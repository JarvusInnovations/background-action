module.exports = {
    USER: 'runner',
    CI: 'true',
    RUNNER_USER: 'runner',
    GITHUB_ACTIONS: 'true',
    INPUT_RUN: 'npm install\nPORT=8333 node test/server1.js &\nPORT=8444 node test/server2.js &\nPORT=8555 node test/server3.js &\n',
    'INPUT_WAIT-ON': 'http://localhost:8333/bar\ntcp:localhost:8333\nhttp://localhost:8444/bar\ntcp:localhost:8444\nhttp://localhost:8555/bar\ntcp:localhost:8555\n',
    'INPUT_LOG-OUTPUT-RESUME': 'stderr',
    INPUT_TAIL: 'true',
    'INPUT_WAIT-FOR': '5m',
    'INPUT_LOG-OUTPUT': 'stderr,stdout',
    'INPUT_LOG-OUTPUT-IF': 'exit-early',
    INPUT_NAME: 'exit-early-test'
}
