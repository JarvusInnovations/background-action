const process = require('process')
const cp = require('child_process')
const core = require('@actions/core')
const pkg = require('../package.json')
const freePorts = require('./free-ports')

jest.setTimeout(30000)

let env

beforeAll(async () => { env = require('./wait-argument-env')(await freePorts(1)) })

// regression test for #210: the `wait` builtin appended to the user's commands must not
// be swallowed as an argument of the final command
test('does not pass `wait` as an argument to the last command', (done) => {
    Object.assign(process.env, env)

    const main = cp.spawn('bash', ['--noprofile', '--norc', '-eo', 'pipefail', '-c', `node ${pkg.main}`], { detached: false, env: process.env })

    main.stdout.on('data', (data) => {
        if (data.toString().startsWith('::save-state name=')) {
            const [name, val] = data.toString().split('\n')[0].split('=').pop().split('::')
            process.env[`STATE_${name}`] = val
        }
    })

    main.on('close', () => {
        const pid = core.getState('post-run')
        const reason = core.getState(`reason_${pid}`)

        // with `wait` glued onto the last command, args-server.js rejects the argument and
        // exits non-zero, so the run never becomes ready
        expect(reason).toEqual('success')

        const post = cp.spawn('bash', ['--noprofile', '--norc', '-eo', 'pipefail', '-c', 'node post-run.js'], { detached: false, env: process.env })

        let output = ''
        post.stdout.on('data', (data) => { output += data.toString() })

        post.on('close', () => {
            expect(output).toContain('started with no extra arguments')
            expect(output).not.toContain('Unexpected argument')
            done()
        })
    })
})
