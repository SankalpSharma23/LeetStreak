/**
 * GitHub Sync Constants & Configuration
 * 
 * IMPORTANT: Before using Device Flow, you need to:
 * 1. Go to https://github.com/settings/developers
 * 2. Click "New OAuth App"
 * 3. Fill in:
 *    - App name: LeetStreak
 *    - Homepage URL: https://github.com/your-username/leetstreak
 *    - Callback URL: https://github.com/ (not used for device flow)
 * 4. Copy the Client ID and paste below
 */

// ═══════════════════════════════════════════════════════════════
// CONFIGURATION - Replace with your OAuth App's Client ID
// ═══════════════════════════════════════════════════════════════

// TODO: Replace this with your GitHub OAuth App Client ID
// Get one at: https://github.com/settings/developers
export const GITHUB_CLIENT_ID = 'Ov23liXXXXXXXXXXXXXX'; // Replace this!

// ═══════════════════════════════════════════════════════════════
// API ENDPOINTS
// ═══════════════════════════════════════════════════════════════

export const GITHUB_API = {
  DEVICE_CODE: 'https://github.com/login/device/code',
  ACCESS_TOKEN: 'https://github.com/login/oauth/access_token',
  USER: 'https://api.github.com/user',
  REPOS: 'https://api.github.com/user/repos',
  CONTENTS: (owner, repo, path) => 
    `https://api.github.com/repos/${owner}/${repo}/contents/${encodeURIComponent(path)}`
};

// ═══════════════════════════════════════════════════════════════
// DEFAULT SETTINGS
// ═══════════════════════════════════════════════════════════════

export const DEFAULT_REPO_NAME = 'leetcode-solutions';

export const DEFAULT_REPO_DESCRIPTION = '🚀 My LeetCode Solutions - Auto-synced by LeetStreak';

// ═══════════════════════════════════════════════════════════════
// FILE ORGANIZATION
// ═══════════════════════════════════════════════════════════════

// Language to file extension mapping
export const LANGUAGE_EXTENSIONS = {
  'python': 'py',
  'python3': 'py',
  'javascript': 'js',
  'typescript': 'ts',
  'java': 'java',
  'cpp': 'cpp',
  'c++': 'cpp',
  'c': 'c',
  'csharp': 'cs',
  'c#': 'cs',
  'go': 'go',
  'golang': 'go',
  'rust': 'rs',
  'swift': 'swift',
  'kotlin': 'kt',
  'ruby': 'rb',
  'scala': 'scala',
  'php': 'php',
  'sql': 'sql',
  'mysql': 'sql',
  'postgresql': 'sql',
  'bash': 'sh',
  'shell': 'sh',
  'r': 'r',
  'racket': 'rkt',
  'erlang': 'erl',
  'elixir': 'ex',
  'dart': 'dart'
};

// Comment styles for different languages
export const COMMENT_STYLES = {
  // Single line comment prefix
  hash: ['python', 'python3', 'ruby', 'r', 'bash', 'shell'],
  slash: ['javascript', 'typescript', 'java', 'cpp', 'c++', 'c', 'csharp', 'c#', 
          'go', 'golang', 'rust', 'swift', 'kotlin', 'scala', 'php', 'dart'],
  dash: ['sql', 'mysql', 'postgresql'],
  percent: ['erlang'],
  semicolon: ['racket']
};

/**
 * Get comment prefix for a language
 */
export function getCommentPrefix(language) {
  const lang = language.toLowerCase();
  
  if (COMMENT_STYLES.hash.includes(lang)) return '#';
  if (COMMENT_STYLES.slash.includes(lang)) return '//';
  if (COMMENT_STYLES.dash.includes(lang)) return '--';
  if (COMMENT_STYLES.percent.includes(lang)) return '%';
  if (COMMENT_STYLES.semicolon.includes(lang)) return ';;';
  
  return '//'; // Default
}

/**
 * Get file extension for a language
 */
export function getFileExtension(language) {
  const lang = language.toLowerCase();
  return LANGUAGE_EXTENSIONS[lang] || 'txt';
}

/**
 * Sanitize a string for use in file/folder names
 */
