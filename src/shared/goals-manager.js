/**
 * Goals & Targets System
 */

export const GOAL_TYPES = {
  DAILY: 'daily',
  WEEKLY: 'weekly',
  MONTHLY: 'monthly'
};

export const DEFAULT_GOALS = [
  { id: 'daily_1', type: GOAL_TYPES.DAILY, title: 'Solve 1 problem daily', target: 1, icon: '📅' },
  { id: 'daily_3', type: GOAL_TYPES.DAILY, title: 'Solve 3 problems daily', target: 3, icon: '🔥' },
  { id: 'weekly_10', type: GOAL_TYPES.WEEKLY, title: 'Solve 10 problems this week', target: 10, icon: '📊' },
  { id: 'weekly_20', type: GOAL_TYPES.WEEKLY, title: 'Solve 20 problems this week', target: 20, icon: '💪' },
  { id: 'monthly_50', type: GOAL_TYPES.MONTHLY, title: 'Solve 50 problems this month', target: 50, icon: '🎯' },
  { id: 'monthly_100', type: GOAL_TYPES.MONTHLY, title: 'Solve 100 problems this month', target: 100, icon: '🚀' }
];

export async function getActiveGoals() {
  try {
    const result = await chrome.storage.local.get(['activeGoals']);
    return result.activeGoals || [];
  } catch (error) {
    console.error('Error getting active goals:', error);
    return [];
  }
}

export async function setActiveGoals(goals) {
  try {
    await chrome.storage.local.set({ activeGoals: goals });
  } catch (error) {
    console.error('Error setting active goals:', error);
  }
}

export async function calculateGoalProgress(goal, userStats, submissionCalendar) {
  try {
    let progress = 0;
    const today = new Date();
    
    if (goal.type === GOAL_TYPES.DAILY) {
      // Count problems solved today (using UTC to match LeetCode's format)
      const todayUTC = new Date(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate()));
      const todayTimestamp = Math.floor(todayUTC.getTime() / 1000).toString();
      
      // submissionCalendar is already an object from storage
      const calendar = submissionCalendar;
      progress = parseInt(calendar?.[todayTimestamp]) || 0;
      
      console.log('Daily goal progress:', { todayTimestamp, progress, calendarValue: calendar?.[todayTimestamp] });
    } else if (goal.type === GOAL_TYPES.WEEKLY) {
      // Count problems solved this week (Monday to Sunday, using UTC)
      const todayUTC = new Date(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate()));
      const dayOfWeek = todayUTC.getUTCDay();
      const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
      
      const startOfWeek = new Date(Date.UTC(
        todayUTC.getUTCFullYear(),
        todayUTC.getUTCMonth(),
        todayUTC.getUTCDate() - daysToMonday
      ));
      
      // submissionCalendar is already an object from storage
      const calendar = submissionCalendar;
      
      for (let i = 0; i < 7; i++) {
        const date = new Date(Date.UTC(
          startOfWeek.getUTCFullYear(),
          startOfWeek.getUTCMonth(),
          startOfWeek.getUTCDate() + i
        ));
        if (date > todayUTC) break;
        const timestamp = Math.floor(date.getTime() / 1000).toString();
        progress += parseInt(calendar?.[timestamp]) || 0;
      }
      
      console.log('Weekly goal progress:', progress);
    } else if (goal.type === GOAL_TYPES.MONTHLY) {
      // Count problems solved this month (using UTC)
      const todayUTC = new Date(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate()));
      
      // submissionCalendar is already an object from storage
      const calendar = submissionCalendar;
      
      const daysInMonth = new Date(todayUTC.getUTCFullYear(), todayUTC.getUTCMonth() + 1, 0).getDate();
      const currentDay = todayUTC.getUTCDate();
      
      for (let day = 1; day <= Math.min(daysInMonth, currentDay); day++) {
        const date = new Date(Date.UTC(todayUTC.getUTCFullYear(), todayUTC.getUTCMonth(), day));
        const timestamp = Math.floor(date.getTime() / 1000).toString();
        progress += parseInt(calendar?.[timestamp]) || 0;
      }
      
      console.log('Monthly goal progress:', progress);
    }
    
    return {
      progress,
      target: goal.target,
      percentage: Math.min((progress / goal.target) * 100, 100),
      completed: progress >= goal.target
    };
  } catch (error) {
    console.error('Error calculating goal progress:', error);
    return { progress: 0, target: goal.target, percentage: 0, completed: false };
  }
}
