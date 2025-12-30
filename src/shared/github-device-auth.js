/**
 * GitHub Device Flow Authentication
 * Serverless OAuth for browser extensions
 * 
 * Flow:
 * 1. Request device code from GitHub
 * 2. User enters code at github.com/login/device
 * 3. Poll for access token
 * 4. Store token securely
 */

import { storeEncryptedToken, retrieveEncryptedToken, removeEncryptedToken } from './secure-token-manager.js';

// GitHub OAuth App Client ID (public - safe to expose)
// TODO: Replace with your own Client ID from https://github.com/settings/developers
const GITHUB_CLIENT_ID = 'YOUR_CLIENT_ID_HERE'; // User needs to replace this

// GitHub API endpoints
const DEVICE_CODE_URL = 'https://github.com/login/device/code';
const ACCESS_TOKEN_URL = 'https://github.com/login/oauth/access_token';
const USER_API_URL = 'https://api.github.com/user';

// Auth states
export const AUTH_STATES = {
  IDLE: 'idle',
  REQUESTING_CODE: 'requesting_code',
  WAITING_FOR_USER: 'waiting_for_user',
  POLLING: 'polling',
  SUCCESS: 'success',
  ERROR: 'error',
  EXPIRED: 'expired',
  DENIED: 'denied'
};

// Error types for better handling
export const AUTH_ERRORS = {
  NETWORK_ERROR: 'network_error',
  INVALID_CLIENT: 'invalid_client',
  RATE_LIMITED: 'rate_limited',
  EXPIRED_CODE: 'expired_code',
  ACCESS_DENIED: 'access_denied',
  SLOW_DOWN: 'slow_down',
  STORAGE_ERROR: 'storage_error',
  UNKNOWN: 'unknown'
};

/**
 * Request a device code from GitHub
 * @returns {Promise<{success: boolean, data?: object, error?: string}>}
 */
export async function requestDeviceCode() {
  try {
    const response = await fetch(DEVICE_CODE_URL, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        client_id: GITHUB_CLIENT_ID,
        scope: 'repo' // Only request repo access
      })
    });

    if (!response.ok) {
      if (response.status === 401 || response.status === 404) {
        return { 
          success: false, 
          error: AUTH_ERRORS.INVALID_CLIENT,
          message: 'Invalid GitHub App configuration. Please use manual token setup.'
        };
      }
      if (response.status === 429) {
        return {
          success: false,
          error: AUTH_ERRORS.RATE_LIMITED,
          message: 'Too many requests. Please wait a moment and try again.'
        };
      }
      throw new Error(`GitHub API error: ${response.status}`);
    }

    const data = await response.json();
    
    // GitHub returns these fields:
    // - device_code: Code to use when polling
    // - user_code: Code user enters on GitHub
    // - verification_uri: URL for user to visit
    // - expires_in: Seconds until codes expire
    // - interval: Minimum seconds between polls
    
    return {
      success: true,
      data: {
        deviceCode: data.device_code,
        userCode: data.user_code,
        verificationUri: data.verification_uri,
        expiresIn: data.expires_in || 900, // Default 15 minutes
        interval: data.interval || 5, // Default 5 seconds
        expiresAt: Date.now() + (data.expires_in || 900) * 1000
      }
    };
  } catch (error) {
    console.error('Device code request failed:', error);
    return {
      success: false,
      error: AUTH_ERRORS.NETWORK_ERROR,
      message: 'Failed to connect to GitHub. Please check your internet connection.'
    };
  }
}

/**
 * Poll GitHub for access token
 * @param {string} deviceCode - The device code from requestDeviceCode
 * @returns {Promise<{success: boolean, token?: string, error?: string, shouldRetry?: boolean}>}
 */
export async function pollForToken(deviceCode) {
  try {
    const response = await fetch(ACCESS_TOKEN_URL, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        client_id: GITHUB_CLIENT_ID,
        device_code: deviceCode,
        grant_type: 'urn:ietf:params:oauth:grant-type:device_code'
      })
    });

    const data = await response.json();

    // Check for errors
    if (data.error) {
      switch (data.error) {
        case 'authorization_pending':
          // User hasn't authorized yet - keep polling
          return { success: false, shouldRetry: true, status: 'pending' };
        
        case 'slow_down':
          // We're polling too fast - increase interval
          return { 
            success: false, 
            shouldRetry: true, 
            status: 'slow_down',
            extraWait: 5 // Add 5 seconds to interval
          };
        
        case 'expired_token':
          return { 
            success: false, 
            error: AUTH_ERRORS.EXPIRED_CODE,
            message: 'The code has expired. Please try again.'
          };
        
        case 'access_denied':
          return { 
            success: false, 
            error: AUTH_ERRORS.ACCESS_DENIED,
            message: 'You denied the authorization request.'
          };
        
        default:
          return { 
            success: false, 
            error: AUTH_ERRORS.UNKNOWN,
            message: data.error_description || 'An unknown error occurred.'
          };
      }
    }

    // Success! We have a token
    if (data.access_token) {
      return {
        success: true,
        token: data.access_token,
        tokenType: data.token_type,
        scope: data.scope
      };
    }

    return {
      success: false,
      error: AUTH_ERRORS.UNKNOWN,
      message: 'Unexpected response from GitHub'
    };
  } catch (error) {
    console.error('Token poll failed:', error);
    return {
      success: false,
      error: AUTH_ERRORS.NETWORK_ERROR,
      message: 'Connection error. Will retry...',
      shouldRetry: true
    };
  }
}

