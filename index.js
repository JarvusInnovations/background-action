const core = require('@actions/core')
const WaitOn = require('wait-on')
const Tail = require('tail').Tail
const path = require('path')
const spawn = require('child_process').spawn
const inputs = require('./input')

const { run, workingDirectory, waitOn, tail, logOutput } = inputs
const POST_RUN = core.getState('post-run')

// keep logs out of the workspace, where automated commits can sweep them into the repo (#199);
// fall back to the old location when RUNNER_TEMP is absent (local runs, tests)
const logDir = process.env.RUNNER_TEMP || workingDirectory || process.env.GITHUB_WORKSPACE || './'
// resolve() not join(): these are handed to a shell whose cwd is the working-directory,
// so a relative path would be resolved a second time against it
const stdErrFile = path.resolve(logDir, `${process.pid}.err`)
const stdOutFile = path.resolve(logDir, `${process.pid}.out`)

// A bare `wait` blocks until every backgrounded job has exited and reports none of their
// statuses, so a service that dies on startup goes unnoticed until the readiness check times
// out -- the timeout this action exists to prevent.
//
// `wait -n` returns as soon as any single job exits, surfacing the first failure immediately,
// but it needs bash 4.3+ and the macOS runner image still ships 3.2. The fallback tracks the
// backgrounded pids and polls them, recovering each status with `wait <pid>` once one goes
// away, so both shells behave the same. Job control (`set -m`) is deliberately not used: it
// would put every job in its own process group and break post-run's group shutdown.
const WAIT_FOR_JOBS = `if ((BASH_VERSINFO[0] > 4)) || ((BASH_VERSINFO[0] == 4 && BASH_VERSINFO[1] >= 3)); then
  while [ -n "$(jobs -rp)" ]; do wait -n || exit $?; done
else
  __ba_pids=$(jobs -rp)
  while [ -n "$__ba_pids" ]; do
    __ba_alive=""
    for __ba_pid in $__ba_pids; do
      if kill -0 "$__ba_pid" 2>/dev/null; then
        __ba_alive="$__ba_alive $__ba_pid"
      else
        wait "$__ba_pid" || exit $?
      fi
    done
    __ba_pids="$__ba_alive"
    if [ -n "$__ba_pids" ]; then sleep 0.2; fi
  done
fi`

let stderr, stdout

if (core.isDebug()) {
  core.debug(`logDir: ${logDir}`)
  core.debug(`stdOutFile: ${stdOutFile}`)
  core.debug(`stdErrFile: ${stdErrFile}`)
}

// serve as the entry-point for both main and post-run invocations
if (POST_RUN) {
  require('./post-run')
} else {
  (async function () {
    core.saveState('post-run', process.pid)

    // publish the paths so workflows can upload the logs as artifacts (#193)
    core.setOutput('stdout-log', stdOutFile)
    core.setOutput('stderr-log', stdErrFile)

    const checkStderr = setInterval(() => {
      stderr = TailWrapper(stdErrFile, tail.stderr, core.info)
      if (stderr) clearInterval(checkStderr)
    }, 1000)

    const checkStdout = setInterval(() => {
      stdout = TailWrapper(stdOutFile, tail.stdout, core.info)
      if (stdout) clearInterval(checkStdout)
    }, 1000)

    runCommand(run)

    WaitOn(waitOn, (err) => exitHandler(err, err ? 'timeout' : 'success'))
  })()
}

async function exitHandler(error, reason) {
  if (stdout && stdout.unwatch) stdout.unwatch()
  if (stderr && stderr.unwatch) stderr.unwatch()

  core.saveState(`reason_${process.pid}`, reason)
  if (stdout && stdout.pos) core.saveState('stdout', stdout.pos)
  if (stderr && stderr.pos) core.saveState('stderr', stderr.pos)

  if (error) {
    core.error(error)
    core.setFailed(error.message)
  }
  process.exit(error ? 1 : 0)
}

function runCommand(run) {
  // the wait logic must start on its own line: core.getInput() strips the trailing newline,
  // so inlining it makes it an argument of the user's last command (#210)
  let cmd = `(${run}\n${WAIT_FOR_JOBS})`

  const spawnOpts = { detached: true, stdio: 'ignore' }

  if (workingDirectory) spawnOpts.cwd = workingDirectory

  const pipeStdout = tail.stdout || logOutput.stdout
  const pipeStderr = tail.stderr || logOutput.stderr

  // absolute paths: the shell's cwd is the working-directory, which is no longer where logs live
  if (pipeStdout) cmd += ` > "${stdOutFile}"`
  if (pipeStderr) cmd += ` 2> "${stdErrFile}"`

  const shell = spawn('bash', ['--noprofile', '--norc', '-eo', 'pipefail', '-c', cmd], spawnOpts)

  // detached makes the shell a process group leader, so post-run can signal the whole
  // group -- bash plus everything the user backgrounded -- by its negated pid
  core.saveState('shell-pid', shell.pid)

  shell.on('error', (err) => exitHandler(err, 'exit-early'))
  shell.on('close', (code) => exitHandler(new Error(`Exited early with status ${code}`), 'exit-early'))
}

function TailWrapper(filename, shouldTail, output) {
  if (!shouldTail) return false

  try {
    const tail = new Tail(filename, { flushAtEOF: true })
    tail.on('line', output)
    tail.on('error', core.warning)
    return tail
  } catch {
    console.warn('background-action tried to tail a file before it was ready....')
    return false
  }
}
