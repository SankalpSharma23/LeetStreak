import { useState, useEffect } from 'react';
import { generateInsights } from '../shared/insights-generator';

export default function InsightsPanel({ userData }) {
  const [insights, setInsights] = useState([]);
  const [selectedInsight, setSelectedInsight] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [detailInsight, setDetailInsight] = useState(null);

  useEffect(() => {
    if (userData) {
      const generatedInsights = generateInsights(userData);
      setInsights(generatedInsights);
    }
  }, [userData]);

  const handleViewDetails = (insight, e) => {
    e.stopPropagation();
    setDetailInsight(insight);
    setShowDetailModal(true);
  };

  const handleShare = async (insight, e) => {
    e.stopPropagation();
    const shareText = `🎯 My LeetCode Insight:\n\n${insight.icon} ${insight.category}\n${insight.message}\n\n#LeetCode #CodingJourney`;
    
    if (navigator.clipboard) {
      try {
        await navigator.clipboard.writeText(shareText);
        alert('✓ Insight copied to clipboard!');
      } catch (err) {
        console.error('Failed to copy:', err);
      }
    }
  };

  if (!insights || insights.length === 0) {
    return (
      <div className="bg-surface border border-primary/30 rounded-xl p-8 text-center">
        <div className="text-4xl mb-4">📊</div>
        <p className="text-text-muted">No insights available yet. Keep solving!</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {insights.map((insight, index) => (
        <div
          key={index}
          className={`
            bg-surface border rounded-xl p-4 transition-all duration-300 cursor-pointer
            ${insight.type === 'achievement' ? 'border-accent/40 hover:border-accent/60' : ''}
            ${insight.type === 'neutral' ? 'border-primary/30 hover:border-primary/50' : ''}
            ${insight.type === 'suggestion' ? 'border-leetcode-medium/30 hover:border-leetcode-medium/50' : ''}
            ${selectedInsight === index ? 'ring-2 ring-primary/50 scale-[1.02]' : 'hover:scale-[1.01]'}
          `}
          onClick={() => setSelectedInsight(selectedInsight === index ? null : index)}
        >
          <div className="flex items-start gap-3">
            <div className="text-3xl">{insight.icon}</div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-semibold text-text-muted uppercase tracking-wide">
                  {insight.category}
                </span>
                {insight.type === 'achievement' && (
                  <span className="text-xs bg-accent/20 text-accent px-2 py-0.5 rounded-full">
                    Achievement
                  </span>
                )}
                {insight.type === 'suggestion' && (
                  <span className="text-xs bg-leetcode-medium/20 text-leetcode-medium px-2 py-0.5 rounded-full">
                    Tip
                  </span>
                )}
              </div>
              <p className="text-sm text-text-primary leading-relaxed">
                {insight.message}
              </p>
            </div>
            <div className={`
              text-text-muted transition-transform
              ${selectedInsight === index ? 'rotate-180' : ''}
            `}>
              ▼
            </div>
          </div>
          
          {selectedInsight === index && (
            <div className="mt-4 pt-4 border-t border-surfaceHover animate-slide-up">
              <div className="flex gap-2">
                <button 
                  onClick={(e) => handleViewDetails(insight, e)}
                  className="flex-1 py-2 bg-primary/10 hover:bg-primary/20 text-primary rounded-lg text-xs font-semibold transition-colors"
                >
                  View Details
                </button>
                <button 
                  onClick={(e) => handleShare(insight, e)}
                  className="flex-1 py-2 bg-accent/10 hover:bg-accent/20 text-accent rounded-lg text-xs font-semibold transition-colors"
                >
                  Share
                </button>
              </div>
            </div>
          )}
        </div>
      ))}
      
      {/* Detail Modal */}
      {showDetailModal && detailInsight && (
        <div 
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setShowDetailModal(false)}
        >
          <div 
            className="bg-surface border border-primary/30 rounded-2xl p-6 max-w-md w-full shadow-2xl animate-bounce-in"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start gap-3 mb-4">
              <div className="text-4xl">{detailInsight.icon}</div>
              <div className="flex-1">
                <h3 className="text-lg font-bold text-text-primary mb-1">
                  {detailInsight.category}
                </h3>
                {detailInsight.type === 'achievement' && (
                  <span className="text-xs bg-accent/20 text-accent px-2 py-1 rounded-full">
                    🏆 Achievement
                  </span>
                )}
                {detailInsight.type === 'suggestion' && (
                  <span className="text-xs bg-leetcode-medium/20 text-leetcode-medium px-2 py-1 rounded-full">
                    💡 Tip
                  </span>
                )}
              </div>
              <button
                onClick={() => setShowDetailModal(false)}
                className="text-text-muted hover:text-text-primary transition-colors text-xl"
              >
                ✕
              </button>
            </div>
            
            <div className="bg-surfaceHover rounded-xl p-4 mb-4">
              <p className="text-sm text-text-primary leading-relaxed">
                {detailInsight.message}
              </p>
            </div>

            {detailInsight.type === 'suggestion' && (
              <div className="bg-primary/10 border border-primary/30 rounded-xl p-4 mb-4">
                <h4 className="text-xs font-semibold text-primary mb-2">💡 Quick Tips</h4>
                <ul className="text-xs text-text-muted space-y-1">
                  <li>• Set aside dedicated time for practice</li>
                  <li>• Focus on understanding, not just solving</li>
                  <li>• Review your solutions regularly</li>
                </ul>
              </div>
            )}

            {detailInsight.type === 'achievement' && (
              <div className="bg-accent/10 border border-accent/30 rounded-xl p-4 mb-4">
                <h4 className="text-xs font-semibold text-accent mb-2">🎉 Keep it up!</h4>
                <p className="text-xs text-text-muted">
                  You're making great progress! Consistency is the key to mastering algorithms.
                </p>
              </div>
            )}
            
            <button
              onClick={() => setShowDetailModal(false)}
              className="w-full py-3 bg-primary hover:bg-primaryHover text-inverted rounded-xl font-semibold transition-colors"
            >
              Got it!
            </button>
          </div>
        </div>
      )}
      
      <div className="bg-gradient-to-br from-primary/5 to-accent/5 border border-primary/20 rounded-xl p-4 text-center">
        <p className="text-xs text-text-muted mb-2">
          💡 Insights update daily based on your solving patterns
        </p>
        <button className="text-xs text-primary hover:text-primaryHover font-semibold transition-colors">
          Learn how insights work →
        </button>
      </div>
    </div>
  );
}
