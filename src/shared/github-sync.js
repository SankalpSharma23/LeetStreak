/**
 * GitHub API Integration for LeetCode Solutions Sync
 * Handles authentication, repository operations, and file management
 */

import { sanitizeCommitMessage, isValidGitHubToken, isValidUrl, RateLimiter } from './validation.js';
import { retrieveEncryptedToken } from './secure-token-manager.js';
import { secureFetch } from './certificate-pinning.js';

const githubRateLimiter = new RateLimiter(60, 3600000); // 60 calls per hour (GitHub's rate limit)

class GitHubSyncManager {
  constructor() {
    this.baseURL = 'https://api.github.com';
    this.token = null;
    this.username = null;
    this.repoName = null;
    this.initialized = false;
  }

  /**
   * Initialize with stored credentials
   */
  async initialize() {
    try {
      const result = await chrome.storage.local.get([
        'github_username',
        'github_repo',
        'github_sync_enabled'
      ]);

      if (!result.github_sync_enabled) {
        return { initialized: false, reason: 'Not enabled' };
      }

      // Retrieve encrypted token
      const token = await retrieveEncryptedToken('github_token');
      if (!token) {
        return { initialized: false, reason: 'Token not found' };
      }

      // Validate token format
      if (!isValidGitHubToken(token)) {
        return { initialized: false, reason: 'Invalid token format' };
      }

      this.token = token;
      this.username = result.github_username;
      this.repoName = result.github_repo || 'leetcode-solutions';
      this.initialized = true;

      return { initialized: true };
    } catch (error) {
      console.error('GitHub sync initialization failed:', error);
      return { initialized: false, error: error.message };
    }
  }

