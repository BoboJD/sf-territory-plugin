# Quick Start

## Prerequisites

- Node.js >= 18
- Salesforce CLI (`sf`) installed
- An authenticated Salesforce org with Enterprise Territory Management enabled

## Setup

```bash
npm install
npm run build
sf plugins link .
```

## Run

```bash
# Enable Lead support (ReadOnly access by default)
sf territory lead enable --target-org <alias>

# Enable with ReadWrite access
sf territory lead enable --target-org <alias> --default-access ReadWrite

# Dry run — see what would change without applying it
sf territory lead enable --target-org <alias> --dry-run

# Show browser window (useful for debugging)
sf territory lead enable --target-org <alias> --no-headless --debug
```

## Flags

| Flag | Default | Description |
| ---- | ------- | ----------- |
| `--target-org` | required | Org alias or username |
| `--default-access` | `ReadOnly` | `ReadOnly` or `ReadWrite` |
| `--dry-run` | false | Preview changes only |
| `--debug` | false | Verbose logs + screenshots on error |
| `--headless` | true | Run browser headless (`--no-headless` to show window) |
| `--timeout` | 60000 | Browser timeout in ms |
| `--screenshots-dir` | `screenshots` | Directory for debug screenshots |
| `--quiet` / `-q` | false | Suppress all progress output (for scripts) |

## Development

```bash
npm run dev      # watch mode (auto-rebuild on save)
npm test         # run unit tests
npm run lint     # lint
npm run lint:fix # auto-fix lint issues
```

See [DEVELOPER_GUIDE.md](DEVELOPER_GUIDE.md) for architecture details and [USAGE_EXAMPLES.md](USAGE_EXAMPLES.md) for CI/CD integration examples.
