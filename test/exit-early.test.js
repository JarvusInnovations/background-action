const process = require('process')
const cp = require('child_process')
const core = require('@actions/core')

// shows how the runner will run a javascript action with env / stdout protocol
test('exit-early', (done) => {
    jest.setTimeout(30000)
    Object.assign(process.env, require('./exit-early-env'))

    const main = cp.spawn('bash', ['--noprofile', '--norc', '-eo', 'pipefail', '-c', 'node index.js'], { detached: false, env: process.env })

    main.stdout.on('data', (data) => {
        if (data.toString().startsWith('::save-state name=')) {
            const [name, val] = data.toString().split('\n')[0].split('=').pop().split('::')
            process.env[`STATE_${name}`] = val
        }
        // console.log(`main: stdout: ${data}`)
    })

    /*main.stderr.on('data', (data) => {
        console.error(`main: stderr: ${data}`)
    })*/

    main.on('close', (code) => {
        console.log(`main exited with code ${code}`)

        const pid = core.getState('pid')
        expect(pid).toBeDefined()
        const stdout = core.getState('stdout')
        expect(stdout).toBeDefined()
        const stderr = core.getState('stderr')
        expect(stderr).toBeDefined()
        const reason = core.getState(`reason_${pid}`)
        expect(reason).toEqual('exit-early')

        const post = cp.spawn('bash', ['--noprofile', '--norc', '-eo', 'pipefail', '-c', 'node post-run.js'], { detached: false, env: process.env })

        // Keep track of what we've seen
        let sawStdOutGroup = false
        let sawStdErrGroup = false
        let sawGroupEnd = 0

        post.stdout.on('data', (data) => {
            data = data.toString()
            // console.log(`post: stdout: ${data}`)

            if (data.includes('::group::Truncated Error Output: exit-early-test')) sawStdErrGroup = true
            if (data.includes('::group::Output: exit-early-test')) sawStdOutGroup = true
            sawGroupEnd += (data.match(/::endgroup::/g) || []).length
        })

        //post.stderr.on('data', (data) => {
        // console.error(`post: stderr: ${data}`)
        //})

        post.on('close', (code) => {
            console.log(`post exited with code ${code}`)
            expect(sawGroupEnd).toEqual(2)
            expect(sawStdOutGroup).toEqual(true)
            expect(sawStdErrGroup).toEqual(true)
            done()
        })
    })
})
