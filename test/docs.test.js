const fs = require('fs')
const path = require('path')

// action.yml is the contract the runner enforces; a README that disagrees sends people to
// values that do not behave as written
function declaredDefaults() {
    const actionYml = fs.readFileSync(path.join(__dirname, '..', 'action.yml'), 'utf-8')
    const inputs = actionYml.split(/^outputs:/m)[0].split(/^inputs:/m)[1] || ''
    const defaults = {}
    let current = null

    inputs.split('\n').forEach(line => {
        const input = line.match(/^ {2}([a-z0-9-]+):\s*$/)
        if (input) current = input[1]

        const value = line.match(/^ {4}default:\s*(.+?)\s*$/)
        if (value && current) defaults[current] = value[1].replace(/^['"]|['"]$/g, '')
    })

    return defaults
}

function documentedDefaults() {
    const readme = fs.readFileSync(path.join(__dirname, '..', 'README.md'), 'utf-8')
    const documented = {}

    readme.split('\n').forEach(line => {
        const row = line.match(/^\|\s*`([a-z0-9-]+)`\s*\|(.*)\|\s*$/)
        if (!row) return

        const columns = row[2].split('|')
        const last = (columns[columns.length - 1] || '').trim()
        documented[row[1]] = last.replace(/`/g, '').trim()
    })

    return documented
}

test('README documents the same defaults action.yml declares', () => {
    const declared = declaredDefaults()
    const documented = documentedDefaults()

    Object.keys(declared).forEach(input => {
        if (documented[input] === undefined) return // not every input has a table row
        expect({ input, default: documented[input] }).toEqual({ input, default: declared[input] })
    })
})
