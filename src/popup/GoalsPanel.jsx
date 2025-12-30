import { useState, useEffect } from 'react';
import { DEFAULT_GOALS, getActiveGoals, setActiveGoals, calculateGoalProgress } from '../shared/goals-manager';

export default function GoalsPanel({ userData }) {
  const [activeGoals, setActiveGoalsState] = useState([]);
  const [goalProgress, setGoalProgress] = useState({});
  const [showAddGoal, setShowAddGoal] = useState(false);

  async function loadActiveGoals() {
    const goals = await getActiveGoals();
    setActiveGoalsState(goals);
    if (userData && goals.length > 0) {
      // Update progress immediately after loading goals
      const progress = {};
      for (const goal of goals) {
        progress[goal.id] = await calculateGoalProgress(
          goal,
          userData.stats,
          userData.submissionCalendar
        );
      }
      setGoalProgress(progress);
    }
  }

  async function updateGoalProgress() {
    const progress = {};
    for (const goal of activeGoals) {
      progress[goal.id] = await calculateGoalProgress(
        goal,
        userData.stats,
        userData.submissionCalendar
      );
    }
    setGoalProgress(progress);
  }

  useEffect(() => {
    loadActiveGoals();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (userData && activeGoals.length > 0) {
      updateGoalProgress();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userData?.stats?.total, userData?.submissionCalendar, activeGoals]);

  async function addGoal(goal) {
    const newGoals = [...activeGoals, goal];
    await setActiveGoals(newGoals);
    setActiveGoalsState(newGoals);
    setShowAddGoal(false);
  }

  async function removeGoal(goalId) {
    const newGoals = activeGoals.filter(g => g.id !== goalId);
    await setActiveGoals(newGoals);
    setActiveGoalsState(newGoals);
  }

  const availableGoals = DEFAULT_GOALS.filter(
    goal => !activeGoals.some(ag => ag.id === goal.id)
  );

  if (activeGoals.length === 0 && !showAddGoal) {
    return (
      <div className="bg-surface border border-primary/30 rounded-xl p-6 text-center">
        <div className="text-4xl mb-3">🎯</div>
        <p className="text-text-muted mb-4">No goals set yet</p>
        <button
          onClick={() => setShowAddGoal(true)}
          className="px-4 py-2 bg-primary hover:bg-primaryHover text-inverted rounded-lg font-semibold text-sm transition-colors"
        >
          Set Your First Goal
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {activeGoals.map(goal => {
        const progress = goalProgress[goal.id] || { progress: 0, target: goal.target, percentage: 0, completed: false };
        
        return (
          <div
            key={goal.id}
            className={`
              bg-surface border rounded-xl p-4 transition-all duration-300
              ${progress.completed ? 'border-accent/50 bg-accent/5' : 'border-primary/30'}
            `}
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2 flex-1">
                <span className="text-2xl">{goal.icon}</span>
                <div className="flex-1">
                  <h4 className="font-semibold text-text-primary text-sm">{goal.title}</h4>
                  <p className="text-xs text-text-muted capitalize">{goal.type}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {progress.completed && (
                  <span className="text-accent text-xl">✓</span>
                )}
                <button
                  onClick={() => removeGoal(goal.id)}
                  className="text-text-muted hover:text-red-500 transition-colors"
                  title="Remove goal"
                >
                  ✕
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-text-muted">Progress</span>
                <span className="font-semibold text-text-primary">
                  {progress.progress} / {progress.target}
                </span>
              </div>
              <div className="h-2 bg-surfaceHover rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all duration-500 ${
                    progress.completed ? 'bg-accent' : 'bg-primary'
                  }`}
                  style={{ width: `${progress.percentage}%` }}
                />
              </div>
              {progress.completed && (
                <p className="text-xs text-accent text-center font-medium mt-2">
                  🎊 Goal achieved! Amazing work!
                </p>
              )}
            </div>
          </div>
        );
      })}

      {showAddGoal && availableGoals.length > 0 && (
        <div className="bg-surfaceHover border border-primary/30 rounded-xl p-4 animate-slide-up">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-semibold text-text-primary text-sm">Add New Goal</h4>
            <button
              onClick={() => setShowAddGoal(false)}
              className="text-text-muted hover:text-text-primary transition-colors"
            >
              ✕
            </button>
          </div>
          <div className="space-y-2">
            {availableGoals.map(goal => (
              <button
                key={goal.id}
                onClick={() => addGoal(goal)}
                className="w-full text-left p-3 bg-surface hover:bg-surfaceHover border border-transparent hover:border-primary/30 rounded-lg transition-all duration-200 flex items-center gap-3"
              >
                <span className="text-xl">{goal.icon}</span>
                <div className="flex-1">
                  <p className="text-sm font-medium text-text-primary">{goal.title}</p>
                  <p className="text-xs text-text-muted capitalize">{goal.type}</p>
                </div>
                <span className="text-xs text-primary">Add →</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {!showAddGoal && availableGoals.length > 0 && (
        <button
          onClick={() => setShowAddGoal(true)}
          className="w-full py-3 border-2 border-dashed border-primary/30 hover:border-primary/50 rounded-xl text-primary hover:bg-primary/5 transition-all duration-200 flex items-center justify-center gap-2 font-semibold text-sm"
        >
          <span className="text-lg">+</span>
          <span>Add Another Goal</span>
        </button>
      )}

      {activeGoals.length > 0 && availableGoals.length === 0 && (
        <div className="bg-gradient-to-br from-accent/5 to-primary/5 border border-accent/20 rounded-xl p-4 text-center">
          <p className="text-xs text-text-muted">
            🎉 You've added all available goals! Keep crushing them!
          </p>
        </div>
      )}
    </div>
  );
}
