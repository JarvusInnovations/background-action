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

## Upgrading from v1

`v1` keeps working and is unchanged. When you move to `v2`, four things behave differently:

- **Invalid option values now fail the step.** `tail`, `log-output`, `log-output-resume` and
  `log-output-if` used to match on substrings, so `log-output: no-stderr` quietly *enabled*
  stderr and a typo like `sdtout` quietly disabled logging. Values are now checked exactly.
  The same applies to `wait-for`, where `abc123` used to become a silent 123ms timeout.
- **Backgrounded processes are stopped during post-run.** They receive `SIGTERM`, get
  `shutdown-grace` to exit, and anything they print on the way down is captured. Set
  `shutdown: false` for the old behavior.
- **A backgrounded process that fails is reported immediately** instead of waiting for the
  readiness timeout.
- **Logs live under `RUNNER_TEMP`**, not the workspace, so they can no longer be picked up by
  an automated commit. Use the `stdout-log` / `stderr-log` outputs to reach them.

## Usage

### Example

```yaml
jobs:
  tests:
    runs-on: ubuntu-latest
    env:
      API_PORT: 1212
    steps:
      - uses: actions/checkout@v4
      - uses: JarvusInnovations/background-action@v2
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
          # Eliminates previously output stderr log entries from post-run output

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
| `wait-for`          | How long to wait for (default unit: `ms`)                            | See Durations below                              | `30s`           |
| `tail`              | Which outputs to tail while you wait                                 | `stderr,stdout,true,false`                      | `true`          |
| `log-output`        | Which outputs to log post-run (after the job)                        | `stderr,stdout,true,false`                      | `stdout,stderr` |
| `log-output-resume` | Which outputs should resume where tail left off (no duplicate lines) | `stderr,stdout,true,false`                      | `false`         |
| `log-output-if`     | Whether or not to log output                                         | `failure,exit-early,timeout,success,true,false` | `true`          |
| `working-directory` | Sets the working directory (cwd) for the shell running commands      |                                                 |                 |
| `shutdown`          | Stop backgrounded processes during post-run and capture their shutdown output | `true,false`                           | `true`          |
| `shutdown-grace`    | How long to wait for a clean shutdown before forcing it              | See Durations below                              | `10s`           |

Each of `tail`, `log-output`, `log-output-resume` and `log-output-if` accepts a comma or space
separated list of the values above. Anything else fails the step rather than silently disabling
logging.

### Durations

`wait-for` and `shutdown-grace` accept an amount followed by a unit. A bare number is
milliseconds, and units may be written either way:

| Unit         | Spellings                                    | Example  |
|--------------|----------------------------------------------|----------|
| milliseconds | `ms`, `msec(s)`, `millisecond(s)`            | `500ms`  |
| seconds      | `s`, `sec(s)`, `second(s)`                   | `30s`    |
| minutes      | `m`, `min(s)`, `minute(s)`                   | `10 minutes` |
| hours        | `h`, `hr(s)`, `hour(s)`                      | `2h`     |
| days         | `d`, `day(s)`                                | `1d`     |
| weeks        | `w`, `week(s)`                               | `1w`     |

Amounts may be fractional (`1.5h`) and units may be combined (`1h30m45s`).

### Outputs

| Output       | Description                                             |
|--------------|---------------------------------------------------------|
| `stdout-log` | Path to the file capturing stdout from the run          |
| `stderr-log` | Path to the file capturing stderr from the run          |

Logs are written under `RUNNER_TEMP` so they never land in your repository. To keep them after
the job, or to hand them to a later job, upload them as an artifact:

```yaml
      - uses: JarvusInnovations/background-action@v2
        id: sut
        with:
          run: npm start &
          wait-on: http://localhost:3000

      - uses: actions/upload-artifact@v7
        if: always()
        with:
          name: system-under-test-logs
          path: |
            ${{ steps.sut.outputs.stdout-log }}
            ${{ steps.sut.outputs.stderr-log }}
```

### wait-on

`background-action` leverages the handy [wait-on](https://www.npmjs.com/package/wait-on) package to control flow. You can pass any number of resources in the `wait-on` configuration parameter separated by commas or newlines. For advanced use cases, such as: client-side SSL certs, authorization, proxy configuration and/or custom http headers you can provide a JSON serialized configuration object that matches [wait-on's node.js api usage](https://www.npmjs.com/package/wait-on#nodejs-api-usage).

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
