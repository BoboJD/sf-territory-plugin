/**
 * Territory Settings Service
 * Core automation logic for detecting and configuring Territory Lead support
 */

import { Page, Frame } from 'playwright';
import logger from '../utils/logger.js';
import { TerritorySettings, DefaultLeadAccess } from '../types/territory.js';
import {
  waitForLightningLoadingComplete,
  waitForSetupPageReady,
  isOnTerritorySettingsPage,
} from '../browser/lightningWait.js';

// Playwright timeout note:
// isChecked({ timeout: 0 }) / isEnabled({ timeout: 0 }) mean "no timeout = retry forever".
// isVisible({ timeout: 0 }) is the exception: it returns immediately if element is absent.
// Pattern used throughout: isVisible as the existence gate, evaluate() for property reads.

export class TerritorySettingsService {
  constructor(private page: Page) {}

  /**
   * Detect current Territory Settings state
   */
  async detectCurrentState(): Promise<TerritorySettings> {
    logger.info('Detecting current Territory Settings state');

    try {
      if (!(await isOnTerritorySettingsPage(this.page))) {
        logger.warn('Not on Territory Settings page — results may be inaccurate');
      }

      await waitForSetupPageReady(this.page, 20000);

      const isLeadEnabled = await this.isLeadEnabledCheckboxChecked();
      const defaultLeadAccess = await this.getDefaultLeadAccess();

      const state: TerritorySettings = { isLeadEnabled, defaultLeadAccess };
      logger.info('Current state detected', state);
      return state;
    } catch (error) {
      logger.error('Failed to detect current state', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Find the frame that contains Territory Settings form elements.
   * Salesforce Lightning Setup embeds the actual form content in a sub-frame
   * (salesforce-setup.com/ui/setup/territory2/Territory2SettingsPage).
   */
  private async getContentFrame(): Promise<Frame> {
    const probeSelectors = [
      '.checkboxContainer',
      'input.uiInputCheckbox',
      'input[type="radio"]',
      'input[type="checkbox"]',
    ];

    for (const frame of this.page.frames()) {
      if (frame === this.page.mainFrame()) continue;
      try {
        for (const sel of probeSelectors) {
          const count = await frame.locator(sel).count();
          if (count > 0) {
            logger.info('Found content frame', { url: frame.url(), matchedSelector: sel });
            return frame;
          }
        }
      } catch {
        // frame detached — skip
      }
    }

    logger.debug('No sub-frame contained form elements — using main frame');
    return this.page.mainFrame();
  }

  /** Returns true if the locator's first match is visible (and therefore exists). */
  private async visibleFirst(locator: import('playwright').Locator): Promise<boolean> {
    return locator.first().isVisible({ timeout: 0 }).catch(() => false);
  }

  /** Reads the .checked DOM property without Playwright's retry mechanism. */
  private async readChecked(locator: import('playwright').Locator): Promise<boolean> {
    return locator
      .first()
      .evaluate((el: HTMLInputElement) => el.checked)
      .catch(() => false);
  }

  /**
   * Log all radio button attributes in a frame for debugging.
   */
  private async dumpPageRadioButtons(frame: Frame): Promise<void> {
    try {
      const radios = frame.locator('input[type="radio"]');
      const count = await radios.count();
      logger.info('Radio button diagnostic', { count });
      for (let i = 0; i < Math.min(count, 20); i++) {
        const r = radios.nth(i);
        const value = await r.getAttribute('value').catch(() => null);
        const name = await r.getAttribute('name').catch(() => null);
        const cls = await r.getAttribute('class').catch(() => null);
        const checked = await r.evaluate((el: HTMLInputElement) => el.checked).catch(() => null);
        logger.info(`Radio ${i}`, { value, name, cls, checked });
      }
    } catch (err) {
      logger.debug('Radio diagnostic failed', { error: String(err) });
    }
  }

  /**
   * Log checkbox counts across all frames for debugging.
   */
  private async dumpPageCheckboxes(): Promise<void> {
    try {
      for (const frame of this.page.frames()) {
        const all = await frame.locator('input[type="checkbox"]').count();
        const uiCheckbox = await frame.locator('input.uiInputCheckbox').count();
        const container = await frame.locator('.checkboxContainer input[type="checkbox"]').count();
        logger.info('Checkbox diagnostic per frame', {
          frameUrl: frame.url().substring(0, 80),
          all,
          uiCheckbox,
          container,
        });
      }
    } catch (err) {
      logger.debug('Checkbox diagnostic failed', { error: err instanceof Error ? err.message : String(err) });
    }
  }

  /**
   * Check if "Enable Leads" checkbox is checked.
   *
   * Strategy 1 — getByLabel: uses accessible name + label[for]/id association.
   * Strategy 2 — container + filter({ hasText }): Playwright's hasText filter
   *   pierces shadow DOM, then we narrow to the input inside the matching container.
   */
  private async isLeadEnabledCheckboxChecked(): Promise<boolean> {
    logger.debug('Checking if Lead support is enabled');

    await this.page.evaluate('window.scrollTo(0, 0)');
    const frame = await this.getContentFrame();
    const labelTexts = ['Activer les pistes', 'Enable Leads', 'Enable Lead'];

    // Strategy 1: getByLabel
    for (const text of labelTexts) {
      try {
        const loc = frame.getByLabel(text, { exact: false });
        if (await this.visibleFirst(loc)) {
          const isChecked = await this.readChecked(loc);
          logger.debug('Found Lead checkbox via getByLabel', { text, isChecked });
          return isChecked;
        }
      } catch {
        // continue
      }
    }

    // Strategy 2: .checkboxContainer filtered by shadow-DOM-piercing text
    for (const text of labelTexts) {
      try {
        const loc = frame
          .locator('.checkboxContainer')
          .filter({ hasText: text })
          .locator('input[type="checkbox"]');
        if (await this.visibleFirst(loc)) {
          const isChecked = await this.readChecked(loc);
          logger.debug('Found Lead checkbox via container filter', { text, isChecked });
          return isChecked;
        }
      } catch {
        // continue
      }
    }

    logger.warn('Could not find Enable Leads checkbox with any selector');
    await this.dumpPageCheckboxes();
    return false;
  }

  /**
   * Get the currently selected default Lead access level.
   * Uses value-based radio selectors only — avoids :has-text() selectors that
   * can retry indefinitely with shadow DOM content.
   */
  private async getDefaultLeadAccess(): Promise<DefaultLeadAccess> {
    logger.debug('Getting current default Lead access setting');

    const frame = await this.getContentFrame();

    // Lead access radio buttons use name="leadAccessLevel" with numeric values:
    // value="1" = ReadOnly, value="2" = ReadWrite (Salesforce access level constants).
    // These radios only exist after "Activer les pistes" / "Enable Leads" is checked.
    const rwLoc = frame.locator('input[type="radio"][name="leadAccessLevel"][value="2"]');
    if (await this.visibleFirst(rwLoc) && await this.readChecked(rwLoc)) {
      logger.debug('Current default access is ReadWrite');
      return DefaultLeadAccess.ReadWrite;
    }

    const roLoc = frame.locator('input[type="radio"][name="leadAccessLevel"][value="1"]');
    if (await this.visibleFirst(roLoc) && await this.readChecked(roLoc)) {
      logger.debug('Current default access is ReadOnly');
      return DefaultLeadAccess.ReadOnly;
    }

    logger.debug('Could not determine current default access, assuming None');
    return DefaultLeadAccess.None;
  }

  /**
   * Enable Lead territory support by checking the Enable Leads checkbox
   */
  async enableLeadSupport(): Promise<void> {
    logger.info('Enabling Lead territory support');

    try {
      await waitForLightningLoadingComplete(this.page);
      await this.page.evaluate('window.scrollTo(0, 0)');

      const frame = await this.getContentFrame();
      const labelTexts = ['Activer les pistes', 'Enable Leads', 'Enable Lead'];

      const candidates: Array<{ locator: import('playwright').Locator; desc: string }> = [];
      for (const text of labelTexts) {
        candidates.push({
          locator: frame.getByLabel(text, { exact: false }),
          desc: `getByLabel("${text}")`,
        });
      }
      for (const text of labelTexts) {
        candidates.push({
          locator: frame
            .locator('.checkboxContainer')
            .filter({ hasText: text })
            .locator('input[type="checkbox"]'),
          desc: `container:hasText("${text}") > input`,
        });
      }

      for (const { locator, desc } of candidates) {
        try {
          if (!(await this.visibleFirst(locator))) continue;

          const isChecked = await this.readChecked(locator);
          if (!isChecked) {
            logger.debug('Clicking Enable Leads checkbox', { desc });
            await locator.first().scrollIntoViewIfNeeded();
            await locator.first().click();
            await this.page.waitForTimeout(300);

            const nowChecked = await this.readChecked(locator);
            if (!nowChecked) {
              logger.warn('Checkbox did not become checked after click', { desc });
              continue;
            }
          }

          logger.info('Lead support enabled');
          return;
        } catch (error) {
          logger.debug('Candidate failed', {
            desc,
            error: error instanceof Error ? error.message : 'unknown',
          });
        }
      }

      throw new Error('Could not find or click Enable Leads checkbox');
    } catch (error) {
      logger.error('Failed to enable Lead support', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Set the default Lead access level
   */
  async setDefaultLeadAccess(accessLevel: DefaultLeadAccess): Promise<void> {
    logger.info('Setting default Lead access', { accessLevel });

    if (accessLevel === DefaultLeadAccess.None) {
      logger.warn('Skipping access setting for None');
      return;
    }

    try {
      await waitForLightningLoadingComplete(this.page);

      const frame = await this.getContentFrame();
      // name="leadAccessLevel", value="1" = ReadOnly, value="2" = ReadWrite
      const selectorMap: Record<string, string> = {
        [DefaultLeadAccess.ReadOnly]: 'input[type="radio"][name="leadAccessLevel"][value="1"]',
        [DefaultLeadAccess.ReadWrite]: 'input[type="radio"][name="leadAccessLevel"][value="2"]',
      };

      const sel = selectorMap[accessLevel];
      if (!sel) throw new Error(`Unknown access level: ${accessLevel}`);

      const loc = frame.locator(sel).first();
      if (!(await this.visibleFirst(frame.locator(sel)))) {
        // Dump all radio buttons to understand actual values
        await this.dumpPageRadioButtons(frame);
        throw new Error(`Could not find radio button for ${accessLevel} access level`);
      }

      logger.debug('Clicking access level radio button', { selector: sel, accessLevel });
      await loc.scrollIntoViewIfNeeded();
      await loc.click();
      await this.page.waitForTimeout(300);

      logger.info('Default Lead access set', { accessLevel });
    } catch (error) {
      logger.error('Failed to set default Lead access', {
        accessLevel,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Save the Territory Settings configuration
   */
  async saveConfiguration(): Promise<void> {
    logger.info('Saving Territory Settings configuration');

    try {
      await waitForLightningLoadingComplete(this.page);

      const frame = await this.getContentFrame();

      // button.saveButton is the Aura-specific class on this button.
      // aria-label="" (empty) on this button so aria-label selectors don't match.
      // Text "Enregistrer" / "Save" sits inside a child <span>.
      const saveSelectors = [
        'button.saveButton',
        'button:has-text("Enregistrer")',
        'button:has-text("Save")',
        'button[type="submit"]',
      ];

      for (const selector of saveSelectors) {
        try {
          const loc = frame.locator(selector).first();
          if (!(await loc.isVisible({ timeout: 0 }).catch(() => false))) continue;
          // isEnabled also returns immediately for visible elements
          if (!(await loc.isEnabled().catch(() => false))) continue;

          logger.debug('Found Save button, clicking', { selector });
          await loc.scrollIntoViewIfNeeded();
          await loc.click();
          await waitForLightningLoadingComplete(this.page);
          await this.page.waitForTimeout(1000);

          logger.info('Configuration saved successfully');
          return;
        } catch (error) {
          logger.debug('Save button attempt failed', {
            selector,
            error: error instanceof Error ? error.message : 'unknown',
          });
        }
      }

      throw new Error('Could not find or click Save button');
    } catch (error) {
      logger.error('Failed to save configuration', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Verify that changes were persisted by reloading and re-reading state
   */
  async verifyChanges(expectedState: TerritorySettings): Promise<boolean> {
    logger.info('Verifying configuration changes', expectedState);

    try {
      await this.page.waitForTimeout(1000);
      await this.page.reload({ waitUntil: 'domcontentloaded' });
      await waitForSetupPageReady(this.page);

      const currentState = await this.detectCurrentState();

      const verified =
        currentState.isLeadEnabled === expectedState.isLeadEnabled &&
        currentState.defaultLeadAccess === expectedState.defaultLeadAccess;

      logger.info('Verification result', { verified, expected: expectedState, actual: currentState });
      return verified;
    } catch (error) {
      logger.error('Failed to verify changes', {
        error: error instanceof Error ? error.message : String(error),
      });
      return false;
    }
  }

  /**
   * Execute full detect → change → save → verify flow
   */
  async configureTerritorySettings(targetState: TerritorySettings): Promise<TerritorySettings> {
    logger.info('Starting Territory Settings configuration', targetState);
    const startTime = Date.now();

    try {
      const currentState = await this.detectCurrentState();

      const needsLeadEnable = targetState.isLeadEnabled && !currentState.isLeadEnabled;
      const needsAccessChange = targetState.defaultLeadAccess !== currentState.defaultLeadAccess;

      if (!needsLeadEnable && !needsAccessChange) {
        logger.info('No configuration changes needed');
        return currentState;
      }

      if (needsLeadEnable) {
        await this.enableLeadSupport();
      }

      if (needsAccessChange) {
        await this.setDefaultLeadAccess(targetState.defaultLeadAccess as DefaultLeadAccess);
      }

      await this.saveConfiguration();

      const verified = await this.verifyChanges(targetState);
      if (!verified) {
        logger.warn('Post-save verification failed — changes may not have persisted');
      }

      logger.info('Configuration completed', {
        executionTimeMs: Date.now() - startTime,
        targetState,
        verified,
      });

      return targetState;
    } catch (error) {
      logger.error('Configuration failed', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }
}
