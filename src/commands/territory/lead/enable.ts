/**
 * Salesforce CLI Command: territory lead enable
 * Automates enabling Lead support in Territory Management
 */

import { SfCommand, Flags } from '@salesforce/sf-plugins-core';
import { Messages, Org } from '@salesforce/core';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import logger from '../../../utils/logger.js';
import { getOrgAuthInfo, buildFrontdoorUrl, validateAuthInfo } from '../../../utils/salesforceAuth.js';
import { BrowserManager } from '../../../browser/browserManager.js';
import { TerritorySettingsService } from '../../../services/territorySettingsService.js';
import { TerritorySettings, DefaultLeadAccess, PluginCommandResult } from '../../../types/territory.js';

// Messages live at the plugin root /messages directory.
// Compiled path: lib/commands/territory/lead/enable.js → 4 levels up = plugin root.
const pluginRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..', '..', '..');
Messages.importMessagesDirectory(pluginRoot);
const messages = Messages.loadMessages('sf-territory-plugin', 'territory.lead.enable');

export default class TerritoryLeadEnable extends SfCommand<PluginCommandResult> {
  public static readonly summary = messages.getMessage('summary');
  public static readonly description = messages.getMessage('description');
  public static readonly examples = messages.getMessages('examples');

  public static readonly flags = {
    'target-org': Flags.requiredOrg(),
    'default-access': Flags.string({
      char: 'a',
      description: 'Default Lead access level (ReadOnly, ReadWrite)',
      default: 'ReadOnly',
      options: ['ReadOnly', 'ReadWrite'],
    }),
    'dry-run': Flags.boolean({
      description: 'Show what would be changed without making changes',
      default: false,
    }),
    debug: Flags.boolean({
      description: 'Enable debug mode with screenshots and verbose logging',
      default: false,
    }),
    headless: Flags.boolean({
      description: 'Run browser in headless mode',
      default: true,
    }),
    timeout: Flags.integer({
      char: 't',
      description: 'Browser timeout in milliseconds',
      default: 60000,
    }),
    'screenshots-dir': Flags.string({
      description: 'Directory to save debug screenshots',
      default: 'screenshots',
    }),
    quiet: Flags.boolean({
      char: 'q',
      description: 'Suppress all progress output — only errors are printed',
      default: false,
    }),
  };

  public async run(): Promise<PluginCommandResult> {
    const { flags } = await this.parse(TerritoryLeadEnable);

    if (flags.quiet) logger.level = 'warn';
    const log = (msg: string) => { if (!flags.quiet) this.log(msg); };

    const startTime = Date.now();
    let browserManager: BrowserManager | null = null;
    const result: PluginCommandResult = {
      success: false,
      message: '',
      dryRun: flags['dry-run'],
    };

    try {
      const targetOrg: Org = flags['target-org'];

      log('Enabling Lead support in Territory Management');
      log(`Target Org: ${targetOrg.getUsername()}`);
      log(`Dry Run: ${flags['dry-run']}`);
      if (flags.debug) {
        log('Debug Mode: enabled');
      }

      // Retrieve org auth credentials
      const orgUsername = targetOrg.getUsername() ?? '';
      const authInfo = await getOrgAuthInfo(orgUsername);

      if (!validateAuthInfo(authInfo)) {
        throw new Error('Invalid or expired authentication');
      }

      // Build frontdoor URL that establishes a browser session
      const frontdoorUrl = buildFrontdoorUrl(
        authInfo.instanceUrl,
        authInfo.accessToken,
        '/lightning/setup/Territory2Settings/home'
      );

      log('Launching browser...');
      browserManager = new BrowserManager({
        headless: flags.headless,
        debug: flags.debug,
        timeout: flags.timeout,
        screenshotsDir: flags['screenshots-dir'],
      });

      const page = await browserManager.launch();

      log('Navigating to Territory Settings page...');
      await browserManager.goto(frontdoorUrl);

      const territoryService = new TerritorySettingsService(page);

      log('Detecting current Territory Settings state...');
      const currentState = await territoryService.detectCurrentState();

      log(`Current State: Leads Enabled=${currentState.isLeadEnabled}, Access=${currentState.defaultLeadAccess}`);

      const targetState: TerritorySettings = {
        isLeadEnabled: true,
        defaultLeadAccess: flags['default-access'] as DefaultLeadAccess,
      };

      const needsChanges =
        !currentState.isLeadEnabled ||
        currentState.defaultLeadAccess !== targetState.defaultLeadAccess;

      if (!needsChanges) {
        result.message = 'Territory Settings already configured correctly';
        result.success = true;
        result.detectedState = currentState;
        log(result.message);
      } else if (flags['dry-run']) {
        result.message = `Would enable Leads with ${targetState.defaultLeadAccess} access`;
        result.success = true;
        result.detectedState = currentState;
        result.appliedChanges = targetState;
        log(`[DRY RUN] ${result.message}`);
      } else {
        log('Applying Territory Settings configuration...');
        const finalState = await territoryService.configureTerritorySettings(targetState);

        result.success = true;
        result.message = 'Territory Settings configured successfully';
        result.detectedState = currentState;
        result.appliedChanges = finalState;

        log(result.message);
        log(`New State: Leads Enabled=${finalState.isLeadEnabled}, Access=${finalState.defaultLeadAccess}`);
      }

      result.executionTimeMs = Date.now() - startTime;
      return result;
    } catch (error) {
      result.executionTimeMs = Date.now() - startTime;

      if (!result.message) {
        result.message = `Error: ${error instanceof Error ? error.message : String(error)}`;
      }

      if (browserManager) {
        try {
          const screenshotPath = await browserManager.screenshot('error');
          if (screenshotPath) {
            log(`Debug screenshot saved to: ${screenshotPath}`);
          }
        } catch (screenshotError) {
          logger.debug('Failed to capture error screenshot', {
            error: screenshotError instanceof Error ? screenshotError.message : 'unknown',
          });
        }
      }

      throw error;
    } finally {
      if (browserManager) {
        try {
          await browserManager.close();
        } catch (closeError) {
          logger.warn('Error closing browser', {
            error: closeError instanceof Error ? closeError.message : 'unknown',
          });
        }
      }

      log(`Execution completed in ${result.executionTimeMs ?? 0}ms`);
    }
  }
}
