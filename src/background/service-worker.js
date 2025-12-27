/**
 * LeetFriends Background Service Worker (Manifest V3)
 * - Handles 30-minute background sync alarms
 * - Fetches friend data sequentially with 500ms delays
 * - Sends batched notifications with daily limits per friend
 * - All logic uses UTC dates for consistency
 */

import { fetchUserData } from './leetcode-api.js';
import { getAllFriends, saveFriend, getFriendsList, getFriend, removeFriend, checkStorageHealth } from '../shared/storage.js';
import { validateUsername } from '../shared/validation.js';
import { calculateStreak, getProblemsSolved, needsRefresh } from '../shared/streak-calculator.js';
import { 
  getNotificationState, 
  shouldNotifyForFriend, 
  markFriendNotified, 
  batchNotify,
  isNotificationMuted 
} from '../shared/notification-manager.js';
import { 
  detectSolvedToday, 
  hasNewActivity, 
  detectMilestone, 
  isStreakAtRisk,
  buildNotificationMessage 
} from '../shared/activity-detector.js';

const ALARM_NAME = 'leetfriends_sync';
const SYNC_INTERVAL_MINUTES = 5; // Check every 5 minutes for new submissions
const REQUEST_DELAY_MS = 500;

// Install listener - set up alarms
chrome.runtime.onInstalled.addListener(() => {
  console.log('LeetFriends installed - setting up sync alarm');
  
  // Create alarm for periodic sync
  chrome.alarms.create(ALARM_NAME, {
    periodInMinutes: SYNC_INTERVAL_MINUTES
  });
});

// Alarm listener - trigger background sync
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === ALARM_NAME) {
    console.log('Background sync triggered');
    syncAllFriends();
  }
});

// Message listener - handle requests from popup/options
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('Message received:', message.type);

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
      handleGitHubSync(message.submissionId, message.submission).then(sendResponse);
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
    
    case 'GET_STORAGE_STATUS':
      handleGetStorageStatus().then(sendResponse);
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
    let status = 'pending';
    try {
      const { my_leetcode_username } = await chrome.storage.local.get('my_leetcode_username');
      if (my_leetcode_username) {
        // Get user data
        const friends = await getAllFriends();
        const myData = friends[my_leetcode_username];
        
        if (myData && myData.profile && myData.profile.recentSubmissions) {
          const recentSubmissions = myData.profile.recentSubmissions || [];
          const isCompleted = recentSubmissions.some(
            sub => sub.titleSlug === problemData.slug && sub.statusDisplay === 'Accepted'
          );
          if (isCompleted) {
            status = 'completed';
          }
        }
      }
    } catch (error) {
      console.error('Error checking submission status:', error);
      // Continue with pending status if check fails
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
    
    const statusMsg = status === 'completed' ? ' (Already Submitted)' : '';
    return { success: true, message: 'Added to queue!' + statusMsg, status: status };
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
  const { profile, contestRanking, submissionCalendar } = data;
  
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
    console.log('🐙 GitHub Sync: Processing submission', submissionId);
    console.log('📝 Submission details:', {
      title: submission.problemTitle,
      language: submission.language,
      codeLength: submission.code?.length || 0
    });
    
    // Get GitHub settings
    const settings = await chrome.storage.local.get([
      'github_token',
      'github_username',
      'github_repo',
      'github_sync_enabled'
    ]);

    console.log('⚙️ GitHub settings:', {
      enabled: settings.github_sync_enabled,
      hasToken: !!settings.github_token,
      username: settings.github_username,
      repo: settings.github_repo
    });

    if (!settings.github_sync_enabled || !settings.github_token) {
      console.error('❌ GitHub sync not enabled or token missing');
      return { success: false, error: 'GitHub sync not enabled' };
    }

    // Attempt sync with retry logic
    console.log('🔄 Starting sync with retry logic...');
    const result = await syncToGitHubWithRetry(submission, settings, 3);

    if (result.success) {
      console.log('✅ GitHub sync successful!');
      
      // Remove pending submission
      await chrome.storage.local.remove(submissionId);
      
      // Show success notification
      chrome.notifications.create({
        type: 'basic',
        iconUrl: '/icons/icon128.png',
        title: 'GitHub Sync Success',
        message: `✅ Synced "${submission.problemTitle}" to GitHub!`,
        priority: 1
      });

      return { success: true };
    } else {
      console.error('❌ GitHub sync failed:', result.error);
      
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
        title: 'GitHub Sync Failed',
        message: `❌ Failed to sync "${submission.problemTitle}": ${result.error}`,
        priority: 2
      });

      return { success: false, error: result.error };
    }
  } catch (error) {
    console.error('GitHub Sync error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Sync submission to GitHub with retry logic
 */
async function syncToGitHubWithRetry(submission, settings, maxRetries = 3) {
  const delays = [1000, 3000, 9000]; // Exponential backoff

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const result = await syncToGitHub(submission, settings);
      
      if (result.success) {
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
  const baseURL = 'https://api.github.com';

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
    const result = await chrome.storage.local.get(['synced_problems', 'recent_syncs']);
    const synced = result.synced_problems || [];
    const recent = result.recent_syncs || [];

    synced.push({
      problemSlug: submission.problemSlug,
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
      synced_problems: synced,
      recent_syncs: recent.slice(0, 20)
    });
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
 * Handle manual sync request
 */
async function handleManualSync() {
  // TODO: Implement manual sync for past submissions
  return { success: true, message: 'Manual sync feature coming soon' };
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

    const settings = await chrome.storage.local.get([
      'github_token',
      'github_username',
      'github_repo'
    ]);

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

// ===== End GitHub Auto-Sync =====
