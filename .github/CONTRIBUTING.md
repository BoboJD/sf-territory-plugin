# Contributing

## Prerequisites

- Node.js >= 18
- Salesforce CLI (`sf`)
- A scratch org or sandbox with Enterprise Territory Management enabled

## Setup

```bash
git clone https://github.com/<your-username>/sf-territory-plugin-baseline.git
cd sf-territory-plugin-baseline
npm install
npm run build
sf plugins link .
```

## Development workflow

```bash
npm run dev       # watch mode — recompiles on save
npm test          # unit tests
npm run lint:fix  # auto-fix lint issues
```

## Before submitting a PR

- `npm run build` passes without errors
- `npm test` passes
- `npm run lint` reports no errors
- If you changed selector logic, test against a real org with `--debug --no-headless`

## Selector changes

Salesforce Lightning Setup renders form content inside a sub-iframe on `salesforce-setup.com`. Read [docs/SELECTOR_STRATEGY.md](docs/SELECTOR_STRATEGY.md) before touching any locator code — there are non-obvious constraints around LWC shadow DOM and Playwright timeout semantics.

## Reporting bugs

Please include:
- Salesforce org edition and locale
- Full command output with `--debug` flag
- Screenshots from the `screenshots/` directory (created automatically on failure)
