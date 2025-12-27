import React, { useState, useEffect } from 'react';
import { Users, TrendingUp, BarChart3, Github, Rocket, Loader2, Sparkles, Frown, FileBarChart } from 'lucide-react';
import Leaderboard from './Leaderboard';
import AddFriend from './AddFriend';
import LoadingSkeleton from './LoadingSkeleton';
import StreakView from './StreakView';
import NotificationSettings from './NotificationSettings';
import NotificationToast from './NotificationToast';
import InsightsPanelEnhanced from './InsightsPanelEnhanced';
import ProgressChart from './ProgressChart';
import GitHubSync from './GitHubSync';
import Footer from './Footer';
import { getTimeSinceUpdate } from '../shared/streak-calculator';

function App() {
  const [friends, setFriends] = useState({});
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [error, setError] = useState(null);
  const [view, setView] = useState('streak'); // 'streak', 'leaderboard', 'analytics', or 'github'
  const [myUsername, setMyUsername] = useState(null);
  const [setupMode, setSetupMode] = useState(false);
  const [setupUsername, setSetupUsername] = useState('');
  const [setupLoading, setSetupLoading] = useState(false);
  const [setupError, setSetupError] = useState('');
  const [showNotificationSettings, setShowNotificationSettings] = useState(false);
  const [theme, setTheme] = useState('dark');
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    // Check if chrome.runtime is available
    if (typeof chrome === 'undefined' || !chrome.runtime) {
      setError('Extension context not available');
      setLoading(false);
      return;
    }
    loadTheme();
    checkSetup();
    loadUnreadNotifications();
  }, []);

  const loadUnreadNotifications = async () => {
    try {
      const result = await chrome.storage.local.get('unread_notifications');
      const unread = result.unread_notifications || [];
      
      // Filter out notifications older than 1 day
      const oneDayAgo = Date.now() - (24 * 60 * 60 * 1000);
      const recentNotifications = unread.filter(n => n.timestamp > oneDayAgo);
      
      // Update storage if any were removed
      if (recentNotifications.length !== unread.length) {
        await chrome.storage.local.set({ unread_notifications: recentNotifications });
      }
      
      if (recentNotifications.length > 0) {
        setNotifications(recentNotifications);
      }
    } catch (error) {
      console.error('Error loading notifications:', error);
    }
  };

  const handleDismissNotifications = async (notificationId) => {
    // Remove the dismissed notification
    const updatedNotifications = notifications.filter(n => n.id !== notificationId);
    setNotifications(updatedNotifications);
    
    try {
      await chrome.storage.local.set({ unread_notifications: updatedNotifications });
    } catch (error) {
      console.error('Error clearing notification:', error);
    }
  };

  const loadTheme = async () => {
    try {
      const result = await chrome.storage.local.get('theme');
      const savedTheme = result.theme || 'dark';
      setTheme(savedTheme);
      document.documentElement.setAttribute('data-theme', savedTheme);
    } catch (error) {
      console.error('Error loading theme:', error);
    }
  };

  const toggleTheme = async () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);
    try {
      await chrome.storage.local.set({ theme: newTheme });
    } catch (error) {
      console.error('Error saving theme:', error);
    }
  };

  const checkSetup = async () => {
    try {
      const result = await chrome.storage.local.get('my_leetcode_username');
      console.log('Setup check result:', result);
      if (result.my_leetcode_username) {
        setMyUsername(result.my_leetcode_username);
        await fetchFriends();
      } else {
        setSetupMode(true);
        setLoading(false);
      }
    } catch (err) {
      console.error('Error checking setup:', err);
      setSetupMode(true);
      setLoading(false);
    }
  };

  const handleSetup = async (e) => {
    e.preventDefault();
    if (!setupUsername.trim()) {
      setSetupError('Please enter your LeetCode username');
      return;
    }

    setSetupLoading(true);
    setSetupError('');

    try {
      const response = await chrome.runtime.sendMessage({
        type: 'ADD_FRIEND',
        username: setupUsername.trim()
      });

      if (response.success) {
        await chrome.storage.local.set({ my_leetcode_username: setupUsername.trim() });
        setMyUsername(setupUsername.trim());
        setSetupMode(false);
        // Wait a bit for data to propagate
        await new Promise(resolve => setTimeout(resolve, 500));
        await fetchFriends();
      } else {
        setSetupError(response.error || 'Failed to verify username');
      }
    } catch (err) {
      console.error('Error during setup:', err);
      setSetupError('Failed to verify username. Please try again.');
    } finally {
      setSetupLoading(false);
    }
  };

  const fetchFriends = async (forceRefresh = false) => {
    const startTime = Date.now();
    
    try {
      // Always show loading state when actively fetching
      setLoading(true);
      if (forceRefresh) {
        setRefreshing(true);
      }
      setError(null);

      const response = await chrome.runtime.sendMessage({
        type: 'FETCH_STATS',
        forceRefresh
      });

      if (response.success) {
        setFriends(response.friends);
        
        // Get most recent update time
        const timestamps = Object.values(response.friends).map(f => f.lastUpdated);
        if (timestamps.length > 0) {
          setLastUpdated(Math.max(...timestamps));
        }
      } else {
        setError(response.error || 'Failed to fetch data');
      }
    } catch (err) {
      console.error('Error fetching friends:', err);
      setError('Failed to connect to background service');
    } finally {
      // Only delay if we're actually fetching data (forceRefresh)
      if (forceRefresh) {
        setLoading(false);
        setRefreshing(false);
      } else {
        // For initial load, show immediately
        setLoading(false);
        setRefreshing(false);
      }
    }
  };

  const handleRefresh = () => {
    fetchFriends(true);
  };

  const handleFriendAdded = () => {
    fetchFriends(true);
  };

  const friendsList = Object.values(friends);
  const myData = myUsername ? friends[myUsername] : null;
  
  // Debug logging
  console.log('myUsername:', myUsername);
  console.log('friends keys:', Object.keys(friends));
  console.log('myData found:', myData ? 'yes' : 'no');
  
  // Calculate my streak
  const myStreak = myData?.stats?.streak || 0;
  
  // Check if data is loaded
  const hasData = myData !== null && myData !== undefined;

  // Setup screen
  if (setupMode) {
    console.log('Rendering setup mode');
    return (
      <div className="w-[400px] h-[600px] bg-background flex items-center justify-center p-8">
        <div className="text-center max-w-sm w-full animate-fade-in mx-auto">
          <div className="w-24 h-24 bg-surface rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg ring-4 ring-surfaceHover">
            <Rocket className="w-12 h-12 text-primary animate-bounce-slow" />
          </div>
          <h1 className="text-2xl font-bold text-text-main mb-2 text-center">Welcome to LeetStreak!</h1>
          <p className="text-sm text-text-muted mb-8 text-center mx-auto">
            Enter your LeetCode username to track your coding journey and streaks
          </p>
          
          <form onSubmit={handleSetup} className="space-y-4 w-full">
            <div className="relative group w-full">
              <input
                type="text"
                value={setupUsername}
                onChange={(e) => setSetupUsername(e.target.value)}
                placeholder="Your LeetCode username"
                disabled={setupLoading}
                className="w-full px-4 py-4 bg-surface border-2 border-surfaceHover rounded-2xl focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary text-text-main placeholder-text-muted transition-all duration-300 text-center font-medium disabled:opacity-50"
                autoFocus
              />
            </div>
            
            {setupError && (
              <div className="p-3 bg-red-500/10 rounded-xl border border-red-500/20 text-sm text-red-400 animate-shake text-center w-full">
                {setupError}
              </div>
            )}
            
            <button
              type="submit"
              disabled={setupLoading}
              className="w-full py-4 bg-primary hover:bg-primaryHover text-inverted font-bold rounded-2xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-primary/20 active:scale-95"
            >
              <span className="flex items-center justify-center gap-2">
                {setupLoading ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Verifying...</>
                ) : (
                  <><Sparkles className="w-4 h-4" /> Get Started</>
                )}
              </span>
            </button>
          </form>
          
          <p className="mt-6 text-xs text-text-muted text-center mx-auto">
            We'll fetch your LeetCode stats and start tracking your progress
          </p>
        </div>
      </div>
    );
  }

  console.log('Rendering main app - loading:', loading, 'error:', error, 'hasData:', hasData);

  return (
    <div className="w-[400px] h-[600px] bg-gradient-to-br from-background via-background to-surface/20 flex flex-col overflow-hidden text-text-main">
      {loading ? (
        <LoadingSkeleton count={3} />
      ) : error ? (
        <div className="flex-1 flex items-center justify-center p-6 animate-fade-in">
          <div className="text-center">
            <Frown className="w-16 h-16 text-text-muted mb-3 animate-bounce-slow mx-auto" />
            <p className="text-red-400 font-semibold mb-2">Oops!</p>
            <p className="text-sm text-text-muted mb-6">{error}</p>
            <button
              onClick={() => fetchFriends()}
              className="px-6 py-2 bg-primary hover:bg-primaryHover text-inverted font-medium rounded-full transition-colors shadow-lg hover:shadow-primary/20"
            >
              Try Again
            </button>
          </div>
        </div>
      ) : !hasData ? (
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center animate-fade-in">
          <div className="w-20 h-20 bg-surface rounded-full flex items-center justify-center mb-6 ring-2 ring-surfaceHover">
            <FileBarChart className="w-16 h-16 text-primary animate-pulse-slow" />
          </div>
          <h3 className="text-xl font-bold text-text-main mb-2">Loading Your Data</h3>
          <p className="text-sm text-text-muted mb-8 max-w-xs">
            Fetching your LeetCode stats...
          </p>
          <button
            onClick={handleRefresh}
            className="px-6 py-3 bg-primary hover:bg-primaryHover text-inverted rounded-2xl font-semibold transition-all shadow-lg hover:shadow-primary/20"
          >
            Refresh
          </button>
        </div>
      ) : (
        <>
          {/* Top Navigation Tabs with Settings Button */}
          <div className="flex border-b border-surfaceHover/50 bg-surface/95 backdrop-blur-md sticky top-0 z-10 shadow-lg">
            <div className="flex flex-1 gap-0 px-2">
              <button
                onClick={() => setView('leaderboard')}
                className={`flex-1 py-3.5 px-2 text-sm font-medium transition-all duration-200 relative group ${
                  view === 'leaderboard' ? 'text-primary' : 'text-text-muted hover:text-text-main'
                }`}
              >
                <Users className={`w-5 h-5 mx-auto mb-1.5 transition-transform duration-200 ${
                  view === 'leaderboard' ? 'scale-110' : 'group-hover:scale-105'
                }`} />
                <span className="text-[11px] font-semibold">Friends</span>
                {view === 'leaderboard' && (
                  <div className="absolute bottom-0 left-2 right-2 h-0.5 bg-gradient-to-r from-transparent via-primary to-transparent"></div>
                )}
              </button>
              <button
                onClick={() => setView('streak')}
                className={`flex-1 py-3.5 px-2 text-sm font-medium transition-all duration-200 relative group ${
                  view === 'streak' ? 'text-primary' : 'text-text-muted hover:text-text-main'
                }`}
              >
                <TrendingUp className={`w-5 h-5 mx-auto mb-1.5 transition-transform duration-200 ${
                  view === 'streak' ? 'scale-110' : 'group-hover:scale-105'
                }`} />
                <span className="text-[11px] font-semibold">Progress</span>
                {view === 'streak' && (
                  <div className="absolute bottom-0 left-2 right-2 h-0.5 bg-gradient-to-r from-transparent via-primary to-transparent"></div>
                )}
              </button>
              <button
                onClick={() => setView('analytics')}
                className={`flex-1 py-3.5 px-2 text-sm font-medium transition-all duration-200 relative group ${
                  view === 'analytics' ? 'text-primary' : 'text-text-muted hover:text-text-main'
                }`}
              >
                <BarChart3 className={`w-5 h-5 mx-auto mb-1.5 transition-transform duration-200 ${
                  view === 'analytics' ? 'scale-110' : 'group-hover:scale-105'
                }`} />
                <span className="text-[11px] font-semibold">Analytics</span>
                {view === 'analytics' && (
                  <div className="absolute bottom-0 left-2 right-2 h-0.5 bg-gradient-to-r from-transparent via-primary to-transparent"></div>
                )}
              </button>
              <button
                onClick={() => setView('github')}
                className={`flex-1 py-3.5 px-2 text-sm font-medium transition-all duration-200 relative group ${
                  view === 'github' ? 'text-primary' : 'text-text-muted hover:text-text-main'
                }`}
              >
                <Github className={`w-5 h-5 mx-auto mb-1.5 transition-transform duration-200 ${
                  view === 'github' ? 'scale-110' : 'group-hover:scale-105'
                }`} />
                <span className="text-[11px] font-semibold">GitHub</span>
                {view === 'github' && (
                  <div className="absolute bottom-0 left-2 right-2 h-0.5 bg-gradient-to-r from-transparent via-primary to-transparent"></div>
                )}
              </button>
            </div>
            <div className="flex items-center gap-1 pr-2">
              <button
                onClick={toggleTheme}
                className="p-2.5 text-text-muted hover:text-primary transition-all duration-200 hover:bg-surfaceHover/50 rounded-lg"
                title="Toggle Theme"
              >
                {theme === 'dark' ? (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                  </svg>
                )}
              </button>
              <button
                onClick={() => setShowNotificationSettings(true)}
                className="p-2.5 text-text-muted hover:text-primary transition-all duration-200 hover:bg-surfaceHover/50 rounded-lg"
                title="Notification Settings"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
              </button>
            </div>
          </div>

          {/* Notification Settings Modal */}
          <NotificationSettings 
            isOpen={showNotificationSettings}
            onClose={() => setShowNotificationSettings(false)}
          />

          {/* Content */}
          <div className="flex-1 overflow-hidden bg-background flex flex-col pb-10">
            {view === 'streak' ? (
              hasData ? (
                <StreakView 
                  friends={[myData]} 
                  currentStreak={myStreak}
                  onRefresh={handleRefresh}
                  refreshing={refreshing}
                />
              ) : (
                <div className="flex items-center justify-center h-full p-8 text-center">
                  <div>
                    <FileBarChart className="w-20 h-20 text-primary mb-4 animate-pulse mx-auto" />
                    <p className="text-text-muted mb-4">Loading your progress...</p>
                    <button
                      onClick={handleRefresh}
                      className="px-4 py-2 bg-primary text-inverted rounded-full text-sm font-medium"
                    >
                      Refresh
                    </button>
                  </div>
                </div>
              )
            ) : view === 'analytics' ? (
              myData ? (
                <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-hide">
                  {myData.submissionCalendar && (
                    <ProgressChart submissionCalendar={typeof myData.submissionCalendar === 'string' ? JSON.parse(myData.submissionCalendar) : myData.submissionCalendar} />
                  )}
                  <InsightsPanelEnhanced userData={myData} friendsData={friendsList.filter(f => f.username !== myUsername)} />
                </div>
              ) : (
                <div className="flex items-center justify-center h-full p-8 text-center">
                  <div>
                    <BarChart3 className="w-20 h-20 text-primary mb-4 animate-pulse mx-auto" />
                    <p className="text-text-muted mb-4">Loading analytics data...</p>
                    <button
                      onClick={handleRefresh}
                      className="px-4 py-2 bg-primary text-inverted rounded-full text-sm font-medium"
                    >
                      Refresh
                    </button>
                  </div>
                </div>
              )
            ) : view === 'github' ? (
              <GitHubSync />
            ) : (
              <>
                <AddFriend onFriendAdded={handleFriendAdded} />
                <div className="flex-1 overflow-y-auto scrollbar-hide">
                  <Leaderboard friends={friendsList} myData={myData} myUsername={myUsername} onRefresh={handleRefresh} />
                </div>
              </>
            )}
          </div>
        </>
      )}

      {/* Notification Toast */}
      <NotificationToast 
        notifications={notifications} 
        onDismiss={handleDismissNotifications} 
      />

      {/* Footer */}
      <Footer />
    </div>
  );
}

export default App;
