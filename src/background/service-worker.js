/**
 * LeetFriends Background Service Worker (Manifest V3)
 * - Handles 30-minute background sync alarms
 * - Fetches friend data sequentially with 500ms delays
 * - Sends batched notifications with daily limits per friend
 * - All logic uses UTC dates for consistency
 */

import { fetchUserData } from './leetcode-api.js';
import { getAllFriends, saveFriend, getFriendsList, getFriend, removeFriend } from '../shared/storage.js';
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
const SYNC_INTERVAL_MINUTES = 30;
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
    if (!username) {
      return { success: false, error: 'Username is required' };
    }

    console.log(`Adding friend: ${username}`);
    
    // Check if friend already exists
    const existingFriend = await getFriend(username);
    if (existingFriend) {
      return { success: false, error: `${username} is already in your friends list` };
    }
    
    // Fetch data to validate username
    const data = await fetchUserData(username);
    
    // Process and save
    const processedData = processUserData(data);
    await saveFriend(username, processedData);

    return { success: true, message: `${username} added successfully`, data: processedData };
  } catch (error) {
    console.error('Error adding friend:', error);
    return { success: false, error: error.message || 'User not found or profile is private' };
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

  // Check if we can notify this friend today
  const canNotify = await shouldNotifyForFriend(username);
  if (!canNotify) {
    console.log(`⏭️  Already notified ${username} today (UTC)`);
    return events;
  }

  console.log(`🔍 Checking events for ${username}...`);

  // Event 1: Friend solved today
  const solvedToday = detectSolvedToday(newData.submissionCalendar);
  if (solvedToday) {
    const hadNewActivity = hasNewActivity(newData, oldData);
    console.log(`✅ ${username} solved today. Has new activity: ${hadNewActivity}`);
    if (hadNewActivity) {
      console.log(`🔔 Adding notification event for ${username}`);
      events.push({
        username,
        type: 'solved_today',
        message: buildNotificationMessage(username, 'solved_today', newData),
        priority: 1
      });
    }
  } else {
    console.log(`❌ ${username} has not solved today`);
  }

  // Event 2: Milestone reached (7, 30, 100 days)
  if (detectMilestone(newData.stats.streak)) {
    const oldStreak = oldData?.stats?.streak || 0;
    if (newData.stats.streak > oldStreak) {
      console.log(`🎉 ${username} reached milestone: ${newData.stats.streak} day streak!`);
      events.push({
        username,
        type: 'milestone',
        message: buildNotificationMessage(username, 'milestone', { streak: newData.stats.streak }),
        priority: 2
      });
    }
  }

  if (events.length > 0) {
    console.log(`📊 Found ${events.length} event(s) for ${username}`);
  }

  // Note: Don't mark as notified here - batchNotify will handle it after sending
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
