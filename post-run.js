const core = require('@actions/core')
const inputs = require('./input')
const fs = require('fs')
const path = require('path')

const { logOutput, logOutputResume, logOutputIf, workingDirectory } = inputs

const pid = core.getState('post-run')
const reason = core.getState(`reason_${pid}`)
const stdout = parseInt(core.getState('stdout') || 0, 10)
const stderr = parseInt(core.getState('stderr') || 0, 10)

const cwd = workingDirectory || process.env.GITHUB_WORKSPACE || './'
const stdoutPath = path.join(cwd, `${pid}.out`)
const stderrPath = path.join(cwd, `${pid}.err`)

const shouldLog = logOutputIf === 'true' || logOutputIf === reason || (logOutputIf === 'failure' && (reason === 'exit-early' || reason === 'timeout'))

core.debug({ reason, pid, stderrPath, stdoutPath, stdout, stderr, inputs, shouldLog })

if (shouldLog) {
  streamLogs()
} else {
  process.exit(0)
}

function streamLog(path, start) {
  return new Promise((resolve, reject) => {
    const log = fs.createReadStream(path, { start, emitClose: true, encoding: 'utf8', autoClose: true })
    log.on('close', () => resolve(null))
    log.on('error', (err) => reject(err))
    log.pipe(process.stdout)
  })
}

async function streamLogs() {
  if (logOutput.stdout) {
    const start = logOutputResume.stdout ? stdout : 0
    const truncated = start > 0
    await core.group(`${logOutputResume.stdout ? 'Truncated ' : ''}Output:`, async () => {
      if (truncated) console.log(`Truncated ${start} bytes of tailed stdout output`)
      await streamLog(stdoutPath, start)
    })
  }

  if (logOutput.stderr) {
    const start = logOutputResume.stderr ? stderr : 0
    const truncated = start > 0
    await core.group(`${logOutputResume.stderr ? 'Truncated ' : ''}Error Output:`, async () => {
      if (truncated) console.log(`Truncated ${start} bytes of tailed stderr output`)
      await streamLog(stderrPath, start)
    })
  }
}
