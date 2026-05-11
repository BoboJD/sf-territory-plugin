/**
 * Tests for TerritorySettingsService
 */

import { describe, test, expect, beforeEach } from '@jest/globals';
import { Page } from 'playwright';
import { TerritorySettingsService } from '../src/services/territorySettingsService';
import { DefaultLeadAccess, TerritorySettings } from '../src/types/territory';

// Stub heavy dependencies so service logic can be tested in isolation
jest.mock('playwright');
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

describe('TerritorySettingsService', () => {
  let mockPage: Partial<Page>;
  let service: TerritorySettingsService;

  beforeEach(() => {
    jest.clearAllMocks();

    mockPage = {
      isVisible: jest.fn().mockResolvedValue(false),
      isChecked: jest.fn().mockResolvedValue(false),
      isEnabled: jest.fn().mockResolvedValue(true),
      url: jest
        .fn()
        .mockReturnValue(
          'https://example.salesforce.com/lightning/setup/Territory2Settings/home'
        ),
      click: jest.fn().mockResolvedValue(undefined),
      fill: jest.fn().mockResolvedValue(undefined),
      locator: jest.fn().mockReturnValue({
        scrollIntoViewIfNeeded: jest.fn().mockResolvedValue(undefined),
        boundingBox: jest.fn().mockResolvedValue(null),
        isVisible: jest.fn().mockResolvedValue(false),
      }),
      waitForSelector: jest.fn().mockResolvedValue(undefined),
      waitForTimeout: jest.fn().mockResolvedValue(undefined),
      reload: jest.fn().mockResolvedValue(undefined),
      waitForLoadState: jest.fn().mockResolvedValue(undefined),
      content: jest.fn().mockResolvedValue('<html></html>'),
    };

    service = new TerritorySettingsService(mockPage as unknown as Page, false);
  });

  describe('detectCurrentState', () => {
    test('should detect that Leads are disabled by default', async () => {
      const state = await service.detectCurrentState();

      expect(state.isLeadEnabled).toBe(false);
      expect(state.defaultLeadAccess).toBe(DefaultLeadAccess.None);
    });

    test('should detect enabled Leads when checkbox is checked', async () => {
      // First isVisible call for the first checkbox selector returns true
      (mockPage.isVisible as jest.Mock).mockResolvedValueOnce(true);
      // isChecked returns true → lead is enabled
      (mockPage.isChecked as jest.Mock).mockResolvedValueOnce(true);

      const state = await service.detectCurrentState();

      expect(state.isLeadEnabled).toBe(true);
    });
  });

  describe('enableLeadSupport', () => {
    test('should click the Enable Leads checkbox when found and unchecked', async () => {
      (mockPage.isVisible as jest.Mock).mockResolvedValue(true);
      (mockPage.isChecked as jest.Mock)
        .mockResolvedValueOnce(false) // initial: unchecked
        .mockResolvedValueOnce(true); // after click: checked

      await service.enableLeadSupport();

      expect(mockPage.click).toHaveBeenCalled();
    });

    test('should throw error if no checkbox selector matches', async () => {
      (mockPage.isVisible as jest.Mock).mockResolvedValue(false);

      await expect(service.enableLeadSupport()).rejects.toThrow(
        'Could not find or click Enable Leads checkbox'
      );
    });
  });

  describe('setDefaultLeadAccess', () => {
    test('should click a ReadOnly radio button when found', async () => {
      (mockPage.isVisible as jest.Mock).mockResolvedValue(true);

      await service.setDefaultLeadAccess(DefaultLeadAccess.ReadOnly);

      expect(mockPage.click).toHaveBeenCalled();
    });

    test('should skip without clicking for None access level', async () => {
      await service.setDefaultLeadAccess(DefaultLeadAccess.None);

      expect(mockPage.click).not.toHaveBeenCalled();
    });
  });

  describe('saveConfiguration', () => {
    test('should click a Save button when found and enabled', async () => {
      (mockPage.isVisible as jest.Mock).mockResolvedValue(true);
      (mockPage.isEnabled as jest.Mock).mockResolvedValue(true);

      await service.saveConfiguration();

      expect(mockPage.click).toHaveBeenCalled();
    });

    test('should throw error if no Save button is found', async () => {
      (mockPage.isVisible as jest.Mock).mockResolvedValue(false);

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
      expect(mockPage.click).not.toHaveBeenCalled();
    });
  });
});
