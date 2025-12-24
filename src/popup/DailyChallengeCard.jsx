import { useState, useEffect } from 'react';
import { getDailyChallenge, getChallengeProgress, updateChallengeProgress } from '../shared/daily-challenge';

export default function DailyChallengeCard({ userStats }) {
  const [challenge, setChallenge] = useState(null);
  const [progress, setProgress] = useState(0);
  const [completed, setCompleted] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);

  useEffect(() => {
    if (userStats) {
      loadChallenge();
    }
  }, []);

  useEffect(() => {
    if (userStats && challenge) {
      updateProgress();
    }
  }, [userStats, challenge]);

  async function loadChallenge() {
    const dailyChallenge = await getDailyChallenge(userStats);
    const { progress: currentProgress, completed: isCompleted } = await getChallengeProgress();
    
    setChallenge(dailyChallenge);
    setProgress(currentProgress);
    setCompleted(isCompleted);
  }

  async function updateProgress() {
    const { progress: newProgress, completed: isCompleted } = await updateChallengeProgress(userStats);
    
    // Show confetti if just completed
    if (isCompleted && !completed) {
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 3000);
    }
    
    setProgress(newProgress);
    setCompleted(isCompleted);
  }

  async function resetChallenge() {
    try {
      await chrome.storage.local.set({
        previousStats: userStats,
        challengeProgress: 0,
        challengeCompleted: false
      });
      setProgress(0);
      setCompleted(false);
    } catch (error) {
      console.error('Error resetting challenge:', error);
    }
  }

  if (!challenge) return null;

  const progressPercent = Math.min((progress / challenge.target) * 100, 100);

  return (
    <div className="bg-surface border border-primary/30 rounded-xl p-6 shadow-lg relative overflow-hidden">
      {showConfetti && (
        <div className="absolute inset-0 pointer-events-none z-10">
          {[...Array(30)].map((_, i) => (
            <div
              key={i}
              className="absolute animate-confetti text-2xl"
              style={{
                left: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 0.5}s`,
                animationDuration: `${2 + Math.random() * 2}s`
              }}
            >
              {['🎉', '✨', '🌟', '💫', '⭐'][Math.floor(Math.random() * 5)]}
            </div>
          ))}
        </div>
      )}

      <div className="flex items-start justify-between mb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-3xl">{challenge.icon}</span>
            <h3 className="text-xl font-bold text-text-primary">{challenge.title}</h3>
          </div>
          <p className="text-text-muted">{challenge.description}</p>
        </div>
        {completed && (
          <div className="flex items-center gap-1 bg-accent/20 text-accent px-3 py-1 rounded-full animate-bounce-in">
            <span className="text-xl">✓</span>
            <span className="font-semibold">Done!</span>
          </div>
        )}
      </div>

      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-text-muted">Progress</span>
          <span className="font-semibold text-text-primary">
            {progress} / {challenge.target}
          </span>
        </div>
        <div className="h-3 bg-surfaceHover rounded-full overflow-hidden">
          <div
            className={`h-full transition-all duration-500 ${
              completed ? 'bg-accent' : 'bg-primary'
            }`}
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {completed && (
        <div className="mt-4 text-center">
          <div className="text-sm text-accent font-medium mb-2">
            🎊 Challenge completed! Come back tomorrow for a new one!
          </div>
          <button
            onClick={resetChallenge}
            className="text-xs text-text-muted hover:text-text-primary transition-colors"
          >
            Reset progress
          </button>
        </div>
      )}

      {!completed && progressPercent > 0 && (
        <div className="mt-4 text-center text-sm text-text-muted">
          Keep going! You're {progressPercent.toFixed(0)}% there!
        </div>
      )}

      {!completed && progressPercent === 0 && (
        <div className="mt-4 text-center">
          <div className="text-xs text-text-muted">
            Start solving to make progress!
          </div>
        </div>
      )}
    </div>
  );
}
