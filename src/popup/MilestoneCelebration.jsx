import React, { useEffect, useState, useMemo } from 'react';

// Generate confetti configuration outside component to avoid impure function calls during render
const generateConfettiData = () => {
  const emojis = ['🎉', '⭐', '🔥', '🎊', '✨', '💫'];
  return [...Array(50)].map((_, i) => ({
    id: i,
    emoji: emojis[Math.floor(Math.random() * emojis.length)],
    left: Math.random() * 100,
    delay: Math.random() * 0.5,
    duration: 2 + Math.random() * 2
  }));
};

function MilestoneCelebration({ streak, onClose }) {
  const [show, setShow] = useState(true);

  // Generate confetti data once to avoid re-rendering issues
  const confettiData = useMemo(() => generateConfettiData(), []);

  useEffect(() => {
    const timer = setTimeout(() => {
      setShow(false);
      setTimeout(onClose, 300);
    }, 4000);
    return () => clearTimeout(timer);
  }, [onClose]);

  const getMilestoneMessage = (streak) => {
    if (streak === 7) return { emoji: '🔥', title: 'Week Warrior!', message: '7 days of dedication!' };
    if (streak === 30) return { emoji: '🚀', title: 'Month Master!', message: '30 days strong!' };
    if (streak === 100) return { emoji: '💯', title: 'Century Club!', message: '100 days of excellence!' };
    if (streak === 365) return { emoji: '👑', title: 'Year Legend!', message: 'A full year of coding!' };
    return { emoji: '⭐', title: `${streak} Day Streak!`, message: 'Keep going!' };
  };

  const milestone = getMilestoneMessage(streak);

  if (!show) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-fade-in">
      {/* Confetti Effect */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {confettiData.map((confetti) => (
          <div
            key={confetti.id}
            className="absolute animate-confetti"
            style={{
              left: `${confetti.left}%`,
              top: `-10%`,
              animationDelay: `${confetti.delay}s`,
              animationDuration: `${confetti.duration}s`
            }}
          >
            {confetti.emoji}
          </div>
        ))}
      </div>

      {/* Milestone Card */}
      <div className="relative bg-gradient-to-br from-primary via-accent to-secondary p-8 rounded-3xl shadow-2xl max-w-sm mx-4 animate-bounce-in text-center">
        <div className="absolute inset-0 bg-surface/10 backdrop-blur-xl rounded-3xl"></div>
        
        <div className="relative z-10">
          <div className="text-8xl mb-4 animate-pulse-slow">{milestone.emoji}</div>
          <h2 className="text-3xl font-black text-white mb-2 drop-shadow-lg">
            {milestone.title}
          </h2>
          <p className="text-lg text-white/90 mb-4">{milestone.message}</p>
          <div className="text-6xl font-black text-white drop-shadow-2xl">
            {streak}
          </div>
          <p className="text-sm text-white/80 mt-2">days streak</p>
          
          <button
            onClick={() => {
              setShow(false);
              setTimeout(onClose, 300);
            }}
            className="mt-6 px-6 py-2 bg-white text-primary font-bold rounded-full hover:scale-105 transition-transform shadow-lg"
          >
            Awesome! 🎉
          </button>
        </div>
      </div>
    </div>
  );
}

export default MilestoneCelebration;
