// With GITHUB_STATE unset, core.saveState writes `::save-state name=NAME::VALUE` lines to stdout.
// Stream chunks do not align to line boundaries and a single chunk can carry several states, so
// buffer the whole stream and scan every line. Reading one line per chunk silently loses states
// whenever two are written close together -- which is exactly what happens when a run fails fast.
function collect(stream) {
    let output = ''
    stream.on('data', (data) => { output += data.toString() })
    return () => output
}

function apply(output, env) {
    output.split('\n').forEach(line => {
        const match = line.match(/^::save-state name=(.+?)::(.*)$/)
        if (match) env[`STATE_${match[1]}`] = match[2]
    })
}

module.exports = { collect, apply }
