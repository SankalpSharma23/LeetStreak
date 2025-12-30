# Security Documentation

## Overview
LeetStreak implements comprehensive security measures to protect user data and prevent common web vulnerabilities.

## Security Features Implemented

### 1. Content Security Policy (CSP)
**Location:** `public/manifest.json`

The extension enforces strict CSP headers:
```json
"content_security_policy": {
  "extension_pages": "script-src 'self'; object-src 'none'; base-uri 'self'; form-action 'none'; frame-ancestors 'none'; upgrade-insecure-requests;",
  "sandbox": "sandbox allow-scripts; script-src 'self'"
}
```

**Protection:**
- Only allows scripts from the extension itself (no external scripts)
- Blocks all object embeds (Flash, Java applets)
- Prevents clickjacking with `frame-ancestors 'none'`
- Upgrades all HTTP requests to HTTPS

### 2. Input Validation & Sanitization
**Location:** `src/shared/security-utils.js`, `src/shared/validation.js`

#### Username Validation
```javascript
validateUsername(username, minLength = 1, maxLength = 50)
```
- Strips whitespace
- Validates length (1-50 characters)
- Only allows alphanumeric, underscore, and hyphen
- Normalizes to lowercase

#### GitHub Token Validation
```javascript
isValidGitHubToken(token)
```
- Validates Personal Access Token format: `ghp_[A-Za-z0-9]{36}`
- Validates Fine-grained token format: `github_pat_[A-Za-z0-9_]{82}`
- Rejects malformed tokens before API calls

#### URL Validation
```javascript
isValidUrl(url, allowedProtocols = ['https:'], allowedHosts = null)
```
- Ensures only HTTPS URLs are used
- Optional host whitelist enforcement
- Prevents SSRF attacks

#### HTML Sanitization
```javascript
escapeHtml(text)
sanitizeText(text)
```
- Escapes HTML special characters: `& < > " ' /`
- Strips all HTML tags for aggressive sanitization
- Used before any DOM insertion

### 3. XSS Prevention
**Location:** `src/content/leetcode-integration.js`

#### DOM-based Element Creation
Replaced all `innerHTML` usage with safe DOM manipulation:

**Before (Vulnerable):**
```javascript
button.innerHTML = `<span>${userInput}</span>`;
```

**After (Secure):**
```javascript
const span = document.createElement('span');
span.textContent = userInput; // Automatically escapes
button.appendChild(span);
```

#### Safe Element Creation Helper
```javascript
createSafeElement(tag, text = '', attributes = {})
```
- Uses `textContent` instead of `innerHTML`
- Blocks inline event handlers (onclick, onmouseover, etc.)
- Safe attribute assignment

### 4. Rate Limiting
**Location:** `src/shared/security-utils.js`

#### RateLimiter Class
```javascript
const limiter = new RateLimiter(maxCalls, windowMs);
if (limiter.isAllowed()) {
  // Make API call
}
```