/**
 * Validate a GitHub token and get user info
 * @param {string} token - The access token to validate
 * @returns {Promise<{valid: boolean, user?: object, error?: string}>}
 */
export async function validateToken(token) {
  try {
    const response = await fetch(USER_API_URL, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/vnd.github.v3+json'
      }
    });

    if (!response.ok) {
      if (response.status === 401) {
        return { valid: false, error: 'Token is invalid or expired' };
      }
      if (response.status === 403) {
        // Check if it's a scope issue
        const scopes = response.headers.get('X-OAuth-Scopes');
        if (!scopes || !scopes.includes('repo')) {
          return { valid: false, error: 'Token missing repo permissions' };
        }
      }
      return { valid: false, error: `GitHub API error: ${response.status}` };
    }

    const user = await response.json();
    return {
      valid: true,
      user: {
        login: user.login,
        name: user.name,
        avatarUrl: user.avatar_url,
        email: user.email
      }
    };
  } catch (error) {
    console.error('Token validation failed:', error);
    return { valid: false, error: 'Failed to validate token' };
  }
}

/**
 * Check if a repository exists, create if it doesn't
 * @param {string} token - GitHub access token
 * @param {string} username - GitHub username
 * @param {string} repoName - Repository name
 * @returns {Promise<{success: boolean, created?: boolean, error?: string}>}
 */
export async function ensureRepository(token, username, repoName) {
  try {
    // Check if repo exists
    const checkResponse = await fetch(
      `https://api.github.com/repos/${username}/${repoName}`,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/vnd.github.v3+json'
        }
      }
    );

    if (checkResponse.ok) {
      return { success: true, created: false, exists: true };
    }

    if (checkResponse.status === 404) {
      // Create the repository
      const createResponse = await fetch('https://api.github.com/user/repos', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/vnd.github.v3+json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: repoName,
          description: '🚀 My LeetCode Solutions - Auto-synced by LeetStreak',
          private: false,
          auto_init: true,
          has_issues: false,
          has_projects: false,
          has_wiki: false
        })
      });

      if (createResponse.ok || createResponse.status === 201) {
        return { success: true, created: true };
      }

      const errorData = await createResponse.json();
      if (errorData.errors?.[0]?.message?.includes('already exists')) {
        return { success: true, created: false, exists: true };
      }

      return { success: false, error: errorData.message || 'Failed to create repository' };
    }

    return { success: false, error: `Failed to check repository: ${checkResponse.status}` };
  } catch (error) {
    console.error('Repository check/create failed:', error);
    return { success: false, error: 'Failed to access GitHub' };
  }
}

/**
 * Complete Device Flow authentication manager
 * Handles the entire flow with callbacks for UI updates
 */
export class DeviceFlowManager {
  constructor() {
    this.state = AUTH_STATES.IDLE;
    this.deviceCode = null;
    this.userCode = null;
    this.expiresAt = null;
    this.pollInterval = 5;
    this.pollTimer = null;
    this.callbacks = {};
    this.aborted = false;
  }

  /**
   * Register callbacks for state changes
   */
  on(event, callback) {
    this.callbacks[event] = callback;
  }

  /**
   * Emit event to callback
   */
  emit(event, data) {
    if (this.callbacks[event]) {
      this.callbacks[event](data);
    }
  }

  /**
   * Start the device flow
   */
  async start() {
    this.aborted = false;
    this.state = AUTH_STATES.REQUESTING_CODE;
    this.emit('stateChange', { state: this.state });

    // Request device code
    const codeResult = await requestDeviceCode();
    
    if (!codeResult.success) {
      this.state = AUTH_STATES.ERROR;
      this.emit('error', { 
        type: codeResult.error, 
        message: codeResult.message 
      });
      return { success: false, error: codeResult.error };
    }

    // Store code info
    this.deviceCode = codeResult.data.deviceCode;
    this.userCode = codeResult.data.userCode;
    this.expiresAt = codeResult.data.expiresAt;
    this.pollInterval = codeResult.data.interval;

    this.state = AUTH_STATES.WAITING_FOR_USER;
    this.emit('stateChange', { state: this.state });
    this.emit('codeReady', {
      userCode: this.userCode,
      verificationUri: codeResult.data.verificationUri,
      expiresAt: this.expiresAt,
      expiresIn: codeResult.data.expiresIn
    });

    // Start polling
    return this.startPolling();
  }

