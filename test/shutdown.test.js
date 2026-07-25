const process = require('process')
const cp = require('child_process')
const net = require('net')
const core = require('@actions/core')
const pkg = require('../package.json')
const saveState = require('./save-state')

jest.setTimeout(60000)

const freePorts = require('./free-ports')

let PORT
let env

beforeAll(async () => {
    [PORT] = await freePorts(1)
    env = require('./shutdown-env')([PORT])
})

function isListening(port) {
    return new Promise((resolve) => {
        const socket = net.connect({ host: '127.0.0.1', port })
        socket.on('connect', () => { socket.destroy(); resolve(true) })
        socket.on('error', () => { socket.destroy(); resolve(false) })
    })
}

// #205: post-run must signal the backgrounded process group and wait for it to exit,
// so shutdown output is captured and nothing is left holding the port
test('shuts down the backgrounded process and captures its shutdown output', (done) => {
    Object.assign(process.env, env)

    const main = cp.spawn('bash', ['--noprofile', '--norc', '-eo', 'pipefail', '-c', `node ${pkg.main}`], { detached: false, env: process.env })

    const mainOutput = saveState.collect(main.stdout)

    main.on('close', async () => {
        saveState.apply(mainOutput(), process.env)
        const pid = core.getState('post-run')
        expect(core.getState(`reason_${pid}`)).toEqual('success')

        // the server outlives the main invocation -- that is the whole point of the action
        expect(await isListening(PORT)).toEqual(true)

        const post = cp.spawn('bash', ['--noprofile', '--norc', '-eo', 'pipefail', '-c', 'node post-run.js'], { detached: false, env: process.env })

        let output = ''
        post.stdout.on('data', (data) => { output += data.toString() })

        post.on('close', async () => {
            expect(output).toContain('GRACEFUL_SHUTDOWN_COMPLETE')
            expect(await isListening(PORT)).toEqual(false)
            done()
        })
    })
})
