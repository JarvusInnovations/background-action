const process = require('process')
const cp = require('child_process')
const core = require('@actions/core')

// shows how the runner will run a javascript action with env / stdout protocol
test('truncate', (done) => {
  jest.setTimeout(30000)
  Object.assign(process.env, require('./truncate-env'))

  const main = cp.spawnSync('bash', ['--noprofile', '--norc', '-eo', 'pipefail', '-c', 'node index.js'], { env: process.env, encoding: 'utf-8' })

  main.stdout.split('\n').forEach(line => {
    if (line.startsWith('::save-state name=')) {
      const [name, val] = line.split('\n')[0].split('=').pop().split('::')
      process.env[`STATE_${name}`] = val
    }
  })

  setTimeout(() => {
    const pid = core.getState('post-run')
    expect(pid).toBeDefined()
    const stdout = core.getState('stdout')
    expect(stdout).toBeDefined()
    const stderr = core.getState('stderr')
    expect(stderr).toBeDefined()
    const reason = core.getState(`reason_${pid}`)
    expect(reason).toEqual('success')

    const post = cp.spawnSync('bash', ['--noprofile', '--norc', '-eo', 'pipefail', '-c', 'node post-run.js'], { env: process.env, encoding: 'utf-8' })

    // Keep track of what we've seen
    let sawStdOutGroup = false
    let sawStdErrGroup = false
    let sawGroupEnd = 0

    post.stdout.split('\n').forEach(line => {
      if (line.startsWith('::group::Truncated Error Output:')) sawStdErrGroup = true
      if (line.startsWith('::group::Truncated Output:')) sawStdOutGroup = true
      if (line.startsWith('::endgroup::')) sawGroupEnd++
    })

    expect(sawGroupEnd).toEqual(2)
    expect(sawStdOutGroup).toEqual(true)
    expect(sawStdErrGroup).toEqual(true)
    done()
  }, 5000)

})