  /**
   * Start polling for token
   */
  async startPolling() {
    this.state = AUTH_STATES.POLLING;
    
    while (!this.aborted) {
      // Check if expired
      if (Date.now() > this.expiresAt) {
        this.state = AUTH_STATES.EXPIRED;
        this.emit('error', { 
          type: AUTH_ERRORS.EXPIRED_CODE, 
          message: 'The authorization code has expired. Please try again.' 
        });
        return { success: false, error: AUTH_ERRORS.EXPIRED_CODE };
      }

      // Poll for token
      const result = await pollForToken(this.deviceCode);

      if (result.success) {
        // Success! Validate and store token
        this.state = AUTH_STATES.SUCCESS;
        
        const validation = await validateToken(result.token);
        if (!validation.valid) {
          this.state = AUTH_STATES.ERROR;
          this.emit('error', { 
            type: AUTH_ERRORS.UNKNOWN, 
            message: validation.error 
          });
          return { success: false, error: validation.error };
        }

        this.emit('success', {
          token: result.token,
          user: validation.user
        });

        return { 
          success: true, 
          token: result.token, 
          user: validation.user 
        };
      }

      if (!result.shouldRetry) {
        // Fatal error
        this.state = AUTH_STATES.ERROR;
        if (result.error === AUTH_ERRORS.ACCESS_DENIED) {
          this.state = AUTH_STATES.DENIED;
        }
        this.emit('error', { 
          type: result.error, 
          message: result.message 
        });
        return { success: false, error: result.error };
      }

      // Handle slow_down by increasing interval
      if (result.status === 'slow_down') {
        this.pollInterval += result.extraWait || 5;
      }

      // Update time remaining
      const remaining = Math.max(0, Math.floor((this.expiresAt - Date.now()) / 1000));
      this.emit('tick', { remaining });

      // Wait before next poll
      await this.sleep(this.pollInterval * 1000);
    }

    return { success: false, error: 'aborted' };
  }

  /**
   * Abort the flow
   */
  abort() {
    this.aborted = true;
    this.state = AUTH_STATES.IDLE;
    if (this.pollTimer) {
      clearTimeout(this.pollTimer);
    }
    this.emit('aborted', {});
  }

  /**
   * Sleep helper
   */
  sleep(ms) {
    return new Promise(resolve => {
      this.pollTimer = setTimeout(resolve, ms);
    });
  }

  /**
   * Get remaining time
   */
  getRemainingTime() {
    if (!this.expiresAt) return 0;
    return Math.max(0, Math.floor((this.expiresAt - Date.now()) / 1000));
  }
}

/**
 * Store GitHub credentials securely
 */
export async function storeGitHubCredentials(token, username, repoName) {
  try {
    await storeEncryptedToken('github_token', token);
    await chrome.storage.local.set({
      github_username: username,
      github_repo: repoName,
      github_sync_enabled: true,
      github_auth_method: 'device_flow'
    });
    return { success: true };
  } catch (error) {
    console.error('Failed to store credentials:', error);
    return { success: false, error: 'Failed to save credentials' };
  }
}

/**
 * Clear GitHub credentials
 */
export async function clearGitHubCredentials() {
  try {
    await removeEncryptedToken('github_token');
    await chrome.storage.local.remove([
      'github_username',
      'github_repo',
      'github_sync_enabled',
      'github_auth_method'
    ]);
    return { success: true };
  } catch (error) {
    console.error('Failed to clear credentials:', error);
    return { success: false, error: 'Failed to clear credentials' };
  }
}

/**
 * Get current GitHub connection status
 */
export async function getGitHubStatus() {
  try {
    const data = await chrome.storage.local.get([
      'github_username',
      'github_repo',
      'github_sync_enabled',
      'github_auth_method'
    ]);

    if (!data.github_sync_enabled) {
      return { connected: false };
    }

    const token = await retrieveEncryptedToken('github_token');
    if (!token) {
      return { connected: false };
    }

    return {
      connected: true,
      username: data.github_username,
      repo: data.github_repo,
      authMethod: data.github_auth_method || 'pat'
    };
  } catch (error) {
    console.error('Failed to get GitHub status:', error);
    return { connected: false, error: error.message };
  }
}

export default DeviceFlowManager;