export function sanitizeForPath(str) {
  return str
    .replace(/[<>:"/\\|?*]/g, '-')  // Replace invalid chars
    .replace(/\s+/g, '-')           // Replace spaces with dashes
    .replace(/--+/g, '-')           // Replace multiple dashes
    .replace(/^-|-$/g, '')          // Remove leading/trailing dashes
    .substring(0, 100);             // Limit length
}

/**
 * Generate file path for a solution
 * Format: {Topic}/{Difficulty}/{number}-{slug}.{ext}
 */
export function generateFilePath(submission) {
  const {
    questionNumber,
    problemSlug,
    language,
    difficulty = 'Medium',
    topics = []
  } = submission;

  // Get primary topic or 'Unsorted'
  const primaryTopic = topics.length > 0 
    ? sanitizeForPath(topics[0]) 
    : 'Unsorted';

  // Sanitize difficulty
  const difficultyFolder = sanitizeForPath(difficulty);

  // Format question number with padding
  const paddedNumber = String(questionNumber || 0).padStart(4, '0');

  // Get file extension
  const extension = getFileExtension(language);

  // Sanitize slug
  const safeSlug = sanitizeForPath(problemSlug || 'solution');

  // Build path: Topic/Difficulty/0001-two-sum.py
  return `${primaryTopic}/${difficultyFolder}/${paddedNumber}-${safeSlug}.${extension}`;
}

/**
 * Generate rich metadata header for code file
 */
export function generateMetadataHeader(submission) {
  const {
    questionNumber,
    problemTitle,
    difficulty,
    topics = [],
    runtime,
    runtimePercentile,
    memory,
    memoryPercentile,
    acceptanceRate,
    problemUrl,
    language
  } = submission;

  const comment = getCommentPrefix(language);
  const divider = '═'.repeat(65);
  
  const lines = [
    `${comment} ${divider}`,
    `${comment} ${questionNumber}. ${problemTitle}`,
    `${comment} ${divider}`,
    `${comment} Difficulty: ${difficulty}`,
    `${comment} Topics: ${topics.join(', ') || 'N/A'}`,
    `${comment}`,
  ];

  // Add performance stats if available
  if (runtime || memory) {
    if (runtime) {
      const percentileStr = runtimePercentile 
        ? ` (Beats ${runtimePercentile}%)` 
        : '';
      lines.push(`${comment} Runtime: ${runtime}${percentileStr}`);
    }
    if (memory) {
      const percentileStr = memoryPercentile 
        ? ` (Beats ${memoryPercentile}%)` 
        : '';
      lines.push(`${comment} Memory: ${memory}${percentileStr}`);
    }
  }

  // Add acceptance rate if available
  if (acceptanceRate) {
    lines.push(`${comment} Acceptance Rate: ${acceptanceRate}%`);
  }

  lines.push(`${comment}`);
  lines.push(`${comment} LeetCode: ${problemUrl || 'N/A'}`);
  lines.push(`${comment} Synced: ${new Date().toISOString()}`);
  lines.push(`${comment} ${divider}`);
  lines.push('');

  return lines.join('\n');
}

/**
 * Generate commit message for a solution
 */
export function generateCommitMessage(submission, isUpdate = false) {
  const { questionNumber, problemTitle, difficulty, language } = submission;
  const action = isUpdate ? 'Update' : 'Add';
  const emoji = {
    'Easy': '🟢',
    'Medium': '🟡', 
    'Hard': '🔴'
  }[difficulty] || '📝';

  return `${emoji} ${action}: ${questionNumber}. ${problemTitle} (${language})`;
}

// ═══════════════════════════════════════════════════════════════
// RATE LIMITING
// ═══════════════════════════════════════════════════════════════

export const RATE_LIMITS = {
  // GitHub API rate limits
  REQUESTS_PER_HOUR: 5000, // Authenticated requests
  MIN_REQUEST_INTERVAL: 100, // Minimum ms between requests
  
  // Device flow specific
  DEVICE_POLL_INTERVAL: 5, // Seconds between polls (GitHub minimum)
  DEVICE_CODE_EXPIRY: 900, // 15 minutes
  
  // Retry settings
  MAX_RETRIES: 3,
  RETRY_DELAY: 1000, // Base delay in ms
  RETRY_BACKOFF: 2 // Exponential backoff multiplier
};

// ═══════════════════════════════════════════════════════════════
// ERROR MESSAGES (User-friendly)
// ═══════════════════════════════════════════════════════════════

export const ERROR_MESSAGES = {
  NETWORK_ERROR: 'Unable to connect to GitHub. Please check your internet connection.',
  INVALID_TOKEN: 'Your GitHub token is invalid or expired. Please reconnect.',
  RATE_LIMITED: 'GitHub rate limit exceeded. Please wait a few minutes.',
  REPO_NOT_FOUND: 'Repository not found. It will be created automatically.',
  PERMISSION_DENIED: 'Permission denied. Please ensure your token has "repo" access.',
  CODE_EXPIRED: 'The authorization code has expired. Please try again.',
  AUTH_DENIED: 'Authorization was denied. Please try again and click "Authorize".',
  UNKNOWN: 'An unexpected error occurred. Please try again.'
};
