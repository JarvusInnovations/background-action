module.exports = {
  CI: 'true',
  GITHUB_ACTIONS: 'true',
  USER: 'runner',
  INPUT_RUN: 'npm install\nPORT=6333 node test/server.js &\nPORT=6444 node test/server.js &\nPORT=6555 node test/server.js &\n',
  'INPUT_WAIT-ON': 'http://localhost:6333/bar\ntcp:localhost:6333\nhttp://localhost:6444/bar\ntcp:localhost:6444\nhttp://localhost:6555/bar\ntcp:localhost:6555\n',
  'INPUT_LOG-OUTPUT-RESUME': 'stderr,stdout',
  INPUT_TAIL: 'true',
  'INPUT_WAIT-FOR': '5m',
  'INPUT_LOG-OUTPUT': 'true',
  INPUT_NAME: 'truncate-test',
  'INPUT_LOG-OUTPUT-IF': 'true'
}
