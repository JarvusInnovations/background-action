const cp = require('child_process')
const fs = require('fs')
const os = require('os')
const path = require('path')

jest.setTimeout(30000)

// post-run used to fail the whole job with ENOENT when the log files were gone; this pins the
// fix so the post step stays advisory. It also covers shutdown finding no process to signal.
test('exits cleanly when the log files are missing', () => {
    const runnerTemp = fs.mkdtempSync(path.join(os.tmpdir(), 'ba-missing-logs-'))

    const env = Object.assign({}, process.env, {
        USER: 'runner',
        CI: 'true',
        GITHUB_ACTIONS: 'true',
        GITHUB_STATE: '',
        RUNNER_TEMP: runnerTemp,
        'STATE_post-run': '424242',
        STATE_reason_424242: 'success',
        INPUT_RUN: 'echo hi',
        'INPUT_WAIT-ON': 'file:/tmp/background-action-test',
        'INPUT_WAIT-FOR': '1s',
        INPUT_TAIL: 'false',
        'INPUT_LOG-OUTPUT': 'stdout,stderr',
        'INPUT_LOG-OUTPUT-RESUME': 'false',
        'INPUT_LOG-OUTPUT-IF': 'true'
    })

    const post = cp.spawnSync('bash', ['--noprofile', '--norc', '-eo', 'pipefail', '-c', 'node post-run.js'], { env, encoding: 'utf-8' })

    expect(post.status).toEqual(0)
})
