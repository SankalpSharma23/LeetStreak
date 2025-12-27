/**
 * Input Validation & Sanitization
 * Prevents XSS and validates user inputs
 */

/**
 * Validate and normalize username
 * @param {string} username - Raw username input
 * @returns {string} Normalized username
 * @throws {Error} If username is invalid
 */
export function validateUsername(username) {
  if (!username || typeof username !== 'string') {
    throw new Error('Username is required');
  }
  
  // Remove whitespace
  username = username.trim();
  
  // Check length
  if (username.length < 1 || username.length > 50) {
    throw new Error('Username must be 1-50 characters');
  }
  
  // Only allow alphanumeric, underscore, hyphen
  const usernameRegex = /^[a-zA-Z0-9_-]+$/;
  if (!usernameRegex.test(username)) {
    throw new Error('Username contains invalid characters. Only letters, numbers, underscore, and hyphen are allowed.');
  }
  
  // Normalize to lowercase for storage consistency
  return username.toLowerCase();
}

/**
 * Escape HTML to prevent XSS
 * @param {string} text - Text to escape
 * @returns {string} Escaped text
 */
export function escapeHtml(text) {
  if (typeof text !== 'string') return text;
  
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return text.replace(/[&<>"']/g, m => map[m]);
}

/**
 * Sanitize commit message for GitHub
 * @param {string} message - Raw commit message
 * @returns {string} Sanitized message
 */
export function sanitizeCommitMessage(message) {
  if (typeof message !== 'string') return '';
  
  // Remove potentially dangerous characters but keep meaningful ones
  return message.replace(/[<>]/g, '').trim();
}
