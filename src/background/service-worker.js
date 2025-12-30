/**
 * LeetFriends Background Service Worker (Manifest V3)
 * - Handles 30-minute background sync alarms
 * - Fetches friend data sequentially with 500ms delays
 * - Sends batched notifications with daily limits per friend
 * - All logic uses UTC dates for consistency
 */

import { fetchUserData } from './leetcode-api.js';
import { getAllFriends, saveFriend, getFriendsList, getFriend, removeFriend } from '../shared/storage.js';
import { validateUsername } from '../shared/validation.js';
import { calculateStreak, getProblemsSolved, needsRefresh } from '../shared/streak-calculator.js';
import { 
  getNotificationState, 
  batchNotify,
  isNotificationMuted 
} from '../shared/notification-manager.js';
import { 
  detectMilestone, 
  isStreakAtRisk,
  buildNotificationMessage 
} from '../shared/activity-detector.js';
import {
  getCurrentInterval,
  getNextAlarmConfig,
  getScheduleDescription
} from '../shared/schedule-manager.js';
import { retrieveEncryptedToken } from '../shared/secure-token-manager.js';

const ALARM_NAME = 'leetfriends_sync';
const SCHEDULE_CHECK_ALARM = 'schedule_transition_check';
const REQUEST_DELAY_MS = 500;

// Global error handlers to catch any unhandled errors
self.addEventListener('error', (event) => {
  console.error('💥 UNCAUGHT SERVICE WORKER ERROR:', event.error);
  console.error('Stack:', event.error?.stack);
});

self.addEventListener('unhandledrejection', (event) => {
  console.error('💥 UNCAUGHT PROMISE REJECTION:', event.reason);
  console.error('Stack:', event.reason?.stack);
});

// Install listener - set up alarms
chrome.runtime.onInstalled.addListener(() => {
  console.log('LeetFriends installed - setting up dynamic sync alarm');
  setupDynamicAlarm();
  migrateOldSyncData();
});

/**
 * Migrate old synced_problems data to synced_submissions
 */
async function migrateOldSyncData() {
  try {
    const result = await chrome.storage.local.get(['synced_problems', 'synced_submissions']);
    
    // If old key exists but new key doesn't, migrate the data
    if (result.synced_problems && !result.synced_submissions) {
      console.log(`Migrating ${result.synced_problems.length} synced problems to new storage key`);
      await chrome.storage.local.set({
        synced_submissions: result.synced_problems
      });
      console.log('✅ Migration complete: synced_problems → synced_submissions');
    }
  } catch (error) {
    console.error('Error migrating sync data:', error);
  }
}

/**
 * Setup dynamic alarm based on time of day
 * Active hours (7 PM - 4 AM): 1.7 minutes
 * Quiet hours (4 AM - 7 PM): 30 minutes
 */
async function setupDynamicAlarm() {
  const config = getNextAlarmConfig();
  
  // Safety check in case config is undefined
  if (!config || !config.intervalMinutes) {
    console.warn('Invalid alarm config, using default 30 minute interval');
    await chrome.alarms.clear(ALARM_NAME);
    chrome.alarms.create(ALARM_NAME, {
      delayInMinutes: 30,
      periodInMinutes: 30
    });
    return;
  }
  
  console.log(`Setting up alarm: ${config.description}`);
  console.log(`Next check in ${config.intervalMinutes.toFixed(1)} minutes`);
  
  // Clear existing alarms
  await chrome.alarms.clear(ALARM_NAME);
  await chrome.alarms.clear(SCHEDULE_CHECK_ALARM);
  
  // Create main sync alarm with dynamic interval
  chrome.alarms.create(ALARM_NAME, {
    delayInMinutes: config.intervalMinutes,
    periodInMinutes: config.intervalMinutes
  });
  
  // Store current schedule for reference
  await chrome.storage.local.set({
    current_schedule: {
      interval: config.intervalMinutes,
      description: config.description,
      updatedAt: Date.now()
    }
  });
}

/**
 * Check if schedule needs to transition (active ↔ quiet)
 * Called on each alarm to ensure we're using the right interval
 */
async function checkScheduleTransition() {
  const result = await chrome.storage.local.get('current_schedule');
  const currentSchedule = result.current_schedule;
  const newInterval = getCurrentInterval();
  
  // If interval changed, reschedule alarm
  if (!currentSchedule || Math.abs(currentSchedule.interval - newInterval) > 0.1) {
    console.log(`Schedule transition detected! Switching to ${getScheduleDescription()}`);
    await setupDynamicAlarm();
  }
}

// Alarm listener - trigger background sync
chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === ALARM_NAME) {
    console.log(`Background sync triggered - ${getScheduleDescription()}`);
    
    // Check if we need to transition schedules
    await checkScheduleTransition();
    
    // Run sync
    await syncAllFriends();
  }
});

// Message listener - handle requests from popup/options
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('📨 Message received from', sender.url ? 'content script' : 'popup', ':', message.type);
  console.log('📦 Message object:', JSON.stringify(message, null, 2));

  // Handle PING synchronously first (no async)
  if (message.type === 'PING') {
    console.log('🏓 Service worker pinged - keeping alive');
    sendResponse({ pong: true });
    return;
  }

  switch (message.type) {
    case 'FETCH_STATS':
      handleFetchStats(message.forceRefresh).then(sendResponse);
      return true; // Async response
    
    case 'ADD_FRIEND':
      handleAddFriend(message.username).then(sendResponse);
      return true;
    
    case 'REMOVE_FRIEND':
      handleRemoveFriend(message.username).then(sendResponse);
      return true;
    
    case 'GET_FRIENDS':
      handleGetFriends().then(sendResponse);
      return true;
    
    case 'MUTE_NOTIFICATIONS':
      handleMuteNotifications(message.untilUTC).then(sendResponse);
      return true;
    
    case 'GET_NOTIFICATION_STATE':
      handleGetNotificationState().then(sendResponse);
      return true;
    
    case 'ADD_TO_QUEUE':
      handleAddToQueue(message.problemData).then(sendResponse);
      return true;
    
    case 'GITHUB_SYNC_SUBMISSION':
      console.log('🔥 GITHUB_SYNC_SUBMISSION message handler triggered!');
      console.log('📋 Submission details:', { submissionId: message.submissionId, hasProblemTitle: !!message.submission?.problemTitle });
      handleGitHubSyncSubmission(message.submission, message.submissionId).then(sendResponse).catch(err => {
        console.error('💥 Error in GITHUB_SYNC_SUBMISSION:', err);
        sendResponse({ success: false, error: err.message });
      });
      return true;
    
    case 'GITHUB_SYNC_ENABLED':
      handleGitHubSyncEnabled().then(sendResponse);
      return true;
    
    case 'MANUAL_SYNC_REQUESTED':
      handleManualSync().then(sendResponse);
      return true;
    
    case 'RETRY_FAILED_SYNCS':
      handleRetryFailedSyncs().then(sendResponse);
      return true;
    
    // ===== Device Flow Authentication =====
    case 'GITHUB_DEVICE_CODE_REQUEST':
      handleDeviceCodeRequest().then(sendResponse);
      return true;
    
    case 'GITHUB_DEVICE_POLL':
      handleDevicePoll(message.deviceCode).then(sendResponse);
      return true;
    
    case 'GITHUB_VALIDATE_TOKEN':
      handleValidateToken(message.token).then(sendResponse);
      return true;
    
    case 'GITHUB_STORE_CREDENTIALS':
      handleStoreCredentials(message.token, message.username, message.repo).then(sendResponse);
      return true;
    
    case 'GITHUB_CLEAR_CREDENTIALS':
      handleClearCredentials().then(sendResponse);
      return true;
    
    case 'GITHUB_GET_STATUS':
      handleGetGitHubStatus().then(sendResponse);
      return true;
    
    case 'GITHUB_ENSURE_REPO':
      handleEnsureRepo(message.token, message.username, message.repo).then(sendResponse);
      return true;
    
    case 'SHOW_NOTIFICATION':
      chrome.notifications.create({
        type: 'basic',
        iconUrl: 'icons/icon128.png',
        title: message.title || 'LeetStreak',
        message: message.message || '',
        priority: 2,
        requireInteraction: true
      });
      sendResponse({ success: true });
      return true;
    
    case 'GET_STORAGE_STATUS':
      // Feature not implemented yet
      sendResponse({ bytesInUse: 0, quota: chrome.storage.local.QUOTA_BYTES });
      return true;
    
    case 'CSP_VIOLATION':
      handleCSPViolation(message.violation, sender);
      sendResponse({ received: true });
      return true;
    
    case 'RESCHEDULE_ALARMS':
      setupDynamicAlarm().then(() => {
        sendResponse({ success: true });
      });
      return true;
    
    default:
      sendResponse({ success: false, error: 'Unknown message type' });
  }
});

