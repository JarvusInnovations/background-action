module.exports = ([port]) => ({
    USER: 'runner',
    CI: 'true',
    RUNNER_USER: 'runner',
    GITHUB_ACTIONS: 'true',
    GITHUB_STATE: '',
    // reproduces #210: a multi-line run whose final command is NOT backgrounded.
    // core.getInput() strips the trailing newline, so an inlined `wait` is parsed as
    // an argument to the user's last command rather than as a shell builtin.
    INPUT_RUN: `export BACKGROUND_ACTION_TEST=1\nPORT=${port} node test/args-server.js\n`,
    'INPUT_WAIT-ON': `tcp:localhost:${port}`,
    'INPUT_LOG-OUTPUT-RESUME': 'false',
    INPUT_TAIL: 'true',
    'INPUT_WAIT-FOR': '15s',
    'INPUT_LOG-OUTPUT': 'stderr,stdout',
    'INPUT_LOG-OUTPUT-IF': 'true'
})
