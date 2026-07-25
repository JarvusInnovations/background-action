// server1/2/3.js do not exist -- that is what makes the run exit early
module.exports = ([first, second, third]) => ({
    USER: 'runner',
    CI: 'true',
    RUNNER_USER: 'runner',
    GITHUB_ACTIONS: 'true',
    GITHUB_STATE: '',
    INPUT_RUN: `npm install\nPORT=${first} node test/server1.js &\nPORT=${second} node test/server2.js &\nPORT=${third} node test/server3.js &\n`,
    'INPUT_WAIT-ON': `http://localhost:${first}/bar\ntcp:localhost:${first}\nhttp://localhost:${second}/bar\ntcp:localhost:${second}\nhttp://localhost:${third}/bar\ntcp:localhost:${third}\n`,
    'INPUT_LOG-OUTPUT-RESUME': 'stderr',
    INPUT_TAIL: 'true',
    'INPUT_WAIT-FOR': '5m',
    'INPUT_LOG-OUTPUT': 'stderr,stdout',
    'INPUT_LOG-OUTPUT-IF': 'exit-early'
})
