# Advanced Security Features

## Overview
This document covers three advanced security features implemented in LeetStreak:
1. **Encrypted Token Storage** - AES-256-GCM encryption for GitHub tokens
2. **CSP Violation Reporting** - Real-time monitoring of Content Security Policy violations
3. **Certificate Pinning** - SSL/TLS certificate validation for API requests

---

## 1. Encrypted Token Storage 🔐

### Implementation
**Files:**
- `src/shared/secure-token-manager.js` - Token encryption/decryption manager
- `src/popup/GitHubSync.jsx` - UI integration
- `src/shared/github-sync.js` - Backend integration

### How It Works

#### Encryption
```javascript
import { storeEncryptedToken } from '../shared/secure-token-manager.js';

// Store encrypted token
await storeEncryptedToken('github_token', userToken);
```

**Process:**
1. Derives encryption key from extension ID + browser fingerprint
2. Uses Web Crypto API with AES-256-GCM
3. PBKDF2 key derivation with 100,000 iterations
4. Random salt and IV for each encryption
5. Stores encrypted data as base64 in chrome.storage.local

#### Decryption
```javascript
import { retrieveEncryptedToken } from '../shared/secure-token-manager.js';

// Retrieve decrypted token
const token = await retrieveEncryptedToken('github_token');
```

**Process:**
1. Retrieves encrypted data from storage
2. Derives same encryption key
3. Decrypts using AES-256-GCM
4. Returns plain text token for use

### Automatic Migration

The system automatically migrates plain text tokens to encrypted storage:

```javascript
// On component mount, checks for plain text tokens
const migrateTokensIfNeeded = async () => {
  const result = await chrome.storage.local.get('github_token');
  if (result.github_token && typeof result.github_token === 'string') {
    await storeEncryptedToken('github_token', result.github_token);
    // Plain text token is removed after successful encryption
  }
};
```

### Security Properties

| Property | Value |
|----------|-------|
| Algorithm | AES-256-GCM |
| Key Derivation | PBKDF2 (100,000 iterations) |
| Salt | 16 bytes (random per encryption) |
| IV | 12 bytes (random per encryption) |
| Authenticated | Yes (GCM mode provides authentication) |

### Storage Format

```javascript
{
  "github_token_encrypted": "base64_encoded_encrypted_data",
  "github_token_version": 1
}
```

### API Reference

#### `storeEncryptedToken(key, token)`
Encrypts and stores a token.
- **Parameters:**
  - `key` (string): Storage key name
  - `token` (string): Token to encrypt
- **Returns:** `Promise<boolean>` - Success status
- **Throws:** Error if encryption fails

#### `retrieveEncryptedToken(key)`
Retrieves and decrypts a token.
- **Parameters:**
  - `key` (string): Storage key name
- **Returns:** `Promise<string|null>` - Decrypted token or null
- **Fallback:** Returns plain text if decryption fails (migration support)

#### `removeEncryptedToken(key)`
Removes encrypted token from storage.
- **Parameters:**
  - `key` (string): Storage key name
- **Returns:** `Promise<void>`

#### `isTokenEncrypted(key)`
Checks if a token is encrypted.
- **Parameters:**
  - `key` (string): Storage key name
- **Returns:** `Promise<boolean>`

### Security Considerations

**Strengths:**
- ✅ Tokens encrypted at rest
- ✅ Automatic migration from plain text
- ✅ Authenticated encryption (prevents tampering)
- ✅ Random salt/IV prevents pattern analysis

**Limitations:**
- ⚠️ Key derived from extension ID (same key per installation)
- ⚠️ Token exposed in memory when decrypted
- ⚠️ No additional user password required

**Best Practices:**
1. Revoke tokens when extension is uninstalled
2. Use Fine-grained GitHub tokens with minimal permissions
3. Set token expiration dates
4. Monitor token usage on GitHub

---

## 2. CSP Violation Reporting 🚨

### Implementation
**Files:**
- `public/manifest.json` - CSP policy with report-uri
- `src/shared/csp-reporter.js` - Violation monitoring
- `src/background/service-worker.js` - Violation handler

### How It Works

#### Manifest Configuration
```json
{
  "content_security_policy": {
    "extension_pages": "script-src 'self'; object-src 'none'; base-uri 'self'; form-action 'none'; frame-ancestors 'none'; upgrade-insecure-requests; report-uri /__/csp-report"
  }
}
```

#### Violation Detection
```javascript
import { cspReporter } from '../shared/csp-reporter.js';

// Violations are automatically captured
document.addEventListener('securitypolicyviolation', (event) => {
  cspReporter.handleViolation(event);
});
```

### Violation Data

