import React, { useState, useEffect, useRef } from 'react';
import { 
  Github, 
  HelpCircle, 
  ExternalLink, 
  ChevronDown, 
  ChevronUp, 
  CheckCircle2, 
  AlertTriangle, 
  Loader2, 
  Rocket, 
  FileCode2,
  Copy,
  RefreshCw,
  Key,
  Shield,
  X,
  Clock,
  Zap
} from 'lucide-react';
import { isValidGitHubToken } from '../shared/security-utils.js';

/**
 * GitHubSync Component
 * 
 * Hybrid authentication: Device Flow (primary) + PAT (fallback)
 * - Device Flow: User-friendly, no manual token copying
 * - PAT: Fallback for users who prefer manual setup
 */
function GitHubSync() {
  // Connection state
  const [isConnected, setIsConnected] = useState(false);
  const [username, setUsername] = useState('');
  const [repoName, setRepoName] = useState('leetcode-solutions');
  const [syncStats, setSyncStats] = useState({ total: 0, pending: 0, failed: 0 });
  const [recentSyncs, setRecentSyncs] = useState([]);

  // UI state
  const [authMethod, setAuthMethod] = useState('device'); // 'device' or 'pat'
  const [showHelp, setShowHelp] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Device Flow state
  const [deviceFlowState, setDeviceFlowState] = useState('idle'); // idle, loading, waiting, success, error
  const [userCode, setUserCode] = useState('');
  const [verificationUri, setVerificationUri] = useState('');
  const [timeLeft, setTimeLeft] = useState(0);
  const [copied, setCopied] = useState(false);
  
  // PAT state
  const [patToken, setPatToken] = useState('');
  const [showToken, setShowToken] = useState(false);
  const [isValidating, setIsValidating] = useState(false);

  // General loading states
  const [isSaving, setIsSaving] = useState(false);
  const [isDisconnecting, setIsDisconnecting] = useState(false);

  // Refs for polling
  const pollIntervalRef = useRef(null);
  const countdownRef = useRef(null);

  // Load initial state
  useEffect(() => {
    loadConnectionStatus();
    loadSyncStats();
    checkPendingDeviceFlow();
    
    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, []);

  // Check if there's a pending device flow (popup was closed and reopened)
  const checkPendingDeviceFlow = async () => {
    try {
      const result = await chrome.storage.local.get('github_device_flow_pending');
      const pending = result.github_device_flow_pending;
      
      if (pending && pending.expiresAt > Date.now()) {
        // Restore the pending state
        setUserCode(pending.userCode);
        setVerificationUri(pending.verificationUri);
        setTimeLeft(Math.floor((pending.expiresAt - Date.now()) / 1000));
        setDeviceFlowState('waiting');
        // Resume polling
        startPolling(5);
      } else if (pending) {
        // Expired, clean up
        await chrome.storage.local.remove('github_device_flow_pending');
      }
    } catch (error) {
      console.error('Error checking pending device flow:', error);
    }
  };

  // Countdown timer effect
  useEffect(() => {
    if (deviceFlowState === 'waiting' && timeLeft > 0) {
      countdownRef.current = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            clearInterval(countdownRef.current);
            setDeviceFlowState('error');
            setError('Authorization code expired. Please try again.');
            chrome.storage.local.remove('github_device_flow_pending');
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      
      return () => clearInterval(countdownRef.current);
    }
  }, [deviceFlowState, timeLeft]);

  const loadConnectionStatus = async () => {
    try {
      const response = await chrome.runtime.sendMessage({ type: 'GITHUB_GET_STATUS' });
      
      if (response?.success && response.connected) {
        setIsConnected(true);
        setUsername(response.username || '');
        setRepoName(response.repo || 'leetcode-solutions');
        setSyncStats({
          total: response.syncedCount || 0,
          pending: 0,
          failed: response.failedCount || 0
        });
      }
    } catch (error) {
      console.error('Failed to load connection status:', error);
    }
  };

  const loadSyncStats = async () => {
    try {
      const result = await chrome.storage.local.get([
        'synced_submissions',
        'synced_problems',  // Legacy key - for migration
        'failed_syncs',
        'recent_syncs'
      ]);
      
      // Migrate old synced_problems data to synced_submissions if needed
      let syncedArray = result.synced_submissions || [];
      if (!result.synced_submissions && result.synced_problems) {
        syncedArray = result.synced_problems;
        // Persist the migration
        await chrome.storage.local.set({ synced_submissions: syncedArray });
      }
      
      setSyncStats({
        total: syncedArray.length,
        pending: 0,
        failed: (result.failed_syncs || []).length
      });
      
      setRecentSyncs((result.recent_syncs || []).slice(0, 5));
    } catch (error) {
      console.error('Error loading sync stats:', error);
    }
  };

  // ===== Device Flow Methods =====

  const startDeviceFlow = async () => {
    setError('');
    setSuccess('');
    setDeviceFlowState('loading');

    try {
      const response = await chrome.runtime.sendMessage({ type: 'GITHUB_DEVICE_CODE_REQUEST' });

      if (!response?.success) {
        setDeviceFlowState('error');
        if (response?.errorCode === 'INVALID_CLIENT') {
          setError('GitHub OAuth not configured. Please use Personal Access Token instead.');
          setAuthMethod('pat');
        } else {
          setError(response?.error || 'Failed to start authentication');
        }
        return;
      }

      setUserCode(response.userCode);
      setVerificationUri(response.verificationUri);
      setTimeLeft(response.expiresIn);
      setDeviceFlowState('waiting');

      // Auto-copy code to clipboard
      try {
        await navigator.clipboard.writeText(response.userCode);
        setCopied(true);
        setTimeout(() => setCopied(false), 3000);
      } catch (e) {
        console.log('Could not auto-copy code');
      }

      // Store code in storage so it persists if popup closes
      await chrome.storage.local.set({
        github_device_flow_pending: {
          userCode: response.userCode,
          verificationUri: response.verificationUri,
          expiresAt: Date.now() + (response.expiresIn * 1000)
        }
      });

      // Show notification with the code
      chrome.runtime.sendMessage({
        type: 'SHOW_NOTIFICATION',
        title: 'GitHub Code: ' + response.userCode,
        message: 'Enter this code on GitHub to connect. Code copied to clipboard!'
      });

      // Open GitHub after a small delay so user sees the code
      setTimeout(() => {
        window.open(response.verificationUri, '_blank');
      }, 1500);
      
      startPolling(response.interval || 5);
    } catch (error) {
      console.error('Device flow error:', error);
      setDeviceFlowState('error');
      setError(error.message || 'Failed to start authentication');
    }
  };

  const startPolling = (interval) => {
    const pollInterval = interval * 1000;

    pollIntervalRef.current = setInterval(async () => {
      try {
        const response = await chrome.runtime.sendMessage({ type: 'GITHUB_DEVICE_POLL' });

        if (response?.success) {
          clearInterval(pollIntervalRef.current);
          setDeviceFlowState('success');
          await completeSetup(response.token, response.username);
        } else if (response?.shouldRetry) {
          if (response?.errorCode === 'SLOW_DOWN' && response.interval) {
            clearInterval(pollIntervalRef.current);
            startPolling(response.interval);
          }
        } else {
          clearInterval(pollIntervalRef.current);
          setDeviceFlowState('error');
          setError(response?.error || 'Authentication failed');
        }
      } catch (error) {
        console.error('Poll error:', error);
      }
    }, pollInterval);
  };

  const completeSetup = async (token, githubUsername) => {
    setIsSaving(true);
    
    try {
      console.log('🔧 completeSetup called with:', { token: !!token, githubUsername });
      
      const repoResponse = await chrome.runtime.sendMessage({
        type: 'GITHUB_ENSURE_REPO',
        token,
        username: githubUsername,
        repo: repoName
      });

      console.log('📦 GITHUB_ENSURE_REPO response:', repoResponse);

      if (!repoResponse?.success) {
        throw new Error(repoResponse?.error || 'Failed to setup repository');
      }

      const storeResponse = await chrome.runtime.sendMessage({
        type: 'GITHUB_STORE_CREDENTIALS',
        token,
        username: githubUsername,
        repo: repoName
      });

      console.log('📦 GITHUB_STORE_CREDENTIALS response:', storeResponse);

      if (!storeResponse?.success) {
        throw new Error(storeResponse?.error || 'Failed to store credentials');
      }

      setUsername(githubUsername);
      setIsConnected(true);
      setDeviceFlowState('idle');
      
      // Clean up pending device flow
      await chrome.storage.local.remove('github_device_flow_pending');
      
      console.log('💾 Setting github_sync_enabled to true in storage');
      await chrome.storage.local.set({ github_sync_enabled: true });
      
      console.log('📢 Sending GITHUB_SYNC_ENABLED message');
      chrome.runtime.sendMessage({ type: 'GITHUB_SYNC_ENABLED' });
      loadSyncStats();
      
      const repoCreated = repoResponse.created ? ' (Repository created!)' : '';
      setSuccess(`✨ Connected to github.com/${githubUsername}/${repoName}${repoCreated}`);
    } catch (error) {
      console.error('❌ completeSetup failed:', error);
      setError(error.message);
      setDeviceFlowState('error');
    } finally {
      setIsSaving(false);
    }
  };

  const cancelDeviceFlow = async () => {
    if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    if (countdownRef.current) clearInterval(countdownRef.current);
    await chrome.storage.local.remove('github_device_flow_pending');
    setDeviceFlowState('idle');
    setUserCode('');
    setVerificationUri('');
    setError('');
  };

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(userCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  // ===== PAT Methods =====

  const handlePatSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    
    if (!patToken || !repoName) {
      setError('Please enter both token and repository name');
      return;
    }

    if (!isValidGitHubToken(patToken)) {
      setError('Invalid token format. Use a Personal Access Token (ghp_...) or Fine-grained token (github_pat_...)');
      return;
    }

    setIsValidating(true);
    
    try {
      const validateResponse = await chrome.runtime.sendMessage({
        type: 'GITHUB_VALIDATE_TOKEN',
        token: patToken
      });

      if (!validateResponse?.success) {
        throw new Error(validateResponse?.error || 'Token validation failed');
      }

      await completeSetup(patToken, validateResponse.username);
      setPatToken('');
    } catch (error) {
      setError(error.message);
    } finally {
      setIsValidating(false);
    }
  };

  // ===== Common Methods =====

  const handleDisconnect = async () => {
    setIsDisconnecting(true);
    setError('');
    
    try {
      const response = await chrome.runtime.sendMessage({ type: 'GITHUB_CLEAR_CREDENTIALS' });
      
      if (response?.success) {
        setIsConnected(false);
        setUsername('');
        setSyncStats({ total: 0, pending: 0, failed: 0 });
        setRecentSyncs([]);
        setSuccess('Disconnected from GitHub');
        
        await chrome.storage.local.set({ github_sync_enabled: false });
        chrome.runtime.sendMessage({ type: 'GITHUB_SYNC_DISABLED' });
      } else {
        throw new Error(response?.error || 'Failed to disconnect');
      }
    } catch (error) {
      setError(error.message);
    } finally {
      setIsDisconnecting(false);
    }
  };

  const handleRetryFailed = async () => {
    try {
      setSuccess('Retrying failed syncs...');
      const response = await chrome.runtime.sendMessage({ type: 'RETRY_FAILED_SYNCS' });
      
      if (response?.success) {
        setSuccess(`Retried ${response.retried} syncs. ${response.failed} still failed.`);
      }
      
      setTimeout(loadSyncStats, 2000);
    } catch (error) {
      setError('Failed to retry syncs');
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const isLoading = deviceFlowState === 'loading' || isValidating || isSaving;

  // ===== Render =====
  return (
    <div className="flex-1 overflow-y-auto scrollbar-hide p-6 space-y-6">
      {/* Header */}
      <div className="text-center">
        <div className="w-16 h-16 bg-surface rounded-full flex items-center justify-center mx-auto mb-3 ring-2 ring-surfaceHover shadow-lg">
          <Github className="w-8 h-8 text-text-main" />
        </div>
        <h2 className="text-xl font-bold text-text-main">GitHub Auto-Sync</h2>
        <p className="text-xs text-text-muted mt-1">
          Automatically push accepted solutions to GitHub
        </p>
      </div>

      {/* Status Messages */}
      {error && (
        <div className="p-3 bg-red-500/10 rounded-xl border border-red-500/20 text-sm text-red-400 animate-fade-in flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}
      
      {success && (
        <div className="p-3 bg-green-500/10 rounded-xl border border-green-500/20 text-sm text-green-400 animate-fade-in flex items-start gap-2">
          <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" />
          <span>{success}</span>
        </div>
      )}

      {/* Main Content */}
      {isConnected ? (
        // ===== Connected State =====
        <div className="space-y-4">
          {/* Connected Status */}
          <div className="p-4 bg-green-500/10 rounded-xl border border-green-500/20">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-green-400" />
                <span className="text-sm font-semibold text-green-400">Connected</span>
              </div>
              <button
                onClick={handleDisconnect}
                disabled={isDisconnecting}
                className="text-xs text-text-muted hover:text-red-400 transition-colors disabled:opacity-50"
              >
                {isDisconnecting ? 'Disconnecting...' : 'Disconnect'}
              </button>
            </div>
            <a
              href={`https://github.com/${username}/${repoName}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-text-main hover:text-primary transition-colors flex items-center gap-1"
            >
              github.com/<span className="font-mono text-primary">{username}/{repoName}</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>

          {/* Sync Stats */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-gradient-to-br from-primary/10 to-primary/5 rounded-xl p-4 text-center border border-primary/20 shadow-md">
              <div className="text-3xl font-bold text-primary mb-2">{syncStats.total}</div>
              <div className="text-xs font-medium text-text-muted">Synced</div>
            </div>
            <div className="bg-gradient-to-br from-blue-500/10 to-blue-500/5 rounded-xl p-4 text-center border border-blue-500/20 shadow-md">
              <div className="text-3xl font-bold text-blue-400 mb-2">{syncStats.pending}</div>
              <div className="text-xs font-medium text-text-muted">Pending</div>
            </div>
            <div className="bg-gradient-to-br from-red-500/10 to-red-500/5 rounded-xl p-4 text-center border border-red-500/20 shadow-md">
              <div className="text-3xl font-bold text-red-400 mb-2">{syncStats.failed}</div>
              <div className="text-xs font-medium text-text-muted">Failed</div>
            </div>
          </div>

          {/* Retry Failed Button */}
          {syncStats.failed > 0 && (
            <button
              onClick={handleRetryFailed}
              className="w-full py-3 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 rounded-xl text-sm font-medium text-red-400 transition-all flex items-center justify-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              Retry {syncStats.failed} Failed Sync{syncStats.failed !== 1 ? 's' : ''}
            </button>
          )}

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
                    <span className={`text-lg ${sync.status === 'success' ? 'text-green-400' : 'text-red-400'}`}>
                      {sync.status === 'success' ? '✓' : '✗'}
                    </span>
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

          {/* How It Works */}
          <div className="p-4 bg-surface/50 rounded-xl border border-surfaceHover">
            <p className="text-xs font-medium text-text-main mb-2 flex items-center gap-2">
              <Zap className="w-3.5 h-3.5 text-primary" />
              Auto-sync is active
            </p>
            <p className="text-xs text-text-muted">
              Your accepted solutions will be automatically pushed with runtime, memory stats, and organized by topic/difficulty.
            </p>
          </div>
        </div>
      ) : deviceFlowState === 'waiting' ? (
        // ===== Device Flow Waiting State =====
        <div className="space-y-4">
          {/* Code Display */}
          <div className="bg-surface rounded-xl p-6 border border-surfaceHover text-center">
            <p className="text-sm text-text-muted mb-3">
              Enter this code on GitHub:
            </p>
            <div className="flex items-center justify-center gap-2 mb-4">
              <code className="text-3xl font-mono font-bold text-primary tracking-widest">
                {userCode}
              </code>
              <button
                onClick={copyCode}
                className="p-2 hover:bg-surfaceHover rounded-lg transition-colors"
                title="Copy code"
              >
                {copied ? (
                  <CheckCircle2 className="w-5 h-5 text-green-400" />
                ) : (
                  <Copy className="w-5 h-5 text-text-muted" />
                )}
              </button>
            </div>
            
            {/* Timer */}
            <div className="flex items-center justify-center gap-2 text-sm text-text-muted mb-4">
              <Clock className="w-4 h-4" />
              <span>Expires in {formatTime(timeLeft)}</span>
            </div>

            {/* Progress indicator */}
            <div className="flex items-center justify-center gap-2 text-sm text-blue-400 mb-4">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Waiting for authorization...</span>
            </div>

            {/* Open GitHub button */}
            <a
              href={verificationUri}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primaryHover text-inverted rounded-lg font-medium transition-colors"
            >
              <Github className="w-4 h-4" />
              Open GitHub
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>

          {/* Instructions */}
          <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4">
            <ol className="text-sm text-text-muted space-y-2 list-decimal list-inside">
              <li>GitHub should have opened in a new tab</li>
              <li>Enter the code shown above</li>
              <li>Click <span className="text-green-400 font-medium">"Authorize"</span></li>
              <li>This page will update automatically</li>
            </ol>
          </div>

          {/* Cancel Button */}
          <button
            onClick={cancelDeviceFlow}
            className="w-full py-3 bg-surface hover:bg-surfaceHover border border-surfaceHover rounded-xl text-sm font-medium text-text-muted transition-all flex items-center justify-center gap-2"
          >
            <X className="w-4 h-4" />
            Cancel
          </button>
        </div>
      ) : (
        // ===== Setup State =====
        <div className="space-y-4">
          {/* Auth Method Toggle */}
          <div className="flex bg-surface rounded-xl p-1 border border-surfaceHover">
            <button
              onClick={() => setAuthMethod('device')}
              className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2 ${
                authMethod === 'device'
                  ? 'bg-primary text-inverted'
                  : 'text-text-muted hover:text-text-main'
              }`}
            >
              <Zap className="w-4 h-4" />
              Quick Connect
            </button>
            <button
              onClick={() => setAuthMethod('pat')}
              className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2 ${
                authMethod === 'pat'
                  ? 'bg-primary text-inverted'
                  : 'text-text-muted hover:text-text-main'
              }`}
            >
              <Key className="w-4 h-4" />
              Access Token
            </button>
          </div>

          {/* Repository Name (shared between both methods) */}
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
              disabled={isLoading}
            />
            <p className="text-xs text-text-muted mt-1">
              Repository will be created if it doesn't exist
            </p>
          </div>

          {authMethod === 'device' ? (
            // ===== Device Flow UI =====
            <div className="space-y-4">
              <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-4">
                <div className="flex items-start gap-3">
                  <Shield className="w-5 h-5 text-green-400 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-green-400 mb-1">Recommended Method</p>
                    <p className="text-xs text-text-muted">
                      Sign in with your GitHub account. No need to create or copy any tokens manually.
                    </p>
                  </div>
                </div>
              </div>

              <button
                onClick={startDeviceFlow}
                disabled={isLoading || !repoName}
                className="w-full py-3 bg-primary hover:bg-primaryHover text-inverted font-semibold rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-primary/20 flex items-center justify-center gap-2"
              >
                {deviceFlowState === 'loading' ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Starting...
                  </>
                ) : (
                  <>
                    <Github className="w-4 h-4" />
                    Connect with GitHub
                  </>
                )}
              </button>
            </div>
          ) : (
            // ===== PAT UI =====
            <div className="space-y-4">
              {/* Help Guide */}
              <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl overflow-hidden">
                <button
                  onClick={() => setShowHelp(!showHelp)}
                  className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-blue-500/5 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <HelpCircle className="w-5 h-5 text-blue-400" />
                    <span className="text-sm font-semibold text-blue-400">How to get a token?</span>
                  </div>
                  {showHelp ? (
                    <ChevronUp className="w-4 h-4 text-blue-400" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-blue-400" />
                  )}
                </button>
                
                {showHelp && (
                  <div className="px-4 pb-4 space-y-4 text-sm text-text-muted animate-fade-in">
                    <ol className="space-y-2 list-decimal list-inside">
                      <li>Click the button below to open GitHub settings</li>
                      <li>Check the <code className="px-1.5 py-0.5 bg-surface rounded text-primary">repo</code> scope</li>
                      <li>Click "Generate token" at the bottom</li>
                      <li>Copy the token (starts with <code className="px-1.5 py-0.5 bg-surface rounded">ghp_</code>)</li>
                    </ol>

                    <a
                      href="https://github.com/settings/tokens/new?scopes=repo&description=LeetStreak%20Auto-Sync"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 px-4 py-2 bg-primary/20 hover:bg-primary/30 text-primary rounded-lg transition-colors justify-center font-medium"
                    >
                      <Github className="w-4 h-4" />
                      <span>Open GitHub Token Settings</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                )}
              </div>

              <form onSubmit={handlePatSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-text-main mb-2">
                    Personal Access Token
                  </label>
                  <div className="relative">
                    <input
                      type={showToken ? 'text' : 'password'}
                      value={patToken}
                      onChange={(e) => setPatToken(e.target.value)}
                      placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
                      className="w-full px-4 py-3 bg-surface border border-surfaceHover rounded-xl focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary text-text-main placeholder-text-muted text-sm pr-12"
                      disabled={isLoading}
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

                <button
                  type="submit"
                  disabled={isLoading || !patToken || !repoName}
                  className="w-full py-3 bg-primary hover:bg-primaryHover text-inverted font-semibold rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-primary/20 flex items-center justify-center gap-2"
                >
                  {isValidating || isSaving ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Connecting...
                    </>
                  ) : (
                    <>
                      <Rocket className="w-4 h-4" />
                      Connect with Token
                    </>
                  )}
                </button>
              </form>
            </div>
          )}

          {/* How It Works */}
          <div className="p-4 bg-surface/50 rounded-xl border border-surfaceHover">
            <p className="text-xs font-medium text-text-main mb-2 flex items-center gap-2">
              <FileCode2 className="w-3.5 h-3.5" />
              How it works:
            </p>
            <ul className="text-xs text-text-muted space-y-1 list-disc list-inside">
              <li>Captures your code when you submit</li>
              <li>Waits for "Accepted" status</li>
              <li>Pushes to GitHub with runtime/memory stats</li>
              <li>Organized by topic and difficulty</li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}

export default GitHubSync;
