/**
 * Territory-related type definitions
 */

export interface TerritorySettings {
  isLeadEnabled: boolean;
  defaultLeadAccess: 'ReadOnly' | 'ReadWrite' | 'None';
  lastModified?: Date;
}

export interface BrowserConfig {
  headless: boolean;
  debug: boolean;
  timeout: number;
  screenshotsDir?: string;
}

export interface PluginCommandResult {
  success: boolean;
  message: string;
  detectedState?: TerritorySettings;
  appliedChanges?: TerritorySettings;
  dryRun: boolean;
  executionTimeMs?: number;
}

export interface SalesforceAuthInfo {
  instanceUrl: string;
  accessToken: string;
  username: string;
  orgId: string;
}

export interface FrontdoorConfig {
  url: string;
  cookieName: string;
}

export enum DefaultLeadAccess {
  ReadOnly = 'ReadOnly',
  ReadWrite = 'ReadWrite',
  None = 'None',
}
