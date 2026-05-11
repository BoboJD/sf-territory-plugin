/**
 * Lightning Setup UI loading and stability utilities
 * Handles waiting for Lightning components to load and become stable
 */

import { Page } from 'playwright';
import logger from '../utils/logger.js';
import { waitFor, retry } from '../utils/retry.js';

/**
 * Wait for Lightning loading spinners to disappear
 */
export async function waitForLightningLoadingComplete(
  page: Page,
  timeoutMs: number = 30000
): Promise<void> {
  logger.info('Waiting for Lightning loading spinners to disappear');

  try {
    await waitFor(
      async () => {
        const spinnerSelectors = [
          'lightning-spinner',
          '.slds-spinner',
          '[role="status"] lightning-spinner',
          'div[class*="spinner"]',
        ];

        for (const selector of spinnerSelectors) {
          try {
            const isVisible = await page.isVisible(selector);
            if (isVisible) {
              logger.debug('Found visible spinner', { selector });
              return false;
            }
          } catch {
            // Selector absent — continue
          }
        }

        return true;
      },
      { timeoutMs, intervalMs: 500 }
    );

    logger.info('Lightning loading complete');
  } catch (error) {
    // Non-fatal: spinners may not be present at all
    logger.warn('Timeout waiting for Lightning loading spinners', {
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

/**
 * Wait for Lightning Setup page to be fully loaded and interactive
 */
export async function waitForSetupPageReady(
  page: Page,
  timeoutMs: number = 30000
): Promise<void> {
  logger.info('Waiting for Setup page to be ready');

  try {
    await waitForLightningLoadingComplete(page, Math.min(timeoutMs / 3, 10000));

    // Give the full timeoutMs to the main-content selector — spinner check above is non-fatal
    // and Lightning SPAs can take 15–20 s to render [role="main"] on the first load.
    await page.waitForSelector('[role="main"]', { timeout: timeoutMs });

    // Network idle is best-effort — Lightning SPAs frequently leave open connections
    await page.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => undefined);

    logger.info('Setup page is ready');
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    logger.error('Failed waiting for Setup page ready', { error: errorMsg });
    throw error;
  }
}

/**
 * Wait for a specific element to appear and become positionally stable
 */
export async function waitForElementStable(
  page: Page,
  selector: string,
  options: { timeoutMs?: number } = {}
): Promise<void> {
  const { timeoutMs = 10000 } = options;

  logger.debug('Waiting for element to appear', { selector });

  try {
    await page.waitForSelector(selector, { state: 'visible', timeout: timeoutMs });

    // Poll bounding box until position stabilises across two consecutive checks
    let lastBoundingBox: { x: number; y: number; width: number; height: number } | null = null;
    let stableCount = 0;
    const startTime = Date.now();

    while (stableCount < 2) {
      if (Date.now() - startTime > timeoutMs) {
        throw new Error(`Element not stable after ${timeoutMs}ms`);
      }

      try {
        const bbox = await page.locator(selector).boundingBox();

        if (JSON.stringify(bbox) === JSON.stringify(lastBoundingBox)) {
          stableCount++;
        } else {
          stableCount = 0;
          lastBoundingBox = bbox;
        }
      } catch {
        stableCount = 0;
      }

      await new Promise<void>((resolve) => setTimeout(resolve, 100));
    }

    logger.debug('Element is stable', { selector });
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    logger.error('Failed waiting for element to be stable', { selector, error: errorMsg });
    throw error;
  }
}

/**
 * Wait for a form to be interactive and submittable
 */
export async function waitForFormReady(
  page: Page,
  formSelector: string,
  timeoutMs: number = 10000
): Promise<void> {
  logger.debug('Waiting for form to be ready', { formSelector });

  try {
    await waitForElementStable(page, formSelector, { timeoutMs });

    const fieldCount = await page
      .locator(
        `${formSelector} input:not([disabled]), ${formSelector} select:not([disabled])`
      )
      .count();

    if (fieldCount === 0) {
      logger.warn('No interactive input fields found in form', { formSelector });
    }

    logger.debug('Form is ready', { formSelector, fieldCount });
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    logger.error('Failed waiting for form to be ready', { formSelector, error: errorMsg });
    throw error;
  }
}

/**
 * Detect if the browser is currently on the Territory Settings page
 */
export async function isOnTerritorySettingsPage(page: Page): Promise<boolean> {
  try {
    const url = page.url();
    const isCorrectUrl =
      url.includes('/lightning/setup/Territory2Settings') ||
      url.includes('Territory2Settings');

    if (!isCorrectUrl) {
      // Accept page if it has the territory settings heading even without the expected URL
      const hasHeading = await page
        .locator('text="Territory Settings"')
        .isVisible()
        .catch(() => false);
      return hasHeading;
    }

    return true;
  } catch (error) {
    logger.debug('Error checking if on Territory Settings page', {
      error: error instanceof Error ? error.message : String(error),
    });
    return false;
  }
}

/**
 * Click an element using retry logic for reliability
 */
export async function safeClick(
  page: Page,
  selector: string,
  options: { retries?: number; delay?: number } = {}
): Promise<void> {
  const { retries = 3, delay = 300 } = options;

  await retry(
    async () => {
      logger.debug('Clicking element', { selector });

      await page.waitForSelector(selector, { state: 'visible', timeout: 5000 });
      await page.locator(selector).scrollIntoViewIfNeeded();
      await page.waitForTimeout(delay);
      await page.click(selector);

      logger.debug('Element clicked successfully', { selector });
    },
    {
      maxAttempts: retries,
      initialDelayMs: 500,
      onRetry: (attempt, error) => {
        logger.debug(`Retry click attempt ${attempt}`, { selector, error: error.message });
      },
    }
  );
}

/**
 * Set input value with retry logic
 */
export async function safeSetValue(
  page: Page,
  selector: string,
  value: string,
  options: { retries?: number } = {}
): Promise<void> {
  const { retries = 3 } = options;

  await retry(
    async () => {
      logger.debug('Setting input value', { selector, value });

      await page.waitForSelector(selector, { state: 'visible', timeout: 5000 });
      await page.locator(selector).scrollIntoViewIfNeeded();
      await page.fill(selector, value);

      logger.debug('Value set successfully', { selector, value });
    },
    {
      maxAttempts: retries,
      initialDelayMs: 300,
      onRetry: (attempt, error) => {
        logger.debug(`Retry set value attempt ${attempt}`, { selector, error: error.message });
      },
    }
  );
}
