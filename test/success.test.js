const process = require('process')
const cp = require('child_process')
const core = require('@actions/core')

jest.setTimeout(30000)

test('success', async () => {
  Object.assign(process.env, {
    CI: 'true',
    GITHUB_ACTIONS: 'true',
    GITHUB_STATE: '',
    USER: 'runner',
    INPUT_RUN: 'DELAY=1000 PORT=3333 node test/server.js &\nPORT=4444 DELAY=2000 node test/server.js &\nDELAY=3000 PORT=5566 node test/server.js &\n',
    'INPUT_WAIT-ON': 'http://localhost:3333/bar\ntcp:localhost:3333\nhttp://localhost:4444/bar\ntcp:localhost:4444\nhttp://localhost:5566/bar\ntcp:localhost:5566\n',
    'INPUT_LOG-OUTPUT-RESUME': 'true',
    INPUT_TAIL: 'true',
    'INPUT_WAIT-FOR': '10s',
    'INPUT_LOG-OUTPUT': 'stderr,stdout',
    'INPUT_LOG-OUTPUT-IF': 'success'
  })

  const main = cp.spawnSync('bash', ['--noprofile', '--norc', '-eo', 'pipefail', '-c', 'node index.js'], { env: process.env, encoding: 'utf-8' })

  const pids = {}

  main.stdout.split('\n').forEach(line => {
    if (line.startsWith('::save-state name=')) {
      const [name, val] = line.split('\n')[0].split('=').pop().split('::')
      process.env[`STATE_${name}`] = val
    } else if (line.includes(':std')) {
      let [pid, kind, count] = line.split(':')
      count = parseInt(count, 10)
      pids[pid] || (pids[pid] = { stdout: 0, stderr: 0 })
      expect(pids[pid][kind]).toBeLessThanOrEqual(count)
      pids[pid][kind] = count
    }
  })

  // Test state
  const pid = core.getState('post-run')
  expect(pid).toBeDefined()
  const stdout = core.getState('stdout')
  expect(stdout).toBeDefined()
  const stderr = core.getState('stderr')
  expect(stderr).toBeDefined()
  const reason = core.getState(`reason_${pid}`)
  expect(reason).toEqual('success')

  await new Promise((r) => setTimeout(r, 10000));

  // Run post
  const post = cp.spawnSync('bash', ['--noprofile', '--norc', '-eo', 'pipefail', '-c', 'node post-run.js'], { env: process.env, encoding: 'utf-8' })

  // Keep track of what we've seen
  let sawStdOutGroup = false
  let sawStdErrGroup = false
  let sawGroupEnd = 0

  const postPids = {}

  post.stdout.split('\n').forEach(line => {
    if (line.includes('::group::Truncated Error Output:')) return (sawStdErrGroup = true)
    if (line.includes('::group::Truncated Output:')) return (sawStdOutGroup = true)
    sawGroupEnd += (line.match(/::endgroup::/g) || []).length

    if (line.includes(':std')) {
      let [pid, kind, count] = line.split(':')
      count = parseInt(count, 10)
      if (!pid || !kind || !count) return
      postPids[pid] || (postPids[pid] = { stdout: 0, stderr: 0 })
        // output is in order
        expect(postPids[pid][kind]).toBeLessThanOrEqual(count)
        // output resumes properly
        expect(count).toBeGreaterThan(pids[pid][kind])
        postPids[pid][kind] = count
      }
  })

  expect(sawStdOutGroup).toEqual(true)
  expect(sawStdErrGroup).toEqual(true)
  expect(sawGroupEnd).toEqual(2)
})
