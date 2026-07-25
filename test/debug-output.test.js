const cp = require('child_process')
const fs = require('fs')
const os = require('os')
const path = require('path')
const pkg = require('../package.json')

jest.setTimeout(30000)

// debug mode is enabled by anyone who can re-run a job; the environment carries tokens and
// job/step variables, and runner masking only covers values registered as secrets
test('does not dump the environment when debug logging is enabled', () => {
    const secret = 'sentinel-value-that-must-never-be-logged'
    const runnerTemp = fs.mkdtempSync(path.join(os.tmpdir(), 'ba-debug-'))

    const env = Object.assign({}, process.env, {
        USER: 'runner',
        CI: 'true',
        GITHUB_ACTIONS: 'true',
        GITHUB_STATE: '',
        RUNNER_DEBUG: '1',
        RUNNER_TEMP: runnerTemp,
        A_DERIVED_CREDENTIAL: secret,
        INPUT_RUN: 'echo hi',
        'INPUT_WAIT-ON': `file:${path.join(runnerTemp, 'never-appears')}`,
        'INPUT_WAIT-FOR': '1s',
        INPUT_TAIL: 'false',
        'INPUT_LOG-OUTPUT': 'false',
        'INPUT_LOG-OUTPUT-RESUME': 'false',
        'INPUT_LOG-OUTPUT-IF': 'false'
    })

    const main = cp.spawnSync('bash', ['--noprofile', '--norc', '-eo', 'pipefail', '-c', `node ${pkg.main}`], { env, encoding: 'utf-8' })

    expect(`${main.stdout}${main.stderr}`).not.toContain(secret)
})
