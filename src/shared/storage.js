/**
 * Chrome Storage Manager - Handles all chrome.storage.local operations
 * Structure: { friends: { [username]: { profile, stats, submissionCalendar, lastUpdated } } }
 */

import { storageQueue } from './storage-queue.js';

const STORAGE_KEY = 'leetfriends_data';
const QUOTA_LIMIT = 5 * 1024 * 1024; // 5MB for chrome.storage.local
const WARN_THRESHOLD = 0.8; // Warn at 80%

/**
 * Get storage usage in bytes
 */
async function getStorageUsage() {
  try {
    const data = await chrome.storage.local.get(null);
    const size = new Blob([JSON.stringify(data)]).size;
    return size;
  } catch (error) {
    console.error('Error calculating storage usage:', error);
    return 0;
  }
}

/**
 * Clean up old submission calendar entries (keep last 365 days)
 */
async function cleanupOldSubmissions() {
  console.log('[Storage] Running cleanup of old submissions...');
  
  const friends = await getAllFriends();
  const oneYearAgo = Math.floor(Date.now() / 1000) - (365 * 24 * 60 * 60);
  let cleanedCount = 0;
  
  Object.entries(friends).forEach(([username, friend]) => {
    if (friend.submissionCalendar) {
      Object.keys(friend.submissionCalendar).forEach(timestamp => {
        if (parseInt(timestamp) < oneYearAgo) {
          delete friend.submissionCalendar[timestamp];
          cleanedCount++;
        }
      });
    }
  });
  
  if (cleanedCount > 0) {
    await chrome.storage.local.set({ [STORAGE_KEY]: { friends } });
    console.log(`[Storage] Cleaned ${cleanedCount} old submission entries`);
  }
  
  return cleanedCount;
}

/**
 * Check storage health
 */
export async function checkStorageHealth() {
  const usage = await getStorageUsage();
  const usagePercent = (usage / QUOTA_LIMIT) * 100;
  
  return {
    bytes: usage,
    megabytes: (usage / 1024 / 1024).toFixed(2),
    percent: usagePercent.toFixed(1),
    nearLimit: usagePercent > (WARN_THRESHOLD * 100),
    atLimit: usagePercent > 95
  };
}

/**
 * Get all friends data from storage
 * @returns {Promise<Object>} Friends data object
 */
export async function getAllFriends() {
  try {
    const result = await chrome.storage.local.get(STORAGE_KEY);
    return result[STORAGE_KEY]?.friends || {};
  } catch (error) {
    console.error('Error getting friends from storage:', error);
    return {};
  }
}

/**
 * Get a single friend's data
 * @param {string} username - LeetCode username
 * @returns {Promise<Object|null>} Friend data or null if not found
 */
export async function getFriend(username) {
  const friends = await getAllFriends();
  return friends[username] || null;
}

/**
 * Save or update a friend's data
 * @param {string} username - LeetCode username
 * @param {Object} data - Friend data object
 */
export async function saveFriend(username, data) {
  // Use queue to prevent race conditions
  return storageQueue.enqueue(async () => {
    try {
      // Check storage health before save
      const health = await checkStorageHealth();
      
      if (health.atLimit) {
        console.warn('[Storage] Quota at limit, attempting cleanup...');
        await cleanupOldSubmissions();
        
        // Check again after cleanup
        const newHealth = await checkStorageHealth();
        if (newHealth.atLimit) {
          throw new Error('Storage quota exceeded. Please remove some friends or clear old data.');
        }
      }
      
      if (health.nearLimit) {
        console.warn(`[Storage] Usage: ${health.megabytes}MB (${health.percent}%)`);
      }
      
      const friends = await getAllFriends();
      const isNewFriend = !friends[username];
      
      friends[username] = {
        ...data,
        lastUpdated: Date.now(),
        friendshipStartDate: friends[username]?.friendshipStartDate || new Date().toISOString().split('T')[0]
      };

      await chrome.storage.local.set({
        [STORAGE_KEY]: { friends }
      });

      return { success: true, storageHealth: health };
    } catch (error) {
      console.error('Error saving friend to storage:', error);
      
      // Handle quota exceeded error specifically
      if (error.message && (error.message.includes('QUOTA_EXCEEDED') || error.message.includes('quota'))) {
        // Last resort: try cleanup and retry once
        try {
          await cleanupOldSubmissions();
          const friends = await getAllFriends();
          friends[username] = { ...data, lastUpdated: Date.now() };
          await chrome.storage.local.set({ [STORAGE_KEY]: { friends } });
          return { success: true, warning: 'Storage was full but cleaned up successfully' };
        } catch (retryError) {
          return { success: false, error: 'Storage quota exceeded. Please remove some friends.' };
        }
      }
      
      return { success: false, error: error.message };
    }
  });
}

/**
 * Remove a friend from storage
 * @param {string} username - LeetCode username
 */
export async function removeFriend(username) {
  // Use queue to prevent race conditions
  return storageQueue.enqueue(async () => {
    try {
      const friends = await getAllFriends();
      delete friends[username];

      await chrome.storage.local.set({
        [STORAGE_KEY]: { friends }
      });

      return true;
    } catch (error) {
      console.error('Error removing friend from storage:', error);
      return false;
    }
  });
}

/**
 * Get list of friend usernames
 * @returns {Promise<string[]>} Array of usernames
 */
export async function getFriendsList() {
  const friends = await getAllFriends();
  return Object.keys(friends);
}

/**
 * Check if a username is already added
 * @param {string} username - LeetCode username
 * @returns {Promise<boolean>}
 */
export async function friendExists(username) {
  const friends = await getAllFriends();
  return username in friends;
}

/**
 * Get last update timestamp for a friend
 * @param {string} username - LeetCode username
 * @returns {Promise<number|null>} Timestamp or null
 */
export async function getLastUpdated(username) {
  const friend = await getFriend(username);
  return friend?.lastUpdated || null;
}

/**
 * Update a friend's specific field
 * @param {string} username - LeetCode username
 * @param {string} field - Field to update
 * @param {any} value - New value
 */
export async function updateFriendField(username, field, value) {
  try {
    const friends = await getAllFriends();
    if (!friends[username]) return false;

    friends[username][field] = value;
    friends[username].lastUpdated = Date.now();

    await chrome.storage.local.set({
      [STORAGE_KEY]: { friends }
    });

    return true;
  } catch (error) {
    console.error('Error updating friend field:', error);
    return false;
  }
}

/**
 * Clear all data (for testing/reset)
 */
export async function clearAllData() {
  try {
    await chrome.storage.local.remove(STORAGE_KEY);
    return true;
  } catch (error) {
    console.error('Error clearing data:', error);
    return false;
  }
}
