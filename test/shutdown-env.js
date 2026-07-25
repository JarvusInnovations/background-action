module.exports = ([port]) => ({
    USER: 'runner',
    CI: 'true',
    RUNNER_USER: 'runner',
    GITHUB_ACTIONS: 'true',
    GITHUB_STATE: '',
    INPUT_RUN: `PORT=${port} node test/shutdown-server.js &\n`,
    'INPUT_WAIT-ON': `tcp:localhost:${port}`,
    'INPUT_LOG-OUTPUT-RESUME': 'false',
    INPUT_TAIL: 'true',
    'INPUT_WAIT-FOR': '15s',
    'INPUT_LOG-OUTPUT': 'stderr,stdout',
    'INPUT_LOG-OUTPUT-IF': 'true'
})
