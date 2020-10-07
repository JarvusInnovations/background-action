const http = require('http')

const PORT = process.env.PORT || 3000
const DELAY = process.env.DELAY || 5000
const STDOUT = process.env.STDOUT ? (process.env.STDOUT == 1) : true
const STDERR = process.env.STDERR ? (process.env.STDERR == 1) : true

const server = http.createServer((req, res) => {
  res.setHeader('Content-Type', 'text/html')
  res.setHeader('X-Foo', 'bar')
  res.writeHead(200, { 'Content-Type': 'text/plain' })
  res.end('ok')
})

let x = 0
let y = 0

setInterval(() => {
  STDOUT && console.log(`${process.pid}:stdout:${x++}`)
  STDERR && console.error(`${process.pid}:stderr:${y++}`)
  if (x === 15) throw new Error(`${process.pid}:${y}`)
}, 1000)

STDOUT && console.log(`${process.pid}:stdout:${x++}: Waiting ${DELAY} ms to listen on: ${PORT}`)

setTimeout(() => {
  STDOUT && console.log(`${process.pid}:stdout:${x++}: Listening on ${PORT}`)
  server.listen(PORT)
}, DELAY)

