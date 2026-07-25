const process = require('process')
const cp = require('child_process')
const core = require('@actions/core')
const pkg = require('../package.json')
const freePorts = require('./free-ports')

jest.setTimeout(60000)

let env

beforeAll(async () => { env = require('./background-failure-env')(await freePorts(1)) })

// a bare `wait` blocks until every background job finishes and discards their exit statuses,
// so one failed service is invisible until the readiness check times out -- the exact timeout
// this action exists to prevent
test('reports a failed background process instead of waiting for the readiness timeout', (done) => {
    Object.assign(process.env, env)

    const started = Date.now()
    const main = cp.spawn('bash', ['--noprofile', '--norc', '-eo', 'pipefail', '-c', `node ${pkg.main}`], { detached: false, env: process.env })

    main.stdout.on('data', (data) => {
        if (data.toString().startsWith('::save-state name=')) {
            const [name, val] = data.toString().split('\n')[0].split('=').pop().split('::')
            process.env[`STATE_${name}`] = val
        }
    })

    main.on('close', () => {
        const elapsed = Date.now() - started
        const pid = core.getState('post-run')

        expect(core.getState(`reason_${pid}`)).toEqual('exit-early')
        // must beat the 10s wait-for, otherwise the failure was only noticed by timing out
        expect(elapsed).toBeLessThan(5000)

        // let the action's own shutdown reap the surviving `sleep`
        cp.spawnSync('bash', ['--noprofile', '--norc', '-eo', 'pipefail', '-c', 'node post-run.js'], { env: process.env, encoding: 'utf-8' })
        done()
    })
})
