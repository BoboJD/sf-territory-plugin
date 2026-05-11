# Developer Guide

This guide explains the architecture and how to extend the Salesforce Territory Lead Enable plugin.

## Project Structure Deep Dive

```
messages/
└── territory.lead.enable.json         # Help text and examples

src/
├── commands/territory/lead/
│   └── enable.ts                      # CLI command entry point
├── browser/
│   ├── browserManager.ts              # Playwright lifecycle management
│   └── lightningWait.ts               # Lightning UI detection utilities
├── services/
│   └── territorySettingsService.ts    # Core domain logic
├── utils/
│   ├── salesforceAuth.ts              # Salesforce auth & session handling
│   ├── logger.ts                      # Winston logging configuration
│   └── retry.ts                       # Retry and wait helpers
├── types/
│   └── territory.ts                   # TypeScript interfaces
└── index.ts                           # Plugin exports
```

## Development Workflow

### Setup Development Environment

```bash
# Install dependencies
npm install

# Build TypeScript
npm run build

# Link plugin locally for testing
sf plugins link .

# Test the command
sf territory lead enable --target-org test-org --dry-run
```

### Watch Mode Development

```bash
# In one terminal, watch TypeScript compilation
npm run dev

# In another terminal, test changes
sf territory lead enable --target-org test-org --debug
```

## Key Architectural Layers

### 1. Command Layer

**File:** `src/commands/territory/lead/enable.ts`

This is the CLI entry point. It:
- Parses command-line flags
- Validates inputs
- Orchestrates the workflow
- Handles errors and cleanup
- Returns results to the CLI

```typescript
export default class TerritoryLeadEnable extends SfCommand<PluginCommandResult> {
  // Flags define CLI interface
  public static readonly flags = {
    'target-org': Flags.requiredOrg(),
    'default-access': Flags.string({...}),
    // ...
  };

  // run() is the entry point
  public async run(): Promise<PluginCommandResult> {
    // Implementation
  }
}
```

**Key Responsibilities:**
- Flag validation
- Org authentication
- Browser launch
- Service orchestration
- Error handling
- Result formatting

### 2. Browser Automation Layer

**Files:** `src/browser/browserManager.ts`, `src/browser/lightningWait.ts`

These manage browser lifecycle and Lightning-specific waiting logic.

**BrowserManager:**
- Launches Playwright
- Creates pages
- Handles navigation
- Captures screenshots
- Manages cleanup

```typescript
const browser = new BrowserManager(config);
const page = await browser.launch();
await browser.goto(url);
await browser.screenshot('myfile');
await browser.close();
```

**LightningWait:**
- Detects Lightning spinners
- Validates page readiness
- Provides safe click/input helpers
- Implements retry logic

```typescript
await waitForLightningLoadingComplete(page);
await waitForSetupPageReady(page);
await safeClick(page, selector);
```

### 3. Domain Logic Layer

**File:** `src/services/territorySettingsService.ts`

Core automation logic. Independent of CLI or UI frameworks.

```typescript
const service = new TerritorySettingsService(page, debug);

// Detect current state
const currentState = await service.detectCurrentState();

// Configure
await service.enableLeadSupport();
await service.setDefaultLeadAccess('ReadOnly');
await service.saveConfiguration();

// Verify
const verified = await service.verifyChanges(expectedState);
```

**Key Methods:**
- `detectCurrentState()` - Read current settings
- `enableLeadSupport()` - Check the Enable Leads checkbox
- `setDefaultLeadAccess()` - Select access level
- `saveConfiguration()` - Click Save button
- `verifyChanges()` - Confirm persistence
- `configureTerritorySettings()` - Full flow

### 4. Utilities Layer

**Auth Utilities** (`src/utils/salesforceAuth.ts`):
```typescript
const authInfo = await getOrgAuthInfo('myOrg');
const loginUrl = buildFrontdoorUrl(
  authInfo.instanceUrl,
  authInfo.accessToken,
  '/lightning/setup/Territory2Settings/home'
);
validateAuthInfo(authInfo);
```

**Retry Utilities** (`src/utils/retry.ts`):
```typescript
await retry(
  async () => { /* operation */ },
  { maxAttempts: 3, initialDelayMs: 500 }
);

await waitFor(
  async () => condition,
  { timeoutMs: 10000, intervalMs: 500 }
);
```

**Logger** (`src/utils/logger.ts`):
```typescript
import logger from '../utils/logger';

logger.info('Message', { context: 'data' });
logger.error('Error message', { error: err.message });
logger.debug('Debug info');
```

## Selector Strategy

### Understanding the Selector Hierarchy

The plugin uses **multi-strategy selectors** to handle Lightning fragility:

