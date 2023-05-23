const process = require('process')
const cp = require('child_process')
const core = require('@actions/core')

jest.setTimeout(30000)

// shows how the runner will run a javascript action with env / stdout protocol
test('working-directory', (done) => {

    Object.assign(process.env, require('./working-directory-env'))

    const main = cp.spawnSync('bash', ['--noprofile', '--norc', '-eo', 'pipefail', '-c', 'node index.js'], { env: process.env, encoding: 'utf-8' })

    main.stdout.split('\n').forEach(line => {
        if (line.startsWith('::save-state name=')) {
            const [name, val] = line.split('\n')[0].split('=').pop().split('::')
            process.env[`STATE_${name}`] = val
        }
    })

    setTimeout(() => {
        const workingDirectory = core.getInput('working-directory')
        expect(workingDirectory).toEqual('test')
        const pid = core.getState('post-run')
        expect(pid).toBeDefined()
        const stdout = core.getState('stdout')
        expect(stdout).toBeDefined()
        const stderr = core.getState('stderr')
        expect(stderr).toBeDefined()
        const reason = core.getState(`reason_${pid}`)
        console.log(`reason_${pid}`)
        expect(reason).toEqual('success')

        const post = cp.spawn('bash', ['--noprofile', '--norc', '-eo', 'pipefail', '-c', 'node post-run.js'], { detached: false, env: process.env })

        // Keep track of what we've seen
        let sawStdOutGroup = false
        let sawStdErrGroup = false
        let sawGroupEnd = 0

        post.stdout.on('data', (data) => {
            data = data.toString()
            console.log(`post: stdout: ${data}`)

            if (data.includes('::group::Error Output:')) sawStdErrGroup = true
            if (data.includes('::group::Output:')) sawStdOutGroup = true
            sawGroupEnd += (data.match(/::endgroup::/g) || []).length
        })

        post.stderr.on('data', (data) => {
            console.error(`post: stderr: ${data}`)
        })

        post.on('close', (code) => {
            console.log(`post exited with code ${code}`)
            // this should only log on failure, so we don't expect any of this
            expect(sawStdOutGroup).toEqual(false)
            expect(sawStdErrGroup).toEqual(false)
            expect(sawGroupEnd).toEqual(0)
            done()
        })
    })
})
