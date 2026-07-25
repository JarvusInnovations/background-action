const js = require('@eslint/js')
const globals = require('globals')

module.exports = [
    {
        // the built bundle is generated, and linting 1.5MB of webpack output is pure noise
        ignores: ['dist/**']
    },
    js.configs.recommended,
    {
        languageOptions: {
            ecmaVersion: 2022,
            sourceType: 'commonjs',
            globals: {
                ...globals.node,
                ...globals.jest
            }
        }
    }
]