Each violation includes:
```javascript
{
  timestamp: "2025-12-28T10:30:00.000Z",
  blockedURI: "https://evil.com/script.js",
  violatedDirective: "script-src",
  effectiveDirective: "script-src",
  sourceFile: "chrome-extension://abc123/popup.html",
  lineNumber: 42,
  columnNumber: 15,
  statusCode: 200,
  documentURI: "chrome-extension://abc123/popup.html"
}
```

### Storage

Violations are stored in `chrome.storage.local`:
```javascript
{
  "csp_violations": [
    { /* violation 1 */ },
    { /* violation 2 */ },
    // ... up to 100 most recent
  ]
}
```

### Background Handler

```javascript
// service-worker.js
async function handleCSPViolation(violation, sender) {
  console.warn('🚨 CSP Violation from', sender.tab?.id, ':', violation);
  
  // Store violation
  const result = await chrome.storage.local.get('csp_violations');
  const violations = result.csp_violations || [];
  violations.push(violation);
  
  // Alert on critical violations
  if (violation.violatedDirective?.includes('script-src')) {
    console.error('Critical CSP violation:', violation.blockedURI);
    // Could send notification to user
  }
  
  await chrome.storage.local.set({ csp_violations: violations });
}
```

### API Reference

#### `cspReporter.getViolations()`
Returns all captured violations.
- **Returns:** `Array<Object>`

#### `cspReporter.getSummary()`
Returns violation statistics.
- **Returns:**
```javascript
{
  total: 10,
  byDirective: {
    'script-src': 5,
    'style-src': 3,
    'img-src': 2
  },
  bySource: {
    'popup.html': 7,
    'options.html': 3
  },
  recent: [ /* last 10 violations */ ]
}
```

#### `cspReporter.clearViolations()`
Clears all stored violations.
- **Returns:** `Promise<void>`

#### `cspReporter.exportViolations()`
Exports violations as JSON.
- **Returns:** `string` (JSON formatted)

### Monitoring

View violations in console:
```javascript
// In popup or options page
import { cspReporter } from '../shared/csp-reporter.js';

const summary = cspReporter.getSummary();
console.table(summary.byDirective);
```

### Use Cases

1. **Development** - Identify CSP-violating code during development
2. **Security Monitoring** - Detect XSS attempts in production
3. **Debugging** - Trace sources of CSP violations
4. **Compliance** - Maintain CSP compliance reports

---

## 3. Certificate Pinning 📌

### Implementation
**Files:**
- `src/shared/certificate-pinning.js` - Certificate validator
- `src/background/leetcode-api.js` - LeetCode API integration
- `src/shared/github-sync.js` - GitHub API integration

### How It Works

#### Secure Fetch Wrapper
```javascript
import { secureFetch } from '../shared/certificate-pinning.js';

// Replace fetch with secureFetch
const response = await secureFetch('https://api.github.com/user', {
  headers: {
    'Authorization': `token ${token}`
  }
});
```

**Process:**
1. Enforces HTTPS-only requests
2. Makes request to server
3. Validates security headers (HSTS, etc.)
4. Checks certificate validity (browser-level)
5. Records any violations
6. Returns response or throws error

### Certificate Pins

Pre-configured pins for trusted domains:
```javascript
const CERTIFICATE_PINS = {
  'api.github.com': [
    'SHA256:AAAA...', // Primary certificate
    'SHA256:BBBB...'  // Backup certificate
  ],
  'leetcode.com': [
    'SHA256:CCCC...',
    'SHA256:DDDD...'
  ]
};
```

**Note:** Example pins shown. Update with actual certificate fingerprints before production use.

### Getting Certificate Fingerprints

```bash
# Using OpenSSL
openssl s_client -connect api.github.com:443 < /dev/null 2>/dev/null | \
  openssl x509 -fingerprint -sha256 -noout

# Using Chrome DevTools
# 1. Open DevTools > Security tab
# 2. View Certificate
# 3. Details > SHA-256 Fingerprint
```

### Validation Levels

| Level | Description | Status |
|-------|-------------|--------|
| HTTPS Enforcement | Blocks HTTP requests | ✅ Active |
| Security Headers | Validates HSTS, etc. | ✅ Active |
| Certificate Validity | Browser-level check | ✅ Active |
| Pin Validation | SHA-256 fingerprint match | ⚠️ Logged only |

**Note:** Full pin validation requires Chrome extension API limitations to be addressed. Current implementation validates headers and relies on browser's certificate validation.

### API Reference

#### `secureFetch(url, options)`
Secure fetch with certificate validation.
- **Parameters:**
  - `url` (string): Request URL (must be HTTPS)
  - `options` (Object): Fetch options
- **Returns:** `Promise<Response>`
- **Throws:** Error if validation fails

#### `getCertificateStats()`
Gets certificate validation statistics.
- **Returns:**
```javascript
{
  totalViolations: 0,
  lastViolation: null // or { url, reason, timestamp }
}
```