**Implementation:**
- **LeetCode API:** 30 calls per minute
- **GitHub API:** 60 calls per hour (matches GitHub's limits)
- Token bucket algorithm
- Prevents API abuse and DoS

**Usage:**
```javascript
// leetcode-api.js
const apiRateLimiter = new RateLimiter(30, 60000);

// github-sync.js
const githubRateLimiter = new RateLimiter(60, 3600000);
```

### 5. Secure Data Storage
**Location:** `src/shared/security-utils.js`

#### SecureStorage Class
Encryption utilities using Web Crypto API:

```javascript
// Encrypt sensitive data
const encrypted = await SecureStorage.encrypt(data, password);

// Decrypt
const decrypted = await SecureStorage.decrypt(encrypted, password);
```

**Features:**
- AES-256-GCM encryption
- PBKDF2 key derivation (100,000 iterations)
- Random salt and IV for each encryption
- Base64 encoding for storage

**Note:** Currently GitHub tokens are stored in plain text in `chrome.storage.local`. For production, consider:
```javascript
// Encrypt before storage
const encrypted = await SecureStorage.encrypt(token, userPassword);
await chrome.storage.local.set({ github_token_encrypted: encrypted });
```

### 6. API Security

#### GitHub API
- Token format validation before requests
- HTTPS-only communication
- Rate limit enforcement
- URL validation
- Error message sanitization

#### LeetCode API
- CORS-safe GraphQL requests
- Timeout protection (10 seconds)
- Retry with exponential backoff
- Rate limit handling (429 responses)
- Offline detection

### 7. Secure Communication
**All API calls use HTTPS:**
```javascript
"host_permissions": [
  "https://leetcode.com/*",
  "https://leetcode.com/graphql",
  "https://api.github.com/*"
]
```

### 8. Additional Security Measures

#### Origin Validation
```javascript
isTrustedOrigin(origin)
```
Validates message origins for cross-context communication.

#### Secure Random Generation
```javascript
generateSecureRandom(length = 32)
```
Uses `crypto.getRandomValues()` for cryptographically secure randomness.

#### JSON Validation
```javascript
safeJsonParse(jsonString, schema = null)
```
- Validates JSON structure
- Type checking against schema
- Prevents injection via malformed JSON

## Security Best Practices

### For Developers

1. **Never use `innerHTML` with user input**
   - Use `textContent` or `createTextNode()`
   - If HTML is required, use `createSafeElement()`

2. **Always validate input**
   ```javascript
   const result = validateUsername(input);
   if (!result.valid) {
     throw new Error(result.error);
   }
   ```

3. **Sanitize before storage**
   ```javascript
   const clean = sanitizeCommitMessage(userMessage);
   await saveToStorage(clean);
   ```

4. **Check rate limits**
   ```javascript
   if (!rateLimiter.isAllowed()) {
     const wait = rateLimiter.getTimeUntilReset();
     throw new Error(`Rate limited. Wait ${wait}ms`);
   }
   ```

5. **Validate URLs before fetch**
   ```javascript
   if (!isValidUrl(url, ['https:'], ['api.github.com'])) {
     throw new Error('Invalid URL');
   }
   ```

### For Users

1. **GitHub Token Security**
   - Use Fine-grained tokens with minimal permissions
   - Set token expiration
   - Only grant `repo` access (no admin, user, or org permissions)
   - Revoke tokens when extension is uninstalled

2. **Data Privacy**
   - All data stored locally in browser storage
   - No external analytics or tracking
   - GitHub sync is optional

3. **Extension Permissions**
   - `storage`: Local data persistence
   - `alarms`: Background sync scheduling
   - `notifications`: Streak reminders
   - `tabs`: Reading LeetCode problem pages
   - Host permissions limited to LeetCode and GitHub APIs

## Threat Model

### Protected Against
✅ XSS (Cross-Site Scripting)
✅ HTML Injection
✅ CSRF (Cross-Site Request Forgery)
✅ Clickjacking
✅ Rate limit abuse
✅ SSRF (Server-Side Request Forgery)
✅ Malformed input attacks
✅ Token format manipulation

### Partial Protection
⚠️ Token theft (stored in plain text - encryption recommended for production)
⚠️ Man-in-the-middle (relies on HTTPS, but no certificate pinning)

### Out of Scope
❌ Browser vulnerabilities
❌ Operating system security
❌ Physical access to device
❌ Compromised GitHub account

## Security Audit Checklist

- [x] Content Security Policy implemented
- [x] Input validation on all user inputs
- [x] HTML escaping before DOM insertion
- [x] No `eval()` or `Function()` constructor usage
- [x] HTTPS-only API communication
- [x] Rate limiting on external APIs
- [x] Secure random number generation
- [x] Origin validation for messages
- [x] Token format validation
- [x] URL validation before fetch
- [ ] Token encryption (recommended for production)
- [x] Error message sanitization
- [x] No sensitive data in console logs
- [x] Minimal extension permissions
- [x] No external script dependencies in CSP

## Incident Response

If a security vulnerability is discovered:

1. **Do not disclose publicly** until a fix is available
2. Report to the extension maintainers privately
3. Include:
   - Description of vulnerability
   - Steps to reproduce
   - Potential impact
   - Suggested fix (if any)

## Future Security Enhancements

1. **Token Encryption**
   - Encrypt GitHub tokens before storage
   - Use user-provided password or browser's credential management API

2. **Certificate Pinning**
   - Pin GitHub and LeetCode API certificates
   - Detect MITM attacks

3. **Content Security Policy Reporting**
   - Add CSP violation reporting
   - Monitor for attack attempts

4. **Security Headers**
   - Implement additional security headers for extension pages

5. **Automated Security Scanning**
   - Add SAST tools to CI/CD pipeline
   - Regular dependency vulnerability scans

## References

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Chrome Extension Security](https://developer.chrome.com/docs/extensions/mv3/security/)
- [Web Crypto API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Crypto_API)
- [Content Security Policy](https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP)
