import React, { useState, useEffect } from 'react';
import { ChevronLeft, Moon, Sun, Bell, RotateCcw, LogOut, AlertTriangle, X } from 'lucide-react';

function ConfirmDialog({ title, message, confirmText, cancelText, onConfirm, onCancel, isDangerous }) {
  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-surface rounded-2xl shadow-2xl max-w-sm w-full border border-surfaceHover/50 animate-fade-in">
        {/* Header */}
        <div className={`flex items-center gap-3 p-6 border-b ${isDangerous ? 'border-red-500/20 bg-red-500/5' : 'border-surfaceHover/30'}`}>
          <div className={`p-3 rounded-full ${isDangerous ? 'bg-red-500/20' : 'bg-orange-500/20'}`}>
            <AlertTriangle className={`w-5 h-5 ${isDangerous ? 'text-red-400' : 'text-orange-400'}`} />
          </div>
          <h3 className="text-lg font-bold text-text-main flex-1">{title}</h3>
          <button
            onClick={onCancel}
            className="p-1 hover:bg-surfaceHover rounded-lg transition-colors"
          >
            <X className="w-4 h-4 text-text-muted" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6">
          <p className="text-text-muted text-sm leading-relaxed">{message}</p>
        </div>

        {/* Footer */}
        <div className="flex gap-3 p-6 border-t border-surfaceHover/30 bg-surface/50">
          <button
            onClick={onCancel}
            className="flex-1 py-3 px-4 bg-surface hover:bg-surfaceHover border border-surfaceHover/50 text-text-main rounded-lg font-medium transition-all"
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            className={`flex-1 py-3 px-4 rounded-lg font-medium transition-all text-white shadow-lg ${
              isDangerous
                ? 'bg-red-600 hover:bg-red-700 active:scale-95'
                : 'bg-orange-600 hover:bg-orange-700 active:scale-95'
            }`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}

function SettingsPanel({ onBack, theme, onThemeChange }) {
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [autoSyncEnabled, setAutoSyncEnabled] = useState(true);
  const [username, setUsername] = useState('');
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [showClearDataConfirm, setShowClearDataConfirm] = useState(false);

  useEffect(() => {
    // Load settings from storage
    chrome.storage.local.get(['my_leetcode_username', 'notifications_enabled', 'auto_sync_enabled'], (data) => {
      if (data.my_leetcode_username) {
        setUsername(data.my_leetcode_username);
      }
      if (data.notifications_enabled !== undefined) {
        setNotificationsEnabled(data.notifications_enabled);
      }
      if (data.auto_sync_enabled !== undefined) {
        setAutoSyncEnabled(data.auto_sync_enabled);
      }
    });
  }, []);

  const handleThemeToggle = (newTheme) => {
    chrome.storage.local.set({ theme: newTheme });
    onThemeChange(newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);
  };

  const handleNotificationsToggle = () => {
    const newValue = !notificationsEnabled;
    setNotificationsEnabled(newValue);
    chrome.storage.local.set({ notifications_enabled: newValue });
  };

  const handleAutoSyncToggle = () => {
    const newValue = !autoSyncEnabled;
    setAutoSyncEnabled(newValue);
    chrome.storage.local.set({ auto_sync_enabled: newValue });
  };

  const handleClearData = async () => {
    setShowClearDataConfirm(false);
    const { clearAllData } = await import('../shared/storage.js');
    await clearAllData();
    // Reset to setup mode
    window.location.reload();
  };

  const handleLogout = async () => {
    setShowLogoutConfirm(false);
    await chrome.storage.local.remove(['my_leetcode_username', 'friends']);
    window.location.reload();
  };

  return (
    <div className="flex flex-col h-full bg-gradient-to-br from-background via-background to-surface/20">
      {/* Header */}
      <div className="flex items-center gap-3 p-4 border-b border-surfaceHover/50 bg-surface/95 backdrop-blur-md sticky top-0">
        <button
          onClick={onBack}
          className="p-2 hover:bg-surfaceHover rounded-lg transition-colors"
          title="Go back"
        >
          <ChevronLeft className="w-5 h-5 text-primary" />
        </button>
        <h2 className="text-lg font-bold text-text-main flex-1">Settings</h2>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-6">
        {/* Account Section */}
        <div className="space-y-3">
          <h3 className="text-sm font-bold text-text-muted uppercase tracking-wide">Account</h3>
          <div className="bg-surface/50 rounded-lg p-4 border border-surfaceHover/30">
            <p className="text-xs text-text-muted mb-1">Connected Account</p>
            <p className="text-lg font-semibold text-text-main">{username || 'Not set'}</p>
          </div>
        </div>

        {/* Theme Section */}
        <div className="space-y-3">
          <h3 className="text-sm font-bold text-text-muted uppercase tracking-wide">Appearance</h3>
          <div className="space-y-2">
            <button
              onClick={() => handleThemeToggle('dark')}
              className={`w-full flex items-center justify-between p-4 rounded-lg border-2 transition-all ${
                theme === 'dark'
                  ? 'bg-surface border-primary shadow-lg shadow-primary/20'
                  : 'bg-surface/50 border-surfaceHover/30 hover:border-surfaceHover/50'
              }`}
            >
              <div className="flex items-center gap-3">
                <Moon className={`w-5 h-5 ${theme === 'dark' ? 'text-primary' : 'text-text-muted'}`} />
                <span className={`font-medium ${theme === 'dark' ? 'text-primary' : 'text-text-main'}`}>Dark Mode</span>
              </div>
              {theme === 'dark' && <div className="w-2 h-2 rounded-full bg-primary"></div>}
            </button>

            <button
              onClick={() => handleThemeToggle('light')}
              className={`w-full flex items-center justify-between p-4 rounded-lg border-2 transition-all ${
                theme === 'light'
                  ? 'bg-surface border-primary shadow-lg shadow-primary/20'
                  : 'bg-surface/50 border-surfaceHover/30 hover:border-surfaceHover/50'
              }`}
            >
              <div className="flex items-center gap-3">
                <Sun className={`w-5 h-5 ${theme === 'light' ? 'text-primary' : 'text-text-muted'}`} />
                <span className={`font-medium ${theme === 'light' ? 'text-primary' : 'text-text-main'}`}>Light Mode</span>
              </div>
              {theme === 'light' && <div className="w-2 h-2 rounded-full bg-primary"></div>}
            </button>
          </div>
        </div>

        {/* Notification Section */}
        <div className="space-y-3">
          <h3 className="text-sm font-bold text-text-muted uppercase tracking-wide">Notifications</h3>
          <button
            onClick={handleNotificationsToggle}
            className="w-full flex items-center justify-between p-4 bg-surface/50 border border-surfaceHover/30 rounded-lg hover:bg-surface/70 transition-all"
          >
            <div className="flex items-center gap-3">
              <Bell className="w-5 h-5 text-primary" />
              <div className="text-left">
                <p className="font-medium text-text-main">Notifications</p>
                <p className="text-xs text-text-muted">Milestones and updates</p>
              </div>
            </div>
            <div className={`w-12 h-7 rounded-full transition-all ${notificationsEnabled ? 'bg-primary' : 'bg-surfaceHover'}`}>
              <div className={`w-5 h-5 rounded-full bg-white transition-transform mt-1 ${notificationsEnabled ? 'ml-6' : 'ml-1'}`}></div>
            </div>
          </button>
        </div>

        {/* Sync Section */}
        <div className="space-y-3">
          <h3 className="text-sm font-bold text-text-muted uppercase tracking-wide">Sync</h3>
          <button
            onClick={handleAutoSyncToggle}
            className="w-full flex items-center justify-between p-4 bg-surface/50 border border-surfaceHover/30 rounded-lg hover:bg-surface/70 transition-all"
          >
            <div className="flex items-center gap-3">
              <RotateCcw className="w-5 h-5 text-primary" />
              <div className="text-left">
                <p className="font-medium text-text-main">Auto-Sync</p>
                <p className="text-xs text-text-muted">Every 30 minutes</p>
              </div>
            </div>
            <div className={`w-12 h-7 rounded-full transition-all ${autoSyncEnabled ? 'bg-primary' : 'bg-surfaceHover'}`}>
              <div className={`w-5 h-5 rounded-full bg-white transition-transform mt-1 ${autoSyncEnabled ? 'ml-6' : 'ml-1'}`}></div>
            </div>
          </button>
        </div>

        {/* Actions Section */}
        <div className="space-y-3 pt-6 border-t border-surfaceHover/30">
          <h3 className="text-sm font-bold text-text-muted uppercase tracking-wide">Danger Zone</h3>
          
          <button
            onClick={() => setShowLogoutConfirm(true)}
            className="w-full flex items-center justify-between p-4 bg-orange-500/10 border-2 border-orange-500/30 rounded-xl hover:bg-orange-500/15 hover:border-orange-500/50 transition-all group"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-500/20 rounded-lg group-hover:scale-110 transition-transform">
                <LogOut className="w-4 h-4 text-orange-400" />
              </div>
              <div className="text-left">
                <p className="font-semibold text-orange-400 text-sm">Logout</p>
                <p className="text-xs text-orange-400/60">Exit your account</p>
              </div>
            </div>
          </button>

          <button
            onClick={() => setShowClearDataConfirm(true)}
            className="w-full flex items-center justify-between p-4 bg-red-500/10 border-2 border-red-500/30 rounded-xl hover:bg-red-500/15 hover:border-red-500/50 transition-all group"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-500/20 rounded-lg group-hover:scale-110 transition-transform">
                <AlertTriangle className="w-4 h-4 text-red-400" />
              </div>
              <div className="text-left">
                <p className="font-semibold text-red-400 text-sm">Clear All Data</p>
                <p className="text-xs text-red-400/60">Cannot be undone</p>
              </div>
            </div>
          </button>
        </div>
      </div>

      {/* Logout Confirmation Dialog */}
      {showLogoutConfirm && (
        <ConfirmDialog
          title="Logout?"
          message="You'll be logged out and can set up your account again later. Your extension will reset to the welcome screen."
          confirmText="Logout"
          cancelText="Cancel"
          onConfirm={handleLogout}
          onCancel={() => setShowLogoutConfirm(false)}
          isDangerous={false}
        />
      )}

      {/* Clear Data Confirmation Dialog */}
      {showClearDataConfirm && (
        <ConfirmDialog
          title="Clear All Data?"
          message="This will permanently delete all your friends list, settings, cache, and stored data. This action cannot be undone. You'll need to set up your account again."
          confirmText="Clear Data"
          cancelText="Cancel"
          onConfirm={handleClearData}
          onCancel={() => setShowClearDataConfirm(false)}
          isDangerous={true}
        />
      )}
    </div>
  );
}

export default SettingsPanel;
