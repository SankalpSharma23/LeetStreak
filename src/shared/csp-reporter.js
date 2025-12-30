/**
 * CSP Violation Reporter
 * Monitors and logs Content Security Policy violations
 */

class CSPViolationReporter {
  constructor() {
    this.violations = [];
    this.maxViolations = 100; // Keep last 100 violations
    this.setupListener();
  }

  /**
   * Set up CSP violation listener
   */
  setupListener() {
    if (typeof document !== 'undefined') {
      document.addEventListener('securitypolicyviolation', (e) => {
        this.handleViolation(e);
      });
    }
  }

  /**
   * Handle CSP violation
   * @param {SecurityPolicyViolationEvent} event
   */
  handleViolation(event) {
    const violation = {
      timestamp: new Date().toISOString(),
      blockedURI: event.blockedURI,
      violatedDirective: event.violatedDirective,
      effectiveDirective: event.effectiveDirective,
      originalPolicy: event.originalPolicy,
      sourceFile: event.sourceFile,
      lineNumber: event.lineNumber,
      columnNumber: event.columnNumber,
      statusCode: event.statusCode,
      documentURI: event.documentURI
    };

    // Log to console
    console.warn('🚨 CSP Violation Detected:', {
      directive: violation.violatedDirective,
      blocked: violation.blockedURI,
      source: `${violation.sourceFile}:${violation.lineNumber}:${violation.columnNumber}`
    });

    // Store violation
    this.violations.push(violation);
    if (this.violations.length > this.maxViolations) {
      this.violations.shift(); // Remove oldest
    }

    // Store in chrome.storage for analysis
    this.persistViolation(violation);

    // Send to background for potential alerts
    if (typeof chrome !== 'undefined' && chrome.runtime) {
      chrome.runtime.sendMessage({
        type: 'CSP_VIOLATION',
        violation: violation
      }).catch(() => {
        // Service worker might not be ready, ignore
      });
    }
  }

  /**
   * Persist violation to storage
   * @param {Object} violation
   */
  async persistViolation(violation) {
    try {
      const result = await chrome.storage.local.get('csp_violations');
      const violations = result.csp_violations || [];
      
      violations.push(violation);
      
      // Keep only last 100
      if (violations.length > 100) {
        violations.splice(0, violations.length - 100);
      }

      await chrome.storage.local.set({ csp_violations: violations });
    } catch (error) {
      console.error('Failed to persist CSP violation:', error);
    }
  }

  /**
   * Get all violations
   * @returns {Array<Object>}
   */
  getViolations() {
    return [...this.violations];
  }

  /**
   * Get violations summary
   * @returns {Object}
   */
  getSummary() {
    const summary = {
      total: this.violations.length,
      byDirective: {},
      bySource: {},
      recent: this.violations.slice(-10)
    };

    this.violations.forEach(v => {
      // Count by directive
      const directive = v.violatedDirective;
      summary.byDirective[directive] = (summary.byDirective[directive] || 0) + 1;

      // Count by source
      const source = v.sourceFile || 'unknown';
      summary.bySource[source] = (summary.bySource[source] || 0) + 1;
    });

    return summary;
  }

  /**
   * Clear all violations
   */
  async clearViolations() {
    this.violations = [];
    await chrome.storage.local.remove('csp_violations');
  }

  /**
   * Export violations as JSON
   * @returns {string}
   */
  exportViolations() {
    return JSON.stringify({
      exportDate: new Date().toISOString(),
      summary: this.getSummary(),
      violations: this.violations
    }, null, 2);
  }
}

// Create singleton instance
export const cspReporter = new CSPViolationReporter();

// Export class for testing
export { CSPViolationReporter };
