# background-action

Run commands in the background with logging and failure detection. `background-action` will send your processes to the background once a set of files, ports, sockets or http resources are available. It can optionally tail output until ready/timeout and/or log output stderr/stdout post-run.

## Purpose

Use background-action to bootstrap your system under test to eliminate workflow timeouts, race conditions, and test suite failures when the system fails to start. Specify the resources (http, file, tcp, socket) to `wait-on` and how long to `wait-for` before continuing to the next step. `tail` stdout/stderr while you wait and/or `log-output` post-run conditionally using `log-output-if`.

**What can happen when a system under test running in the background fails to start?**

- No indication of the cause of failure
- Costly workflow timeouts
- Spurious test failures
- Lost log output

`background-action` addresses these issues directly and was purpose-built to bootstrap your system under test in a discrete step to isolate failures at the source. We hope that it saves you and your team time and reduces frustration in these trying times.

**Crafted with ❤️ by [Jarvus Innovations](https://jarv.us) in Philadelphia**

## Usage

### Example

```yaml
jobs:
  tests:
    runs-on: ubuntu-latest
    env:
      API_PORT: 1212
    steps:
      - uses: actions/checkout@v2
      - uses: JarvusInnovations/background-action@v1
        name: Bootstrap System Under Test (SUT)
        with:
          run: |
            npm install
            PORT=$API_PORT node test/server.js &
            PORT=2121 node test/server.js &
            PORT=3232 node test/server.js &
          # your step-level and job-level environment variables are available to your commands as-is
          # npm install will count towards the wait-for timeout
          # whenever possible, move unrelated scripts to a different step
          # to background multiple processes: add & to the end of the command

          wait-on: |
            http://localhost:${{ env.API_PORT }}
            http-get://localhost:2121
            tcp:localhost:3232
            file://very-important-secrets.txt
          # IMPORTANT: to use environment variables in wait-on, you must use this form: ${{ env.VAR }}
          # See wait-on section below for all resource types and prefixes

          tail: true # true = stderr,stdout
          # This will allow you to monitor the progress live

          log-output-resume: stderr
          # Eliminates previosuly output stderr log entries from post-run output

          wait-for: 5m

          log-output: stderr,stdout # same as true

          log-output-if: failure
          # failure = exit-early or timeout

          working-directory: backend
          # sets the working directory (cwd) for the shell running commands

    - name: Tests that require the resources defined above to run
      run: npm test
```

### Configuration

| Parameter           | Description                                                          | Allowed Values                                  | Default         |
|---------------------|----------------------------------------------------------------------|-------------------------------------------------|-----------------|
| `run`               | Commands to run, supports multiple lines                             |                                                 |                 |
| `wait-on`           | What resources to wait for: `http\|tcp\|file\|socket\|unix://`       | See `wait-on` below                             |                 |
| `wait-for`          | How long to wait for (default unit: `ms`)                            | `#ms, #s/sec, #m/min, #h/hr`                    | `5m`            |
| `tail`              | Which outputs to tail while you wait                                 | `stderr,stdout,true,false`                      | `stderr,stdout` |
| `log-output`        | Which outputs to log post-run (after the job)                        | `stderr,stdout,true,false`                      | `stderr,stdout` |
| `log-output-resume` | Which outputs should resume where tail left off (no duplicate lines) | `stderr,stdout,true,false`                      | `stderr,stdout` |
| `log-output-if`     | Whether or not to log output                                         | `failure,exit-early,timeout,success,true,false` |                 |
| `working-directory` | Sets the working directory (cwd) for the shell running commands      |                                                 |                 |

### wait-on

`background-action` leverages the handy [wait-on](https://www.npmjs.com/package/wait-on) package to control flow. You can pass any number of resources in the `wait-on` configuration parameter seperated by commas or newlines. For advanced use cases, such as: client-side SSL certs, authorization, proxy configuration and/or custom http headers you can provide a JSON serialized configuration object that matches [wait-on's node.js api usage](https://www.npmjs.com/package/wait-on#nodejs-api-usage).

#### Resource Types

| Prefix             | Description                      | Example                                  |
|--------------------|----------------------------------|------------------------------------------|
| `file:`            | Regular file (also default type) | `file:/path/to/file`                     |
| `http:`            | HTTP HEAD returns 2XX response   | `http://m.com:90/foo`                    |
| `https:`           | HTTPS HEAD returns 2XX response  | `https://my/bar`                         |
| `http-get:`        | HTTP GET returns 2XX response    | `http://m.com:90/foo`                    |
| `https-get:`       | HTTPS GET returns 2XX response   | `https://my/bar`                         |
| `tcp:`             | TCP port is listening            | `1.2.3.4:9000 or foo.com:700`            |
| `socket:`          | Domain Socket is listening       | `socket:/path/to/sock`                   |
| `http://unix:`     | http: over socket                | `http://unix:SOCK_PATH:URL_PATH`         |
| `http-get://unix:` | http-get: over socket            | `http-get://unix:/path/to/sock:/foo/bar` |

See the [actions tab](https://github.com/JarvusInnovations/background-action/actions) for runs of this action! :rocket:
