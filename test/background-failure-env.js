module.exports = ([unserved]) => ({
    USER: 'runner',
    CI: 'true',
    RUNNER_USER: 'runner',
    GITHUB_ACTIONS: 'true',
    GITHUB_STATE: '',
    // one backgrounded process fails immediately while another keeps running; the readiness
    // check never succeeds, so a run that does not notice the failure can only time out
    INPUT_RUN: 'node -e "process.exit(3)" &\nsleep 30 &\n',
    'INPUT_WAIT-ON': `tcp:localhost:${unserved}`,
    'INPUT_LOG-OUTPUT-RESUME': 'false',
    INPUT_TAIL: 'false',
    'INPUT_WAIT-FOR': '10s',
    'INPUT_LOG-OUTPUT': 'stderr,stdout',
    'INPUT_LOG-OUTPUT-IF': 'true'
})
