const core = require('@actions/core')

const DURATION_UNITS = {
    ms: 1, msec: 1, msecs: 1, millisecond: 1, milliseconds: 1,
    s: 1000, sec: 1000, secs: 1000, second: 1000, seconds: 1000,
    m: 60000, min: 60000, mins: 60000, minute: 60000, minutes: 60000,
    h: 3600000, hr: 3600000, hrs: 3600000, hour: 3600000, hours: 3600000,
    d: 86400000, day: 86400000, days: 86400000,
    w: 604800000, week: 604800000, weeks: 604800000
}

const DURATION_PART = /(\d+(?:\.\d+)?)\s*([a-z]*)/gi

// wait-on takes a plain millisecond count, so durations are only ever understood here.
// Sums each <amount><unit> pair, which is what makes `1h30m` work, and refuses anything it
// could not account for rather than quietly using the part it recognized.
function parseDuration(str) {
    let total = 0
    let consumed = 0

    for (const [match, amount, unit] of str.matchAll(DURATION_PART)) {
        const scale = DURATION_UNITS[unit.toLowerCase() || 'ms']

        if (scale === undefined) return NaN

        total += parseFloat(amount) * scale
        consumed += match.length
    }

    return consumed === str.length ? Math.floor(total) : NaN
}

function getRawInputs() {
    const run = core.getInput('run')
    const name = core.getInput('name')
    const waitOn = core.getInput('wait-on')
    const waitFor = core.getInput('wait-for')
    const tail = core.getInput('tail')

    const logOutput = core.getInput('log-output')
    const logOutputResume = core.getInput('log-output-resume')
    const logOutputIf = core.getInput('log-output-if')
    const workingDirectory = core.getInput('working-directory')
    const shutdown = core.getInput('shutdown')
    const shutdownGrace = core.getInput('shutdown-grace')

    return { run, name, waitOn, waitFor, tail, logOutput, logOutputResume, logOutputIf, workingDirectory, shutdown, shutdownGrace }
}

// split a comma/whitespace separated input and reject anything outside the allowed set --
// substring matching used to turn `no-stderr` into "enable stderr" and typos into silence
function parseTokens(str, allowed, name) {
    const tokens = str.split(/[\s,]+/).filter(token => token !== '')
    const invalid = tokens.filter(token => allowed.includes(token) === false)

    if (invalid.length) {
        throw new Error(`Invalid input for: ${name}, expecting: ${allowed.join(',')} received: ${invalid.join(',')}`)
    }

    return tokens
}

function parseDurationInput(str, name) {
    const ms = parseDuration(str)

    if (Number.isFinite(ms) === false || ms <= 0) {
        throw new Error(`Invalid input for: ${name}, expecting a positive duration (eg 30s, 5m, 1h30m) received: ${str}`)
    }

    return ms
}

function parseLogOption(str, name) {
    const tokens = parseTokens(str, ['true', 'false', 'stdout', 'stderr'], name)

    if (tokens.includes('true')) return { stdout: true, stderr: true }

    return { stdout: tokens.includes('stdout'), stderr: tokens.includes('stderr') }
}

function normalizeInputs(inputs) {
    let { run, name, waitOn, waitFor, tail, logOutput, logOutputResume, logOutputIf, workingDirectory, shutdown, shutdownGrace } = inputs

    tail = parseLogOption(tail, 'tail')
    logOutputResume = parseLogOption(logOutputResume, 'log-output-resume')
    logOutput = parseLogOption(logOutput, 'log-output')

    shutdown = shutdown !== 'false'
    shutdownGrace = parseDurationInput(shutdownGrace || '10s', 'shutdown-grace')

    const waitForMs = parseDurationInput(waitFor, 'wait-for')

    // action.yml documented `early-exit` from the initial commit while input.js, post-run.js
    // and index.js all use `exit-early`; accept the spelling we published
    logOutputIf = logOutputIf.replace(/\bearly-exit\b/g, 'exit-early')
    logOutputIf = parseTokens(logOutputIf, ['true', 'false', 'failure', 'exit-early', 'timeout', 'success'], 'log-output-if')

    let waitOnConfig

    try {
        // allow JSON configurations for advanced usage
        waitOnConfig = JSON.parse(waitOn)
    } catch {
        // not JSON -- fall through and treat the input as a resource list
    }

    if (waitOnConfig !== null && typeof waitOnConfig === 'object') {
        // a JSON config supersedes wait-for; its own timeout applies
        if (Array.isArray(waitOnConfig.resources) === false) {
            throw new Error('Invalid input for: wait-on, a JSON configuration must include a resources array, see: https://github.com/jeffbski/wait-on#readme')
        }

        waitOn = waitOnConfig
    } else {
        waitOn = {
            resources: waitOn.split(/\n|,/).map(resource => resource.trim()).filter(line => line !== ''),
            timeout: waitForMs,
            verbose: core.isDebug(),
            log: !tail.stderr && !tail.stdout // provide some interactive feedback if we're not tailing
        }

        if (waitOn.resources.length === 0) throw new Error('You must provide one or more resources, see: https://github.com/jeffbski/wait-on#readme')
    }

    return { run, name, waitOn, waitFor, tail, logOutput, logOutputResume, logOutputIf, workingDirectory, shutdown, shutdownGrace }
}

module.exports = normalizeInputs(getRawInputs())
