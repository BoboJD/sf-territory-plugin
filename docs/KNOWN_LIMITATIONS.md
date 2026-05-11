# Known Limitations

## UI Automation Fragility

This plugin depends on Salesforce Setup UI automation.

Salesforce seasonal releases may:
- rename labels
- change DOM structure
- move settings
- modify Lightning components

## Browser Dependency

Headless browser execution may fail:
- in CI
- behind corporate proxies
- with browser sandbox restrictions

## Authentication

frontdoor.jsp login may fail if:
- session policies are strict
- IP locking is enabled
- MFA policies interfere

## Recommendation

Keep automation logic isolated and test selectors frequently after Salesforce upgrades.
