import React, { useState, useEffect } from 'react';
import { getDailyQuestion } from '../background/leetcode-api';

function DailyQuestion() {
  const [question, setQuestion] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDailyQuestion();
  }, []);

  const loadDailyQuestion = async () => {
    setLoading(true);
    const dailyQuestion = await getDailyQuestion();
    setQuestion(dailyQuestion);
    setLoading(false);
  };

  const getDifficultyColor = (difficulty) => {
    switch (difficulty?.toLowerCase()) {
      case 'easy':
        return 'text-green-400 bg-green-400/10 border-green-400/30';
      case 'medium':
        return 'text-yellow-400 bg-yellow-400/10 border-yellow-400/30';
      case 'hard':
        return 'text-red-400 bg-red-400/10 border-red-400/30';
      default:
        return 'text-text-muted bg-surface/50 border-surfaceHover';
    }
  };

  const openQuestion = () => {
    if (question?.link) {
      chrome.tabs.create({ url: question.link });
    }
  };

  if (loading) {
    return (
      <div className="bg-gradient-to-br from-surface to-surfaceHover/30 p-5 rounded-xl border border-surfaceHover shadow-lg">
        <div className="flex items-center gap-3 mb-4">
          <span className="text-2xl">📅</span>
          <div>
            <h3 className="font-bold text-sm text-text-main">Daily Question</h3>
            <p className="text-[10px] text-text-muted">Loading today's challenge...</p>
          </div>
        </div>
        <div className="relative w-full h-1.5 bg-surfaceHover rounded-full overflow-hidden">
          <div className="absolute top-0 left-0 h-full bg-gradient-to-r from-primary via-primaryHover to-primary rounded-full animate-loading-bar" style={{
            width: '40%',
            animation: 'loading-slide 1.5s ease-in-out infinite'
          }}></div>
        </div>
        <style>{`
          @keyframes loading-slide {
            0% { left: -40%; }
            100% { left: 100%; }
          }
        `}</style>
      </div>
    );
  }

  if (!question) {
    return (
      <div className="bg-gradient-to-br from-surface to-surfaceHover/30 p-5 rounded-xl border border-surfaceHover shadow-lg">
        <div className="flex items-center gap-3 mb-4">
          <span className="text-2xl">📅</span>
          <div>
            <h3 className="font-bold text-sm text-text-main">Daily Question</h3>
            <p className="text-[10px] text-text-muted">Unable to load question</p>
          </div>
        </div>
        <p className="text-xs text-text-muted">Please try again later</p>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-surface to-surfaceHover/30 p-5 rounded-xl border border-surfaceHover shadow-lg hover:shadow-primary/5 transition-all duration-300 group">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <span className="text-2xl">📅</span>
          <div>
            <h3 className="font-bold text-sm text-text-main">Daily Question</h3>
            <p className="text-[10px] text-text-muted">{new Date(question.date).toLocaleDateString('en-US', { 
              month: 'long', 
              day: 'numeric', 
              year: 'numeric' 
            })}</p>
          </div>
        </div>
        <div className={`px-2.5 py-1 rounded-full text-[10px] font-bold border ${getDifficultyColor(question.difficulty)}`}>
          {question.difficulty}
        </div>
      </div>

      <button
        onClick={openQuestion}
        className="w-full text-left group-hover:scale-[1.01] transition-transform"
      >
        <div className="flex items-start gap-2 mb-3">
          <span className="text-text-muted font-semibold text-xs">#{question.questionId}</span>
          <h4 className="font-bold text-sm text-text-main group-hover:text-primary transition-colors flex-1 leading-tight">
            {question.title}
          </h4>
        </div>

        {question.topics && question.topics.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-3">
            {question.topics.slice(0, 4).map((topic, idx) => (
              <span
                key={idx}
                className="px-2 py-0.5 bg-primary/10 text-primary text-[9px] font-semibold rounded-full border border-primary/20"
              >
                {topic}
              </span>
            ))}
            {question.topics.length > 4 && (
              <span className="px-2 py-0.5 bg-surfaceHover text-text-muted text-[9px] font-semibold rounded-full">
                +{question.topics.length - 4} more
              </span>
            )}
          </div>
        )}

        <div className="flex items-center gap-4 text-[10px] text-text-muted">
          <div className="flex items-center gap-1">
            <span>👍</span>
            <span className="font-semibold">{question.likes?.toLocaleString() || 0}</span>
          </div>
          <div className="flex items-center gap-1">
            <span>👎</span>
            <span className="font-semibold">{question.dislikes?.toLocaleString() || 0}</span>
          </div>
          <div className="flex-1"></div>
          <div className="text-primary font-bold group-hover:translate-x-1 transition-transform flex items-center gap-1">
            <span>Solve Now</span>
            <span>→</span>
          </div>
        </div>
      </button>
    </div>
  );
}

export default DailyQuestion;
