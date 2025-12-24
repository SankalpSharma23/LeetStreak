/**
 * Chrome Storage Manager - Handles all chrome.storage.local operations
 * Structure: { friends: { [username]: { profile, stats, submissionCalendar, lastUpdated } } }
 */

const STORAGE_KEY = 'leetfriends_data';

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
  try {
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

    return true;
  } catch (error) {
    console.error('Error saving friend to storage:', error);
    return false;
  }
}

/**
 * Remove a friend from storage
 * @param {string} username - LeetCode username
 */
export async function removeFriend(username) {
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
