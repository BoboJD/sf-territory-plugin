/**
 * Salesforce authentication and session helper
 */

import { AuthInfo } from '@salesforce/core';
import logger from './logger.js';
import { SalesforceAuthInfo } from '../types/territory.js';

/**
 * Retrieve authentication info for an org
 * @param orgAlias Org alias or username
 */
export async function getOrgAuthInfo(orgAlias: string): Promise<SalesforceAuthInfo> {
  try {
    const authInfo = await AuthInfo.create({ username: orgAlias });
    const fields = authInfo.getFields(true); // decrypt=true to get the plaintext OAuth token

    if (!fields.accessToken || !fields.instanceUrl) {
      throw new Error('Missing accessToken or instanceUrl in auth info');
    }

    const result: SalesforceAuthInfo = {
      instanceUrl: fields.instanceUrl,
      accessToken: fields.accessToken,
      username: fields.username || orgAlias,
      orgId: fields.orgId || 'unknown',
    };

    logger.info('Retrieved Salesforce auth info', {
      username: result.username,
      orgId: result.orgId,
      instanceUrl: result.instanceUrl,
    });

    return result;
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    logger.error('Failed to retrieve org auth info', {
      orgAlias,
      error: errorMsg,
    });
    throw error;
  }
}

/**
 * Build frontdoor.jsp login URL for direct browser navigation
 * This allows the browser to establish a session without manual login
 */
export function buildFrontdoorUrl(
  instanceUrl: string,
  accessToken: string,
  returnUrl: string = '/lightning/setup/Territory2Settings/home'
): string {
  const baseUrl = instanceUrl.replace(/\/$/, '');
  const encodedReturnUrl = encodeURIComponent(returnUrl);
  // /secur/frontdoor.jsp is the canonical session-bridge endpoint used by `sf org open`.
  // /services/auth/frontdoor.jsp is a different path that rejects CLI OAuth tokens.
  return `${baseUrl}/secur/frontdoor.jsp?sid=${accessToken}&retURL=${encodedReturnUrl}`;
}

/**
 * Validate that auth info is still valid
 * Basic check: ensure accessToken and instanceUrl exist
 */
export function validateAuthInfo(authInfo: SalesforceAuthInfo): boolean {
  return (
    Boolean(authInfo.accessToken) &&
    Boolean(authInfo.instanceUrl) &&
    authInfo.instanceUrl.startsWith('https://')
  );
}