/**
 * Handle FETCH_STATS request
 * - Checks if data needs refresh (>15 mins old)
 * - Returns cached data if fresh, otherwise fetches new data
 */
async function handleFetchStats(forceRefresh = false) {
  try {
    const friends = await getAllFriends();
    const friendUsernames = Object.keys(friends);

    if (friendUsernames.length === 0) {
      return { success: true, friends: {}, message: 'No friends added yet' };
    }

    // Check if any friend needs refresh
    let needsSync = forceRefresh;
    if (!forceRefresh) {
      for (const username of friendUsernames) {
        if (needsRefresh(friends[username].lastUpdated)) {
          needsSync = true;
          break;
        }
      }
    }

    if (needsSync) {
      console.log('Data stale - triggering sync');
      await syncAllFriends();
      const updatedFriends = await getAllFriends();
      return { success: true, friends: updatedFriends, refreshed: true };
    }

    return { success: true, friends, cached: true };
  } catch (error) {
    console.error('Error in handleFetchStats:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Handle ADD_FRIEND request
 * - Validates username by fetching data
 * - Saves to storage if valid
 */
async function handleAddFriend(username) {
  try {
    // Store original username for API call
    const originalUsername = username;
    
    // Validate and normalize username (prevents XSS and case duplication)
    let normalizedUsername;
    try {
      normalizedUsername = validateUsername(username);
    } catch (validationError) {
      return { success: false, error: validationError.message };
    }

    console.log(`Adding friend: ${originalUsername} (normalized: ${normalizedUsername})`);
    
    // Check if friend already exists (using normalized username)
    const existingFriend = await getFriend(normalizedUsername);
    if (existingFriend) {
      return { success: false, error: `${originalUsername} is already in your friends list` };
    }
    
    // Fetch data using ORIGINAL username (LeetCode API is case-sensitive)
    const data = await fetchUserData(originalUsername);
    
    // Process and save using normalized username as key
    const processedData = processUserData(data);
    await saveFriend(normalizedUsername, processedData);

    return { success: true, message: `${originalUsername} added successfully`, data: processedData };
  } catch (error) {
    console.error('Error adding friend:', error);
    return { success: false, error: error.message || 'User not found or profile is private' };
  }
}

/**
 * Handle ADD_TO_QUEUE request
 */
async function handleAddToQueue(problemData) {
  try {
    if (!problemData) {
      return { success: false, error: 'Problem data is required' };
    }

    // Get existing queue
    const result = await chrome.storage.local.get('problem_queue');
    const queue = result.problem_queue || [];
    
    // Check if already in queue (by slug or id)
    const exists = queue.some(p => {
      return p.slug === problemData.slug || 
             p.id === problemData.slug ||
             (p.url && p.url === problemData.url);
    });
    
    if (exists) {
      return { success: false, error: 'Already in queue!', alreadyExists: true };
    }
    
    // Check if problem is already submitted
    let status = problemData.status || 'pending'; // Use status from content script if available
    
    // If not already marked as completed from page detection, check with API
    if (status !== 'completed') {
      try {
        const storageResult = await chrome.storage.local.get(['my_leetcode_username', 'friends_data']);
        const { my_leetcode_username } = storageResult;
        const friendsData = storageResult.friends_data || {};
        
        if (my_leetcode_username) {
          const myData = friendsData[my_leetcode_username];
          
          if (myData) {
            // Check in recentSubmissions
            const recentSubmissions = myData.recentSubmissions || [];
            const isInRecent = recentSubmissions.some(sub => {
              return (sub.titleSlug === problemData.slug || sub.slug === problemData.slug) && 
                     sub.statusDisplay === 'Accepted';
            });
            
            // Check in allAcceptedSubmissions (covers all solved problems)
            const allAccepted = myData.allAcceptedSubmissions || [];
            const isInAll = allAccepted.some(sub => {
              return sub.titleSlug === problemData.slug || sub.slug === problemData.slug;
            });
            
            if (isInRecent || isInAll) {
              status = 'completed';
              console.log(`Problem ${problemData.slug} already submitted - marking as completed`);
            }
          }
        }
      } catch (error) {
        console.error('Error checking submission status:', error);
        // Continue with pending status if check fails
      }
    } else {
      console.log(`Problem ${problemData.slug} marked as completed from page detection`);
    }
    
    // Ensure all existing problems have id field
    const normalizedQueue = queue.map(p => {
      if (!p.id) {
        p.id = p.slug || `problem-${Date.now()}-${Math.random()}`;
      }
      return p;
    });
    
    // Add to queue with id field
    const newProblem = {
      ...problemData,
      id: problemData.slug || `problem-${Date.now()}-${Math.random()}`,
      addedAt: Date.now(),
      status: status // pending, in-progress, or completed (if already submitted)
    };
    
    normalizedQueue.push(newProblem);
    
    await chrome.storage.local.set({ problem_queue: normalizedQueue });
    
    console.log(`Problem added to queue with status: ${status}`);
    return { success: true, message: 'Added to queue!', status: status };
  } catch (error) {
    console.error('Error adding to queue:', error);
    return { success: false, error: error.message || 'Failed to add to queue' };
  }
}

/**
 * Handle REMOVE_FRIEND request
 */
async function handleRemoveFriend(username) {
  try {
    await removeFriend(username);
    return { success: true, message: `${username} removed` };
  } catch (error) {
    console.error('Error removing friend:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Handle GET_FRIENDS request
 */
async function handleGetFriends() {
  try {
    const friends = await getAllFriends();
    return { success: true, friends };
  } catch (error) {
    console.error('Error getting friends:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Handle MUTE_NOTIFICATIONS request
 */
async function handleMuteNotifications(untilUTC) {
  try {
    const { setNotificationMuted } = await import('../shared/notification-manager.js');
    await setNotificationMuted(untilUTC);
    return { success: true, message: `Notifications muted until ${untilUTC}` };
  } catch (error) {
    console.error('Error muting notifications:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Handle GET_NOTIFICATION_STATE request
 */
async function handleGetNotificationState() {
  try {
    const state = await getNotificationState();
    return { success: true, state };
  } catch (error) {
    console.error('Error getting notification state:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Sync all friends sequentially with delays
 * - Fetches each friend's data with 500ms delay between requests
 * - Detects significant events and batches notifications
 * - Enforces max 1 notification per friend per UTC day
 * - Also checks if current user's streak is at risk
 */
async function syncAllFriends() {
  try {
    const friendUsernames = await getFriendsList();
    console.log(`Syncing ${friendUsernames.length} friends...`);

    // Skip if notifications are muted
    if (await isNotificationMuted()) {
      console.log('Notifications muted - skipping notification detection');
    }

    const notificationEvents = [];

    // Get current user's username
    const result = await chrome.storage.local.get('my_leetcode_username');
    const myUsername = result.my_leetcode_username;

    for (const username of friendUsernames) {
      try {
        // Get previous data for comparison
        const oldData = await getFriend(username);

        // Fetch new data
        const newData = await fetchUserData(username);
        const processedData = processUserData(newData);

        // Save to storage
        await saveFriend(username, processedData);

        // Detect events for notifications (only if not muted)
        if (!(await isNotificationMuted())) {
          const events = await detectEvents(username, oldData, processedData);
          notificationEvents.push(...events);
          
          // Check if this is the current user and their streak is at risk
          if (myUsername && username === myUsername) {
            if (isStreakAtRisk(processedData.submissionCalendar, processedData.stats.streak)) {
              notificationEvents.push({
                username: 'You',
                type: 'streak_at_risk',
                message: buildNotificationMessage('You', 'streak_at_risk', { streak: processedData.stats.streak }),
                priority: 3
              });
            }
          }
        }

        // Delay before next request
        await sleep(REQUEST_DELAY_MS);
      } catch (error) {
        console.error(`Error syncing ${username}:`, error);
        // Continue with next friend
      }
    }

    // Send batched notifications
    if (notificationEvents.length > 0) {
      console.log(`Sending ${notificationEvents.length} notification(s):`, notificationEvents);
      await batchNotify(notificationEvents);
    } else {
      console.log('No notification events detected');
    }

    console.log('Sync completed');
  } catch (error) {
    console.error('Error in syncAllFriends:', error);
  }
}

/**
 * Detect significant events for a friend
 * Returns array of notification events
 */
async function detectEvents(username, oldData, newData) {
  const events = [];

  console.log(`🔍 Checking events for ${username}...`);

  // Get the current user's username
  const storageData = await chrome.storage.local.get('my_leetcode_username');
  const myUsername = storageData.my_leetcode_username;

  // Skip new_submission and milestone notifications for the user's own account
  // (they see their own stats in the app, no need for duplicate notifications)
  if (username && myUsername && username.toLowerCase() === myUsername.toLowerCase()) {
    console.log(`⏭️  Skipping personal notifications for your own account (${username})`);
    return events;
  }

  // Event 1: NEW SUBMISSION DETECTED (Real-time notification)
  if (oldData && oldData.stats && newData.stats) {
    const oldTotal = oldData.stats.total || 0;
    const newTotal = newData.stats.total || 0;
    
    if (newTotal > oldTotal) {
      const problemsSubmitted = newTotal - oldTotal;
      console.log(`🎯 ${username} submitted ${problemsSubmitted} new problem(s)!`);
      
      // Get the most recent submission details
      let problemTitle = 'a problem';
      if (newData.recentSubmissions && newData.recentSubmissions.length > 0) {
        const latestSubmission = newData.recentSubmissions[0];
        problemTitle = latestSubmission.title || problemTitle;
      }
      
      events.push({
        username,
        type: 'new_submission',
        message: `${username} just solved ${problemsSubmitted === 1 ? problemTitle : `${problemsSubmitted} problems`}! 🎯`,
        priority: 1
      });
    }
  }

  // Event 2: Milestone reached (7, 30, 100 days)
  if (detectMilestone(newData.stats.streak)) {
    const oldStreak = oldData?.stats?.streak || 0;
    if (newData.stats.streak > oldStreak) {
      console.log(`🎉 ${username} reached milestone: ${newData.stats.streak} day streak!`);
      events.push({
        username,
        type: 'milestone',
        message: `${username} hit ${newData.stats.streak} day streak! 🔥`,
        priority: 2
      });
    }
  }

  if (events.length > 0) {
    console.log(`📊 Found ${events.length} event(s) for ${username}`);
  }

  return events;
}

/**
 * Process raw API data into storage format
 */
function processUserData(data) {
  const { profile, contestRanking, submissionCalendar, allAcceptedSubmissions } = data;
  
  const streak = calculateStreak(submissionCalendar);
  const problemsSolved = getProblemsSolved(profile.submitStats.acSubmissionNum);

  return {
    profile: {
      username: profile.username,
      realName: profile.profile.realName,
      avatar: profile.profile.userAvatar,
      ranking: profile.profile.ranking
    },
    stats: {
      ...problemsSolved,
      streak: streak
    },
    contest: {
      rating: contestRanking?.rating || 0,
      attended: contestRanking?.attendedContestsCount || 0,
      ranking: contestRanking?.globalRanking || 0
    },
    badges: profile.badges || [],
    recentSubmissions: profile.recentSubmissions || [],
    allAcceptedSubmissions: allAcceptedSubmissions || [],
    submissionCalendar: submissionCalendar,
    lastUpdated: Date.now()
  };
}

/**
 * Utility sleep function
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ===== GitHub Auto-Sync Handlers =====

/**
 * Handle GitHub sync request for accepted submission
 */
async function handleGitHubSync(submissionId, submission) {
  try {
    console.log('🐙 GitHub Auto-Sync: Processing submission', submissionId);
    console.log('📝 Submission details:', {
      title: submission.problemTitle,
      language: submission.language,
      codeLength: submission.code?.length || 0
    });
    
    // Get GitHub settings
    const settings = await chrome.storage.local.get([
      'github_username',
      'github_repo',
      'github_sync_enabled'
    ]);

    console.log('⚙️ GitHub settings check:', {
      enabled: settings.github_sync_enabled,
      username: settings.github_username,
      repo: settings.github_repo
    });

    if (!settings.github_sync_enabled) {
      console.warn('⚠️ GitHub sync is disabled - submission stored as pending');
      return { success: false, error: 'GitHub sync not enabled' };
    }

    if (!settings.github_username || !settings.github_repo) {
      console.warn('⚠️ GitHub username or repo not configured');
      return { success: false, error: 'GitHub settings incomplete' };
    }

    // Retrieve encrypted token
    console.log('🔐 Retrieving encrypted GitHub token...');
    const github_token = await retrieveEncryptedToken('github_token');
    
    if (!github_token) {
      console.error('❌ GitHub token not found or could not be decrypted');
      return { success: false, error: 'GitHub token missing' };
    }
    
    console.log('✅ GitHub token retrieved successfully');

    // Prepare settings with decrypted token
    const fullSettings = {
      ...settings,
      github_token: github_token
    };

    // Attempt sync with retry logic
    console.log('🔄 Starting GitHub sync with retry logic...');
    const result = await syncToGitHubWithRetry(submission, fullSettings, 3);

    if (result.success) {
      console.log('✅ GitHub auto-sync successful!');
      
      // Remove pending submission
      await chrome.storage.local.remove(submissionId);
      
      // Show success notification
      chrome.notifications.create({
        type: 'basic',
        iconUrl: '/icons/icon128.png',
        title: 'GitHub Auto-Sync Success ✅',
        message: `Synced "${submission.problemTitle}" to GitHub!`,
        priority: 1
      });

      return { success: true };
    } else {
      console.error('❌ GitHub auto-sync failed:', result.error);
      
      // Move to failed syncs
      const failedSyncs = await chrome.storage.local.get('failed_syncs');
      const failed = failedSyncs.failed_syncs || [];
      
      failed.push({
        submission,
        error: result.error,
        timestamp: Date.now(),
        retryCount: 0
      });

      await chrome.storage.local.set({ failed_syncs: failed });

      // Show error notification
      chrome.notifications.create({
        type: 'basic',
        iconUrl: '/icons/icon128.png',
        title: 'GitHub Auto-Sync Failed ❌',
        message: `Failed to sync "${submission.problemTitle}": ${result.error}`,
        priority: 2
      });

      return { success: false, error: result.error };
    }
  } catch (error) {
    console.error('💥 Critical error in handleGitHubSync:', error);
    return { success: false, error: error.message || 'Unknown error' };
  }
}

/**
 * Generate file path for solution
 * Format: {Topic}/{Difficulty}/{number}-{slug}.{ext}
 */
function generateSolutionFilePath(submission) {
  const {
    questionNumber,
    problemSlug,
    language,
    difficulty = 'Medium',
    topics = []
  } = submission;

  // Language to extension map
  const extMap = {
    'python': 'py', 'python3': 'py', 'javascript': 'js', 'typescript': 'ts',
    'java': 'java', 'cpp': 'cpp', 'c++': 'cpp', 'c': 'c', 'csharp': 'cs',
    'go': 'go', 'rust': 'rs', 'swift': 'swift', 'kotlin': 'kt', 'ruby': 'rb',
    'scala': 'scala', 'php': 'php', 'sql': 'sql', 'mysql': 'sql', 'bash': 'sh', 'r': 'r'
  };
  
  const extension = extMap[language?.toLowerCase()] || 'txt';
  
  // Get primary topic
  const primaryTopic = (topics && topics.length > 0) 
    ? sanitizePath(topics[0]) 
    : 'Unsorted';
  
  // Sanitize difficulty
  const difficultyFolder = sanitizePath(difficulty || 'Medium');
  
  // Format question number
  const paddedNumber = String(questionNumber || 0).padStart(4, '0');
  
  // Sanitize slug
  const safeSlug = sanitizePath(problemSlug || 'solution');
  
  return `${primaryTopic}/${difficultyFolder}/${paddedNumber}-${safeSlug}.${extension}`;
}

/**
 * Generate metadata header for code file
 */
function generateCodeWithMetadata(submission) {
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
    language,
    code
  } = submission;

  // Get comment character based on language
  const commentMap = {
    'python': '#', 'python3': '#', 'ruby': '#', 'r': '#', 'bash': '#',
    'sql': '--', 'mysql': '--'
  };
  const comment = commentMap[language?.toLowerCase()] || '//';
  
  const divider = '═'.repeat(65);
  
  const lines = [
    `${comment} ${divider}`,
    `${comment} ${questionNumber}. ${problemTitle}`,
    `${comment} ${divider}`,
    `${comment} Difficulty: ${difficulty || 'Medium'}`,
    `${comment} Topics: ${topics.join(', ') || 'N/A'}`,
    `${comment}`,
  ];

  // Add performance stats
  if (runtime) {
    const percentileStr = runtimePercentile ? ` (Beats ${runtimePercentile}%)` : '';
    lines.push(`${comment} Runtime: ${runtime}${percentileStr}`);
  }
  if (memory) {
    const percentileStr = memoryPercentile ? ` (Beats ${memoryPercentile}%)` : '';
    lines.push(`${comment} Memory: ${memory}${percentileStr}`);
  }
  if (acceptanceRate) {
    lines.push(`${comment} Acceptance Rate: ${acceptanceRate}%`);
  }

  lines.push(`${comment}`);
  lines.push(`${comment} LeetCode: ${problemUrl || 'N/A'}`);
  lines.push(`${comment} Synced: ${new Date().toISOString()}`);
  lines.push(`${comment} ${divider}`);
  lines.push('');
  lines.push(code || '// No code captured');

  return lines.join('\n');
}

/**
 * Generate commit message
 */
function generateCommitMessage(submission, isUpdate = false) {
  const { questionNumber, problemTitle, difficulty, language } = submission;
  const action = isUpdate ? 'Update' : 'Add';
  const emoji = { 'Easy': '🟢', 'Medium': '🟡', 'Hard': '🔴' }[difficulty] || '📝';
  return `${emoji} ${action}: ${questionNumber}. ${problemTitle} (${language})`;
}

/**
 * Sync submission to GitHub with retry logic
 */
async function syncToGitHubWithRetry(submission, settings, maxRetries = 3) {
  const delays = [1000, 3000, 9000]; // Exponential backoff

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      // Generate proper file path: Topic/Difficulty/0001-two-sum.py
      const filePath = generateSolutionFilePath(submission);
      
      // Generate code with rich metadata header
      const fileContent = generateCodeWithMetadata(submission);
      
      // Generate commit message
      const commitMessage = generateCommitMessage(submission, false);

      console.log('📁 File path:', filePath);
      console.log('📝 Commit message:', commitMessage);

      const result = await syncToGithub(
        settings.github_token,
        settings.github_username,
        settings.github_repo,
        filePath,
        fileContent,
        commitMessage
      );
      
      if (result.success) {
        // Record successful sync with metadata
        await recordSuccessfulSync(submission, filePath, result.fileUrl);
        return result;
      }

      // If rate limited, wait longer
      if (result.error?.includes('rate limit')) {
        await sleep(60000); // Wait 1 minute
        continue;
      }

      // Other errors - exponential backoff
      if (attempt < maxRetries - 1) {
        await sleep(delays[attempt]);
      }
    } catch (error) {
      if (attempt === maxRetries - 1) {
        return { success: false, error: error.message };
      }
      await sleep(delays[attempt]);
    }
  }

  return { success: false, error: 'Max retries exceeded' };
}

/**
 * Core GitHub sync logic
 */
async function syncToGitHub(submission, settings) {
  const { github_token, github_username, github_repo } = settings;

  // Generate file path
  const filePath = generateGitHubFilePath(submission);
  
  // Check if file exists
  const existingFile = await getGitHubFile(github_token, github_username, github_repo, filePath);
  
  // Prepare code with metadata
  const codeWithMetadata = addCodeMetadata(submission);

  // Skip if identical
  if (existingFile.exists) {
    const existingContent = atob(existingFile.content);
    if (existingContent.trim() === codeWithMetadata.trim()) {
      return { success: true, skipped: true };
    }
  }

  // Push to GitHub
  const commitMessage = existingFile.exists 
    ? `Update: ${submission.problemTitle} (${submission.language})`
    : `Add: ${submission.problemTitle} (${submission.language})`;

  const result = await pushToGitHub(
    github_token,
    github_username,
    github_repo,
    filePath,
    codeWithMetadata,
    commitMessage,
    existingFile.sha
  );

  // Record successful sync
  if (result.success) {
    await recordSuccessfulSync(submission, filePath, result.fileUrl);
  }

  return result;
}

/**
 * Generate GitHub file path
 */
function generateGitHubFilePath(submission) {
  const { problemSlug, questionNumber, language, topics } = submission;
  
  // Get file extension
  const extMap = {
    'python3': 'py', 'javascript': 'js', 'typescript': 'ts',
    'java': 'java', 'cpp': 'cpp', 'c': 'c', 'csharp': 'cs',
    'go': 'go', 'rust': 'rs', 'swift': 'swift', 'kotlin': 'kt'
  };
  const ext = extMap[language.toLowerCase()] || 'txt';

  // Format: 0001-two-sum.py
  const number = String(questionNumber).padStart(4, '0');
  const filename = `${number}-${problemSlug}.${ext}`;

  // Use first topic as folder, or 'Unsorted'
  const folder = (topics && topics.length > 0) ? sanitizePath(topics[0]) : 'Unsorted';

  return `${folder}/${filename}`;
}

/**
 * Sanitize path
 */
function sanitizePath(path) {
  return path
    .replace(/[<>:"/\\|?*]/g, '-')
    .replace(/\s+/g, '-')
    .replace(/--+/g, '-')
    .replace(/^-|-$/g, '');
}

/**
 * Add metadata to code
 */
function addCodeMetadata(submission) {
  const { problemTitle, difficulty, topics, questionNumber, problemUrl, code, language } = submission;
  
  const commentChar = getCommentChar(language);
  
  const metadata = [
    `${commentChar} ${questionNumber}. ${problemTitle}`,
    `${commentChar} Difficulty: ${difficulty}`,
    `${commentChar} Topics: ${topics.join(', ')}`,
    `${commentChar} LeetCode: ${problemUrl}`,
    `${commentChar} Synced: ${new Date().toISOString()}`,
    '',
    code
  ];

  return metadata.join('\n');
}

/**
 * Get comment character for language
 */
function getCommentChar(language) {
  const map = {
    'python3': '#', 'python': '#',
    'javascript': '//', 'typescript': '//', 'java': '//',
    'cpp': '//', 'c': '//', 'csharp': '//', 'go': '//',
    'rust': '//', 'swift': '//', 'kotlin': '//', 'php': '//'
  };
  return map[language.toLowerCase()] || '//';
}

/**
 * Get file from GitHub
 */
async function getGitHubFile(token, username, repo, path) {
  try {
    const response = await fetch(
      `https://api.github.com/repos/${username}/${repo}/contents/${path}`,
      {
        headers: {
          'Authorization': `token ${token}`,
          'Accept': 'application/vnd.github.v3+json'
        }
      }
    );

    if (response.status === 404) {
      return { exists: false };
    }

    if (!response.ok) {
      throw new Error(`GitHub API error: ${response.status}`);
    }

    const data = await response.json();
    return {
      exists: true,
      content: data.content,
      sha: data.sha
    };
  } catch (error) {
    return { exists: false, error: error.message };
  }
}

/**
 * Push file to GitHub
 */
async function pushToGitHub(token, username, repo, path, content, message, sha = null) {
  try {
    // Ensure repo exists (will create if it doesn't)
    await ensureRepoExists(token, username, repo);

    // Encode content
    const encodedContent = btoa(unescape(encodeURIComponent(content)));

    const body = {
      message,
      content: encodedContent,
      branch: 'main'
    };

    if (sha) {
      body.sha = sha;
    }

    const response = await fetch(
      `https://api.github.com/repos/${username}/${repo}/contents/${path}`,
      {
        method: 'PUT',
        headers: {
          'Authorization': `token ${token}`,
          'Accept': 'application/vnd.github.v3+json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || `GitHub API error: ${response.status}`);
    }

    const data = await response.json();
    return {
      success: true,
      fileUrl: data.content.html_url,
      commitUrl: data.commit.html_url
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * Ensure repository exists
 */
async function ensureRepoExists(token, username, repo) {
  try {
    const response = await fetch(
      `https://api.github.com/repos/${username}/${repo}`,
      {
        headers: {
          'Authorization': `token ${token}`,
          'Accept': 'application/vnd.github.v3+json'
        }
      }
    );

    if (response.ok) {
      return true; // Repo exists
    }

    if (response.status === 404) {
      // Create repo
      console.log('📦 Repository not found, creating:', repo);
      const createResponse = await fetch(
        'https://api.github.com/user/repos',
        {
          method: 'POST',
          headers: {
            'Authorization': `token ${token}`,
            'Accept': 'application/vnd.github.v3+json',
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            name: repo,
            description: 'My LeetCode solutions - Auto-synced by LeetStreak extension',
            private: false,
            auto_init: true
          })
        }
      );

      if (!createResponse.ok) {
        const errorData = await createResponse.json();
        console.error('❌ GitHub API error:', createResponse.status, errorData);
        throw new Error(`Failed to create repository: ${errorData.message || createResponse.status}`);
      }

      console.log('✅ Repository created successfully');
      // Wait for repo to be ready
      await sleep(2000);
      return true;
    }

    throw new Error(`Failed to check repository: ${response.status}`);
  } catch (error) {
    console.error('Error ensuring repo exists:', error);
    return false;
  }
}

/**
 * Record successful sync
 */
async function recordSuccessfulSync(submission, filePath, fileUrl) {
  try {
    const result = await chrome.storage.local.get(['synced_submissions', 'recent_syncs']);
    const synced = result.synced_submissions || [];
    const recent = result.recent_syncs || [];

    synced.push({
      problemSlug: submission.problemSlug,
      problemTitle: submission.problemTitle,
      language: submission.language,
      filePath,
      fileUrl,
      timestamp: Date.now()
    });

    recent.unshift({
      problemTitle: submission.problemTitle,
      language: submission.language,
      status: 'success',
      timestamp: Date.now()
    });

    await chrome.storage.local.set({
      synced_submissions: synced,
      recent_syncs: recent.slice(0, 20)
    });
    
    console.log(`✅ Recorded successful sync: ${submission.problemTitle}. Total synced: ${synced.length}`);
  } catch (error) {
    console.error('Failed to record sync:', error);
  }
}

/**
 * Handle GitHub sync enabled
 */
async function handleGitHubSyncEnabled() {
  console.log('GitHub sync enabled - initializing cleanup alarm');
  
  // Create alarm for periodic cleanup
  chrome.alarms.create('github_cleanup', {
    periodInMinutes: 60 // Every hour
  });

  return { success: true };
}

/**
 * Handle GitHub sync submission - triggered when user submits accepted solution
 */
async function handleGitHubSyncSubmission(submission, submissionId) {
  try {
    console.log('📤 GitHub auto-sync triggered for submission:', submissionId);
    
    // Check if sync is enabled
    const settings = await chrome.storage.local.get([
      'github_sync_enabled',
      'github_username',
      'github_repo'
    ]);

    if (!settings.github_sync_enabled) {
      console.log('ℹ️ GitHub sync disabled, skipping');
      return { success: false, error: 'GitHub sync not enabled' };
    }

    if (!settings.github_username || !settings.github_repo) {
      console.log('⚠️ GitHub not configured properly');
      return { success: false, error: 'GitHub not configured' };
    }

    // Get encrypted token
    const token = await retrieveEncryptedToken('github_token');
    if (!token) {
      console.error('❌ No GitHub token found');
      return { success: false, error: 'GitHub token not found. Please reconnect.' };
    }

    // Add token to settings
    settings.github_token = token;

    // Sync with retry
    const result = await syncToGitHubWithRetry(submission, settings, 3);
    
    if (result.success) {
      console.log('✅ Auto-sync successful!');
      
      // Record successful sync for stats tracking
      await recordSuccessfulSync(submission, result.filePath || '', result.fileUrl || '');
      
      return { success: true, message: 'Synced to GitHub' };
    } else {
      console.error('❌ Auto-sync failed:', result.error);
      return { success: false, error: result.error || 'Sync failed' };
    }
    
  } catch (error) {
    console.error('❌ Error in handleGitHubSyncSubmission:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Handle manual sync request - syncs all past solved problems to GitHub
 */
async function handleManualSync() {
  try {
    console.log('🔄 Starting manual sync of all solutions...');
    
    // Get GitHub settings
    const settings = await chrome.storage.local.get([
      'github_username',
      'github_repo',
      'github_sync_enabled',
      'my_leetcode_username'
    ]);

    if (!settings.github_sync_enabled) {
      console.error('❌ GitHub sync not enabled');
      return { success: false, error: 'GitHub sync not enabled' };
    }

    // Validate required settings
    if (!settings.my_leetcode_username || !settings.github_username || !settings.github_repo) {
      console.error('❌ Missing required GitHub settings');
      return { success: false, error: 'GitHub settings incomplete. Please configure username and repository.' };
    }

    // Retrieve encrypted token
    const github_token = await retrieveEncryptedToken('github_token');
    console.log('🔐 Token retrieved:', !!github_token);
    
    if (!github_token) {
      console.error('❌ GitHub token not found');
      return { success: false, error: 'GitHub token not found. Please configure GitHub sync settings.' };
    }

    const { my_leetcode_username, github_username, github_repo } = settings;
    console.log('✅ GitHub sync enabled with user:', github_username);
    console.log('🔍 Fetching LeetCode user data:', my_leetcode_username);
    
    // Validate GitHub repo is accessible first
    console.log('🔐 Validating GitHub repository access...');
    try {
      const repoCheckUrl = `https://api.github.com/repos/${github_username}/${github_repo}`;
      const repoCheckResponse = await fetch(repoCheckUrl, {
        headers: {
          'Authorization': `token ${github_token}`,
          'Accept': 'application/vnd.github.v3+json'
        }
      });
      
      if (!repoCheckResponse.ok) {
        console.error(`❌ Cannot access GitHub repo (${repoCheckResponse.status}):`, repoCheckUrl);
        if (repoCheckResponse.status === 404) {
          return { success: false, error: `Repository not found: ${github_username}/${github_repo}` };
        } else if (repoCheckResponse.status === 401) {
          return { success: false, error: 'GitHub token is invalid or expired.' };
        } else if (repoCheckResponse.status === 403) {
          return { success: false, error: 'Access denied to repository. Check token permissions.' };
        }
        return { success: false, error: `Cannot access repository (${repoCheckResponse.status})` };
      }
      
      const repoData = await repoCheckResponse.json();
      console.log('✅ GitHub repo accessible:', repoData.name);
      console.log('📍 Repo URL:', repoData.html_url);
    } catch (error) {
      console.error('❌ Error validating GitHub repo:', error);
      return { success: false, error: `Failed to validate GitHub repo: ${error.message}` };
    }
    
    // Fetch user's data directly from LeetCode API
    let userData;
    try {
      userData = await fetchUserData(my_leetcode_username);
      console.log('✅ User data fetched from LeetCode API');
    } catch (error) {
      console.error('❌ Failed to fetch LeetCode user data:', error.message);
      return { success: false, error: `Failed to fetch LeetCode data: ${error.message}` };
    }

    if (!userData) {
      return { success: false, error: 'User data is empty. Username may be incorrect.' };
    }

    console.log('✅ User data loaded');
    // Get all accepted submissions
    const allSubmissions = userData.allAcceptedSubmissions || [];
    const recentSubmissions = userData.profile?.recentSubmissions || [];
    
    console.log('📋 Submissions data - all:', allSubmissions.length, 'recent:', recentSubmissions.length);
    
    if (allSubmissions.length === 0 && recentSubmissions.length === 0) {
      return { success: false, error: 'No accepted submissions found' };
    }

    console.log(`📊 Found ${allSubmissions.length} all-time submissions and ${recentSubmissions.length} recent`);

    // Combine and deduplicate
    const combinedMap = new Map();
    
    recentSubmissions.forEach(sub => {
      if (sub.statusDisplay === 'Accepted') {
        combinedMap.set(sub.titleSlug, sub);
      }
    });
    
    allSubmissions.forEach(sub => {
      if (!combinedMap.has(sub.titleSlug)) {
        combinedMap.set(sub.titleSlug, sub);
      }
    });

    const submissions = Array.from(combinedMap.values());
    console.log(`✅ Total unique solved problems: ${submissions.length}`);

    // Sync each submission to GitHub
    let syncedCount = 0;
    let failedCount = 0;

    for (let i = 0; i < submissions.length; i++) {
      try {
        const submission = submissions[i];
        const problemSlug = submission.titleSlug || submission.slug;
        
        // Skip if no slug
        if (!problemSlug) continue;

        console.log(`[${i + 1}/${submissions.length}] Syncing: ${submission.title || problemSlug}`);

        // Determine difficulty and folder
        const difficulty = submission.difficulty || 'Medium';
        const folder = difficulty;
        
        // Create file content with metadata
        const fileContent = `/**
 * Problem: ${submission.title || problemSlug}
 * Difficulty: ${difficulty}
 * URL: https://leetcode.com/problems/${problemSlug}/
 * Status: Accepted ✓
 * 
 * ${submission.description ? submission.description.substring(0, 200) : 'No description'}
 */

// Solution code here
`;

        // Create file in GitHub
        const fileName = `${folder}/${problemSlug}.js`;
        
        const syncResult = await syncToGithub(
          github_token,
          github_username,
          github_repo,
          fileName,
          fileContent,
          `Add solution: ${submission.title || problemSlug}`
        );

        if (syncResult.success) {
          syncedCount++;
        } else {
          failedCount++;
          console.warn(`Failed to sync ${problemSlug}:`, syncResult.error);
        }

        // Rate limit: 100ms between requests
        if (i < submissions.length - 1) {
          await sleep(100);
        }
      } catch (error) {
        console.error(`Error syncing submission ${i}:`, error);
        failedCount++;
      }
    }

    console.log(`✅ Manual sync complete: ${syncedCount} synced, ${failedCount} failed`);
    
    // Save sync stats
    await chrome.storage.local.set({
      manual_sync_last: Date.now(),
      manual_sync_count: syncedCount
    });

    return { 
      success: true, 
      synced: syncedCount,
      failed: failedCount,
      message: `Synced ${syncedCount} problems to GitHub`
    };

  } catch (error) {
    console.error('Error in manual sync:', error);
    return { success: false, error: error.message || 'Manual sync failed' };
  }
}

/**
 * Sync a single file to GitHub
 */
async function syncToGithub(token, username, repo, filePath, content, message) {
  try {
    const url = `https://api.github.com/repos/${username}/${repo}/contents/${filePath}`;
    
    // First, try to get existing file to get its SHA
    const getResponse = await fetch(url, {
      headers: {
        'Authorization': `token ${token}`,
        'Accept': 'application/vnd.github.v3+json'
      }
    });

    let sha = null;
    if (getResponse.ok) {
      const existing = await getResponse.json();
      sha = existing.sha;
    } else if (getResponse.status !== 404) {
      // If not a 404 (file not found), log the error
      console.warn(`GitHub check file error (${getResponse.status}):`, filePath);
    }

    // Create or update file
    const encodedContent = btoa(unescape(encodeURIComponent(content)));
    
    const body = {
      message: message,
      content: encodedContent
    };
    
    if (sha) {
      body.sha = sha;
    }

    const putResponse = await fetch(url, {
      method: 'PUT',
      headers: {
        'Authorization': `token ${token}`,
        'Accept': 'application/vnd.github.v3+json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    });

    if (putResponse.ok) {
      const result = await putResponse.json();
      console.log(`✅ Synced to GitHub:`, filePath);
      return { success: true };
    } else {
      const errorText = await putResponse.text();
      console.error(`❌ GitHub PUT failed (${putResponse.status}):`, filePath, errorText.substring(0, 200));
      
      // Check for rate limit
      if (putResponse.status === 403) {
        // Could be rate limit or permission issue
        try {
          const errorObj = JSON.parse(errorText);
          if (errorObj.message?.includes('rate')) {
            return { success: false, error: 'GitHub rate limit exceeded. Try again later.' };
          }
        } catch (e) {}
        return { success: false, error: 'Access denied to repository. Check token permissions.' };
      } else if (putResponse.status === 401) {
        return { success: false, error: 'GitHub token is invalid or expired.' };
      } else if (putResponse.status === 404) {
        // 404 could mean repo doesn't exist or path is invalid
        console.warn('⚠️ 404 error - repo may not exist or path invalid:', filePath);
        return { success: false, error: 'Repository not found or invalid path.' };
      }
      
      return { success: false, error: `GitHub error ${putResponse.status}` };
    }
  } catch (error) {
    console.error(`Error syncing to GitHub:`, error);
    return { success: false, error: error.message };
  }
}

/**
 * Handle retry failed syncs
 */
async function handleRetryFailedSyncs() {
  try {
    const result = await chrome.storage.local.get('failed_syncs');
    const failed = result.failed_syncs || [];

    if (failed.length === 0) {
      return { success: true, retried: 0 };
    }

    // Need to decrypt the token for retries
    const token = await retrieveEncryptedToken('github_token');
    if (!token) {
      return { success: false, error: 'No GitHub token configured' };
    }

    const settings = await chrome.storage.local.get([
      'github_username',
      'github_repo'
    ]);
    settings.github_token = token;

    let successCount = 0;
    const stillFailed = [];

    for (const failedSync of failed) {
      const result = await syncToGitHubWithRetry(failedSync.submission, settings, 2);
      
      if (result.success) {
        successCount++;
      } else {
        failedSync.retryCount++;
        stillFailed.push(failedSync);
      }

      await sleep(1000); // Rate limiting
    }

    await chrome.storage.local.set({ failed_syncs: stillFailed });

    return { success: true, retried: successCount, failed: stillFailed.length };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// ===== Device Flow Authentication Handlers =====

/**
 * GitHub OAuth Client ID for LeetStreak
 */
const GITHUB_CLIENT_ID = 'Ov23liEa61h0LIbIdqls';

/**
 * Request a device code from GitHub
 * This starts the Device Flow authentication process
 */
async function handleDeviceCodeRequest() {
  try {
    const response = await fetch('https://github.com/login/device/code', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        client_id: GITHUB_CLIENT_ID,
        scope: 'repo' // We need repo scope to create/update files
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Device code request failed:', response.status, errorText);
      
      if (response.status === 401 || response.status === 404) {
        return { 
          success: false, 
          error: 'Invalid GitHub Client ID. Please check the configuration.',
          errorCode: 'INVALID_CLIENT'
        };
      }
      
      return { 
        success: false, 
        error: `GitHub returned error ${response.status}`,
        errorCode: 'API_ERROR'
      };
    }

    const data = await response.json();
    
    // GitHub returns: device_code, user_code, verification_uri, expires_in, interval
    if (!data.device_code || !data.user_code) {
      return { 
        success: false, 
        error: 'Invalid response from GitHub',
        errorCode: 'INVALID_RESPONSE'
      };
    }

    // Store the device code temporarily (in memory or storage)
    await chrome.storage.local.set({
      github_auth_pending: {
        deviceCode: data.device_code,
        userCode: data.user_code,
        verificationUri: data.verification_uri,
        expiresAt: Date.now() + (data.expires_in * 1000),
        interval: data.interval || 5,
        startedAt: Date.now()
      }
    });

    return {
      success: true,
      userCode: data.user_code,
      verificationUri: data.verification_uri,
      expiresIn: data.expires_in,
      interval: data.interval || 5
    };
  } catch (error) {
    console.error('Device code request error:', error);
    
    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      return { 
        success: false, 
        error: 'Network error. Please check your internet connection.',
        errorCode: 'NETWORK_ERROR'
      };
    }
    
    return { 
      success: false, 
      error: error.message,
      errorCode: 'UNKNOWN_ERROR'
    };
  }
}

/**
 * Poll GitHub for access token
 * Called repeatedly until user authorizes or timeout
 */
async function handleDevicePoll(deviceCode) {
  try {
    // Get stored auth state
    const result = await chrome.storage.local.get('github_auth_pending');
    const authPending = result.github_auth_pending;

    // Check if auth flow expired
    if (!authPending || Date.now() > authPending.expiresAt) {
      await chrome.storage.local.remove('github_auth_pending');
      return { 
        success: false, 
        error: 'Authorization expired. Please try again.',
        errorCode: 'EXPIRED',
        shouldRetry: false
      };
    }

    const response = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        client_id: GITHUB_CLIENT_ID,
        device_code: deviceCode || authPending.deviceCode,
        grant_type: 'urn:ietf:params:oauth:grant-type:device_code'
      })
    });

    const data = await response.json();

    // Handle different response cases
    if (data.error) {
      switch (data.error) {
        case 'authorization_pending':
          // User hasn't authorized yet - keep polling
          return { 
            success: false, 
            errorCode: 'PENDING',
            shouldRetry: true,
            interval: authPending.interval
          };
        
        case 'slow_down':
          // We're polling too fast - increase interval
          authPending.interval = (authPending.interval || 5) + 5;
          await chrome.storage.local.set({ github_auth_pending: authPending });
          return { 
            success: false, 
            errorCode: 'SLOW_DOWN',
            shouldRetry: true,
            interval: authPending.interval
          };
        
        case 'expired_token':
          await chrome.storage.local.remove('github_auth_pending');
          return { 
            success: false, 
            error: 'Authorization expired. Please try again.',
            errorCode: 'EXPIRED',
            shouldRetry: false
          };
        
        case 'access_denied':
          await chrome.storage.local.remove('github_auth_pending');
          return { 
            success: false, 
            error: 'Authorization denied. Please try again and click "Authorize".',
            errorCode: 'DENIED',
            shouldRetry: false
          };
        
        default:
          return { 
            success: false, 
            error: data.error_description || data.error,
            errorCode: 'UNKNOWN',
            shouldRetry: false
          };
      }
    }

    // Success! We got the token
    if (data.access_token) {
      // Clean up pending auth state
      await chrome.storage.local.remove('github_auth_pending');
      
      // Validate the token and get user info
      const userInfo = await validateGitHubToken(data.access_token);
      
      if (!userInfo.success) {
        return { 
          success: false, 
          error: 'Failed to validate token: ' + userInfo.error,
          errorCode: 'VALIDATION_FAILED',
          shouldRetry: false
        };
      }

      return {
        success: true,
        token: data.access_token,
        username: userInfo.username,
        avatarUrl: userInfo.avatarUrl,
        scopes: data.scope
      };
    }

    return { 
      success: false, 
      error: 'Unexpected response from GitHub',
      errorCode: 'INVALID_RESPONSE',
      shouldRetry: false
    };
  } catch (error) {
    console.error('Device poll error:', error);
    
    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      return { 
        success: false, 
        error: 'Network error. Will retry...',
        errorCode: 'NETWORK_ERROR',
        shouldRetry: true
      };
    }
    
    return { 
      success: false, 
      error: error.message,
      errorCode: 'UNKNOWN_ERROR',
      shouldRetry: false
    };
  }
}

/**
 * Validate a GitHub token and return user info
 */
async function validateGitHubToken(token) {
  try {
    const response = await fetch('https://api.github.com/user', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'LeetStreak-Extension'
      }
    });

    if (!response.ok) {
      if (response.status === 401) {
        return { success: false, error: 'Invalid or expired token' };
      }
      if (response.status === 403) {
        const remaining = response.headers.get('X-RateLimit-Remaining');
        if (remaining === '0') {
          return { success: false, error: 'GitHub API rate limit exceeded. Please wait.' };
        }
        return { success: false, error: 'Access forbidden. Token may lack required permissions.' };
      }
      return { success: false, error: `GitHub API error: ${response.status}` };
    }

    const user = await response.json();
    
    return {
      success: true,
      username: user.login,
      avatarUrl: user.avatar_url,
      name: user.name,
      email: user.email
    };
  } catch (error) {
    console.error('Token validation error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Handle token validation request
 */
async function handleValidateToken(token) {
  if (!token) {
    // Try to get stored token
    token = await retrieveEncryptedToken('github_token');
  }
  
  if (!token) {
    return { success: false, error: 'No token provided' };
  }
  
  return await validateGitHubToken(token);
}

/**
 * Store GitHub credentials securely
 */
async function handleStoreCredentials(token, username, repo) {
  try {
    // Import the secure token manager
    const { storeEncryptedToken } = await import('../shared/secure-token-manager.js');
    
    // Store token securely (encrypted)
    await storeEncryptedToken('github_token', token);
    
    // Store username and repo (not sensitive)
    await chrome.storage.local.set({
      github_username: username,
      github_repo: repo,
      github_sync_enabled: true,  // CRITICAL: Enable sync flag
      github_connected: true,
      github_connected_at: Date.now()
    });
    
    console.log('✅ GitHub credentials stored successfully');
    console.log('GitHub sync enabled flag set to true');
    return { success: true };
  } catch (error) {
    console.error('❌ Failed to store credentials:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Clear GitHub credentials
 */
async function handleClearCredentials() {
  try {
    // Clear encrypted token
    await chrome.storage.local.remove([
      'github_token',
      'github_token_encrypted',
      'github_token_key',
      'github_username',
      'github_repo',
      'github_connected',
      'github_connected_at',
      'github_auth_pending',
      'failed_syncs',
      'synced_submissions'
    ]);
    
    console.log('GitHub credentials cleared');
    return { success: true };
  } catch (error) {
    console.error('Failed to clear credentials:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get current GitHub connection status
 */
async function handleGetGitHubStatus() {
  try {
    const result = await chrome.storage.local.get([
      'github_username',
      'github_repo',
      'github_connected',
      'github_connected_at',
      'synced_submissions',
      'failed_syncs'
    ]);
    
    // Check if token exists and is valid
    const token = await retrieveEncryptedToken('github_token');
    const hasToken = !!token;
    
    if (hasToken && result.github_connected) {
      // Optionally validate token (but don't do this every time due to rate limits)
      const syncedCount = result.synced_submissions?.length || 0;
      const failedCount = result.failed_syncs?.length || 0;
      
      return {
        success: true,
        connected: true,
        username: result.github_username,
        repo: result.github_repo,
        connectedAt: result.github_connected_at,
        syncedCount,
        failedCount
      };
    }
    
    return {
      success: true,
      connected: false
    };
  } catch (error) {
    console.error('Failed to get GitHub status:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Ensure repository exists (create if not)
 */
async function handleEnsureRepo(token, username, repo) {
  try {
    if (!token) {
      token = await retrieveEncryptedToken('github_token');
    }
    
    if (!token) {
      return { success: false, error: 'No GitHub token available' };
    }

    // First, check if repo exists
    const checkResponse = await fetch(`https://api.github.com/repos/${username}/${repo}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'LeetStreak-Extension'
      }
    });

    if (checkResponse.ok) {
      // Repo exists
      const repoData = await checkResponse.json();
      return { 
        success: true, 
        exists: true,
        repoUrl: repoData.html_url,
        isPrivate: repoData.private
      };
    }

    if (checkResponse.status === 404) {
      // Repo doesn't exist, create it
      const createResponse = await fetch('https://api.github.com/user/repos', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/vnd.github.v3+json',
          'Content-Type': 'application/json',
          'User-Agent': 'LeetStreak-Extension'
        },
        body: JSON.stringify({
          name: repo,
          description: '🔥 My LeetCode solutions - synced automatically by LeetStreak',
          private: false, // Public by default, user can change later
          auto_init: true, // Create with README
          has_issues: false,
          has_projects: false,
          has_wiki: false
        })
      });

      if (createResponse.ok) {
        const newRepo = await createResponse.json();
        return { 
          success: true, 
          exists: false, // Was just created
          created: true,
          repoUrl: newRepo.html_url,
          isPrivate: newRepo.private
        };
      }

      const errorData = await createResponse.json();
      return { 
        success: false, 
        error: errorData.message || 'Failed to create repository',
        errorCode: 'CREATE_FAILED'
      };
    }

    if (checkResponse.status === 403) {
      return { 
        success: false, 
        error: 'Access denied. Token may lack repo permissions.',
        errorCode: 'FORBIDDEN'
      };
    }

    return { 
      success: false, 
      error: `GitHub API error: ${checkResponse.status}`,
      errorCode: 'API_ERROR'
    };
  } catch (error) {
    console.error('Ensure repo error:', error);
    return { success: false, error: error.message };
  }
}

// Listen for cleanup alarm
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'github_cleanup') {
    cleanupOldPendingSubmissions();
  }
});

/**
 * Clean up old pending submissions
 */
async function cleanupOldPendingSubmissions() {
  try {
    const items = await chrome.storage.local.get(null);
    const now = Date.now();
    const keysToRemove = [];

    for (const [key, value] of Object.entries(items)) {
      if (key.startsWith('pending_') && value.timestamp) {
        const age = now - value.timestamp;
        // Remove submissions older than 1 hour
        if (age > 60 * 60 * 1000) {
          keysToRemove.push(key);
        }
      }
    }

    if (keysToRemove.length > 0) {
      await chrome.storage.local.remove(keysToRemove);
      console.log(`Cleaned up ${keysToRemove.length} old pending submissions`);
    }
  } catch (error) {
    console.error('Cleanup error:', error);
  }
}

/**
 * Handle CSP violation reports
 */
async function handleCSPViolation(violation, sender) {
  console.warn('🚨 CSP Violation from', sender.tab?.id || 'extension', ':', violation);
  
  // Store violation
  try {
    const result = await chrome.storage.local.get('csp_violations');
    const violations = result.csp_violations || [];
    
    violations.push({
      ...violation,
      tabId: sender.tab?.id,
      url: sender.url,
      receivedAt: new Date().toISOString()
    });
    
    // Keep only last 100
    if (violations.length > 100) {
      violations.splice(0, violations.length - 100);
    }
    
    await chrome.storage.local.set({ csp_violations: violations });
    
    // If critical violation (script-src), show notification
    if (violation.violatedDirective?.includes('script-src')) {
      console.error('Critical CSP violation detected:', violation.blockedURI);
      // Could send notification to user about potential attack
    }
  } catch (error) {
    console.error('Failed to store CSP violation:', error);
  }
}

// ===== End GitHub Auto-Sync =====
