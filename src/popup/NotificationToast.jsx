import React from 'react';
import { Bell, X, Flame, Target, AlertTriangle } from 'lucide-react';

function NotificationToast({ notifications, onDismiss }) {
  // Compute visibility directly instead of storing in state
  const visible = notifications && notifications.length > 0;

  const handleDismiss = () => {
    if (notifications && notifications.length > 0) {
      onDismiss(notifications[0].id);
    }
  };

  if (!visible || !notifications || notifications.length === 0) {
    return null;
  }

  const current = notifications[0];
  const remaining = notifications.length;

  const getIcon = () => {
    switch (current.type) {
      case 'new_submission':
      case 'solved_today':
        return <Target className="w-8 h-8 text-primary" />;
      case 'milestone':
        return <Flame className="w-8 h-8 text-orange-500" />;
      case 'streak_at_risk':
        return <AlertTriangle className="w-8 h-8 text-yellow-500" />;
      default:
        return <Bell className="w-8 h-8 text-primary" />;
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 animate-fade-in" onClick={handleDismiss}></div>
      
      {/* Centered Modal */}
      <div className="fixed inset-0 flex items-center justify-center z-50 pointer-events-none">
        <div className="pointer-events-auto animate-scale-in-center">
          <div className="bg-surface border-2 border-primary/30 rounded-3xl shadow-2xl p-8 w-[340px] relative">
            {/* Close Button */}
            <button
              onClick={handleDismiss}
              className="absolute top-4 right-4 text-text-muted hover:text-text-main transition-colors p-1 hover:bg-surfaceHover rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Icon */}
            <div className="flex justify-center mb-6">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center">
                {getIcon()}
              </div>
            </div>

            {/* Content */}
            <div className="text-center">
              <div className="font-bold text-lg text-text-main mb-2">
                {current.username}
              </div>
              <div className="text-sm text-text-muted mb-6">
                {current.message}
              </div>

              {/* Badge Count */}
              {remaining > 1 && (
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 rounded-full text-xs text-primary font-semibold mb-4">
                  <Bell className="w-3 h-3" />
                  {remaining - 1} more notification{remaining - 1 > 1 ? 's' : ''}
                </div>
              )}

              {/* Action Button */}
              <button
                onClick={handleDismiss}
                className="w-full py-3 bg-primary hover:bg-primaryHover text-inverted font-semibold rounded-xl transition-all duration-200 active:scale-95"
              >
                Got it!
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export default NotificationToast;
