/**
 * Mutual Streak Calculator - Calculates friendship streaks
 * Counts consecutive days where BOTH users solved problems
 */

/**
 * Calculate mutual streak between two users
 * @param {Object} mySubmissionCalendar - Current user's submission calendar
 * @param {Object} friendSubmissionCalendar - Friend's submission calendar
 * @param {string} friendshipStartDate - Date when friendship started (YYYY-MM-DD UTC)
 * @returns {number} Mutual streak in days
 */
export function calculateMutualStreak(mySubmissionCalendar, friendSubmissionCalendar, friendshipStartDate) {
  if (!mySubmissionCalendar || !friendSubmissionCalendar || !friendshipStartDate) {
    return 0;
  }

  // Parse calendars if they are strings
  const myCalendar = typeof mySubmissionCalendar === 'string' 
    ? JSON.parse(mySubmissionCalendar) 
    : mySubmissionCalendar;
  const friendCalendar = typeof friendSubmissionCalendar === 'string' 
    ? JSON.parse(friendSubmissionCalendar) 
    : friendSubmissionCalendar;

  // Convert submission calendars to UTC date sets
  const myDates = getSubmissionDates(myCalendar);
  const friendDates = getSubmissionDates(friendCalendar);

  if (myDates.size === 0 || friendDates.size === 0) {
    return 0;
  }

  // Get dates where BOTH solved problems
  const mutualDates = new Set();
  for (const date of myDates) {
    if (friendDates.has(date) && date >= friendshipStartDate) {
      mutualDates.add(date);
    }
  }

  if (mutualDates.size === 0) {
    return 0;
  }

  // Sort mutual dates in descending order
  const sortedMutualDates = Array.from(mutualDates).sort((a, b) => b.localeCompare(a));

  // Get today's and yesterday's UTC dates
  const nowUTC = new Date();
  const todayUTC = nowUTC.toISOString().split('T')[0];
  const yesterdayUTC = new Date(nowUTC);
  yesterdayUTC.setUTCDate(yesterdayUTC.getUTCDate() - 1);
  const yesterdayStr = yesterdayUTC.toISOString().split('T')[0];

  // Check if streak is still active (most recent mutual date must be today or yesterday)
  const mostRecentMutualDate = sortedMutualDates[0];
  if (mostRecentMutualDate !== todayUTC && mostRecentMutualDate !== yesterdayStr) {
    return 0; // Streak broken
  }

  // Calculate consecutive days from most recent
  let streak = 0;
  let currentCheckDate = new Date(mostRecentMutualDate + 'T00:00:00Z');

  for (let i = 0; i < sortedMutualDates.length; i++) {
    const expectedDateStr = currentCheckDate.toISOString().split('T')[0];
    
    if (sortedMutualDates[i] === expectedDateStr) {
      streak++;
      currentCheckDate.setUTCDate(currentCheckDate.getUTCDate() - 1);
    } else {
      break; // Gap found, streak ends
    }
  }

  return streak;
}

/**
 * Convert submission calendar to Set of UTC date strings
 * @param {Object} submissionCalendar - Map of timestamps to counts
 * @returns {Set<string>} Set of UTC date strings (YYYY-MM-DD)
 */
function getSubmissionDates(submissionCalendar) {
  const dates = new Set();
  
  if (!submissionCalendar || typeof submissionCalendar !== 'object') {
    return dates;
  }
  
  Object.entries(submissionCalendar).forEach(([timestamp, count]) => {
    if (count > 0) {
      const date = new Date(parseInt(timestamp) * 1000);
      const utcDateStr = date.toISOString().split('T')[0];
      dates.add(utcDateStr);
    }
  });

  return dates;
}