  /**
   * Make authenticated request to GitHub API
   */
  async request(endpoint, options = {}) {
    if (!this.token) {
      throw new Error('GitHub token not initialized');
    }

    // Rate limiting check
    if (!githubRateLimiter.isAllowed()) {
      const waitTime = githubRateLimiter.getTimeUntilReset();
      throw new Error(`GitHub API rate limit exceeded. Please wait ${Math.ceil(waitTime / 60000)} minutes.`);
    }

    // Validate URL
    const url = `${this.baseURL}${endpoint}`;
    if (!isValidUrl(url, ['https:'], ['api.github.com'])) {
      throw new Error('Invalid GitHub API URL');
    }

    // Use secure fetch with certificate validation
    const response = await secureFetch(url, {
      ...options,
      headers: {
        'Authorization': `token ${this.token}`,
        'Accept': 'application/vnd.github.v3+json',
        'Content-Type': 'application/json',
        ...options.headers
      }
    });

    // Handle rate limiting
    if (response.status === 403) {
      const rateLimitRemaining = response.headers.get('X-RateLimit-Remaining');
      const rateLimitReset = response.headers.get('X-RateLimit-Reset');
      
      if (rateLimitRemaining === '0') {
        const resetTime = new Date(rateLimitReset * 1000);
        throw new Error(`Rate limit exceeded. Resets at ${resetTime.toLocaleTimeString()}`);
      }
    }

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `GitHub API error: ${response.status}`);
    }

    return response.json();
  }

  /**
   * Validate GitHub token and get user info
   */
  async validateToken(token) {
    try {
      const response = await fetch(`${this.baseURL}/user`, {
        headers: {
          'Authorization': `token ${token}`,
          'Accept': 'application/vnd.github.v3+json'
        }
      });

      if (!response.ok) {
        return { valid: false, error: 'Invalid token' };
      }

      const userData = await response.json();
      return { 
        valid: true, 
        username: userData.login,
        name: userData.name,
        avatarUrl: userData.avatar_url
      };
    } catch (error) {
      return { valid: false, error: error.message };
    }
  }

  /**
   * Check if repository exists
   */
  async repositoryExists() {
    try {
      await this.request(`/repos/${this.username}/${this.repoName}`);
      return true;
    } catch (error) {
      if (error.message.includes('404')) {
        return false;
      }
      throw error;
    }
  }

  /**
   * Create repository
   */
  async createRepository() {
    try {
      const data = await this.request('/user/repos', {
        method: 'POST',
        body: JSON.stringify({
          name: this.repoName,
          description: sanitizeCommitMessage('My LeetCode solutions - Auto-synced by LeetStreak extension'),
          private: false,
          auto_init: true // Initialize with README
        })
      });

      return { success: true, repoUrl: data.html_url };
    } catch (error) {
      // Repository might already exist
      if (error.message.includes('already exists')) {
        return { success: true, existed: true };
      }
      throw error;
    }
  }

  /**
   * Check if file exists in repository
   */
  async fileExists(path) {
    try {
      await this.request(`/repos/${this.username}/${this.repoName}/contents/${path}`);
      return true;
    } catch (error) {
      if (error.message.includes('404')) {
        return false;
      }
      throw error;
    }
  }

  /**
   * Get file content and SHA (needed for updates)
   */
  async getFile(path) {
    try {
      const data = await this.request(`/repos/${this.username}/${this.repoName}/contents/${path}`);
      const content = atob(data.content); // Decode base64
      return {
        content,
        sha: data.sha,
        exists: true
      };
    } catch (error) {
      if (error.message.includes('404')) {
        return { exists: false };
      }
      throw error;
    }
  }

  /**
   * Create or update a file in the repository
   */
  async pushFile(path, content, message, isUpdate = false, sha = null) {
    try {
      // Ensure repository exists
      const repoExists = await this.repositoryExists();
      if (!repoExists) {
        await this.createRepository();
        // Wait a moment for repo to be ready
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      // Encode content to base64
      const encodedContent = btoa(unescape(encodeURIComponent(content)));

      const body = {
        message,
        content: encodedContent,
        branch: 'main'
      };

      // If updating, include SHA
      if (isUpdate && sha) {
        body.sha = sha;
      }

      const data = await this.request(
        `/repos/${this.username}/${this.repoName}/contents/${path}`,
        {
          method: 'PUT',
          body: JSON.stringify(body)
        }
      );

      return {
        success: true,
        commitUrl: data.commit.html_url,
        fileUrl: data.content.html_url
      };
    } catch (error) {
      throw new Error(`Failed to push file: ${error.message}`);
    }
  }

  /**
   * Sync a LeetCode submission to GitHub
   */
  async syncSubmission(submission) {
    try {
      const { code, language, problemTitle, problemSlug, topics, questionNumber } = submission;

      // Generate file path
      const filePath = this.generateFilePath(problemSlug, questionNumber, language, topics);
      
      // Check if file exists
      const existingFile = await this.getFile(filePath);

      let commitMessage;
      let isUpdate = false;
      let sha = null;

      if (existingFile.exists) {
        // Check if content is the same
        if (existingFile.content.trim() === code.trim()) {
          return {
            success: true,
            skipped: true,
            reason: 'Identical content',
            filePath
          };
        }

        // Different content - decide whether to update or create versioned file
        // For now, we'll update
        commitMessage = sanitizeCommitMessage(`Update: ${problemTitle} (${language})`);
        isUpdate = true;
        sha = existingFile.sha;
      } else {
        commitMessage = sanitizeCommitMessage(`Add: ${problemTitle} (${language})`);
      }

      // Add problem metadata as comment at the top
      const codeWithMetadata = this.addMetadata(code, submission);

      // Push to GitHub
      const result = await this.pushFile(filePath, codeWithMetadata, commitMessage, isUpdate, sha);

      // Track successful sync
      await this.recordSync(submission, filePath, result.fileUrl);

      return {
        success: true,
        filePath,
        commitUrl: result.commitUrl,
        fileUrl: result.fileUrl
      };
    } catch (error) {
      // Record failed sync
      await this.recordFailedSync(submission, error.message);
      throw error;
    }
  }

  /**
   * Generate file path based on organization preference
   */
  generateFilePath(problemSlug, questionNumber, language, topics = []) {
    const ext = this.languageToExtension(language);
    const number = String(questionNumber).padStart(4, '0');
    const filename = `${number}-${problemSlug}.${ext}`;

    // Use primary topic as folder, or 'Unsorted' if no topics
    const folder = (topics && topics.length > 0) ? topics[0] : 'Unsorted';
    const sanitizedFolder = this.sanitizePath(folder);

    return `${sanitizedFolder}/${filename}`;
  }

  /**
   * Map language to file extension
   */
  languageToExtension(language) {
    const map = {
      'python': 'py',
      'python3': 'py',
      'javascript': 'js',
      'typescript': 'ts',
      'java': 'java',
      'cpp': 'cpp',
      'c': 'c',
      'csharp': 'cs',
      'go': 'go',
      'rust': 'rs',
      'swift': 'swift',
      'kotlin': 'kt',
      'ruby': 'rb',
      'scala': 'scala',
      'php': 'php'
    };
    return map[language.toLowerCase()] || 'txt';
  }

  /**
   * Sanitize path/folder name
   */
  sanitizePath(path) {
    return path
      .replace(/[<>:"/\\|?*]/g, '-')
      .replace(/\s+/g, '-')
      .replace(/--+/g, '-')
      .replace(/^-|-$/g, '');
  }

  /**
   * Add metadata comment to code
   */
  addMetadata(code, submission) {
    const { problemTitle, difficulty, topics, questionNumber, problemUrl } = submission;
    const commentChar = this.getCommentChar(submission.language);

    const metadata = [
      `${commentChar} ${questionNumber}. ${problemTitle}`,
      `${commentChar} Difficulty: ${difficulty}`,
      `${commentChar} Topics: ${topics.join(', ')}`,
      `${commentChar} LeetCode: ${problemUrl || `https://leetcode.com/problems/${submission.problemSlug}/`}`,
      `${commentChar} Synced: ${new Date().toISOString()}`,
      '',
      code
    ];

    return metadata.join('\n');
  }

  /**
   * Get comment character for language
   */
  getCommentChar(language) {
    const singleLine = {
      'python': '#',
      'python3': '#',
      'javascript': '//',
      'typescript': '//',
      'java': '//',
      'cpp': '//',
      'c': '//',
      'csharp': '//',
      'go': '//',
      'rust': '//',
      'swift': '//',
      'kotlin': '//',
      'php': '//',
      'scala': '//'
    };
    return singleLine[language.toLowerCase()] || '//';
  }

  /**
   * Record successful sync
   */
  async recordSync(submission, filePath, fileUrl) {
    try {
      const result = await chrome.storage.local.get(['synced_problems', 'recent_syncs']);
      const synced = result.synced_problems || [];
      const recent = result.recent_syncs || [];

      // Add to synced list
      synced.push({
        problemSlug: submission.problemSlug,
        language: submission.language,
        filePath,
        fileUrl,
        timestamp: Date.now()
      });

      // Add to recent syncs (keep last 20)
      recent.unshift({
        problemTitle: submission.problemTitle,
        language: submission.language,
        status: 'success',
        timestamp: Date.now()
      });

      await chrome.storage.local.set({
        synced_problems: synced,
        recent_syncs: recent.slice(0, 20)
      });
    } catch (error) {
      console.error('Failed to record sync:', error);
    }
  }

  /**
   * Record failed sync
   */
  async recordFailedSync(submission, errorMessage) {
    try {
      const result = await chrome.storage.local.get(['failed_syncs', 'recent_syncs']);
      const failed = result.failed_syncs || [];
      const recent = result.recent_syncs || [];

      failed.push({
        submission,
        error: errorMessage,
        timestamp: Date.now(),
        retryCount: 0
      });

      recent.unshift({
        problemTitle: submission.problemTitle,
        language: submission.language,
        status: 'failed',
        error: errorMessage,
        timestamp: Date.now()
      });

      await chrome.storage.local.set({
        failed_syncs: failed,
        recent_syncs: recent.slice(0, 20)
      });
    } catch (error) {
      console.error('Failed to record failed sync:', error);
    }
  }

  /**
   * Check current rate limit status
   */
  async getRateLimit() {
    try {
      const data = await this.request('/rate_limit');
      return {
        limit: data.rate.limit,
        remaining: data.rate.remaining,
        reset: new Date(data.rate.reset * 1000)
      };
    } catch (error) {
      return null;
    }
  }
}

// Export singleton instance
const githubSync = new GitHubSyncManager();
export default githubSync;
