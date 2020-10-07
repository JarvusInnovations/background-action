module.exports = {
   CI: 'true',
   GITHUB_ACTIONS: 'true',
   USER: 'runner',
   INPUT_RUN: `PORT=43333 node test/server.js &
     PORT=44444 node test/server.js &
     PORT=45555 node test/server.js &
     `,
   'INPUT_WAIT-ON': `http://localhost:43333/bar
     tcp:localhost:43333
     http://localhost:44444/bar
     tcp:localhost:44444
     http://localhost:45555/bar
     tcp:localhost:46666
  `,
   INPUT_TAIL: 'true',
   'INPUT_WAIT-FOR': '10s',
   'INPUT_LOG-OUTPUT': 'stderr,stdout',
   'INPUT_LOG-OUTPUT-RESUME': 'stderr',
   'INPUT_LOG-OUTPUT-IF': 'timeout'
}
