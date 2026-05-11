# Usage Examples

This document contains practical examples of using the Territory Lead Enable plugin in various scenarios.

## Basic Usage

### Enable Leads with Default Settings

```bash
sf territory lead enable --target-org production
```

Expected output:
```
Enabling Lead support in Territory Management
Target Org: production
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

### Enable Leads with ReadWrite Access

```bash
sf territory lead enable --target-org production --default-access ReadWrite
```

This allows Leads to have read/write access in territories.

### Use a Different Target Org

```bash
sf territory lead enable --target-org development
sf territory lead enable --target-org staging
sf territory lead enable --target-org myalias
```

## Advanced Usage

### Dry-Run Mode (Preview Changes)

Preview what would happen without making changes:

```bash
sf territory lead enable --target-org production --dry-run
```

Output will show:
```
[DRY RUN] Would enable Leads with ReadOnly access
```

This is useful for:
- Validating the command will work
- Checking current settings before automation
- Testing in non-prod environments first

### Debug Mode (Troubleshooting)

Enable full debug logging with screenshots:

```bash
sf territory lead enable --target-org production --debug
```

This will:
- Print detailed logs to console
- Save screenshots on each step
- Show console output from browser
- Display page errors
- Save error screenshots automatically

Check `screenshots/` directory for captured images.

### Headless vs. Non-Headless

**Headless (default - no window):**
```bash
sf territory lead enable --target-org production
# or explicitly
sf territory lead enable --target-org production --headless
```

**Non-Headless (show browser window):**
```bash
sf territory lead enable --target-org production --no-headless
```

Use `--no-headless` for:
- Visual troubleshooting
- Watching the automation
- Debugging selector issues
- Verifying page state

### Increase Browser Timeout

For slower networks or busy orgs:

```bash
# 2 minutes (120000ms)
sf territory lead enable --target-org production --timeout 120000

# 5 minutes (300000ms)
sf territory lead enable --target-org production --timeout 300000
```

### Custom Screenshots Directory

```bash
sf territory lead enable --target-org production --screenshots-dir ./debug-screenshots
```

## Scripting & Automation

### Bash Script - Multiple Orgs

Enable Leads across multiple orgs:

```bash
#!/bin/bash

ORGS=("org1" "org2" "org3")

for org in "${ORGS[@]}"; do
  echo "Processing $org..."
  sf territory lead enable --target-org "$org" --default-access ReadOnly
  
  if [ $? -eq 0 ]; then
    echo "✓ Successfully configured $org"
  else
    echo "✗ Failed to configure $org"
  fi
done
```

### Bash Script - Dry-Run Then Apply

First dry-run to verify, then apply:

```bash
#!/bin/bash

ORG="production"

echo "Step 1: Dry run..."
sf territory lead enable --target-org "$ORG" --dry-run

echo ""
read -p "Proceed with actual configuration? (y/n) " -n 1 -r
echo

if [[ $REPLY =~ ^[Yy]$ ]]; then
  echo "Step 2: Applying configuration..."
  sf territory lead enable --target-org "$ORG"
else
  echo "Aborted."
  exit 1
fi
```

### JSON Output Parsing

The command returns JSON - use jq to parse:

```bash
# Get just the success status
sf territory lead enable --target-org production | jq '.success'

# Get the message
sf territory lead enable --target-org production | jq '.message'

# Get detected state before changes
sf territory lead enable --target-org production | jq '.detectedState'

# Get applied changes
sf territory lead enable --target-org production | jq '.appliedChanges'

# Get execution time
sf territory lead enable --target-org production | jq '.executionTimeMs'
```

### Conditional Execution

```bash
if sf territory lead enable --target-org production &>/dev/null; then
  echo "Configuration successful"
else
  echo "Configuration failed - check logs"
  exit 1
fi
```

## CI/CD Integration

### GitHub Actions

```yaml
name: Territory Configuration

on:
  workflow_dispatch:
    inputs:
      org:
        description: 'Target org'
        required: true
        default: 'production'

jobs:
  configure:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install Salesforce CLI
        run: npm install -g @salesforce/cli
      
      - name: Authenticate to Salesforce
        env:
          SFDX_AUTH_URL: ${{ secrets.SFDX_AUTH_URL }}
        run: sf auth store sfdxauthurl --sfdx-auth-url $SFDX_AUTH_URL --alias ${{ github.event.inputs.org }}
      
      - name: Configure Territory Lead Support
        run: sf territory lead enable --target-org ${{ github.event.inputs.org }}
```

### GitLab CI

```yaml
configure-territory:
  stage: deploy
  image: node:18
  script:
    - npm install -g @salesforce/cli
    - echo "$SFDX_AUTH_URL" > sfdx_auth.txt
    - sf auth store sfdxauthurl --sfdx-auth-url-file sfdx_auth.txt --alias production
    - sf territory lead enable --target-org production --default-access ReadWrite
  only:
    - main
