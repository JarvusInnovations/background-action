const net = require('net')

function listen() {
    return new Promise((resolve, reject) => {
        const server = net.createServer()
        server.on('error', reject)
        server.listen(0, '127.0.0.1', () => resolve(server))
    })
}

function close(server) {
    return new Promise(resolve => server.close(resolve))
}

// Bind port 0 once per requested port and release them together, so callers get ports the OS
// just confirmed were free and never the same port twice. Fixed ports collide with whatever
// happens to be listening on a developer machine or a runner image.
module.exports = async function freePorts(count) {
    const servers = []

    for (let i = 0; i < count; i++) servers.push(await listen())

    const ports = servers.map(server => server.address().port)
    await Promise.all(servers.map(close))

    return ports
}
