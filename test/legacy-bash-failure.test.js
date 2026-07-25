const process = require('process')
const cp = require('child_process')
const path = require('path')
const core = require('@actions/core')
const pkg = require('../package.json')
const saveState = require('./save-state')
const freePorts = require('./free-ports')

jest.setTimeout(60000)

let unserved

beforeAll(async () => { [unserved] = await freePorts(1) })

// Forces `bash` to resolve to the system shell. On macOS -- including the macos runner image,
// which ships 3.2.57 -- that shell predates `wait -n`, so this exercises the fallback. On Linux
// the system shell is modern and this covers the primary path; either way the behavior of the
// action must be identical.
test('detects a failed background process on shells without wait -n', (done) => {
    const env = Object.assign({}, process.env, {
        USER: 'runner',
        CI: 'true',
        GITHUB_ACTIONS: 'true',
        GITHUB_STATE: '',
        // /bin first so `bash` is the system build; node's own directory after so `node` resolves
        PATH: `/bin:/usr/bin:${path.dirname(process.execPath)}`,
        INPUT_RUN: 'node -e "process.exit(3)" &\nsleep 30 &\n',
        'INPUT_WAIT-ON': `tcp:localhost:${unserved}`,
        'INPUT_LOG-OUTPUT-RESUME': 'false',
        INPUT_TAIL: 'false',
        'INPUT_WAIT-FOR': '10s',
        'INPUT_LOG-OUTPUT': 'stderr,stdout',
        'INPUT_LOG-OUTPUT-IF': 'true'
    })

    const started = Date.now()
    const main = cp.spawn('bash', ['--noprofile', '--norc', '-eo', 'pipefail', '-c', `node ${pkg.main}`], { detached: false, env })

    const mainOutput = saveState.collect(main.stdout)

    main.on('close', () => {
        saveState.apply(mainOutput(), env)
        const elapsed = Date.now() - started
        Object.assign(process.env, env)
        const pid = core.getState('post-run')

        expect(core.getState(`reason_${pid}`)).toEqual('exit-early')
        expect(elapsed).toBeLessThan(5000)

        cp.spawnSync('bash', ['--noprofile', '--norc', '-eo', 'pipefail', '-c', 'node post-run.js'], { env, encoding: 'utf-8' })
        done()
    })
})
