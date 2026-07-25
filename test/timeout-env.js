// the fourth port is never served, which is what makes the run time out
module.exports = ([first, second, third, unserved]) => ({
   CI: 'true',
   GITHUB_ACTIONS: 'true',
   GITHUB_STATE: '',
   USER: 'runner',
   INPUT_RUN: `PORT=${first} node test/server.js &
     PORT=${second} node test/server.js &
     PORT=${third} node test/server.js &
     `,
   'INPUT_WAIT-ON': `http://localhost:${first}/bar
     tcp:localhost:${first}
     http://localhost:${second}/bar
     tcp:localhost:${second}
     http://localhost:${third}/bar
     tcp:localhost:${unserved}
  `,
   INPUT_TAIL: 'true',
   'INPUT_WAIT-FOR': '10s',
   'INPUT_LOG-OUTPUT': 'stderr,stdout',
   'INPUT_LOG-OUTPUT-RESUME': 'stderr',
   'INPUT_LOG-OUTPUT-IF': 'timeout'
})
