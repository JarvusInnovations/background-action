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

    return { run, name, waitOn, waitFor, tail, logOutput, logOutputResume, logOutputIf, workingDirectory }
}

function parseLogOption(str) {
    const option = { stdout: false, stderr: false }
    if (str === 'true') return { stdout: true, stderr: true }
    if (str === 'false') return option
    if (str.includes('stdout')) option.stdout = true
    if (str.includes('stderr')) option.stderr = true

    return option
}

function normalizeInputs(inputs) {
    let { run, name, waitOn, waitFor, tail, logOutput, logOutputResume, logOutputIf, workingDirectory } = inputs

    tail = parseLogOption(tail)
    logOutputResume = parseLogOption(logOutputResume)
    logOutput = parseLogOption(logOutput)

    if (logOutputIf && /true|false|failure|exit-early|timeout|success/.test(logOutputIf) == false) {
        throw new Error(`Invalid input for: log-output-if, expecting: true,false,failure,exit-early,timeout,success received: ${logOutputIf}`)
    }

    try {
        // allow JSON configurations for advanced usage
        const waitOnConfig = JSON.parse(waitOn)
        waitOn = waitOnConfig
    } catch (e) {
        waitOn = {
            resources: waitOn.split(/\n|,/).map(resource => resource.trim()).filter(line => line !== ''),
            timeout: parseDuration(waitFor),
            verbose: core.isDebug(),
            log: !tail.stderr && !tail.stdout // provide some interactive feedback if we're not tailing
        }

        if (waitOn.resources.length === 0) throw new Error('You must provide one or more resources, see: https://github.com/jeffbski/wait-on#readme')
    }

    return { run, name, waitOn, waitFor, tail, logOutput, logOutputResume, logOutputIf, workingDirectory }
}

module.exports = normalizeInputs(getRawInputs())
