module.exports = ([first, second, third]) => ({
  CI: 'true',
  GITHUB_ACTIONS: 'true',
  GITHUB_STATE: '',
  USER: 'runner',
  INPUT_RUN: `npm install\nPORT=${first} node test/server.js &\nPORT=${second} node test/server.js &\nPORT=${third} node test/server.js &\n`,
  'INPUT_WAIT-ON': `http://localhost:${first}/bar\ntcp:localhost:${first}\nhttp://localhost:${second}/bar\ntcp:localhost:${second}\nhttp://localhost:${third}/bar\ntcp:localhost:${third}\n`,
  'INPUT_LOG-OUTPUT-RESUME': 'stderr,stdout',
  INPUT_TAIL: 'true',
  'INPUT_WAIT-FOR': '5m',
  'INPUT_LOG-OUTPUT': 'true',
  'INPUT_LOG-OUTPUT-IF': 'true'
})
