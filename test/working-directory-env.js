module.exports = ([port]) => ({
    CI: 'true',
    GITHUB_ACTIONS: 'true',
    GITHUB_STATE: '',
    USER: 'runner',
    INPUT_RUN: `npm install && PORT=${port} node server.js&\n`,
    'INPUT_WAIT-ON': `http://localhost:${port}/bar\ntcp:localhost:${port}\n`,
    'INPUT_LOG-OUTPUT-RESUME': 'stderr',
    INPUT_TAIL: 'true',
    'INPUT_WAIT-FOR': '5m',
    'INPUT_LOG-OUTPUT': 'stderr,stdout',
    'INPUT_LOG-OUTPUT-IF': 'failure',
    'INPUT_WORKING-DIRECTORY': 'test'
})
