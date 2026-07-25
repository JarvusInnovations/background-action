const core = require('@actions/core')
const parseDuration = require('parse-duration')

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

// parse-duration is lenient: nonsense yields null, negatives stay negative, and it will pull
// `123` out of `abc123` -- which silently becomes a 123 millisecond timeout. Require something
// that at least starts like a duration, and a positive finite result.
function parseDurationInput(str, name) {
    const ms = /^\d/.test(str) ? parseDuration(str) : null

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

    let waitOnConfig = null

    try {
        // allow JSON configurations for advanced usage
        waitOnConfig = JSON.parse(waitOn)
    } catch (e) {
        waitOnConfig = null // not JSON, treat the input as a resource list
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