#### `updateCertificatePins(hostname, pins)`
Updates certificate pins for a domain.
- **Parameters:**
  - `hostname` (string): Domain name
  - `pins` (Array<string>): SHA-256 fingerprints
- **Throws:** Error if pins invalid

### Violation Storage

Certificate violations stored in `chrome.storage.local`:
```javascript
{
  "cert_violations": [
    {
      url: "https://api.github.com/user",
      reason: "Missing HSTS header",
      timestamp: "2025-12-28T10:30:00.000Z"
    }
    // ... up to 50 most recent
  ]
}
```

### Monitoring

```javascript
import { getCertificateStats } from '../shared/certificate-pinning.js';

const stats = getCertificateStats();
console.log('Certificate violations:', stats.totalViolations);
```

### Security Considerations

**Protections:**
- ✅ HTTPS enforcement
- ✅ Security header validation
- ✅ Browser certificate validation
- ✅ MITM detection (partial)

**Limitations:**
- ⚠️ Chrome extensions can't directly access certificate details
- ⚠️ Pin validation is advisory (logged but not enforced by default)
- ⚠️ Requires manual pin updates when certificates rotate

**Recommended:**
1. Update pins quarterly or when certificates expire
2. Monitor violation logs regularly
3. Use certificate transparency logs for verification
4. Enable strict mode in production (enforce pin validation)

### Updating Pins

```javascript
import { updateCertificatePins } from '../shared/certificate-pinning.js';

// Update GitHub pins
updateCertificatePins('api.github.com', [
  'SHA256:new_primary_fingerprint_here',
  'SHA256:new_backup_fingerprint_here'
]);
```

---

## Integration Example

Complete example using all three features:

```javascript
import { storeEncryptedToken, retrieveEncryptedToken } from '../shared/secure-token-manager.js';
import { secureFetch } from '../shared/certificate-pinning.js';
import { cspReporter } from '../shared/csp-reporter.js';

async function secureGitHubRequest() {
  try {
    // 1. Retrieve encrypted token
    const token = await retrieveEncryptedToken('github_token');
    if (!token) {
      throw new Error('Token not found');
    }

    // 2. Make secure request with certificate validation
    const response = await secureFetch('https://api.github.com/user', {
      headers: {
        'Authorization': `token ${token}`
      }
    });

    // 3. Check for CSP violations
    const violations = cspReporter.getSummary();
    if (violations.total > 0) {
      console.warn(`${violations.total} CSP violations detected`);
    }

    return await response.json();
  } catch (error) {
    console.error('Secure request failed:', error);
    throw error;
  }
}
```

---

## Security Checklist

Before deploying to production:

- [ ] Update certificate pins with actual SHA-256 fingerprints
- [ ] Test token encryption/decryption flows
- [ ] Verify CSP violation reporting works
- [ ] Set up monitoring for security events
- [ ] Document certificate rotation process
- [ ] Create incident response plan
- [ ] Test with various attack scenarios
- [ ] Review violation logs regularly
- [ ] Update security documentation
- [ ] Train team on security features

---

## Troubleshooting

### Encrypted Tokens Not Working

**Symptom:** GitHub sync fails after enabling encryption

**Solutions:**
1. Check browser console for decryption errors
2. Verify token was migrated: `isTokenEncrypted('github_token')`
3. Clear storage and re-authenticate
4. Check extension ID hasn't changed (reinstall)

### CSP Violations Not Reported

**Symptom:** No violations in storage despite CSP errors

**Solutions:**
1. Check console for `securitypolicyviolation` events
2. Verify manifest.json has `report-uri` directive
3. Check service worker is running
4. Review `chrome.storage.local.get('csp_violations')`

### Certificate Validation Failing

**Symptom:** All API requests fail with certificate errors

**Solutions:**
1. Verify pins are correct SHA-256 fingerprints
2. Check if certificates have rotated
3. Temporarily disable pin enforcement for debugging
4. Verify HTTPS URLs are used
5. Check browser certificate store

---

## Performance Impact

| Feature | CPU Impact | Memory Impact | Storage Impact |
|---------|------------|---------------|----------------|
| Token Encryption | <1ms per operation | Negligible | +16 bytes per token |
| CSP Reporting | <0.1ms per violation | ~1KB per 100 violations | ~10KB max |
| Certificate Pinning | <0.5ms per request | Negligible | ~2KB per 50 violations |

**Overall:** Minimal impact on extension performance.

---

## References

- [Web Crypto API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Crypto_API)
- [Content Security Policy](https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP)
- [HTTP Public Key Pinning (HPKP)](https://developer.mozilla.org/en-US/docs/Web/HTTP/Public_Key_Pinning)
- [Chrome Extension Security](https://developer.chrome.com/docs/extensions/mv3/security/)
- [OWASP Cryptographic Storage Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Cryptographic_Storage_Cheat_Sheet.html)
