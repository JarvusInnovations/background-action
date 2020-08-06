const core = require('@actions/core')
const WaitOn = require('wait-on')
const Tail = require('tail').Tail
const spawn = require('child_process').spawn
const inputs = require('./input')

const { run, name, waitOn, tail, logOutput } = inputs
const POST_RUN = core.getState('post-run') == 1

let stderr, stdout, pid

// serve as the entry-point for both main and post-run invokations
if (POST_RUN) {
  require('./post-run')
} else {
  core.saveState('post-run', 1)

  pid = runCommand(run)

  core.saveState('pid', pid)

  setImmediate(() => {
    stderr = TailWrapper(`./${pid}.err`, tail.stderr, core.info)
    stdout = TailWrapper(`./${pid}.out`, tail.stdout, core.info)
  })

  WaitOn(waitOn, (err) => exitHandler(err, err ? 'timeout' : 'success'))
}

function exitHandler(error, reason) {
  if (stdout) stdout.unwatch()
  if (stderr) stderr.unwatch()

  core.saveState(`reason_${pid}`, reason)

  setImmediate(() => {
    if (error) {
      core.error(error)
      core.setFailed(error.message)
    }

    core.endGroup(name)

    if (stdout) core.saveState('stdout', stdout.pos)
    if (stderr) core.saveState('stderr', stderr.pos)

    process.exit(error ? 1 : 0)
  })
}

function runCommand(run) {
  let cmd = `(${run} wait)`

  if (tail.stdout || logOutput.stdout) cmd += ' > $$.out'
  if (tail.stderr || logOutput.stderr) cmd += ' 2> $$.err'

  const shell = spawn('bash', ['--noprofile', '--norc', '-eo', 'pipefail', '-c', cmd], { detached: true, stdio: 'ignore' })
  shell.on('close', () => exitHandler(new Error('Exited early'), 'exit-early'))

  return shell.pid
}

function TailWrapper(filename, shouldTail, output) {
  if (!shouldTail) return false

  const tail = new Tail(filename, { flushAtEOF: true })
  tail.on('line', output)
  tail.on('error', core.warning)

  return tail
}
