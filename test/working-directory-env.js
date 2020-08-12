module.exports = {
    CI: 'true',
    GITHUB_ACTIONS: 'true',
    USER: 'runner',
    INPUT_RUN: 'npm install && PORT=9362 node server.js&\n',
    'INPUT_WAIT-ON': 'http://localhost:9362/bar\ntcp:localhost:9362\n',
    'INPUT_LOG-OUTPUT-RESUME': 'stderr',
    INPUT_TAIL: 'true',
    'INPUT_WAIT-FOR': '5m',
    'INPUT_LOG-OUTPUT': 'stderr,stdout',
    'INPUT_LOG-OUTPUT-IF': 'failure',
    'INPUT_WORKING-DIRECTORY': 'test'
}
