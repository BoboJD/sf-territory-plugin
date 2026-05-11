/**
 * Tests for TerritorySettingsService
 */

import { describe, test, expect, beforeEach } from '@jest/globals';
import { Page } from 'playwright';
import { TerritorySettingsService } from '../src/services/territorySettingsService';
import { DefaultLeadAccess, TerritorySettings } from '../src/types/territory';

jest.mock('../src/utils/logger', () => ({
  __esModule: true,
  default: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));
jest.mock('../src/browser/lightningWait', () => ({
  __esModule: true,
  waitForLightningLoadingComplete: jest.fn().mockResolvedValue(undefined),
  waitForSetupPageReady: jest.fn().mockResolvedValue(undefined),
  isOnTerritorySettingsPage: jest.fn().mockResolvedValue(true),
}));

/**
 * Self-referential locator mock — all chaining methods (first, filter, locator,
 * getByLabel) return the same object so tests configure a single mock instance.
 */
function makeLocator(defaults: { visible?: boolean; checked?: boolean } = {}): jest.Mocked<any> {
  const loc: any = {
    count: jest.fn().mockResolvedValue(0),
    first: jest.fn(),
    nth: jest.fn(),
    filter: jest.fn(),
    locator: jest.fn(),
    getByLabel: jest.fn(),
    isVisible: jest.fn().mockResolvedValue(defaults.visible ?? false),
    isEnabled: jest.fn().mockResolvedValue(true),
    evaluate: jest.fn().mockResolvedValue(defaults.checked ?? false),
    scrollIntoViewIfNeeded: jest.fn().mockResolvedValue(undefined),
    click: jest.fn().mockResolvedValue(undefined),
    getAttribute: jest.fn().mockResolvedValue(null),
  };
  loc.first.mockReturnValue(loc);
  loc.nth.mockReturnValue(loc);
  loc.filter.mockReturnValue(loc);
  loc.locator.mockReturnValue(loc);
  loc.getByLabel.mockReturnValue(loc);
  return loc;
}

describe('TerritorySettingsService', () => {
  let mockLocator: ReturnType<typeof makeLocator>;
  let mockFrame: any;
  let mockPage: Partial<Page>;
  let service: TerritorySettingsService;

  beforeEach(() => {
    jest.clearAllMocks();

    mockLocator = makeLocator();

    mockFrame = {
      url: jest.fn().mockReturnValue(''),
      locator: jest.fn().mockReturnValue(mockLocator),
      getByLabel: jest.fn().mockReturnValue(mockLocator),
    };

    mockPage = {
      // page.frames() returns [] → getContentFrame falls through to mainFrame()
      frames: jest.fn().mockReturnValue([]),
      mainFrame: jest.fn().mockReturnValue(mockFrame),
      evaluate: jest.fn().mockResolvedValue(undefined),
      waitForTimeout: jest.fn().mockResolvedValue(undefined),
      reload: jest.fn().mockResolvedValue(undefined),
      waitForLoadState: jest.fn().mockResolvedValue(undefined),
      url: jest
        .fn()
        .mockReturnValue('https://example.salesforce.com/lightning/setup/Territory2Settings/home'),
    };

    service = new TerritorySettingsService(mockPage as unknown as Page);
  });

  describe('detectCurrentState', () => {
    test('should detect that Leads are disabled by default', async () => {
      const state = await service.detectCurrentState();

      expect(state.isLeadEnabled).toBe(false);
      expect(state.defaultLeadAccess).toBe(DefaultLeadAccess.None);
    });

    test('should detect enabled Leads when checkbox is checked', async () => {
      mockLocator.isVisible.mockResolvedValue(true);
      mockLocator.evaluate.mockResolvedValue(true);

      const state = await service.detectCurrentState();

      expect(state.isLeadEnabled).toBe(true);
    });
  });

  describe('enableLeadSupport', () => {
    test('should click the Enable Leads checkbox when found and unchecked', async () => {
      mockLocator.isVisible.mockResolvedValue(true);
      mockLocator.evaluate
        .mockResolvedValueOnce(false) // initial: unchecked
        .mockResolvedValueOnce(true); // after click: checked

      await service.enableLeadSupport();

      expect(mockLocator.click).toHaveBeenCalled();
    });

    test('should throw error if no checkbox selector matches', async () => {
      mockLocator.isVisible.mockResolvedValue(false);

      await expect(service.enableLeadSupport()).rejects.toThrow(
        'Could not find or click Enable Leads checkbox'
      );
    });
  });

  describe('setDefaultLeadAccess', () => {
    test('should click a ReadOnly radio button when found', async () => {
      mockLocator.isVisible.mockResolvedValue(true);

      await service.setDefaultLeadAccess(DefaultLeadAccess.ReadOnly);

      expect(mockLocator.click).toHaveBeenCalled();
    });

    test('should skip without clicking for None access level', async () => {
      await service.setDefaultLeadAccess(DefaultLeadAccess.None);

      expect(mockLocator.click).not.toHaveBeenCalled();
    });
  });

  describe('saveConfiguration', () => {
    test('should click a Save button when found and enabled', async () => {
      mockLocator.isVisible.mockResolvedValue(true);
      mockLocator.isEnabled.mockResolvedValue(true);

      await service.saveConfiguration();

      expect(mockLocator.click).toHaveBeenCalled();
    });

    test('should throw error if no Save button is found', async () => {
      mockLocator.isVisible.mockResolvedValue(false);

      await expect(service.saveConfiguration()).rejects.toThrow(
        'Could not find or click Save button'
      );
    });
  });

  describe('configureTerritorySettings', () => {
    test('should return current state early when no changes are needed', async () => {
      const targetState: TerritorySettings = {
        isLeadEnabled: false,
        defaultLeadAccess: DefaultLeadAccess.None,
      };

      const result = await service.configureTerritorySettings(targetState);

      expect(result).toEqual(targetState);
      expect(mockLocator.click).not.toHaveBeenCalled();
    });
  });
});