```typescript
// In TerritorySettingsService
const selectors = [
  // Strategy 1: Label-based (most reliable)
  'label:has-text("Enable Leads") input',
  
  // Strategy 2: Aria-label (semantic)
  'input[aria-label*="Enable"][aria-label*="Lead"]',
  
  // Strategy 3: Data attributes (explicit)
  'input[data-testid="lead-enable-checkbox"]',
  
  // Strategy 4: Role-based (fallback)
  'input[role="checkbox"]',
];

for (const selector of selectors) {
  try {
    const isVisible = await page.isVisible(selector);
    if (isVisible) {
      // Use this selector
      break;
    }
  } catch (error) {
    // Try next selector
  }
}
```

### Adding New Selectors

When updating for Salesforce releases:

1. **Inspect the element** in browser DevTools
2. **Prefer semantic attributes:**
   - `aria-label`
   - `data-testid`
   - `role`
   - Visible text
3. **Avoid dynamic CSS classes**
4. **Add new selector as fallback** in the strategy array

Example - if "Enable Leads" checkbox changes:

```typescript
private async isLeadEnabledCheckboxChecked(): Promise<boolean> {
  const selectors = [
    // Old selector
    'input[type="checkbox"]:has(+ label:has-text("Enable Leads"))',
    
    // New selector (if label changes)
    'input[type="checkbox"]:has(+ label:has-text("Enable Lead Support"))',
    
    // Fallback to data attribute
    'input[data-testid="enable-lead-checkbox"]',
  ];
  
  // ... rest of logic
}
```

## Adding New Features

### Example: Add Territory Type Configuration

**1. Update Types** (`src/types/territory.ts`):

```typescript
export interface TerritorySettings {
  isLeadEnabled: boolean;
  defaultLeadAccess: 'ReadOnly' | 'ReadWrite';
  allowAccountTerritories: boolean;  // NEW
  maxTerritoryDepth: number;         // NEW
}
```

**2. Add Service Methods** (`src/services/territorySettingsService.ts`):

```typescript
async setAllowAccountTerritories(allow: boolean): Promise<void> {
  // Find checkbox
  const selector = 'label:has-text("Allow Account Territories")';
  
  // Click if needed
  const isChecked = await this.page.isChecked(selector);
  if (isChecked !== allow) {
    await safeClick(this.page, selector);
  }
}

async setMaxTerritoryDepth(depth: number): Promise<void> {
  const selector = 'input[aria-label="Max Territory Depth"]';
  await safeSetValue(this.page, selector, depth.toString());
}
```

**3. Update Command** (`src/commands/territory/lead/enable.ts`):

```typescript
public static readonly flags = {
  // ... existing flags
  'allow-account-territories': Flags.boolean({
    default: false,
    description: 'Allow account territories',
  }),
  'max-territory-depth': Flags.integer({
    description: 'Maximum territory depth',
    default: 5,
  }),
};

// In run():
const service = new TerritorySettingsService(page, flags.debug);

if (flags['allow-account-territories']) {
  await service.setAllowAccountTerritories(true);
}

if (flags['max-territory-depth']) {
  await service.setMaxTerritoryDepth(flags['max-territory-depth']);
}
```

### Example: Add New Command

**File:** `src/commands/territory/settings/display.ts`

```typescript
import { SfCommand, Flags } from '@salesforce/sf-plugins-core';
import { TerritorySettingsService } from '../../services/territorySettingsService';
import { BrowserManager } from '../../browser/browserManager';

export default class TerritorySettingsDisplay extends SfCommand<any> {
  public static readonly summary = 'Display Territory Settings';

  public static readonly flags = {
    'target-org': Flags.requiredOrg(),
  };

  public async run(): Promise<any> {
    const { flags } = await this.parse(TerritorySettingsDisplay);
    
    // Setup browser & service
    const browserManager = new BrowserManager({...});
    const page = await browserManager.launch();
    
    const service = new TerritorySettingsService(page);
    const state = await service.detectCurrentState();
    
    // Display results
    this.logJson(state);
    
    await browserManager.close();
  }
}
```

## Testing

### Unit Testing Service

```typescript
import { TerritorySettingsService } from '../src/services/territorySettingsService';

describe('TerritorySettingsService', () => {
  let service: TerritorySettingsService;
  let mockPage: any;

  beforeEach(() => {
    // Mock Playwright Page
    mockPage = {
      isVisible: jest.fn(),
      isChecked: jest.fn(),
      click: jest.fn(),
      // ... more mocks
    };

    service = new TerritorySettingsService(mockPage);
  });

  it('should detect enabled leads', async () => {
    mockPage.isChecked.mockResolvedValue(true);
    
    const state = await service.detectCurrentState();
    
    expect(state.isLeadEnabled).toBe(true);
  });
});
```

