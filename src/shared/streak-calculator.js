/**
 * Streak Calculator - UTC-based consecutive day calculation
 * Follows LeetCode's official calendar logic (UTC midnight resets)
 */

/**
 * Calculate current submission streak from submissionCalendar
 * @param {Object} submissionCalendar - Map of Unix timestamps (seconds) to submission counts
 * @returns {number} Current streak in days
 */
export function calculateStreak(submissionCalendar) {
  if (!submissionCalendar || typeof submissionCalendar !== 'object') {
    return 0;
  }

  // Convert timestamps to UTC date strings (YYYY-MM-DD)
  const submissionDates = new Set();
  Object.entries(submissionCalendar).forEach(([timestamp, count]) => {
    if (count > 0) {
      const date = new Date(parseInt(timestamp) * 1000);
      const utcDateStr = date.toISOString().split('T')[0]; // YYYY-MM-DD in UTC
      submissionDates.add(utcDateStr);
    }
  });

  if (submissionDates.size === 0) {
    return 0;
  }

  // Sort dates in descending order
  const sortedDates = Array.from(submissionDates).sort((a, b) => b.localeCompare(a));

  // Get today's UTC date
  const nowUTC = new Date();
  const todayUTC = nowUTC.toISOString().split('T')[0];

  // Check if streak is still active (must have submitted today or yesterday)
  const mostRecentDate = sortedDates[0];
  const yesterdayUTC = new Date(nowUTC);
  yesterdayUTC.setUTCDate(yesterdayUTC.getUTCDate() - 1);
  const yesterdayStr = yesterdayUTC.toISOString().split('T')[0];

  if (mostRecentDate !== todayUTC && mostRecentDate !== yesterdayStr) {
    return 0; // Streak broken
  }

  // Calculate consecutive days from most recent
  let streak = 0;
  let currentCheckDate = new Date(mostRecentDate + 'T00:00:00Z');

  for (let i = 0; i < sortedDates.length; i++) {
    const expectedDateStr = currentCheckDate.toISOString().split('T')[0];
    
    if (sortedDates[i] === expectedDateStr) {
      streak++;
      currentCheckDate.setUTCDate(currentCheckDate.getUTCDate() - 1);
    } else {
      break; // Gap found, streak ends
    }
  }

  return streak;
}

/**
 * Get total problems solved by difficulty
 * @param {Array} acSubmissionNum - Array of {difficulty, count} objects
 * @returns {Object} {easy, medium, hard, total}
 */
export function getProblemsSolved(acSubmissionNum) {
  const stats = { easy: 0, medium: 0, hard: 0, total: 0 };
  
  if (!Array.isArray(acSubmissionNum)) {
    return stats;
  }

  acSubmissionNum.forEach(item => {
    const count = item.count || 0;
    switch (item.difficulty) {
      case 'Easy':
        stats.easy = count;
        break;
      case 'Medium':
        stats.medium = count;
        break;
      case 'Hard':
        stats.hard = count;
        break;
      case 'All':
        stats.total = count;
        break;
    }
  });

  return stats;
}

/**
 * Calculate time since last update
 * @param {number} lastUpdated - Timestamp in milliseconds
 * @returns {string} Human-readable string (e.g., "5 mins ago")
 */
export function getTimeSinceUpdate(lastUpdated) {
  if (!lastUpdated) return 'Never';

  const now = Date.now();
  const diffMs = now - lastUpdated;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins} min${diffMins > 1 ? 's' : ''} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  
  const diffDays = Math.floor(diffMs / 86400000);
  return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
}

/**
 * Check if data needs refresh (older than 15 minutes)
 * @param {number} lastUpdated - Timestamp in milliseconds
 * @returns {boolean}
 */
export function needsRefresh(lastUpdated) {
  if (!lastUpdated) return true;
  const fifteenMinutes = 15 * 60 * 1000;
  return (Date.now() - lastUpdated) > fifteenMinutes;
}
