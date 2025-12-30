import React, { useState, useEffect } from 'react';
import { 
  getScheduleInfo, 
  saveSchedulePreferences, 
  validateSchedulePreferences 
} from '../shared/schedule-manager';

function NotificationSettings({ isOpen, onClose }) {
  const [notificationState, setNotificationState] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  const [mutedUntil, setMutedUntil] = useState(null);
  const [scheduleInfo, setScheduleInfo] = useState(null);
  const [editingSchedule, setEditingSchedule] = useState(false);
  const [scheduleForm, setScheduleForm] = useState({
    activeStartHour: 19,
    activeEndHour: 4
  });
  const [scheduleError, setScheduleError] = useState('');

  useEffect(() => {
    if (isOpen) {
      loadNotificationState();
      loadScheduleInfo();
    }
  }, [isOpen]);

  const loadScheduleInfo = async () => {
    const info = await getScheduleInfo();
    setScheduleInfo(info);
    setScheduleForm({
      activeStartHour: info.activeStartHour,
      activeEndHour: info.activeEndHour
    });
  };

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

  const handleSaveSchedule = async () => {
    setScheduleError('');
    
    // Merge with current intervals (keep them unchanged)
    const fullPrefs = {
      activeInterval: scheduleInfo.activeInterval,
      quietInterval: scheduleInfo.quietInterval,
      activeStartHour: scheduleForm.activeStartHour,
      activeEndHour: scheduleForm.activeEndHour
    };
    
    // Validate
    const validation = validateSchedulePreferences(fullPrefs);
    if (!validation.valid) {
      setScheduleError(validation.errors.join('. '));
      return;
    }
    
    // Save
    const result = await saveSchedulePreferences(fullPrefs);
    if (result.success) {
      // Reload schedule info
      await loadScheduleInfo();
      setEditingSchedule(false);
      
      // Trigger alarm reschedule
      await chrome.runtime.sendMessage({ type: 'RESCHEDULE_ALARMS' });
    } else {
      setScheduleError('Failed to save preferences');
    }
  };

  const handleCancelEdit = () => {
    // Reset form to current values
    setScheduleForm({
      activeStartHour: scheduleInfo.activeStartHour,
      activeEndHour: scheduleInfo.activeEndHour
    });
    setScheduleError('');
    setEditingSchedule(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-surface border border-zinc-700 rounded-lg max-w-md w-full shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-zinc-700 flex-shrink-0">
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
        <div className="p-4 space-y-4 overflow-y-auto flex-1 modal-scroll">
          {loading ? (
            <div className="text-center text-zinc-400 py-8">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : (
            <>
              {/* Schedule Info */}
              {scheduleInfo && (
                <div className="bg-gradient-to-r from-primary/10 to-accent/10 rounded-lg p-4 border border-primary/20">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">⏰</span>
                      <h3 className="text-sm font-semibold text-zinc-100">Sync Schedule</h3>
                    </div>
                    {!editingSchedule && (
                      <button
                        onClick={() => setEditingSchedule(true)}
                        className="text-xs px-2 py-1 bg-primary/20 hover:bg-primary/30 text-primary rounded transition-colors"
                      >
                        Edit
                      </button>
                    )}
                  </div>
                  
                  {editingSchedule ? (
                    <div className="space-y-5">
                      <div className="text-center">
                        <p className="text-sm text-zinc-300 font-medium mb-1">
                          Set Your Active Coding Hours
                        </p>
                        <p className="text-xs text-zinc-500">
                          Frequent checks every 1.7 minutes during these hours
                        </p>
                      </div>
                      
                      {/* Visual Time Bar */}
                      <div className="relative h-16 bg-background rounded-xl border border-zinc-700 overflow-hidden">
                        {/* Hour markers */}
                        <div className="absolute inset-0 flex">
                          {[...Array(24)].map((_, i) => (
                            <div key={i} className="flex-1 border-r border-zinc-800 last:border-r-0" />
                          ))}
                        </div>
                        
                        {/* Active range highlight */}
                        <div 
                          className="absolute top-0 bottom-0 bg-gradient-to-r from-primary/40 via-accent/40 to-primary/40 transition-all duration-500 ease-out"
                          style={{
                            left: `${(scheduleForm.activeStartHour / 24) * 100}%`,
                            right: scheduleForm.activeStartHour > scheduleForm.activeEndHour 
                              ? `${((24 - scheduleForm.activeEndHour) / 24) * 100}%`
                              : `${((24 - scheduleForm.activeEndHour) / 24) * 100}%`,
                            width: scheduleForm.activeStartHour > scheduleForm.activeEndHour
                              ? `${((24 - scheduleForm.activeStartHour + scheduleForm.activeEndHour) / 24) * 100}%`
                              : `${((scheduleForm.activeEndHour - scheduleForm.activeStartHour) / 24) * 100}%`
                          }}
                        />
                        
                        {/* Start marker */}
                        <div 
                          className="absolute top-0 bottom-0 w-1 bg-primary transition-all duration-300 shadow-lg shadow-primary/50"
                          style={{ left: `${(scheduleForm.activeStartHour / 24) * 100}%` }}
                        >
                          <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-3 h-3 bg-primary rounded-full animate-pulse shadow-lg shadow-primary/50" />
                          <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-3 h-3 bg-primary rounded-full animate-pulse shadow-lg shadow-primary/50" />
                        </div>
                        
                        {/* End marker */}
                        <div 
                          className="absolute top-0 bottom-0 w-1 bg-accent transition-all duration-300 shadow-lg shadow-accent/50"
                          style={{ left: `${(scheduleForm.activeEndHour / 24) * 100}%` }}
                        >
                          <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-3 h-3 bg-accent rounded-full animate-pulse shadow-lg shadow-accent/50" />
                          <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-3 h-3 bg-accent rounded-full animate-pulse shadow-lg shadow-accent/50" />
                        </div>
                        
                        {/* Hour labels */}
                        <div className="absolute inset-0 flex items-center justify-between px-2 pointer-events-none">
                          <span className="text-[10px] text-zinc-600 font-medium">12AM</span>
                          <span className="text-[10px] text-zinc-600 font-medium">6AM</span>
                          <span className="text-[10px] text-zinc-600 font-medium">12PM</span>
                          <span className="text-[10px] text-zinc-600 font-medium">6PM</span>
                          <span className="text-[10px] text-zinc-600 font-medium">11PM</span>
                        </div>
                      </div>
                      
                      {/* Range Sliders */}
                      <div className="space-y-4">
                        {/* Start Hour Slider */}
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <label className="text-xs text-zinc-400 font-medium">
                              🟠 Start Hour
                            </label>
                            <span className="text-sm text-primary font-bold">
                              {scheduleForm.activeStartHour === 0 ? '12:00 AM' : 
                               scheduleForm.activeStartHour < 12 ? `${scheduleForm.activeStartHour}:00 AM` : 
                               scheduleForm.activeStartHour === 12 ? '12:00 PM' : 
                               `${scheduleForm.activeStartHour-12}:00 PM`}
                            </span>
                          </div>
                          <input
                            type="range"
                            min="0"
                            max="23"
                            value={scheduleForm.activeStartHour}
                            onChange={(e) => setScheduleForm({...scheduleForm, activeStartHour: parseInt(e.target.value)})}
                            className="w-full h-2 bg-zinc-800 rounded-lg appearance-none cursor-pointer slider-primary"
                          />
                        </div>
                        
                        {/* End Hour Slider */}
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <label className="text-xs text-zinc-400 font-medium">
                              🟣 End Hour
                            </label>
                            <span className="text-sm text-accent font-bold">
                              {scheduleForm.activeEndHour === 0 ? '12:00 AM' : 
                               scheduleForm.activeEndHour < 12 ? `${scheduleForm.activeEndHour}:00 AM` : 
                               scheduleForm.activeEndHour === 12 ? '12:00 PM' : 
                               `${scheduleForm.activeEndHour-12}:00 PM`}
                            </span>
                          </div>
                          <input
                            type="range"
                            min="0"
                            max="23"
                            value={scheduleForm.activeEndHour}
                            onChange={(e) => setScheduleForm({...scheduleForm, activeEndHour: parseInt(e.target.value)})}
                            className="w-full h-2 bg-zinc-800 rounded-lg appearance-none cursor-pointer slider-accent"
                          />
                        </div>
                      </div>
                      
                      {/* Duration Info */}
                      <div className="bg-gradient-to-r from-primary/10 to-accent/10 rounded-lg p-3 border border-primary/20">
                        <div className="flex items-center justify-center gap-2 text-xs text-zinc-300">
                          <span className="text-primary font-bold">⚡</span>
                          <span>
                            Active for {
                              scheduleForm.activeStartHour > scheduleForm.activeEndHour
                                ? 24 - scheduleForm.activeStartHour + scheduleForm.activeEndHour
                                : scheduleForm.activeEndHour - scheduleForm.activeStartHour
                            } hours
                          </span>
                          <span className="text-zinc-500">|</span>
                          <span>Quiet for {
                            scheduleForm.activeStartHour > scheduleForm.activeEndHour
                                ? scheduleForm.activeStartHour - scheduleForm.activeEndHour
                                : 24 - (scheduleForm.activeEndHour - scheduleForm.activeStartHour)
                            } hours</span>
                        </div>
                      </div>
                      
                      {scheduleError && (
                        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 animate-shake">
                          <p className="text-xs text-red-400 text-center">{scheduleError}</p>
                        </div>
                      )}
                      
                      <div className="flex gap-3 pt-2">
                        <button
                          onClick={handleSaveSchedule}
                          className="flex-1 px-4 py-3 bg-gradient-to-r from-primary to-primaryHover text-white rounded-xl text-sm font-bold transition-all duration-200 hover:shadow-xl hover:shadow-primary/30 hover:-translate-y-0.5 active:translate-y-0"
                        >
                          💾 Save Schedule
                        </button>
                        <button
                          onClick={handleCancelEdit}
                          className="px-4 py-3 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-xl text-sm font-medium transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="text-zinc-400">Current Mode:</span>
                        <span className={`font-semibold px-2 py-0.5 rounded-full ${
                          scheduleInfo.currentMode === 'active' 
                            ? 'bg-green-500/20 text-green-400' 
                            : 'bg-blue-500/20 text-blue-400'
                        }`}>
                          {scheduleInfo.currentMode === 'active' ? '🔥 Active' : '💤 Quiet'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-zinc-400">Check Interval:</span>
                        <span className="text-zinc-200 font-medium">
                          Every {scheduleInfo.currentInterval.toFixed(1)} min
                        </span>
                      </div>
                      <div className="border-t border-zinc-700/50 pt-2 mt-2 space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-zinc-500">Active Hours:</span>
                          <span className="text-zinc-400">
                            {scheduleInfo.activeStart} - {scheduleInfo.activeEnd}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-zinc-500">Active Interval:</span>
                          <span className="text-zinc-400">{scheduleInfo.activeInterval} min</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-zinc-500">Quiet Interval:</span>
                          <span className="text-zinc-400">{scheduleInfo.quietInterval} min</span>
                        </div>
                      </div>
                      {scheduleInfo.nextTransition && (
                        <div className="border-t border-zinc-700/50 pt-2 mt-2">
                          <span className="text-zinc-500">
                            Next mode switch in {Math.round(scheduleInfo.nextTransition)} min
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Status */}
              <div className="bg-gradient-to-br from-background to-zinc-900 rounded-xl p-4 border border-zinc-800 shadow-lg">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className={`relative p-3 rounded-xl ${isMuted ? 'bg-orange-500/10' : 'bg-green-500/10'}`}>
                      <span className="text-2xl">
                        {isMuted ? '🔕' : '🔔'}
                      </span>
                      {!isMuted && (
                        <span className="absolute top-0 right-0 w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                      )}
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-zinc-100">Notification Status</h3>
                      <p className={`text-xs font-medium ${isMuted ? 'text-orange-400' : 'text-green-400'}`}>
                        {isMuted ? 'Muted' : 'Active & Monitoring'}
                      </p>
                    </div>
                  </div>
                  {!isMuted ? (
                    <button
                      onClick={handleMuteUntilTomorrow}
                      className="px-3 py-2 bg-orange-500/20 hover:bg-orange-500/30 text-orange-400 border border-orange-500/30 rounded-lg text-xs font-medium transition-all duration-200 hover:-translate-y-0.5"
                    >
                      Mute 24h
                    </button>
                  ) : (
                    <button
                      onClick={handleUnmute}
                      className="px-3 py-2 bg-green-500/20 hover:bg-green-500/30 text-green-400 border border-green-500/30 rounded-lg text-xs font-medium transition-all duration-200 hover:-translate-y-0.5"
                    >
                      Unmute
                    </button>
                  )}
                </div>
                
                {isMuted && mutedUntil && (
                  <div className="bg-orange-500/10 border border-orange-500/20 rounded-lg p-2 mt-2">
                    <p className="text-xs text-orange-300 text-center">
                      ⏸️ Muted until <span className="font-bold">{mutedUntil}</span> UTC
                    </p>
                  </div>
                )}
              </div>

              {/* Features Info */}
              <div className="bg-gradient-to-br from-primary/5 to-accent/5 rounded-xl p-4 border border-primary/20">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-lg">✨</span>
                  <h3 className="text-sm font-semibold text-zinc-100">Notification Features</h3>
                </div>
                <div className="space-y-2">
                  <div className="flex items-start gap-2">
                    <span className="text-primary mt-0.5">🎯</span>
                    <p className="text-xs text-zinc-400">
                      <span className="text-zinc-300 font-medium">Friend Activity:</span> Get notified when friends solve problems
                    </p>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-secondary mt-0.5">🔥</span>
                    <p className="text-xs text-zinc-400">
                      <span className="text-zinc-300 font-medium">Milestones:</span> Celebrate 7, 30, and 100 day streaks
                    </p>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-accent mt-0.5">⚡</span>
                    <p className="text-xs text-zinc-400">
                      <span className="text-zinc-300 font-medium">Smart Batching:</span> Max 1 notification per friend per day
                    </p>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-orange-500 mt-0.5">📊</span>
                    <p className="text-xs text-zinc-400">
                      <span className="text-zinc-300 font-medium">Gap Analysis:</span> See ranking changes and progress updates
                    </p>
                  </div>
                </div>
              </div>

              {/* Notification History */}
              {notificationState?.lastNotified && Object.keys(notificationState.lastNotified).length > 0 && (
                <div className="bg-gradient-to-br from-background to-zinc-900 rounded-xl p-4 border border-zinc-800">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-lg">📜</span>
                    <h3 className="text-sm font-semibold text-zinc-100">Recent Notifications</h3>
                    <span className="ml-auto text-xs text-zinc-500 bg-zinc-800 px-2 py-0.5 rounded-full">
                      {Object.keys(notificationState.lastNotified).length}
                    </span>
                  </div>
                  <div className="notification-scroll" style={{ maxHeight: '160px', overflowY: 'auto' }}>
                    <div className="space-y-2">
                      {Object.entries(notificationState.lastNotified).map(([username, date]) => (
                        <div key={username} className="flex items-center justify-between p-2 bg-background/50 rounded-lg hover:bg-background transition-colors">
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 bg-primary rounded-full"></div>
                            <span className="text-xs text-zinc-300 font-medium">{username}</span>
                          </div>
                          <span className="text-xs text-zinc-500">{date}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default NotificationSettings;