### Integration Testing

```bash
# Create test org
sf org create scratch --alias test-org --definition-file config/project-scratch-org-def.json

# Run plugin
sf territory lead enable --target-org test-org

# Verify in UI
sf org open --target-org test-org
```

## Error Handling Best Practices

### Pattern: Try Multiple Selectors

```typescript
async findElement(selector: string): Promise<string> {
  const alternatives = [
    selector,
    selector.replace('label', 'span'),
    selector.replace('input[type="checkbox"]', 'input'),
  ];

  for (const alt of alternatives) {
    try {
      if (await this.page.isVisible(alt)) {
        return alt;
      }
    } catch (error) {
      logger.debug('Selector not found', { selector: alt });
    }
  }

  throw new Error(`No selector matched: ${selector}`);
}
```

### Pattern: Retry with Logging

```typescript
async clickWithRetry(selector: string): Promise<void> {
  await retry(
    async () => {
      await this.page.click(selector);
    },
    {
      maxAttempts: 3,
      initialDelayMs: 500,
      onRetry: (attempt, error) => {
        logger.warn(`Click retry ${attempt}`, { selector, error: error.message });
      },
    }
  );
}
```

### Pattern: Debug on Failure

```typescript
async executeWithDebug(fn: () => Promise<void>): Promise<void> {
  try {
    await fn();
  } catch (error) {
    logger.error('Operation failed', { error });
    
    if (this.debug) {
      await browserManager.screenshot('failure');
      const html = await this.page.content();
      logger.debug('Page HTML', { html: html.substring(0, 1000) });
    }
    
    throw error;
  }
}
```

## Performance Optimization

### Parallel Operations

```typescript
// Instead of sequential waits
await waitForLightningLoadingComplete(page);
await waitForSetupPageReady(page);

// Could use Promise.all if they're independent:
// await Promise.all([
//   waitForLightningLoadingComplete(page),
//   checkPageStructure(page),
// ]);
```

### Caching

```typescript
class TerritorySettingsService {
  private cachedState: TerritorySettings | null = null;

  async detectCurrentState(useCache: boolean = true): Promise<TerritorySettings> {
    if (useCache && this.cachedState) {
      return this.cachedState;
    }

    const state = { /* detect */ };
    this.cachedState = state;
    return state;
  }

  invalidateCache(): void {
    this.cachedState = null;
  }
}
```

## Debugging Tips

### Enable All Logging

```bash
LOG_LEVEL=debug sf territory lead enable --target-org test --debug
```

### Watch Browser During Execution

```bash
sf territory lead enable --target-org test --no-headless --debug
```

### Inspect Error Screenshots

```bash
ls -lhS screenshots/ | head -5
```

### Get Browser Console Output

```bash
LOG_LEVEL=debug sf territory lead enable --target-org test 2>&1 | grep "Browser Console"
```

### Check Playwright Traces

```typescript
// Add to browserManager.ts
await context.tracing.start({ screenshots: true, snapshots: true });
// ... operations ...
await context.tracing.stop({ path: 'trace.zip' });
```

## Building and Publishing

### Build for Distribution

```bash
npm run build
npm run test
npm run lint
```

### Create Release

```bash
# Update version in package.json
npm version patch  # or minor, major

# Tag release
git tag v1.0.0
git push --tags

# Publish to npm
npm publish
```

## Maintenance

### Salesforce Release Process

When Salesforce releases a new version:

1. **Check Territory Settings page** in new version
2. **Update selectors** if DOM changed
3. **Run tests** against new instance
4. **Update KNOWN_LIMITATIONS.md**
5. **Release new plugin version**

### Selector Update Checklist

- [ ] Verify current selectors work
- [ ] Check for new Lightning components
- [ ] Add fallback selectors if needed
- [ ] Test in debug mode
- [ ] Update documentation
- [ ] Add comment explaining change

## Contributing

When contributing:

1. Follow TypeScript strict mode
2. Add JSDoc comments
3. Include error handling
4. Add unit tests
5. Test with multiple Salesforce orgs
6. Update README if adding features
7. Submit PR with description

## Useful Resources

- [Playwright Documentation](https://playwright.dev)
- [Salesforce CLI Plugins Guide](https://developer.salesforce.com/docs/atlas.en-us.sfdx_cli_plugins.meta/sfdx_cli_plugins/)
- [Salesforce Setup UI Documentation](https://developer.salesforce.com/docs/)
- [Winston Logger](https://github.com/winstonjs/winston)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)