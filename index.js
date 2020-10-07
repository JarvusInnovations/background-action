const core = require('@actions/core')
const WaitOn = require('wait-on')
const Tail = require('tail').Tail
const path = require('path')
const spawn = require('child_process').spawn
const inputs = require('./input')

const { run, workingDirectory, waitOn, tail, logOutput } = inputs
const POST_RUN = core.getState('post-run')

let stderr, stdout

if (core.isDebug()) {
  console.log(process.env)
}

// serve as the entry-point for both main and post-run invokations
if (POST_RUN) {
  require('./post-run')
} else {
  (async function () {
    core.saveState('post-run', process.pid)

    const cwd = workingDirectory || process.env.GITHUB_WORKSPACE || './'
    const stdErrFile = path.join(cwd, `${process.pid}.err`)
    const stdOutFile = path.join(cwd, `${process.pid}.out`)

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
  let cmd = `(${run} wait)`

  const spawnOpts = { detached: true, stdio: 'ignore' }

  if (workingDirectory) spawnOpts.cwd = workingDirectory

  const pipeStdout = tail.stdout || logOutput.stdout
  const pipeStderr = tail.stderr || logOutput.stderr

  if (pipeStdout) cmd += ` > ${process.pid}.out`
  if (pipeStderr) cmd += ` 2> ${process.pid}.err`

  const shell = spawn('bash', ['--noprofile', '--norc', '-eo', 'pipefail', '-c', cmd], spawnOpts)
  shell.on('error', (err) => exitHandler(err, 'exit-early'))
  shell.on('close', () => exitHandler(new Error('Exited early'), 'exit-early'))
}

function TailWrapper(filename, shouldTail, output) {
  if (!shouldTail) return false

  try {
    const tail = new Tail(filename, { flushAtEOF: true })
    tail.on('line', output)
    tail.on('error', core.warning)
    return tail
  } catch (e) {
    console.warn('background-action tried to tail a file before it was ready....')
    return false
  }
}
