const core = require('@actions/core')
const inputs = require('./input')
const fs = require('fs')
const path = require('path')

const { logOutput, logOutputResume, logOutputIf, workingDirectory, shutdown, shutdownGrace } = inputs

const shellPid = parseInt(core.getState('shell-pid') || 0, 10)
const pid = core.getState('post-run')
const reason = core.getState(`reason_${pid}`)
const stdout = parseInt(core.getState('stdout') || 0, 10)
const stderr = parseInt(core.getState('stderr') || 0, 10)

// must resolve to the same location index.js wrote to (#199)
const logDir = process.env.RUNNER_TEMP || workingDirectory || process.env.GITHUB_WORKSPACE || './'
const stdoutPath = path.resolve(logDir, `${pid}.out`)
const stderrPath = path.resolve(logDir, `${pid}.err`)

const shouldLog = logOutputIf.includes('true') || logOutputIf.includes(reason) || (logOutputIf.includes('failure') && (reason === 'exit-early' || reason === 'timeout'))

if (core.isDebug()) {
  core.debug(`stdout: ${stdout}`)
  core.debug(`stderr: ${stderr}`)
  core.debug(`stdoutPath: ${stdoutPath}`)
  core.debug(`stderrPath: ${stderrPath}`)
  core.debug(`shouldLog: ${shouldLog}`)
  core.debug(`logOutput: ${logOutput}`)
  core.debug(`logOutputResume: ${logOutputResume}`)
  core.debug(`logOutputIf: ${logOutputIf}`)
  core.debug(`workingDirectory: ${workingDirectory}`)
  core.debug(`pid: ${pid}`)
  core.debug(`reason: ${reason}`)
  core.debug(`logDir: ${logDir}`)
}

function groupIsAlive(pgid) {
  try {
    process.kill(-pgid, 0)
    return true
  } catch (err) {
    // ESRCH means the group is gone; EPERM means it survives but we may not signal it
    return err.code === 'EPERM'
  }
}

// signal the process group the main invocation left running and give it a chance to exit
// cleanly, so anything it writes on the way down lands in the logs we are about to stream
async function shutdownProcessGroup(pgid, graceMs) {
  if (!pgid) return

  try {
    // negated pid targets the whole group -- index.js spawns detached, making the shell a
    // group leader, so this reaches every process the user backgrounded
    process.kill(-pgid, 'SIGTERM')
  } catch (err) {
    if (err.code !== 'ESRCH') core.warning(`background-action could not signal process group ${pgid}: ${err.message}`)
    return
  }

  const deadline = Date.now() + graceMs

  while (Date.now() < deadline) {
    if (!groupIsAlive(pgid)) return
    await new Promise(resolve => setTimeout(resolve, 100))
  }

  core.warning(`background-action process group ${pgid} did not exit within ${graceMs}ms, sending SIGKILL`)

  try {
    process.kill(-pgid, 'SIGKILL')
  } catch {
    // already exited between the deadline check and here
  }
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
      try {
        await streamLog(stdoutPath, start)
      } catch(err) {
        console.error('Error streaming stdout:', err)
      }
    })
  }

  if (logOutput.stderr) {
    const start = logOutputResume.stderr ? stderr : 0
    const truncated = start > 0
    await core.group(`${logOutputResume.stderr ? 'Truncated ' : ''}Error Output:`, async () => {
      if (truncated) console.log(`Truncated ${start} bytes of tailed stderr output`)
      try {
        await streamLog(stderrPath, start)
      } catch(err) {
        console.error('Error streaming stderr:', err)
      }
    })
  }
}

(async() => {
    try {
      // shut down before streaming so shutdown output is included in the captured logs
      if (shutdown) await shutdownProcessGroup(shellPid, shutdownGrace)

      if (shouldLog) {
        await streamLogs()
      }
    } catch(err) {
        console.error('Error streaming logs:', err)
    } finally {
        process.exit(0)
    }
})();