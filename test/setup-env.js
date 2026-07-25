const fs = require('fs')
const os = require('os')
const path = require('path')

// Without RUNNER_TEMP the action falls back to the workspace, so running the suite scatters
// <pid>.out/.err files through the repository. They are gitignored, which makes them easy to
// miss -- and ncc bundles whatever it finds, so a stale one ends up inside dist/ and breaks
// the dist check. Give every worker its own temp directory instead.
process.env.RUNNER_TEMP = fs.mkdtempSync(path.join(os.tmpdir(), 'background-action-test-'))
