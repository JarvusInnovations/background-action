const http = require('http')

const PORT = process.env.PORT || 3000
const DELAY = 5000

const server = http.createServer((req, res) => {
  res.setHeader('Content-Type', 'text/html')
  res.setHeader('X-Foo', 'bar')
  res.writeHead(200, { 'Content-Type': 'text/plain' })
  res.end('ok')
})

let x = 0
let y = 0

setInterval(() => {
  console.log(`${process.pid}:stdout:${x++}`)
  console.error(`${process.pid}:stderr:${y++}`)
}, 1000)

console.log(`${process.pid}:${x++}: Waiting ${DELAY} ms to listen on: ${PORT}`)

setTimeout(() => {
  console.log(`${process.pid}:${x++}: Listening on ${PORT}`)
  server.listen(PORT)
}, 8000)

setTimeout(() => {
  throw new Error('This should go to stderr')
}, 29000)