```

## Troubleshooting Examples

### Debug a Failed Configuration

1. **Get detailed logs:**
   ```bash
   sf territory lead enable --target-org production --debug
   ```

2. **Watch the browser:**
   ```bash
   sf territory lead enable --target-org production --no-headless --debug
   ```

3. **Check screenshots:**
   ```bash
   ls -la screenshots/
   ```

4. **Increase timeout:**
   ```bash
   sf territory lead enable --target-org production --timeout 120000 --debug
   ```

### Verify Org Authentication

```bash
# List authenticated orgs
sf auth list

# Test org connection
sf org list

# Re-authenticate if needed
sf auth web login --alias production
```

### Test Against Sandbox

First test in a sandbox:

```bash
# 1. Dry run in sandbox
sf territory lead enable --target-org dev --dry-run

# 2. Actually run in sandbox
sf territory lead enable --target-org dev

# 3. If successful, test in staging
sf territory lead enable --target-org staging

# 4. Finally deploy to production
sf territory lead enable --target-org production
```

## Performance Optimization

### Batch Operations with Timeout Management

```bash
#!/bin/bash

ORGS=("org1" "org2" "org3")
TIMEOUT=120000  # 2 minutes

for org in "${ORGS[@]}"; do
  echo "Configuring $org (timeout: ${TIMEOUT}ms)..."
  
  # Add longer timeout for batch operations
  sf territory lead enable \
    --target-org "$org" \
    --default-access ReadOnly \
    --timeout "$TIMEOUT"
  
  # Brief pause between operations
  sleep 5
done
```

## Rollback Strategy

Since the plugin only enables features, there's no direct rollback. However:

### Manual Verification

```bash
# Run dry-run to verify current state
sf territory lead enable --target-org production --dry-run

# Review output to see if already configured
```

### Manual Rollback (if needed)

If you need to disable Leads:
1. Go to Setup > Territory Settings manually
2. Uncheck "Enable Leads"
3. Save

Then re-run the plugin to re-enable if needed.

## Advanced Scripting

### Status Tracking

```bash
#!/bin/bash

ORGS=("org1" "org2" "org3")
LOG_FILE="territory_config.log"

> "$LOG_FILE"  # Clear log

for org in "${ORGS[@]}"; do
  TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')
  
  echo "[$TIMESTAMP] Processing $org..." | tee -a "$LOG_FILE"
  
  if sf territory lead enable --target-org "$org" >> "$LOG_FILE" 2>&1; then
    echo "[$TIMESTAMP] ✓ $org configured successfully" | tee -a "$LOG_FILE"
  else
    echo "[$TIMESTAMP] ✗ $org configuration failed" | tee -a "$LOG_FILE"
  fi
done

echo ""
echo "Summary:"
echo "Total: ${#ORGS[@]}"
echo "Check $LOG_FILE for details"
```

### Retry on Failure

```bash
#!/bin/bash

ORG="production"
MAX_RETRIES=3
RETRY_DELAY=10

for ((i=1; i<=MAX_RETRIES; i++)); do
  echo "Attempt $i of $MAX_RETRIES..."
  
  if sf territory lead enable --target-org "$ORG"; then
    echo "Success!"
    exit 0
  fi
  
  if [ $i -lt $MAX_RETRIES ]; then
    echo "Failed, retrying in ${RETRY_DELAY}s..."
    sleep "$RETRY_DELAY"
  fi
done

echo "Failed after $MAX_RETRIES attempts"
exit 1
```

## Common Patterns

### Check Before Configuration

```bash
# Check what the current state is with dry-run
DRY_RUN_OUTPUT=$(sf territory lead enable --target-org production --dry-run)

# Check if already configured
if echo "$DRY_RUN_OUTPUT" | grep -q "already configured"; then
  echo "Already configured, skipping"
else
  echo "Not configured, applying changes..."
  sf territory lead enable --target-org production
fi
```

### Parallel Execution (careful with rate limits)

```bash
#!/bin/bash

ORGS=("org1" "org2" "org3")

# Run in parallel with process limit
for org in "${ORGS[@]}"; do
  (
    sf territory lead enable --target-org "$org" --timeout 120000
  ) &
  
  # Limit to 2 parallel processes
  if (( $(jobs -r -p | wc -l) >= 2 )); then
    wait -n
  fi
done

# Wait for remaining jobs
wait
```

## Debugging Tips

### Enable Environment Logging

```bash
# Verbose Node logs
NODE_DEBUG=* sf territory lead enable --target-org production

# Set log level
LOG_LEVEL=debug sf territory lead enable --target-org production
```

### Check Salesforce Org State

```bash
# Get org details
sf org display --target-org production

# Show org configuration
sf org display --target-org production --verbose
```

### Inspect Screenshots

```bash
# List all screenshots
ls -lh screenshots/

# Open latest screenshot (macOS)
open screenshots/$(ls -t screenshots/ | head -1)

# Open latest screenshot (Linux)
xdg-open screenshots/$(ls -t screenshots/ | head -1)

# Open latest screenshot (Windows)
start screenshots\$(ls -t screenshots | head -1)
```