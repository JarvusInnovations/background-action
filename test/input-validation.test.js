const process = require('process')

const BASE = {
    USER: 'runner',
    CI: 'true',
    GITHUB_ACTIONS: 'true',
    GITHUB_STATE: '',
    INPUT_RUN: 'echo hi',
    'INPUT_WAIT-ON': 'file:/tmp/background-action-test',
    'INPUT_WAIT-FOR': '1s',
    INPUT_TAIL: 'true',
    'INPUT_LOG-OUTPUT': 'stdout,stderr',
    'INPUT_LOG-OUTPUT-RESUME': 'false',
    'INPUT_LOG-OUTPUT-IF': 'true'
}

function loadInputs(overrides) {
    jest.resetModules()
    Object.keys(process.env)
        .filter(key => key.startsWith('INPUT_'))
        .forEach(key => delete process.env[key])
    Object.assign(process.env, BASE, overrides)
    return require('../input')
}

// substring matching silently produced the opposite of what the user asked for, or
// silently disabled logging entirely -- on an action whose job is not to lose log output
describe('log option inputs reject typos instead of silently misbehaving', () => {
    test('rejects `no-stderr` rather than enabling stderr', () => {
        expect(() => loadInputs({ 'INPUT_LOG-OUTPUT': 'no-stderr' })).toThrow(/log-output/)
    })

    test('rejects a misspelled stdout rather than logging nothing', () => {
        expect(() => loadInputs({ 'INPUT_LOG-OUTPUT': 'sdtout' })).toThrow(/log-output/)
    })

    test('rejects the wrong case rather than logging nothing', () => {
        expect(() => loadInputs({ INPUT_TAIL: 'stdOut' })).toThrow(/tail/)
    })
})

describe('log option inputs keep accepting the documented forms', () => {
    test('comma separated', () => {
        expect(loadInputs({ 'INPUT_LOG-OUTPUT': 'stdout,stderr' }).logOutput).toEqual({ stdout: true, stderr: true })
    })

    test('whitespace separated', () => {
        expect(loadInputs({ 'INPUT_LOG-OUTPUT': 'stdout stderr' }).logOutput).toEqual({ stdout: true, stderr: true })
    })

    test('a single stream', () => {
        expect(loadInputs({ 'INPUT_LOG-OUTPUT': 'stderr' }).logOutput).toEqual({ stdout: false, stderr: true })
    })

    test('true and false', () => {
        expect(loadInputs({ 'INPUT_LOG-OUTPUT': 'true' }).logOutput).toEqual({ stdout: true, stderr: true })
        expect(loadInputs({ 'INPUT_LOG-OUTPUT': 'false' }).logOutput).toEqual({ stdout: false, stderr: false })
    })
})

// parse-duration is lenient: it returns null for nonsense, negatives for negatives, and will
// happily pull `123` out of `abc123` -- which silently becomes a 123 millisecond timeout
describe('duration inputs', () => {
    test('rejects a value that is not a duration', () => {
        expect(() => loadInputs({ 'INPUT_WAIT-FOR': 'garbage' })).toThrow(/wait-for/)
    })

    test('rejects a number hidden behind other text', () => {
        expect(() => loadInputs({ 'INPUT_WAIT-FOR': 'abc123' })).toThrow(/wait-for/)
    })

    test('rejects a negative duration', () => {
        expect(() => loadInputs({ 'INPUT_WAIT-FOR': '-5s' })).toThrow(/wait-for/)
    })

    test('rejects a zero duration', () => {
        expect(() => loadInputs({ 'INPUT_WAIT-FOR': '0' })).toThrow(/wait-for/)
    })

    test('accepts compound durations', () => {
        expect(loadInputs({ 'INPUT_WAIT-FOR': '1h30m' }).waitOn.timeout).toEqual(5400000)
    })

    // terse and verbose spellings of the same unit both work, and a bare number is milliseconds
    test.each([
        ['90', 90],
        ['500ms', 500],
        ['500 milliseconds', 500],
        ['30s', 30000],
        ['30sec', 30000],
        ['30 seconds', 30000],
        ['5m', 300000],
        ['5min', 300000],
        ['10 minutes', 600000],
        ['2h', 7200000],
        ['2hr', 7200000],
        ['2 hours', 7200000],
        ['1.5h', 5400000],
        ['1d', 86400000],
        ['1w', 604800000],
        ['1h30m', 5400000],
        ['1h30m45s', 5445000]
    ])('accepts %s', (input, expected) => {
        expect(loadInputs({ 'INPUT_WAIT-FOR': input }).waitOn.timeout).toEqual(expected)
    })

    test.each(['30x', '1 fortnight', '5 parsecs', '10 minutes please'])('rejects the unrecognized unit in %s', (input) => {
        expect(() => loadInputs({ 'INPUT_WAIT-FOR': input })).toThrow(/wait-for/)
    })

    test('validates shutdown-grace the same way', () => {
        expect(() => loadInputs({ 'INPUT_SHUTDOWN-GRACE': 'soon' })).toThrow(/shutdown-grace/)
    })
})

describe('wait-on JSON configuration', () => {
    test('accepts an object carrying resources', () => {
        const waitOn = loadInputs({ 'INPUT_WAIT-ON': '{"resources":["tcp:localhost:1"],"timeout":50}' }).waitOn
        expect(waitOn.resources).toEqual(['tcp:localhost:1'])
    })

    test('rejects a JSON object with no resources', () => {
        expect(() => loadInputs({ 'INPUT_WAIT-ON': '{"timeout":50}' })).toThrow(/wait-on/)
    })
})

describe('log-output-if', () => {
    test('rejects a value that merely contains a valid token', () => {
        expect(() => loadInputs({ 'INPUT_LOG-OUTPUT-IF': 'successful' })).toThrow(/log-output-if/)
    })

    // the sibling inputs all take comma lists, so this reads as valid and silently was not
    test('accepts a comma separated list of reasons', () => {
        expect(loadInputs({ 'INPUT_LOG-OUTPUT-IF': 'exit-early,success' }).logOutputIf).toEqual(['exit-early', 'success'])
    })

    test('accepts a single reason', () => {
        expect(loadInputs({ 'INPUT_LOG-OUTPUT-IF': 'failure' }).logOutputIf).toEqual(['failure'])
    })
})
