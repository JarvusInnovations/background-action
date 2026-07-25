const http = require('http')

const PORT = process.env.PORT || 3000
const args = process.argv.slice(2)

// mirrors how a real CLI (npm, vite, etc) reacts to an unexpected trailing argument
if (args.length) {
  console.error(`Unexpected argument: ${args.join(' ')}`)
  process.exit(1)
}

console.log(`${process.pid}:stdout:0: started with no extra arguments`)

const server = http.createServer((req, res) => res.end('ok'))
server.listen(PORT)

// safety net so a failed test can never leak this process onto the port
setTimeout(() => process.exit(0), 60000)
