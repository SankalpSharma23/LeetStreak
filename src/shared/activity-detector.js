/**
 * Activity Detector - Detects significant events for notifications
 * Uses UTC dates and idempotent logic
 */

const getTodayUTC = () => new Date().toISOString().split('T')[0];
const getYesterdayUTC = () => {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() - 1);
  return date.toISOString().split('T')[0];
};

export function detectSolvedToday(submissionCalendar) {
  if (!submissionCalendar || typeof submissionCalendar !== 'object') {
    return false;
  }

  const todayUTC = getTodayUTC();
  
  for (const [timestamp, count] of Object.entries(submissionCalendar)) {
    if (count > 0) {
      const date = new Date(parseInt(timestamp) * 1000);
      const dateUTC = date.toISOString().split('T')[0];
      if (dateUTC === todayUTC) {
        return true;
      }
    }
  }
  
  return false;
}

export function hasNewActivity(currentData, previousData) {
  if (!previousData) return detectSolvedToday(currentData.submissionCalendar);
  
  const solvedToday = detectSolvedToday(currentData.submissionCalendar);
  const totalIncreased = (currentData.stats?.total || 0) > (previousData.stats?.total || 0);
  
  return solvedToday || totalIncreased;
}

export function detectMilestone(streak) {
  return [7, 30, 100].includes(streak);
}

export function isStreakAtRisk(submissionCalendar, streak) {
  if (streak === 0) return false;
  
  const yesterdayUTC = getYesterdayUTC();
  
  const solvedToday = detectSolvedToday(submissionCalendar);
  
  if (solvedToday) return false;
  
  let solvedYesterday = false;
  for (const [timestamp, count] of Object.entries(submissionCalendar)) {
    if (count > 0) {
      const date = new Date(parseInt(timestamp) * 1000);
      const dateUTC = date.toISOString().split('T')[0];
      if (dateUTC === yesterdayUTC) {
        solvedYesterday = true;
        break;
      }
    }
  }
  
  return !solvedYesterday && streak > 0;
}

export function buildNotificationMessage(username, eventType, data) {
  switch (eventType) {
    case 'solved_today':
      return `${username} solved today! 🎯`;
    case 'milestone':
      return `${username} hit ${data.streak} day streak! 🔥`;
    case 'streak_at_risk':
      return `Your ${data.streak} day streak needs attention! ⚠️`;
    default:
      return `${username} updated their progress`;
  }
}
