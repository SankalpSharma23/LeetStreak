import React, { useState, useEffect } from 'react';

function ProblemQueue() {
  const [problems, setProblems] = useState([]);
  const [newProblem, setNewProblem] = useState('');
  const [showInput, setShowInput] = useState(false);

  useEffect(() => {
    loadProblems();
  }, []);

  const loadProblems = async () => {
    try {
      const result = await chrome.storage.local.get('problem_queue');
      setProblems(result.problem_queue || []);
    } catch (error) {
      console.error('Error loading problems:', error);
    }
  };

  const saveProblems = async (updatedProblems) => {
    try {
      await chrome.storage.local.set({ problem_queue: updatedProblems });
      setProblems(updatedProblems);
    } catch (error) {
      console.error('Error saving problems:', error);
    }
  };

  const addProblem = () => {
    if (!newProblem.trim()) return;

    const problem = {
      id: Date.now(),
      title: newProblem.trim(),
      slug: extractSlug(newProblem.trim()),
      url: extractLeetCodeUrl(newProblem.trim()),
      addedAt: Date.now(),
      status: 'pending', // pending, in-progress, completed
      difficulty: 'Medium'
    };

    saveProblems([...problems, problem]);
    setNewProblem('');
    setShowInput(false);
  };

  const updateStatus = (id, newStatus) => {
    const updated = problems.map(p => 
      p.id === id ? { ...p, status: newStatus } : p
    );
    saveProblems(updated);
  };

  const extractSlug = (text) => {
    // Extract slug from URL if it's a URL
    if (text.includes('leetcode.com/problems/')) {
      const match = text.match(/problems\/([^/]+)/);
      return match ? match[1] : text;
    }
    // Convert text to slug
    return text.toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '-');
  };

  const removeProblem = (id) => {
    saveProblems(problems.filter(p => p.id !== id));
  };

  const extractLeetCodeUrl = (text) => {
    // Check if input is already a URL
    if (text.startsWith('http')) {
      return text;
    }
    
    // Try to extract problem slug from text
    const slug = text.toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '-');
    
    return `https://leetcode.com/problems/${slug}/`;
  };

  const openProblem = (url) => {
    chrome.tabs.create({ url });
  };

  return (
    <div className="bg-surface rounded-3xl shadow-xl p-6 border border-surfaceHover transition-all duration-300 hover:shadow-2xl hover:shadow-primary/5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="text-lg">📝</span>
          <div>
            <h3 className="font-bold text-xs text-text-main">Problem Queue</h3>
            <p className="text-[9px] text-text-muted">Save problems to solve later</p>
          </div>
        </div>
        <button
          onClick={() => setShowInput(!showInput)}
          className="px-2.5 py-1 text-[10px] font-semibold bg-primary text-white rounded-md hover:bg-primaryHover transition-all active:scale-95"
        >
          {showInput ? '✕' : '+ Add'}
        </button>
      </div>

      {/* Add Problem Input */}
      {showInput && (
        <div className="mb-3 p-2.5 bg-background/50 rounded-lg border border-surfaceHover">
          <input
            type="text"
            value={newProblem}
            onChange={(e) => setNewProblem(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && addProblem()}
            placeholder="Problem name or URL..."
            className="w-full px-2.5 py-1.5 text-[10px] bg-surface border border-surfaceHover rounded-md focus:outline-none focus:border-primary text-text-main placeholder-text-muted mb-2"
            autoFocus
          />
          <div className="flex gap-2">
            <button
              onClick={addProblem}
              className="flex-1 py-1.5 text-[10px] font-semibold bg-primary text-white rounded-md hover:bg-primaryHover transition-all"
            >
              Add to Queue
            </button>
            <button
              onClick={() => {
                setShowInput(false);
                setNewProblem('');
              }}
              className="px-3 py-1.5 text-[10px] font-semibold text-text-muted hover:text-text-main bg-surface hover:bg-surfaceHover rounded-md transition-all"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Problem List */}
      {problems.length === 0 ? (
        <div className="text-center py-4 text-text-muted">
          <span className="text-2xl mb-1 block">📋</span>
          <p className="text-[10px]">No problems saved yet</p>
          <p className="text-[9px] mt-0.5">Visit LeetCode problems and click "Add to Queue"</p>
        </div>
      ) : (
        <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1 custom-scrollbar">
          {problems.map((problem) => {
            const difficultyColors = {
              Easy: 'text-leetcode-easy',
              Medium: 'text-leetcode-medium',
              Hard: 'text-leetcode-hard'
            };
            const statusIcons = {
              pending: '⏳',
              'in-progress': '🚀',
              completed: '✅'
            };
            
            return (
              <div
                key={problem.id || problem.slug}
                className="flex items-center gap-2 p-2 bg-background/50 rounded-lg border border-surfaceHover hover:border-primary/40 transition-all group"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <span className="text-[10px]">{statusIcons[problem.status] || '📋'}</span>
                    <div className="text-[10px] font-semibold text-text-main truncate group-hover:text-primary transition-colors">
                      {problem.title}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-[8px] text-text-muted">
                    <span className={`font-semibold ${difficultyColors[problem.difficulty] || 'text-text-muted'}`}>
                      {problem.difficulty}
                    </span>
                    {problem.number && <span>#{problem.number}</span>}
                    <span>•</span>
                    <span>Added {new Date(problem.addedAt).toLocaleDateString()}</span>
                  </div>
                </div>
                <div className="flex gap-1 flex-shrink-0">
                  {problem.status !== 'completed' && (
                    <button
                      onClick={() => updateStatus(problem.id || problem.slug, 
                        problem.status === 'pending' ? 'in-progress' : 'completed')}
                      className="px-2 py-1 text-[9px] font-semibold text-accent hover:text-accent bg-accent/10 hover:bg-accent/20 rounded transition-all"
                      title={problem.status === 'pending' ? 'Start' : 'Complete'}
                    >
                      {problem.status === 'pending' ? '▶' : '✓'}
                    </button>
                  )}
                  <button
                    onClick={() => openProblem(problem.url)}
                    className="px-2 py-1 text-[9px] font-semibold text-primary hover:text-primaryHover bg-primary/10 hover:bg-primary/20 rounded transition-all whitespace-nowrap"
                    title="Open problem"
                  >
                    Open
                  </button>
                  <button
                    onClick={() => removeProblem(problem.id || problem.slug)}
                    className="px-1.5 py-1 text-[9px] font-semibold text-red-400 hover:text-red-300 bg-red-400/10 hover:bg-red-400/20 rounded transition-all"
                    title="Remove"
                  >
                    ✕
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {problems.length > 0 && (
        <div className="mt-2 pt-2 border-t border-surfaceHover">
          <div className="flex justify-between items-center text-[9px] text-text-muted">
            <span>{problems.length} problem{problems.length !== 1 ? 's' : ''} in queue</span>
            <div className="flex gap-2">
              <span>⏳ {problems.filter(p => p.status === 'pending').length}</span>
              <span>🚀 {problems.filter(p => p.status === 'in-progress').length}</span>
              <span>✅ {problems.filter(p => p.status === 'completed').length}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ProblemQueue;
