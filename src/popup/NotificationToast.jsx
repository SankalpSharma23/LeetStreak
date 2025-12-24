import React, { useState, useEffect } from 'react';

function NotificationToast({ notifications, onDismiss }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (notifications && notifications.length > 0) {
      setVisible(true);
    } else {
      setVisible(false);
    }
  }, [notifications]);

  const handleDismiss = () => {
    setVisible(false);
    setTimeout(() => {
      if (notifications && notifications.length > 0) {
        onDismiss(notifications[0].id);
      }
    }, 300);
  };

  if (!visible || !notifications || notifications.length === 0) {
    return null;
  }

  const current = notifications[0];
  const remaining = notifications.length;

  return (
    <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 animate-slide-down">
      <div className="bg-gradient-to-r from-primary/90 to-primaryHover/90 backdrop-blur-md border border-primary/40 rounded-2xl shadow-2xl p-4 min-w-[320px] max-w-[360px]">
        <div className="flex items-start gap-3">
          <span className="text-3xl">
            {current.type === 'solved_today' && '🎯'}
            {current.type === 'milestone' && '🔥'}
            {current.type === 'streak_at_risk' && '⚠️'}
          </span>
          <div className="flex-1">
            <div className="font-bold text-sm text-white mb-1">
              {current.username}
            </div>
            <div className="text-xs text-white/90">
              {current.message}
            </div>
            {remaining > 1 && (
              <div className="text-[10px] text-white/70 mt-2">
                {remaining - 1} more notification{remaining - 1 > 1 ? 's' : ''}
              </div>
            )}
          </div>
          <button
            onClick={handleDismiss}
            className="text-white/80 hover:text-white text-lg font-bold leading-none transition-colors"
          >
            ✕
          </button>
        </div>
      </div>
    </div>
  );
}

export default NotificationToast;
