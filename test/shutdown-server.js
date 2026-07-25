const http = require('http')

const PORT = process.env.PORT || 3000

const server = http.createServer((req, res) => res.end('ok'))

// a real system under test flushes coverage / writes a summary on SIGTERM; none of that
// output can be captured unless post-run signals the process and waits for it to exit
process.on('SIGTERM', () => {
  console.log('GRACEFUL_SHUTDOWN_COMPLETE')
  server.close()
  process.exit(0)
})

server.listen(PORT, () => console.log(`${process.pid}:stdout:0: listening on ${PORT}`))

// safety net so a failed test can never leak this process onto the port
setTimeout(() => process.exit(0), 60000)
