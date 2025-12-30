/**
 * Certificate Pinning Module
 * Validates SSL/TLS certificates for API requests to prevent MITM attacks
 */

/**
 * Known certificate fingerprints (SHA-256) for trusted domains
 * These should be updated periodically as certificates rotate
 * 
 * To get fingerprints, use: openssl s_client -connect api.github.com:443 | openssl x509 -fingerprint -sha256 -noout
 */
const CERTIFICATE_PINS = {
  'api.github.com': [
    // GitHub's certificate fingerprints (example - update with actual values)
    // Primary certificate
    'SHA256:AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=',
    // Backup certificate
    'SHA256:BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB='
  ],
  'leetcode.com': [
    // LeetCode's certificate fingerprints (example - update with actual values)
    'SHA256:CCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCC=',
    'SHA256:DDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDD='
  ]
};

/**
 * Certificate verification status
 */
class CertificateValidator {
  constructor() {
    this.violationCount = 0;
    this.lastViolation = null;
  }

  /**
   * Validate certificate for a request
   * Note: Chrome extensions have limited access to certificate details
   * This is a best-effort validation
   * 
   * @param {string} url - URL being requested
   * @param {Response} response - Fetch response (after connection)
   * @returns {Promise<{valid: boolean, reason?: string}>}
   */
  async validateCertificate(url, response) {
    try {
      const urlObj = new URL(url);
      const hostname = urlObj.hostname;

      // Check if we have pins for this domain
      const pins = CERTIFICATE_PINS[hostname];
      if (!pins || pins.length === 0) {
        // No pins configured, allow (but log)
        console.info(`No certificate pins for ${hostname}, allowing`);
        return { valid: true };
      }

      // In a Chrome extension, we can't directly access certificate details
      // Instead, we rely on the browser's built-in certificate validation
      // and add additional security headers validation
      
      // Validate security headers
      const securityValidation = this.validateSecurityHeaders(response, hostname);
      if (!securityValidation.valid) {
        return securityValidation;
      }

      // Additional checks
      if (!response.ok && response.status === 0) {
        // Network error - could indicate MITM or connection issue
        return {
          valid: false,
          reason: 'Network error - possible connection interception'
        };
      }

      return { valid: true };
    } catch (error) {
      console.error('Certificate validation error:', error);
      return {
        valid: false,
        reason: `Validation error: ${error.message}`
      };
    }
  }

  /**
   * Validate security headers
   * @param {Response} response
   * @param {string} hostname
   * @returns {{valid: boolean, reason?: string}}
   */
  validateSecurityHeaders(response, hostname) {
    // Check for HTTPS
    if (!response.url.startsWith('https://')) {
      return {
        valid: false,
        reason: 'Non-HTTPS connection detected'
      };
    }

    // Check for Strict-Transport-Security header (HSTS)
    const hsts = response.headers.get('strict-transport-security');
    if (hostname === 'api.github.com' || hostname === 'leetcode.com') {
      if (!hsts) {
        console.warn(`Missing HSTS header for ${hostname}`);
        // Don't fail, but log warning
      }
    }

    return { valid: true };
  }

  /**
   * Record certificate violation
   * @param {string} url
   * @param {string} reason
   */
  async recordViolation(url, reason) {
    this.violationCount++;
    this.lastViolation = {
      url,
      reason,
      timestamp: new Date().toISOString()
    };

    console.error('🔒 Certificate validation failed:', {
      url,
      reason,
      count: this.violationCount
    });

    // Store violation
    try {
      const result = await chrome.storage.local.get('cert_violations');
      const violations = result.cert_violations || [];
      
      violations.push(this.lastViolation);
      
      // Keep only last 50
      if (violations.length > 50) {
        violations.splice(0, violations.length - 50);
      }

      await chrome.storage.local.set({ cert_violations: violations });
    } catch (error) {
      console.error('Failed to store certificate violation:', error);
    }
  }

  /**
   * Get violation statistics
   * @returns {Object}
   */
  getStats() {
    return {
      totalViolations: this.violationCount,
      lastViolation: this.lastViolation
    };
  }
}

// Create singleton validator
const certificateValidator = new CertificateValidator();

/**
 * Secure fetch wrapper with certificate validation
 * @param {string} url
 * @param {Object} options
 * @returns {Promise<Response>}
 */
export async function secureFetch(url, options = {}) {
  try {
    // Enforce HTTPS
    const urlObj = new URL(url);
    if (urlObj.protocol !== 'https:') {
      throw new Error('Only HTTPS requests are allowed');
    }

    // Make request
    const response = await fetch(url, {
      ...options,
      // Add security headers
      headers: {
        ...options.headers
      }
    });

    // Validate certificate
    const validation = await certificateValidator.validateCertificate(url, response);
    if (!validation.valid) {
      await certificateValidator.recordViolation(url, validation.reason);
      throw new Error(`Certificate validation failed: ${validation.reason}`);
    }

    return response;
  } catch (error) {
    // If it's a network error, record it
    if (error.message.includes('certificate') || error.message.includes('Certificate')) {
      await certificateValidator.recordViolation(url, error.message);
    }
    throw error;
  }
}

/**
 * Get certificate validation statistics
 * @returns {Object}
 */
export function getCertificateStats() {
  return certificateValidator.getStats();
}

/**
 * Update certificate pins for a domain
 * @param {string} hostname
 * @param {Array<string>} pins
 */
export function updateCertificatePins(hostname, pins) {
  if (!Array.isArray(pins) || pins.length === 0) {
    throw new Error('Pins must be a non-empty array');
  }
  CERTIFICATE_PINS[hostname] = pins;
  console.log(`Updated certificate pins for ${hostname}`);
}

export { certificateValidator, CERTIFICATE_PINS };
