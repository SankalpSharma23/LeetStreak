/**
 * Schedule Manager - Dynamic alarm intervals based on time of day
 * Active Hours: User configurable (default 7:00 PM to 4:00 AM) = 1.7 minutes (frequent checks)
 * Quiet Hours: Remaining hours = 30 minutes (battery saving)
 */

// Default interval configurations (in minutes)
export const DEFAULT_ACTIVE_INTERVAL = 1.7;  // Default for peak coding hours
export const DEFAULT_QUIET_INTERVAL = 30;    // Default for work/sleep hours

// Default time boundaries (24-hour format)
export const DEFAULT_ACTIVE_START_HOUR = 19;  // 7:00 PM
export const DEFAULT_ACTIVE_END_HOUR = 4;     // 4:00 AM

// Storage key for user preferences
const SCHEDULE_PREFS_KEY = 'schedule_preferences';

/**
 * Get schedule preferences from storage
 * @returns {Promise<Object>}
 */
export async function getSchedulePreferences() {
  try {
    const result = await chrome.storage.local.get(SCHEDULE_PREFS_KEY);
    return result[SCHEDULE_PREFS_KEY] || {
      activeInterval: DEFAULT_ACTIVE_INTERVAL,
      quietInterval: DEFAULT_QUIET_INTERVAL,
      activeStartHour: DEFAULT_ACTIVE_START_HOUR,
      activeEndHour: DEFAULT_ACTIVE_END_HOUR
    };
  } catch (error) {
    console.error('Error loading schedule preferences:', error);
    return {
      activeInterval: DEFAULT_ACTIVE_INTERVAL,
      quietInterval: DEFAULT_QUIET_INTERVAL,
      activeStartHour: DEFAULT_ACTIVE_START_HOUR,
      activeEndHour: DEFAULT_ACTIVE_END_HOUR
    };
  }
}

/**
 * Save schedule preferences to storage
 * @param {Object} preferences
 */
export async function saveSchedulePreferences(preferences) {
  try {
    await chrome.storage.local.set({ [SCHEDULE_PREFS_KEY]: preferences });
    return { success: true };
  } catch (error) {
    console.error('Error saving schedule preferences:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Check if current time is during active hours
 * @param {Object} prefs - Schedule preferences (optional, will load if not provided)
 * @returns {Promise<boolean>}
 */
export async function isActiveHours(prefs = null) {
  if (!prefs) {
    prefs = await getSchedulePreferences();
  }
  
  const now = new Date();
  const currentHour = now.getHours();
  const { activeStartHour, activeEndHour } = prefs;
  
  // Active hours span midnight: 19:00-23:59 and 00:00-04:00
  if (activeStartHour > activeEndHour) {
    // Wraps around midnight
    return currentHour >= activeStartHour || currentHour < activeEndHour;
  } else {
    // Normal range (doesn't wrap)
    return currentHour >= activeStartHour && currentHour < activeEndHour;
  }
}

/**
 * Get appropriate sync interval for current time
 * @returns {Promise<number>} Interval in minutes
 */
export async function getCurrentInterval() {
  const prefs = await getSchedulePreferences();
  const active = await isActiveHours(prefs);
  return active ? prefs.activeInterval : prefs.quietInterval;
}

/**
 * Get minutes until next schedule transition
 * Used to reschedule alarm when switching between active/quiet periods
 * @returns {Promise<number>} Minutes until next transition
 */
export async function getMinutesUntilTransition() {
  const prefs = await getSchedulePreferences();
  const now = new Date();
  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();
  
  let targetHour;
  
  if (await isActiveHours(prefs)) {
    // Currently active, transition to quiet at activeEndHour
    targetHour = prefs.activeEndHour;
  } else {
    // Currently quiet, transition to active at activeStartHour
    targetHour = prefs.activeStartHour;
  }
  
  // Calculate minutes until target hour
  let hoursUntil = targetHour - currentHour;
  
  // Handle day wrap-around
  if (hoursUntil < 0) {
    hoursUntil += 24;
  }
  if (hoursUntil === 0 && currentMinute > 0) {
    hoursUntil = 24;
  }
  
  const minutesUntil = (hoursUntil * 60) - currentMinute;
  
  return minutesUntil;
}

/**
 * Get human-readable description of current schedule
 * @returns {Promise<string>}
 */
export async function getScheduleDescription() {
  const prefs = await getSchedulePreferences();
  const interval = await getCurrentInterval();
  const active = await isActiveHours(prefs);
  
  const startTime = formatHour(prefs.activeStartHour);
  const endTime = formatHour(prefs.activeEndHour);
  
  if (active) {
    return `Active Mode: Checking every ${interval} minutes (${startTime} - ${endTime})`;
  } else {
    return `Quiet Mode: Checking every ${interval} minutes`;
  }
}

/**
 * Calculate next alarm time
 * @returns {Promise<Object>} { intervalMinutes, description }
 */
export async function getNextAlarmConfig() {
  const interval = await getCurrentInterval();
  const minutesUntilTransition = await getMinutesUntilTransition();
  
  // If transition happens before next regular sync, schedule transition check instead
  const actualInterval = Math.min(interval, minutesUntilTransition);
  
  return {
    intervalMinutes: actualInterval,
    description: await getScheduleDescription(),
    isTransitionCheck: actualInterval === minutesUntilTransition && actualInterval < interval
  };
}

/**
 * Format time for display
 * @param {number} hour - Hour in 24-hour format
 * @returns {string}
 */
export function formatHour(hour) {
  if (hour === 0) return '12:00 AM';
  if (hour < 12) return `${hour}:00 AM`;
  if (hour === 12) return '12:00 PM';
  return `${hour - 12}:00 PM`;
}

/**
 * Get schedule info for settings UI
 * @returns {Promise<Object>}
 */
export async function getScheduleInfo() {
  const prefs = await getSchedulePreferences();
  const active = await isActiveHours(prefs);
  const currentInterval = await getCurrentInterval();
  const nextTransition = await getMinutesUntilTransition();
  
  return {
    activeInterval: prefs.activeInterval,
    quietInterval: prefs.quietInterval,
    activeStartHour: prefs.activeStartHour,
    activeEndHour: prefs.activeEndHour,
    activeStart: formatHour(prefs.activeStartHour),
    activeEnd: formatHour(prefs.activeEndHour),
    currentMode: active ? 'active' : 'quiet',
    currentInterval: currentInterval,
    nextTransition: nextTransition
  };
}

/**
 * Validate schedule preferences
 * @param {Object} prefs
 * @returns {Object} { valid: boolean, errors: string[] }
 */
export function validateSchedulePreferences(prefs) {
  const errors = [];
  
  // Validate intervals
  if (prefs.activeInterval < 1 || prefs.activeInterval > 30) {
    errors.push('Active interval must be between 1 and 30 minutes');
  }
  if (prefs.quietInterval < 5 || prefs.quietInterval > 60) {
    errors.push('Quiet interval must be between 5 and 60 minutes');
  }
  
  // Validate hours
  if (prefs.activeStartHour < 0 || prefs.activeStartHour > 23) {
    errors.push('Active start hour must be between 0 and 23');
  }
  if (prefs.activeEndHour < 0 || prefs.activeEndHour > 23) {
    errors.push('Active end hour must be between 0 and 23');
  }
  
  // Warn if active hours are too short (less than 2 hours)
  let duration = prefs.activeEndHour - prefs.activeStartHour;
  if (duration < 0) duration += 24;
  if (duration < 2) {
    errors.push('Active hours should be at least 2 hours long');
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}
