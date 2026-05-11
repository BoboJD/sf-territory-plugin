# Changelog

All notable changes to this project will be documented in this file.

## [1.0.0] - 2024

### Initial Release

#### Added

**Core Features:**
- ✅ Salesforce CLI plugin for enabling Lead support in Territory Management
- ✅ Automated UI navigation to Territory Settings page
- ✅ Lead support checkbox detection and enabling
- ✅ Default Lead access configuration (ReadOnly, ReadWrite)
- ✅ Configuration saving with verification
- ✅ Dry-run mode for preview
- ✅ Debug mode with screenshots and verbose logging

**Browser Automation:**
- ✅ Playwright-based headless browser automation
- ✅ Frontdoor.jsp session login URL generation
- ✅ Lightning UI loading detection
- ✅ Retry logic with exponential backoff
- ✅ Screenshot capture on failure
- ✅ Debug-mode browser console output

**Selector Strategy:**
- ✅ Multi-strategy fallback selector system
- ✅ Label-based selectors (most reliable)
- ✅ Aria-label selectors
- ✅ Data-attribute selectors
- ✅ Role-based selectors

**Utilities:**
- ✅ Salesforce org authentication (via Salesforce CLI)
- ✅ Session token retrieval
- ✅ Winston-based structured logging
- ✅ Retry utilities with configurable backoff
- ✅ Wait-for utilities for async operations

**Developer Experience:**
- ✅ Full TypeScript support with strict mode
- ✅ Comprehensive error messages
- ✅ JSDoc comments on public APIs
- ✅ Modular service architecture
- ✅ Reusable browser utilities
- ✅ Extensible command structure

**Testing & Quality:**
- ✅ Jest unit test framework
- ✅ ESLint with TypeScript rules
- ✅ Prettier code formatting
- ✅ Example service tests
- ✅ Build and test scripts

**Documentation:**
- ✅ Comprehensive README with usage examples
- ✅ Command reference and flags documentation
- ✅ Architecture overview (ARCHITECTURE.md)
- ✅ Project structure guide (PROJECT_STRUCTURE.md)
- ✅ Selector strategy documentation (SELECTOR_STRATEGY.md)
- ✅ Known limitations documented (KNOWN_LIMITATIONS.md)
- ✅ Usage examples for common scenarios (USAGE_EXAMPLES.md)
- ✅ Developer guide for extending the plugin (DEVELOPER_GUIDE.md)
- ✅ Implementation summary (IMPLEMENTATION_SUMMARY.md)

**Configuration Files:**
- ✅ package.json with all dependencies
- ✅ tsconfig.json with strict TypeScript settings
- ✅ jest.config.js for testing
- ✅ .eslintrc.json for linting
- ✅ .prettierrc for formatting
- ✅ .gitignore for version control

#### Features Included

**Command Flags:**
- `--target-org` (required) - Salesforce org alias or username
- `--default-access` (default: ReadOnly) - Lead access level
- `--dry-run` - Preview without changes
- `--debug` - Verbose logging and screenshots
- `--no-headless` - Show browser window
- `--timeout` (default: 60000) - Browser timeout in ms
- `--screenshots-dir` (default: screenshots) - Debug screenshot location

**Return Value:**
```json
{
  "success": boolean,
  "message": string,
  "detectedState": { "isLeadEnabled": boolean, "defaultLeadAccess": string },
  "appliedChanges": { "isLeadEnabled": boolean, "defaultLeadAccess": string },
  "dryRun": boolean,
  "executionTimeMs": number
}
```

#### Known Limitations

- Depends on Salesforce Lightning UI stability
- Subject to Salesforce seasonal release changes
- Browser execution may fail in restricted environments
- MFA and IP locking may block frontdoor.jsp login
- Requires "Customize Setup" permission

#### Performance

- Average execution: 30-60 seconds
- Browser launch: 3-5 seconds
- Navigation: 5-10 seconds
- Configuration: 3-5 seconds
- Verification: 2-3 seconds

---

## Version Numbering

This project follows [Semantic Versioning](https://semver.org/):
- **MAJOR** - Incompatible API changes
- **MINOR** - New features (backward compatible)
- **PATCH** - Bug fixes (backward compatible)

## Future Enhancements

Planned for future releases:

- [ ] Configuration file support (.territoryrc.json)
- [ ] Batch operations on multiple orgs
- [ ] Territory 2 custom settings automation
- [ ] Video recording on failure
- [ ] Slack webhook notifications
- [ ] Audit log tracking
- [ ] Integration tests with test orgs
- [ ] GitHub Actions workflow template
- [ ] Salesforce DX package support
- [ ] Plugin version auto-update

## Migration Guide

N/A for v1.0.0 (initial release)

## Support

For issues, questions, or feature requests:

1. Check [KNOWN_LIMITATIONS.md](docs/KNOWN_LIMITATIONS.md)
2. Review [Troubleshooting](README.md#troubleshooting-1) section
3. Check existing issues on GitHub
4. Create detailed bug report with logs

## Contributors

Initial release implemented with:
- TypeScript
- Playwright
- Salesforce CLI SDK
- Winston Logger
- Jest Testing Framework