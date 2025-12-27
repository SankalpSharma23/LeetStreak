/**
 * Notification Manager - Handles batched notifications with daily limits
 * Strictly follows UTC-based notification rules
 */

const NOTIFICATION_STORAGE_KEY = 'leetfriends_notifications';

export async function getNotificationState() {
  try {
    const result = await chrome.storage.local.get(NOTIFICATION_STORAGE_KEY);
    return result[NOTIFICATION_STORAGE_KEY] || {
      mutedUntilUTC: null,
      lastNotified: {}
    };
  } catch (error) {
    console.error('Error getting notification state:', error);
    return { mutedUntilUTC: null, lastNotified: {} };
  }
}

export async function setNotificationMuted(untilUTC) {
  const state = await getNotificationState();
  state.mutedUntilUTC = untilUTC;
  await chrome.storage.local.set({ [NOTIFICATION_STORAGE_KEY]: state });
}

export async function isNotificationMuted() {
  const state = await getNotificationState();
  if (!state.mutedUntilUTC) return false;
  
  const todayUTC = new Date().toISOString().split('T')[0];
  return state.mutedUntilUTC >= todayUTC;
}

export async function shouldNotifyForFriend(username) {
  if (await isNotificationMuted()) return false;
  
  const state = await getNotificationState();
  const todayUTC = new Date().toISOString().split('T')[0];
  
  return state.lastNotified[username] !== todayUTC;
}

export async function markFriendNotified(username) {
  const state = await getNotificationState();
  const todayUTC = new Date().toISOString().split('T')[0];
  
  state.lastNotified[username] = todayUTC;
  await chrome.storage.local.set({ [NOTIFICATION_STORAGE_KEY]: state });
}

export async function batchNotify(events) {
  if (events.length === 0) {
    console.log('No events to notify');
    return;
  }
  if (await isNotificationMuted()) {
    console.log('Notifications are muted');
    return;
  }
  
  console.log('Processing', events.length, 'notification(s)');
  
  try {
    // Store notifications for popup to display
    const result = await chrome.storage.local.get('unread_notifications');
    const existingNotifications = result.unread_notifications || [];
    
    // Add timestamps and IDs to new notifications
    const timestamp = Date.now();
    const notificationsWithMeta = events.map((event, index) => ({
      ...event,
      id: `${timestamp}-${index}`,
      timestamp: timestamp
    }));
    
    // Add new notifications
    const updatedNotifications = [...existingNotifications, ...notificationsWithMeta];
    
    // Keep only notifications from last 24 hours and limit to 20
    const oneDayAgo = timestamp - (24 * 60 * 60 * 1000);
    const recentNotifications = updatedNotifications
      .filter(n => n.timestamp > oneDayAgo)
      .slice(-20);
    
    await chrome.storage.local.set({ unread_notifications: recentNotifications });
    
    console.log('✅ Notifications stored successfully for popup display');
    
    // Send individual browser notification for each new submission
    for (const event of events) {
      if (event.type === 'new_submission' || event.type === 'milestone') {
        await chrome.notifications.create({
          type: 'basic',
          iconUrl: chrome.runtime.getURL('icons/icon128.png'),
          title: event.type === 'new_submission' ? '🎯 LeetStreak - New Submission!' : '🔥 LeetStreak - Milestone!',
          message: event.message,
          priority: 2,
          requireInteraction: false
        });
        console.log('✅ Browser notification sent for:', event.username);
      }
    }
    
  } catch (error) {
    console.error('❌ Error sending notification:', error);
    console.error('Notification details:', { eventsCount: events.length });
  }
}
