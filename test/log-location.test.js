const cp = require('child_process')
const fs = require('fs')
const os = require('os')
const path = require('path')
const pkg = require('../package.json')

jest.setTimeout(60000)

const freePorts = require('./free-ports')

let PORT

beforeAll(async () => { [PORT] = await freePorts(1) })

function tempDir(prefix) {
    return fs.mkdtempSync(path.join(os.tmpdir(), prefix))
}

function logFiles(dir) {
    return fs.readdirSync(dir).filter(file => file.endsWith('.out') || file.endsWith('.err'))
}

// GITHUB_OUTPUT uses the same heredoc format as GITHUB_STATE: name<<delim \n value \n delim
function parseOutputs(file) {
    const lines = fs.readFileSync(file, 'utf-8').split('\n')
    const outputs = {}

    lines.forEach((line, index) => {
        const match = line.match(/^(.+?)<<(ghadelimiter_.+)$/)
        if (match) outputs[match[1]] = lines[index + 1]
    })

    return outputs
}

function runMain() {
    const runnerTemp = tempDir('ba-runner-temp-')
    const workingDirectory = tempDir('ba-workdir-')
    const outputFile = path.join(tempDir('ba-output-'), 'output')
    fs.writeFileSync(outputFile, '')

    const env = Object.assign({}, process.env, {
        USER: 'runner',
        CI: 'true',
        GITHUB_ACTIONS: 'true',
        GITHUB_STATE: '',
        GITHUB_OUTPUT: outputFile,
        RUNNER_TEMP: runnerTemp,
        // absolute path so the command still resolves from the temporary working directory
        INPUT_RUN: `PORT=${PORT} node ${path.join(__dirname, 'args-server.js')} &`,
        'INPUT_WORKING-DIRECTORY': workingDirectory,
        'INPUT_WAIT-ON': `tcp:localhost:${PORT}`,
        'INPUT_WAIT-FOR': '15s',
        INPUT_TAIL: 'true',
        'INPUT_LOG-OUTPUT': 'stderr,stdout',
        'INPUT_LOG-OUTPUT-RESUME': 'false',
        'INPUT_LOG-OUTPUT-IF': 'true'
    })

    const main = cp.spawnSync('bash', ['--noprofile', '--norc', '-eo', 'pipefail', '-c', `node ${pkg.main}`], { env, encoding: 'utf-8' })

    // reuse the action's own shutdown to clean up the backgrounded server
    main.stdout.split('\n').forEach(line => {
        if (line.startsWith('::save-state name=')) {
            const [name, val] = line.split('=').pop().split('::')
            env[`STATE_${name}`] = val
        }
    })
    cp.spawnSync('bash', ['--noprofile', '--norc', '-eo', 'pipefail', '-c', 'node post-run.js'], { env, encoding: 'utf-8' })

    return { runnerTemp, workingDirectory, outputs: parseOutputs(outputFile) }
}

// #199: log files land in the working directory (or the workspace), where automated commits
// can sweep them into the repository
test('writes log files outside the working directory', () => {
    const { runnerTemp, workingDirectory } = runMain()

    expect(logFiles(workingDirectory)).toEqual([])
    expect(logFiles(runnerTemp).length).toBeGreaterThan(0)
})

// #193: consumers need a supported way to reference the logs (eg to upload them as artifacts)
test('exposes the log file paths as outputs', () => {
    const { runnerTemp, outputs } = runMain()

    expect(outputs['stdout-log']).toBeDefined()
    expect(outputs['stderr-log']).toBeDefined()
    expect(outputs['stdout-log'].startsWith(runnerTemp)).toEqual(true)
    expect(fs.existsSync(outputs['stdout-log'])).toEqual(true)
    expect(fs.existsSync(outputs['stderr-log'])).toEqual(true)
})
