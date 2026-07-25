const process = require('process')

const BASE = {
    USER: 'runner',
    CI: 'true',
    GITHUB_ACTIONS: 'true',
    GITHUB_STATE: '',
    INPUT_RUN: 'echo hi',
    'INPUT_WAIT-ON': 'file:/tmp/background-action-test',
    'INPUT_WAIT-FOR': '1s',
    INPUT_TAIL: 'false',
    'INPUT_LOG-OUTPUT': 'stdout',
    'INPUT_LOG-OUTPUT-RESUME': 'false'
}

function loadInputs(logOutputIf) {
    jest.resetModules()
    Object.assign(process.env, BASE, { 'INPUT_LOG-OUTPUT-IF': logOutputIf })
    return require('../input')
}

// action.yml has advertised `early-exit` since the initial commit while input.js, post-run.js,
// index.js and the README all use `exit-early` -- the documented spelling is rejected outright
test('accepts the early-exit spelling documented in action.yml', () => {
    expect(loadInputs('early-exit').logOutputIf).toContain('exit-early')
})

test('still accepts the canonical exit-early spelling', () => {
    expect(loadInputs('exit-early').logOutputIf).toContain('exit-early')
})
