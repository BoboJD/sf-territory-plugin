/**
 * Browser management using Playwright
 * Handles browser lifecycle, page navigation, and session management
 */

import { chromium, Browser, Page, BrowserContext } from 'playwright';
import path from 'path';
import fs from 'fs';
import logger from '../utils/logger.js';
import { BrowserConfig } from '../types/territory.js';

export class BrowserManager {
  private browser: Browser | null = null;
  private context: BrowserContext | null = null;
  private page: Page | null = null;
  private config: BrowserConfig;

  constructor(config: BrowserConfig) {
    this.config = config;
  }

  async launch(): Promise<Page> {
    try {
      logger.info('Launching browser', {
        headless: this.config.headless,
        debug: this.config.debug,
        timeout: this.config.timeout,
      });

      this.browser = await chromium.launch({
        headless: this.config.headless,
        args: [
          '--disable-dev-shm-usage',
          '--no-sandbox',
          '--disable-gpu',
        ],
      });

      this.context = await this.browser.newContext({
        viewport: { width: 1920, height: 1080 },
        ignoreHTTPSErrors: true,
      });

      this.page = await this.context.newPage();
      this.page.setDefaultTimeout(this.config.timeout);
      this.page.setDefaultNavigationTimeout(this.config.timeout);

      if (this.config.debug) {
        this.page.on('console', (msg) => {
          logger.debug(`[Browser Console ${msg.type()}]: ${msg.text()}`);
        });
        this.page.on('pageerror', (error) => {
          logger.error('[Browser Error]', { message: error.message });
        });
      }

      logger.info('Browser launched successfully');
      return this.page;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      logger.error('Failed to launch browser', { error: errorMsg });
      throw error;
    }
  }

  async goto(url: string): Promise<void> {
    if (!this.page) {
      throw new Error('Browser not launched. Call launch() first.');
    }

    try {
      logger.info('Navigating to URL', { url });
      // Lightning SPAs keep WebSocket connections open indefinitely, so
      // 'networkidle' never fires. 'domcontentloaded' signals the redirect has
      // landed and the page has been parsed; waitForSetupPageReady() handles
      // the rest of the Lightning boot sequence.
      await this.page.goto(url, { waitUntil: 'domcontentloaded' });
      logger.info('Navigation completed');
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      logger.error('Navigation failed', { url, error: errorMsg });
      await this.captureDebugInfo('navigation-error');
      throw error;
    }
  }

  async screenshot(name: string): Promise<string> {
    if (!this.page) {
      throw new Error('Browser not launched');
    }

    const screenshotsDir = this.config.screenshotsDir ?? 'screenshots';

    if (!fs.existsSync(screenshotsDir)) {
      fs.mkdirSync(screenshotsDir, { recursive: true });
    }

    const filename = path.join(screenshotsDir, `${name}-${Date.now()}.png`);

    try {
      await this.page.screenshot({ path: filename });
      logger.info('Screenshot saved', { path: filename });
      return filename;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      logger.error('Failed to take screenshot', { error: errorMsg });
      return '';
    }
  }

  async captureDebugInfo(prefix: string): Promise<void> {
    if (!this.page) {
      return;
    }

    try {
      await this.screenshot(`${prefix}-screenshot`);

      const url = this.page.url();
      logger.debug('Current URL', { url });

      const htmlContent = await this.page.content();
      logger.debug('Current HTML (truncated)', { html: htmlContent.substring(0, 2000) });
    } catch (error) {
      logger.debug('Failed to capture debug info', {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  getPage(): Page {
    if (!this.page) {
      throw new Error('Browser not launched');
    }
    return this.page;
  }

  async close(): Promise<void> {
    try {
      logger.info('Closing browser');

      if (this.page) {
        await this.page.close();
        this.page = null;
      }
      if (this.context) {
        await this.context.close();
        this.context = null;
      }
      if (this.browser) {
        await this.browser.close();
        this.browser = null;
      }

      logger.info('Browser closed successfully');
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      logger.warn('Error closing browser', { error: errorMsg });
    }
  }
}
