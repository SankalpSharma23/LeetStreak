/**
 * Daily Challenge Generator and Manager
 */

const CHALLENGES = [
  { id: 'solve_2_easy', title: 'Double Trouble', description: 'Solve 2 Easy problems', icon: '🎯', target: 2, difficulty: 'easy' },
  { id: 'solve_1_medium', title: 'Step Up', description: 'Solve 1 Medium problem', icon: '📈', target: 1, difficulty: 'medium' },
  { id: 'solve_1_hard', title: 'Beast Mode', description: 'Solve 1 Hard problem', icon: '💪', target: 1, difficulty: 'hard' },
  { id: 'maintain_streak', title: 'Keep it Going', description: 'Maintain your streak', icon: '⚡', target: 1, difficulty: 'any' }
];

export async function getDailyChallenge(userStats = null) {
  try {
    const result = await chrome.storage.local.get(['dailyChallenge', 'dailyChallengeDate', 'previousStats']);
    const today = new Date().toISOString().split('T')[0];
    
    // Return existing challenge if it's from today
    if (result.dailyChallengeDate === today && result.dailyChallenge) {
      return result.dailyChallenge;
    }
    
    // Generate new challenge for today
    const challenge = generateNewChallenge();
    
    // Initialize previousStats with current stats when creating new challenge
    const initialStats = userStats || result.previousStats || { easy: 0, medium: 0, hard: 0, total: 0 };
    
    await chrome.storage.local.set({
      dailyChallenge: challenge,
      dailyChallengeDate: today,
      challengeProgress: 0,
      challengeCompleted: false,
      previousStats: initialStats
    });
    
    return challenge;
  } catch (error) {
    console.error('Error getting daily challenge:', error);
    return null;
  }
}

function generateNewChallenge() {
  const randomIndex = Math.floor(Math.random() * CHALLENGES.length);
  return { ...CHALLENGES[randomIndex], date: new Date().toISOString().split('T')[0] };
}

export async function updateChallengeProgress(userStats) {
  try {
    const result = await chrome.storage.local.get([
      'dailyChallenge',
      'dailyChallengeDate',
      'challengeProgress',
      'challengeCompleted',
      'previousStats'
    ]);
    
    const today = new Date().toISOString().split('T')[0];
    
    if (result.dailyChallengeDate !== today || !result.dailyChallenge) {
      return { progress: 0, completed: false };
    }
    
    if (result.challengeCompleted) {
      return { progress: result.dailyChallenge.target, completed: true };
    }
    
    const challenge = result.dailyChallenge;
    const prevStats = result.previousStats || { easy: 0, medium: 0, hard: 0, total: 0 };
    
    let progress = 0;
    
    // Calculate progress based on challenge type
    if (challenge.difficulty === 'easy') {
      progress = (userStats.easy || 0) - (prevStats.easy || 0);
    } else if (challenge.difficulty === 'medium') {
      progress = (userStats.medium || 0) - (prevStats.medium || 0);
    } else if (challenge.difficulty === 'hard') {
      progress = (userStats.hard || 0) - (prevStats.hard || 0);
    } else if (challenge.difficulty === 'any') {
      progress = (userStats.total || 0) - (prevStats.total || 0);
    }
    
    progress = Math.max(0, progress);
    const completed = progress >= challenge.target;
    
    await chrome.storage.local.set({
      challengeProgress: progress,
      challengeCompleted: completed,
      previousStats: userStats
    });
    
    return { progress, completed };
  } catch (error) {
    console.error('Error updating challenge progress:', error);
    return { progress: 0, completed: false };
  }
}

export async function getChallengeProgress() {
  try {
    const result = await chrome.storage.local.get([
      'dailyChallenge',
      'challengeProgress',
      'challengeCompleted'
    ]);
    
    return {
      challenge: result.dailyChallenge,
      progress: result.challengeProgress || 0,
      completed: result.challengeCompleted || false
    };
  } catch (error) {
    console.error('Error getting challenge progress:', error);
    return { challenge: null, progress: 0, completed: false };
  }
}
