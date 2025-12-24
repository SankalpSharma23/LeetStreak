import React, { useState, useEffect } from 'react';

function NotificationSettings({ isOpen, onClose }) {
  const [notificationState, setNotificationState] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  const [mutedUntil, setMutedUntil] = useState(null);

  useEffect(() => {
    if (isOpen) {
      loadNotificationState();
    }
  }, [isOpen]);

  const loadNotificationState = async () => {
    try {
      setLoading(true);
      const response = await chrome.runtime.sendMessage({ type: 'GET_NOTIFICATION_STATE' });
      if (response.success) {
        setNotificationState(response.state);
        const todayUTC = new Date().toISOString().split('T')[0];
        const muted = response.state.mutedUntilUTC && response.state.mutedUntilUTC > todayUTC;
        setIsMuted(muted);
        setMutedUntil(response.state.mutedUntilUTC);
      }
    } catch (error) {
      console.error('Error loading notification state:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleMuteUntilTomorrow = async () => {
    try {
      const tomorrow = new Date();
      tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
      const tomorrowUTC = tomorrow.toISOString().split('T')[0];

      const response = await chrome.runtime.sendMessage({
        type: 'MUTE_NOTIFICATIONS',
        untilUTC: tomorrowUTC
      });

      if (response.success) {
        setIsMuted(true);
        setMutedUntil(tomorrowUTC);
      }
    } catch (error) {
      console.error('Error muting notifications:', error);
    }
  };

  const handleUnmute = async () => {
    try {
      const response = await chrome.runtime.sendMessage({
        type: 'MUTE_NOTIFICATIONS',
        untilUTC: null
      });

      if (response.success) {
        setIsMuted(false);
        setMutedUntil(null);
      }
    } catch (error) {
      console.error('Error unmuting notifications:', error);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-surface border border-zinc-700 rounded-lg max-w-md w-full shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-zinc-700">
          <h2 className="text-lg font-semibold text-zinc-100">Notification Settings</h2>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-zinc-100 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="p-4 space-y-4">
          {loading ? (
            <div className="text-center text-zinc-400 py-8">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : (
            <>
              {/* Status */}
              <div className="bg-background rounded-lg p-4 border border-zinc-800">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-zinc-400">Status</span>
                  <span className={`text-sm font-medium ${isMuted ? 'text-orange-400' : 'text-green-400'}`}>
                    {isMuted ? '🔕 Muted' : '🔔 Active'}
                  </span>
                </div>
                {isMuted && mutedUntil && (
                  <p className="text-xs text-zinc-500 mt-2">
                    Muted until {mutedUntil} UTC
                  </p>
                )}
              </div>

              {/* Info */}
              <div className="text-sm text-zinc-400 space-y-2">
                <p>• Max 1 notification per friend per day (UTC)</p>
                <p>• Notifications for: solved today, milestones (7/30/100 days)</p>
                <p>• Batched notifications sent after sync</p>
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                {!isMuted ? (
                  <button
                    onClick={handleMuteUntilTomorrow}
                    className="flex-1 bg-orange-500/20 hover:bg-orange-500/30 text-orange-400 border border-orange-500/50 rounded-lg px-4 py-2 font-medium transition-colors"
                  >
                    Mute Until Tomorrow
                  </button>
                ) : (
                  <button
                    onClick={handleUnmute}
                    className="flex-1 bg-green-500/20 hover:bg-green-500/30 text-green-400 border border-green-500/50 rounded-lg px-4 py-2 font-medium transition-colors"
                  >
                    Unmute Notifications
                  </button>
                )}
              </div>

              {/* Notification History */}
              {notificationState?.lastNotified && Object.keys(notificationState.lastNotified).length > 0 && (
                <div className="border-t border-zinc-700 pt-4 mt-4">
                  <h3 className="text-sm font-medium text-zinc-300 mb-2">Recent Notifications</h3>
                  <div className="space-y-1 max-h-32 overflow-y-auto">
                    {Object.entries(notificationState.lastNotified).map(([username, date]) => (
                      <div key={username} className="flex justify-between text-xs">
                        <span className="text-zinc-400">{username}</span>
                        <span className="text-zinc-500">{date}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-zinc-700 bg-background/50">
          <button
            onClick={onClose}
            className="w-full bg-zinc-700 hover:bg-zinc-600 text-zinc-100 rounded-lg px-4 py-2 font-medium transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

export default NotificationSettings;
