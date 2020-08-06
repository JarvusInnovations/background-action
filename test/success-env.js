module.exports = {
    CI: 'true',
    GITHUB_ACTIONS: 'true',
    USER: 'runner',
    INPUT_RUN: 'npm install\nPORT=3333 node test/server.js &\nPORT=4444 node test/server.js &\nPORT=5555 node test/server.js &\n',
    'INPUT_WAIT-ON': 'http://localhost:3333/bar\ntcp:localhost:3333\nhttp://localhost:4444/bar\ntcp:localhost:4444\nhttp://localhost:5555/bar\ntcp:localhost:5555\n',
    'INPUT_LOG-OUTPUT-RESUME': 'stderr',
    INPUT_TAIL: 'true',
    'INPUT_WAIT-FOR': '5m',
    'INPUT_LOG-OUTPUT': 'stderr,stdout',
    'INPUT_LOG-OUTPUT-IF': 'failure',
    INPUT_NAME: 'success-test'
}
