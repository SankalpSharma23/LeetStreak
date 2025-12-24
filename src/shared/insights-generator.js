/**
 * Smart Insights Generator
 * Analyzes user patterns and generates personalized insights
 */

export function generateInsights(userData) {
  const insights = [];
  
  if (!userData || !userData.stats) return insights;
  
  const { stats, submissionCalendar, recentSubmissions } = userData;
  
  // 1. Difficulty Preference Analysis
  const difficultyInsight = analyzeDifficultyPreference(stats);
  if (difficultyInsight) insights.push(difficultyInsight);
  
  // 2. Consistency Analysis
  const consistencyInsight = analyzeConsistency(submissionCalendar);
  if (consistencyInsight) insights.push(consistencyInsight);
  
  // 3. Best Solving Days
  const bestDaysInsight = analyzeBestDays(submissionCalendar);
  if (bestDaysInsight) insights.push(bestDaysInsight);
  
  // 4. Recent Activity Trend
  const trendInsight = analyzeRecentTrend(recentSubmissions);
  if (trendInsight) insights.push(trendInsight);
  
  // 5. Achievement Potential
  const potentialInsight = analyzePotential(stats);
  if (potentialInsight) insights.push(potentialInsight);
  
  return insights;
}

function analyzeDifficultyPreference(stats) {
  const { easy = 0, medium = 0, hard = 0, total = 0 } = stats;
  
  if (total === 0) return null;
  
  const easyPercent = (easy / total) * 100;
  const mediumPercent = (medium / total) * 100;
  const hardPercent = (hard / total) * 100;
  
  let message, icon, type;
  
  if (hardPercent > 30) {
    message = `You're a challenge seeker! ${hardPercent.toFixed(0)}% of your solutions are Hard problems. 💪`;
    icon = '🔥';
    type = 'achievement';
  } else if (mediumPercent > 50) {
    message = `Balanced approach! You focus on Medium problems (${mediumPercent.toFixed(0)}%). Keep pushing! 📈`;
    icon = '⚖️';
    type = 'neutral';
  } else if (easyPercent > 60) {
    message = `Strong foundation with Easy problems! Ready to tackle more Medium challenges? 🎯`;
    icon = '💡';
    type = 'suggestion';
  }
  
  return { message, icon, type, category: 'Difficulty Preference' };
}

function analyzeConsistency(submissionCalendar) {
  if (!submissionCalendar) return null;
  
  try {
    const calendar = typeof submissionCalendar === 'string' 
      ? JSON.parse(submissionCalendar) 
      : submissionCalendar;
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Check last 7 days
    let activeDays = 0;
    for (let i = 0; i < 7; i++) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const timestamp = Math.floor(date.getTime() / 1000).toString();
      if (calendar[timestamp] > 0) activeDays++;
    }
    
    let message, icon, type;
    
    if (activeDays === 7) {
      message = `Perfect week! You solved problems every day for 7 days straight! 🌟`;
      icon = '🎉';
      type = 'achievement';
    } else if (activeDays >= 5) {
      message = `Great consistency! ${activeDays} active days this week. Keep it up! ⚡`;
      icon = '⭐';
      type = 'achievement';
    } else if (activeDays >= 3) {
      message = `${activeDays} days active this week. Try to maintain regular practice! 💪`;
      icon = '📊';
      type = 'neutral';
    } else {
      message = `Only ${activeDays} active days this week. Let's get back on track! 🎯`;
      icon = '💡';
      type = 'suggestion';
    }
    
    return { message, icon, type, category: 'Weekly Consistency' };
  } catch (error) {
    return null;
  }
}

function analyzeBestDays(submissionCalendar) {
  if (!submissionCalendar) return null;
  
  try {
    const calendar = typeof submissionCalendar === 'string' 
      ? JSON.parse(submissionCalendar) 
      : submissionCalendar;
    
    const dayOfWeekCounts = Array(7).fill(0);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Analyze last 30 days
    for (let i = 0; i < 30; i++) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const timestamp = Math.floor(date.getTime() / 1000).toString();
      if (calendar[timestamp] > 0) {
        const dayOfWeek = date.getDay();
        dayOfWeekCounts[dayOfWeek]++;
      }
    }
    
    const maxDays = Math.max(...dayOfWeekCounts);
    if (maxDays === 0) return null;
    
    const bestDay = dayOfWeekCounts.indexOf(maxDays);
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    
    const message = `Your most productive day is ${dayNames[bestDay]}! You've been most active on ${dayNames[bestDay]}s. 📅`;
    
    return {
      message,
      icon: '📈',
      type: 'neutral',
      category: 'Best Solving Days'
    };
  } catch (error) {
    return null;
  }
}

function analyzeRecentTrend(recentSubmissions) {
  if (!recentSubmissions || recentSubmissions.length === 0) return null;
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const threeDaysAgo = new Date(today);
  threeDaysAgo.setDate(today.getDate() - 3);
  
  const recentCount = recentSubmissions.filter(sub => {
    const subDate = new Date(sub.timestamp * 1000);
    return subDate >= threeDaysAgo;
  }).length;
  
  let message, icon, type;
  
  if (recentCount >= 5) {
    message = `On fire! ${recentCount} submissions in the last 3 days! 🔥`;
    icon = '🚀';
    type = 'achievement';
  } else if (recentCount >= 2) {
    message = `Good momentum with ${recentCount} recent submissions! Keep going! 💪`;
    icon = '⚡';
    type = 'neutral';
  } else if (recentCount === 1) {
    message = `Getting started! Let's build that momentum! 🎯`;
    icon = '💡';
    type = 'suggestion';
  } else {
    message = `Time to get coding! Start with an easy problem to warm up! 🌟`;
    icon = '💡';
    type = 'suggestion';
  }
  
  return { message, icon, type, category: 'Recent Activity' };
}

function analyzePotential(stats) {
  const { easy = 0, medium = 0, hard = 0, total = 0 } = stats;
  
  if (total === 0) return null;
  
  let message, icon, type;
  
  if (total >= 1000) {
    message = `LeetCode Master! Over ${total} problems solved! You're in the elite club! 👑`;
    icon = '👑';
    type = 'achievement';
  } else if (total >= 500) {
    message = `Halfway to 1000! Keep grinding, you're doing amazing! 🎯`;
    icon = '🎖️';
    type = 'achievement';
  } else if (total >= 100) {
    message = `Century club member! ${total} problems solved and counting! 💯`;
    icon = '💯';
    type = 'achievement';
  } else if (total >= 50) {
    message = `Great progress! ${total} problems down. Next milestone: 100! 📊`;
    icon = '⭐';
    type = 'neutral';
  } else {
    message = `Building momentum! ${total} problems solved. Keep going! 🚀`;
    icon = '🌱';
    type = 'neutral';
  }
  
  return { message, icon, type, category: 'Achievement Level' };
}
