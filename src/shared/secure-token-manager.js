/**
 * Secure Token Manager
 * Handles encrypted storage and retrieval of sensitive tokens
 */

import { SecureStorage } from './security-utils.js';

/**
 * Derive encryption key from extension ID and browser fingerprint
 * This provides a consistent key per browser/extension installation
 */
async function getEncryptionKey() {
  // Use extension ID as base
  const extensionId = chrome.runtime.id;
  
  // Add browser-specific entropy
  const userAgent = navigator.userAgent;
  
  // Combine for consistent key per installation
  return `${extensionId}-${userAgent.slice(0, 50)}`;
}

/**
 * Store encrypted token
 * @param {string} key - Storage key name
 * @param {string} token - Token to encrypt and store
 * @returns {Promise<boolean>} Success status
 */
export async function storeEncryptedToken(key, token) {
  try {
    if (!token || typeof token !== 'string') {
      throw new Error('Invalid token');
    }
    
    const encryptionKey = await getEncryptionKey();
    const encrypted = await SecureStorage.encrypt(token, encryptionKey);
    
    await chrome.storage.local.set({
      [`${key}_encrypted`]: encrypted,
      [`${key}_version`]: 1 // For future migration if encryption changes
    });
    
    // Remove any plain text version
    await chrome.storage.local.remove(key);
    
    return true;
  } catch (error) {
    console.error('Failed to store encrypted token:', error);
    throw new Error('Token encryption failed');
  }
}

/**
 * Retrieve and decrypt token
 * @param {string} key - Storage key name
 * @returns {Promise<string|null>} Decrypted token or null
 */
export async function retrieveEncryptedToken(key) {
  try {
    const result = await chrome.storage.local.get([
      `${key}_encrypted`,
      `${key}_version`,
      key // Check for legacy plain text
    ]);
    
    // If encrypted version exists, decrypt it
    if (result[`${key}_encrypted`]) {
      const encryptionKey = await getEncryptionKey();
      const decrypted = await SecureStorage.decrypt(
        result[`${key}_encrypted`],
        encryptionKey
      );
      return decrypted;
    }
    
    // Fallback to plain text (for migration)
    if (result[key]) {
      console.warn(`Found plain text token for ${key}, migrating to encrypted...`);
      // Migrate to encrypted storage
      await storeEncryptedToken(key, result[key]);
      return result[key];
    }
    
    return null;
  } catch (error) {
    console.error('Failed to retrieve encrypted token:', error);
    
    // If decryption fails, check for plain text fallback
    const result = await chrome.storage.local.get(key);
    if (result[key]) {
      console.warn('Decryption failed, using plain text fallback');
      return result[key];
    }
    
    return null;
  }
}

/**
 * Remove encrypted token
 * @param {string} key - Storage key name
 * @returns {Promise<void>}
 */
export async function removeEncryptedToken(key) {
  await chrome.storage.local.remove([
    `${key}_encrypted`,
    `${key}_version`,
    key
  ]);
}

/**
 * Check if token is encrypted
 * @param {string} key - Storage key name
 * @returns {Promise<boolean>}
 */
export async function isTokenEncrypted(key) {
  const result = await chrome.storage.local.get(`${key}_encrypted`);
  return !!result[`${key}_encrypted`];
}

/**
 * Migrate all plain text tokens to encrypted storage
 * @returns {Promise<{migrated: number, failed: number}>}
 */
export async function migrateAllTokens() {
  const tokenKeys = ['github_token'];
  let migrated = 0;
  let failed = 0;
  
  for (const key of tokenKeys) {
    try {
      const result = await chrome.storage.local.get(key);
      if (result[key] && typeof result[key] === 'string') {
        await storeEncryptedToken(key, result[key]);
        migrated++;
      }
    } catch (error) {
      console.error(`Failed to migrate ${key}:`, error);
      failed++;
    }
  }
  
  return { migrated, failed };
}
