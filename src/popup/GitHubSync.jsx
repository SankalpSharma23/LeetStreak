import React, { useState, useEffect } from 'react';
import { Github, HelpCircle, ExternalLink, ChevronDown, ChevronUp, CheckCircle2, AlertTriangle, Loader2, Rocket, FileCode2 } from 'lucide-react';

function GitHubSync() {
  const [isEnabled, setIsEnabled] = useState(false);
  const [token, setToken] = useState('');
  const [username, setUsername] = useState('');
  const [repoName, setRepoName] = useState('leetcode-solutions');
  const [isValidating, setIsValidating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [syncStats, setSyncStats] = useState({ total: 0, pending: 0, failed: 0 });
  const [recentSyncs, setRecentSyncs] = useState([]);
  const [showToken, setShowToken] = useState(false);
  const [showGuide, setShowGuide] = useState(false);

  useEffect(() => {
    loadSettings();
    loadSyncStats();
  }, []);

  const loadSettings = async () => {
    try {
      const result = await chrome.storage.local.get([
        'github_sync_enabled',
        'github_username',
        'github_repo'
      ]);
      
      setIsEnabled(result.github_sync_enabled || false);
      setUsername(result.github_username || '');
      setRepoName(result.github_repo || 'leetcode-solutions');
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  };

  const loadSyncStats = async () => {
    try {
      const result = await chrome.storage.local.get([
        'synced_problems',
        'failed_syncs',
        'recent_syncs'
      ]);
      
      const synced = result.synced_problems || [];
      const failed = result.failed_syncs || [];
      const recent = result.recent_syncs || [];
      
      setSyncStats({
        total: synced.length,
        pending: 0, // Will be calculated from pending_ keys
        failed: failed.length
      });
      
      setRecentSyncs(recent.slice(0, 5)); // Show last 5
    } catch (error) {
      console.error('Error loading sync stats:', error);
    }
  };

  const validateToken = async (tokenToValidate) => {
    try {
      const response = await fetch('https://api.github.com/user', {
        headers: {
          'Authorization': `token ${tokenToValidate}`,
          'Accept': 'application/vnd.github.v3+json'
        }
      });

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Invalid token. Please check and try again.');
        }
        throw new Error(`GitHub API error: ${response.status}`);
      }

      const userData = await response.json();
      return { valid: true, username: userData.login };
    } catch (error) {
      throw new Error(error.message || 'Failed to validate token');
    }
  };

  const handleSaveSettings = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    
    if (!token || !repoName) {
      setError('Please enter both token and repository name');
      return;
    }

    setIsValidating(true);
    
    try {
      // Validate token
      const { valid, username: githubUsername } = await validateToken(token);
      
      if (!valid) {
        throw new Error('Token validation failed');
      }

      setIsSaving(true);

      // Save to storage
      await chrome.storage.local.set({
        github_token: token,
        github_username: githubUsername,
        github_repo: repoName,
        github_sync_enabled: true
      });

      setUsername(githubUsername);
      setIsEnabled(true);
      setSuccess(`Connected to github.com/${githubUsername}/${repoName}`);
      setToken(''); // Clear token input for security
      
      // Notify background worker to initialize sync
      chrome.runtime.sendMessage({ type: 'GITHUB_SYNC_ENABLED' });
      
    } catch (error) {
      setError(error.message);
    } finally {
      setIsValidating(false);
      setIsSaving(false);
    }
  };

  const handleDisable = async () => {
    try {
      await chrome.storage.local.set({ github_sync_enabled: false });
      setIsEnabled(false);
      setSuccess('GitHub sync disabled');
    } catch (error) {
      setError('Failed to disable sync');
    }
  };

  const handleManualSync = async () => {
    try {
      setSuccess('Manual sync started... (Feature coming soon)');
      // TODO: Implement manual sync for past submissions
      chrome.runtime.sendMessage({ type: 'MANUAL_SYNC_REQUESTED' });
    } catch (error) {
      setError('Failed to start manual sync');
    }
  };

  const handleRetryFailed = async () => {
    try {
      setSuccess('Retrying failed syncs...');
      chrome.runtime.sendMessage({ type: 'RETRY_FAILED_SYNCS' });
      setTimeout(loadSyncStats, 2000);
    } catch (error) {
      setError('Failed to retry syncs');
    }
  };

  return (
    <div className="flex-1 overflow-y-auto scrollbar-hide p-6 space-y-6">
      {/* Header */}
      <div className="text-center">
        <div className="w-16 h-16 bg-surface rounded-full flex items-center justify-center mx-auto mb-3 ring-2 ring-surfaceHover shadow-lg">
          <Github className="w-8 h-8 text-text-main" />
        </div>
        <h2 className="text-xl font-bold text-text-main">GitHub Auto-Sync</h2>
        <p className="text-xs text-text-muted mt-1">
          Automatically push your accepted solutions to GitHub
        </p>
      </div>

      {/* Status Messages */}
      {error && (
        <div className="p-3 bg-red-500/10 rounded-xl border border-red-500/20 text-sm text-red-400 animate-fade-in">
          {error}
        </div>
      )}
      
      {success && (
        <div className="p-3 bg-green-500/10 rounded-xl border border-green-500/20 text-sm text-green-400 animate-fade-in">
          {success}
        </div>
      )}

      {/* Setup Form or Status Display */}
      {!isEnabled ? (
        <>
          {/* Helper Guide */}
          <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl overflow-hidden">
            <button
              onClick={() => setShowGuide(!showGuide)}
              className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-blue-500/5 transition-colors"
            >
              <div className="flex items-center gap-2">
                <HelpCircle className="w-5 h-5 text-blue-400" />
                <span className="text-sm font-semibold text-blue-400">Need help getting started?</span>
              </div>
              {showGuide ? (
                <ChevronUp className="w-4 h-4 text-blue-400" />
              ) : (
                <ChevronDown className="w-4 h-4 text-blue-400" />
              )}
            </button>
            
            {showGuide && (
              <div className="px-4 pb-4 space-y-4 text-sm text-text-muted animate-fade-in">
                <div>
                  <p className="font-semibold text-text-main mb-2 flex items-center gap-2">
                    <FileCode2 className="w-4 h-4" />
                    Step-by-step guide:
                  </p>
                  <ol className="space-y-2 list-decimal list-inside ml-1">
                    <li className="leading-relaxed">
                      <span className="font-medium text-text-main">Generate a GitHub Token</span>
                      <br />
                      <span className="ml-5 text-xs">Click the link below to create a new token</span>
                    </li>
                    <li className="leading-relaxed">
                      <span className="font-medium text-text-main">Set Token Permissions</span>
                      <br />
                      <span className="ml-5 text-xs">Make sure to check the <code className="px-1.5 py-0.5 bg-surface rounded text-primary">repo</code> scope (allows creating/updating repos)</span>
                    </li>
                    <li className="leading-relaxed">
                      <span className="font-medium text-text-main">Copy Your Token</span>
                      <br />
                      <span className="ml-5 text-xs">Copy the generated token (starts with <code className="px-1.5 py-0.5 bg-surface rounded">ghp_</code>)</span>
                    </li>
                    <li className="leading-relaxed">
                      <span className="font-medium text-text-main">Paste Below & Enable</span>
                      <br />
                      <span className="ml-5 text-xs">Paste your token in the field below and click "Enable GitHub Sync"</span>
                    </li>
                  </ol>
                </div>

                <div className="p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                  <p className="text-xs font-semibold text-yellow-400 mb-1 flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    Important:
                  </p>
                  <ul className="text-xs space-y-1 list-disc list-inside ml-1">
                    <li>Save your token securely - you can't view it again on GitHub</li>
                    <li>Never share your token with anyone</li>
                    <li>The token is stored locally in your browser</li>
                  </ul>
                </div>

                <a
                  href="https://github.com/settings/tokens/new?scopes=repo&description=LeetStreak%20Auto-Sync"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-4 py-2 bg-primary/20 hover:bg-primary/30 text-primary rounded-lg transition-colors justify-center font-medium"
                >
                  <Github className="w-4 h-4" />
                  <span>Generate GitHub Token</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            )}
          </div>

          <form onSubmit={handleSaveSettings} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-text-main mb-2">
              GitHub Personal Access Token
            </label>
            <div className="relative">
              <input
                type={showToken ? 'text' : 'password'}
                value={token}
                onChange={(e) => setToken(e.target.value)}
                placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
                className="w-full px-4 py-3 bg-surface border border-surfaceHover rounded-xl focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary text-text-main placeholder-text-muted text-sm"
                disabled={isValidating || isSaving}
              />
              <button
                type="button"
                onClick={() => setShowToken(!showToken)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-main"
              >
                {showToken ? '👁️' : '👁️‍🗨️'}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-text-main mb-2">
              Repository Name
            </label>
            <input
              type="text"
              value={repoName}
              onChange={(e) => setRepoName(e.target.value)}
              placeholder="leetcode-solutions"
              className="w-full px-4 py-3 bg-surface border border-surfaceHover rounded-xl focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary text-text-main placeholder-text-muted text-sm"
              disabled={isValidating || isSaving}
            />
            <p className="text-xs text-text-muted mt-1">
              Repository will be created if it doesn't exist
            </p>
          </div>

          <button
            type="submit"
            disabled={isValidating || isSaving}
            className="w-full py-3 bg-primary hover:bg-primaryHover text-inverted font-semibold rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-primary/20"
          >
            <span className="flex items-center justify-center gap-2">
              {isValidating || isSaving ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Connecting...</>
              ) : (
                <><Rocket className="w-4 h-4" /> Enable GitHub Sync</>
              )}
            </span>
          </button>

          <div className="mt-4 p-4 bg-surface/50 rounded-xl border border-surfaceHover">
            <p className="text-xs font-medium text-text-main mb-2">How it works:</p>
            <ul className="text-xs text-text-muted space-y-1 list-disc list-inside">
              <li>Captures your code before submission</li>
              <li>Waits for "Accepted" status</li>
              <li>Pushes to GitHub with topic-based folders</li>
              <li>Automatically retries on failure</li>
            </ul>
          </div>
        </form>
        </>
      ) : (
        <div className="space-y-4">
          {/* Connected Status */}
          <div className="p-4 bg-green-500/10 rounded-xl border border-green-500/20">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="text-green-400 text-xl">✓</span>
                <span className="text-sm font-semibold text-green-400">Connected</span>
              </div>
              <button
                onClick={handleDisable}
                className="text-xs text-text-muted hover:text-red-400 transition-colors"
              >
                Disable
              </button>
            </div>
            <p className="text-sm text-text-main">
              github.com/<span className="font-mono text-primary">{username}/{repoName}</span>
            </p>
          </div>

          {/* Sync Stats */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-surface rounded-xl p-3 text-center border border-surfaceHover">
              <div className="text-2xl font-bold text-primary">{syncStats.total}</div>
              <div className="text-xs text-text-muted mt-1">Synced</div>
            </div>
            <div className="bg-surface rounded-xl p-3 text-center border border-surfaceHover">
              <div className="text-2xl font-bold text-blue-400">{syncStats.pending}</div>
              <div className="text-xs text-text-muted mt-1">Pending</div>
            </div>
            <div className="bg-surface rounded-xl p-3 text-center border border-surfaceHover">
              <div className="text-2xl font-bold text-red-400">{syncStats.failed}</div>
              <div className="text-xs text-text-muted mt-1">Failed</div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={handleManualSync}
              className="py-3 bg-surface hover:bg-surfaceHover border border-surfaceHover rounded-xl text-sm font-medium text-text-main transition-all"
            >
              📤 Manual Sync
            </button>
            {syncStats.failed > 0 && (
              <button
                onClick={handleRetryFailed}
                className="py-3 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 rounded-xl text-sm font-medium text-red-400 transition-all"
              >
                🔄 Retry Failed
              </button>
            )}
          </div>

          {/* Recent Syncs */}
          {recentSyncs.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-text-main mb-2">Recent Syncs</h3>
              <div className="space-y-2">
                {recentSyncs.map((sync, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-3 p-3 bg-surface rounded-xl border border-surfaceHover"
                  >
                    <span className="text-lg">{sync.status === 'success' ? '✓' : '✗'}</span>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-text-main truncate">
                        {sync.problemTitle}
                      </div>
                      <div className="text-xs text-text-muted">
                        {new Date(sync.timestamp).toLocaleDateString()}
                      </div>
                    </div>
                    <span className="text-xs text-text-muted font-mono">
                      {sync.language}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default GitHubSync;
