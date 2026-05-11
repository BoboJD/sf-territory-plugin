# Salesforce Territory Lead Enable CLI Plugin

[![npm](https://img.shields.io/npm/v/sf-territory-plugin)](https://www.npmjs.com/package/sf-territory-plugin)
[![CI](https://github.com/BoboJD/sf-territory-plugin/actions/workflows/ci.yml/badge.svg)](https://github.com/BoboJD/sf-territory-plugin/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

## Overview

This Salesforce CLI plugin automates enabling Lead support in Enterprise Territory Management through UI automation. It navigates to the Territory Settings page and configures Lead-related options without requiring direct API access.

**Target Setup Page:** `/lightning/setup/Territory2Settings/home`

### Why Browser Automation?

Salesforce does not currently expose metadata or API support for this specific configuration, making UI automation the only reliable approach.

## Features

✅ **Salesforce CLI Integration** - Uses Salesforce CLI authentication and org management  
✅ **Headless Browser Automation** - Uses Playwright for reliable Lightning UI interaction  
✅ **Lead Support Configuration** - Enables Lead territory support and sets default access levels  
✅ **Dry-Run Support** - Preview changes without applying them  
✅ **Debug Mode** - Captures screenshots and verbose logging on failure  
✅ **Robust Selectors** - Fallback selector strategies for Lightning UI instability  
✅ **Error Recovery** - Retry logic with exponential backoff  
✅ **Production-Ready** - Type-safe, well-tested, clean architecture  

## Installation

```bash
# Install as a Salesforce CLI plugin
sf plugins install @salesforce/sf-territory-plugin

# Or install from source
npm install
npm run build
sf plugins link .
```

## Usage

### Basic Command

Enable Lead support with default ReadOnly access:

```bash
sf territory lead enable --target-org myOrg
```

### Set Custom Default Access

Enable with ReadWrite access:

```bash
sf territory lead enable --target-org myOrg --default-access ReadWrite
```

### Dry-Run Mode

Preview what changes would be made without applying them:

```bash
sf territory lead enable --target-org myOrg --dry-run
```

### Debug Mode

Run with debug logging and screenshots:

```bash
sf territory lead enable --target-org myOrg --debug
```

Screenshots are saved to the `screenshots/` directory.

### Headless / Non-Headless Mode

Show browser window during execution (useful for troubleshooting):

```bash
sf territory lead enable --target-org myOrg --no-headless
```

### Custom Timeout

Set browser timeout (in milliseconds):

```bash
sf territory lead enable --target-org myOrg --timeout 120000
```

## Command Reference

```bash
sf territory lead enable [FLAGS]
```

### Flags

| Flag | Short | Default | Description |
|------|-------|---------|-------------|
| `--target-org` | | required | Salesforce org alias or username |
| `--default-access` | `-a` | `ReadOnly` | Default Lead access level (`ReadOnly`, `ReadWrite`) |
| `--dry-run` | | `false` | Show changes without applying them |
| `--debug` | | `false` | Enable debug mode with screenshots |
| `--no-headless` | | `headless=true` | Show browser window |
| `--timeout` | `-t` | `60000` | Browser timeout in milliseconds |
| `--screenshots-dir` | | `screenshots` | Directory to save debug screenshots |

## Command Output

The command returns a JSON result with:

```typescript
{
  success: boolean;                          // Operation succeeded
  message: string;                           // Result message
  detectedState?: TerritorySettings;         // Current state before changes
  appliedChanges?: TerritorySettings;        // State after changes
  dryRun: boolean;                           // Was this a dry run?
  executionTimeMs?: number;                  // Total execution time
}
```

### Example Output (Success)

```
Enabling Lead support in Territory Management
Target Org: myOrg
Dry Run: false
Retrieving organization authentication...
Launching browser...
Navigating to Territory Settings page...
Detecting current Territory Settings state...
Current State: Leads Enabled=false, Access=None
Applying Territory Settings configuration...
Configuration completed
Territory Settings configured successfully
New State: Leads Enabled=true, Access=ReadOnly
Execution completed in 45230ms
```

## Architecture

### Project Structure

```
src/
├── commands/
│   └── territory/lead/
│       ├── enable.ts                  # Main CLI command
│       └── messages/
│           └── territory.lead.enable.json  # Help text & examples
├── browser/
│   ├── browserManager.ts              # Playwright lifecycle & navigation
│   └── lightningWait.ts               # Lightning UI loading detection
├── services/
│   └── territorySettingsService.ts    # Core automation logic
├── utils/
│   ├── salesforceAuth.ts              # Org authentication & frontdoor URL
│   ├── logger.ts                      # Winston logging
│   └── retry.ts                       # Retry logic & wait utilities
├── types/
│   └── territory.ts                   # TypeScript interfaces
└── index.ts                           # Plugin exports
```

### Key Components

#### 1. **Command Layer** (`src/commands/territory/lead/enable.ts`)
- Parses CLI flags
- Orchestrates the automation flow
- Handles error reporting and screenshots
- Returns JSON results

#### 2. **Salesforce Auth** (`src/utils/salesforceAuth.ts`)
- Retrieves org auth info using Salesforce CLI
- Builds frontdoor.jsp login URLs for session management
- Validates auth before browser launch

#### 3. **Browser Manager** (`src/browser/browserManager.ts`)
- Manages Playwright browser lifecycle
- Handles page navigation and timeout
- Captures screenshots for debugging
- Enables debugging with console logging

#### 4. **Lightning Wait Utils** (`src/browser/lightningWait.ts`)
- Waits for Lightning spinners to disappear
- Detects when Setup page is fully loaded
- Provides safe click and input helpers with retries
- Validates page location

#### 5. **Territory Settings Service** (`src/services/territorySettingsService.ts`)
- Detects current Lead configuration state
- Uses robust, multi-strategy selector approach
- Enables Lead support checkbox
- Configures default access levels
- Saves changes and verifies persistence

## Selector Strategy

The plugin implements a **multi-strategy fallback approach** for Lightning UI reliability:

### Strategy Layers

1. **Label-based selectors** (preferred)
   ```ts
   label:has-text("Enable Leads")
   label:has-text("Read Only")
   ```

2. **Aria-label selectors**
   ```ts
   input[aria-label*="Enable"][aria-label*="Lead"]
   ```

3. **Data-attribute selectors**
   ```ts
   input[data-testid="lead-enable-checkbox"]
   ```

4. **Role-based selectors**
   ```ts
   input[role="checkbox"]
   ```

### Why This Approach?

- **Avoids fragility** - Salesforce generates unstable CSS classes
- **Resilient to updates** - Uses semantic HTML attributes
- **Visible text priority** - Uses actual UI labels users see
- **Graceful fallbacks** - Tries multiple selectors before failing

## Error Handling

### Failure Scenarios

The plugin handles these common failures:

1. **Authentication expired** - Clear error message with next steps
2. **Browser launch fails** - Returns detailed system error
3. **Navigation timeout** - Screenshots show current browser state
4. **Selector not found** - Tries all fallback strategies
5. **Save fails** - Reports verification failure with current state

### Debug Information

When a failure occurs, the plugin:
- ✅ Takes a screenshot (saved with timestamp)
- ✅ Dumps current page HTML snippet
- ✅ Logs current URL
- ✅ Shows verbose error details
- ✅ Provides retry guidance

Enable debug mode for detailed logging:

```bash
sf territory lead enable --target-org myOrg --debug
```

## Development

### Setup

```bash
# Install dependencies
npm install

# Build TypeScript
npm run build

# Watch mode for development
npm run dev
```

### Testing

```bash
# Run tests
npm test

# Watch mode
npm test:watch

# Coverage report
npm test:coverage
```

### Linting & Formatting

```bash
# Check code style
npm run lint

# Fix linting issues
npm run lint:fix

# Format code
npm run format
```

## Technical Stack

- **TypeScript 5.3+** - Type-safe implementation
- **Playwright 1.40+** - Headless browser automation
- **@salesforce/sf-plugins-core** - CLI framework
- **@salesforce/core** - Salesforce APIs
- **Winston 3.11** - Structured logging
- **Jest 29** - Testing framework

## Known Limitations

### Salesforce Seasonal Releases

Salesforce releases can change:
- Label text
- DOM structure
- Lightning component structure
- Setting page location

**Mitigation:** Keep selectors flexible using text matching and aria-labels.

### Browser Execution Environment

Browser automation may fail:
- In CI/CD without display server
- Behind corporate proxies
- With strict browser sandbox restrictions
- In containerized environments

**Mitigation:** Use `--no-headless` for troubleshooting, check browser system dependencies.

### Authentication Limitations

frontdoor.jsp login may fail if:
- Session policies are strict
- IP locking is enabled
- MFA policies interfere
- Access tokens are revoked

**Mitigation:** Ensure org auth is recent (`sf auth list`), re-authenticate if needed.

### Lightning DOM Instability

Lightning components can have:
- Generated CSS classes (avoid these)
- Dynamic element ID
- Invisible elements in DOM
- Timing-dependent rendering

**Mitigation:** Plugin uses multi-strategy selectors and extensive wait logic.

## Troubleshooting

### "Could not find Enable Leads checkbox"

1. **Verify page loaded:**
   ```bash
   sf territory lead enable --target-org myOrg --debug --no-headless
   ```
   Watch the browser - is the page fully loaded?

2. **Check Salesforce version:**
   ```bash
   sf org display --target-org myOrg
   ```
   Territory 2 Settings may have changed in newer versions.

3. **Verify permissions:**
   - User must have "Customize Setup" permission
   - User must have access to Territory Management

4. **Increase timeout:**
   ```bash
   sf territory lead enable --target-org myOrg --timeout 120000
   ```

### "Failed to retrieve org auth info"

1. **Check org is authenticated:**
   ```bash
   sf auth list
   ```

2. **Re-authenticate:**
   ```bash
   sf auth web login --alias myOrg
   ```

3. **Verify username/alias:**
   ```bash
   sf territory lead enable --target-org correctAlias
   ```

### "Browser failed to launch"

1. **Check system dependencies:**
   ```bash
   # Linux: install required libraries
   sudo apt-get install libgtk-3-0 libgbm1 libxss1
   ```

2. **Run non-headless for debugging:**
   ```bash
   sf territory lead enable --target-org myOrg --no-headless
   ```

3. **Check for blocked ports:**
   Browser may need access to ephemeral ports.

### "Navigation timeout"

1. **Check org instance is accessible:**
   ```bash
   curl https://yourinstance.salesforce.com/lightning/setup/Territory2Settings/home
   ```

2. **Increase timeout:**
   ```bash
   sf territory lead enable --target-org myOrg --timeout 120000
   ```

3. **Check network connectivity:**
   Proxy/firewall may be blocking navigation.

## Contributing

Contributions are welcome! Please:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new features
5. Run linting and tests
6. Submit a pull request

## License

MIT
