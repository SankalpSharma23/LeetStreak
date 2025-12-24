# LeetStreak Notification System Documentation

## Overview
The LeetStreak notification system provides real-time alerts for friend activity and personal streak tracking. All logic uses UTC dates for consistency across timezones.

## Architecture

### Core Components

1. **notification-manager.js** - Manages notification state, muting, and batching
2. **activity-detector.js** - Detects significant events from user data
3. **service-worker.js** - Coordinates sync and notification dispatch
4. **NotificationSettings.jsx** - UI for user notification preferences

### Data Flow

```
Background Sync (every 30 min)
    ↓
Fetch friend data (sequential with 500ms delays)
    ↓
Detect events (solved today, milestones, streak at risk)
    ↓
Check notification rules (muted?, already notified today?)
    ↓
Batch notifications
    ↓
Send to Chrome notifications API
```

## Notification Rules

### Daily Limits (UTC-based)
- Maximum **1 notification per friend per UTC day**
- Resets at UTC midnight (00:00 UTC)
- Tracked in storage: `lastNotified: { username: "YYYY-MM-DD" }`

### Muting
- Users can mute notifications until a specific UTC date
- Stored as: `mutedUntilUTC: "YYYY-MM-DD"` or `null`
- UI provides "Mute Until Tomorrow" button
- No notifications sent while `mutedUntilUTC > todayUTC`

## Event Types

### 1. Friend Solved Today
- **Trigger**: Friend's `submissionCalendar` shows activity on current UTC date
- **Detection**: Compares current data with previous sync
- **Priority**: 1 (lowest)
- **Message**: `"{username} solved today! 🎯"`

### 2. Milestone Reached
- **Trigger**: Friend's streak reaches 7, 30, or 100 days
- **Detection**: Checks if `streak % 7 === 0 || streak === 30 || streak === 100`
- **Requirement**: Streak must have increased since last sync
- **Priority**: 2 (medium)
- **Message**: `"{username} hit {streak} day streak! 🔥"`

### 3. Streak At Risk
- **Trigger**: User's own streak is about to break
- **Detection**: 
  - Streak > 0
  - No submission today (UTC)
  - No submission yesterday (UTC)
- **Priority**: 3 (highest)
- **Message**: `"Your {streak} day streak needs attention! ⚠️"`

## Storage Structure

### Notification State
```javascript
{
  mutedUntilUTC: "YYYY-MM-DD" | null,
  lastNotified: {
    "username1": "2024-01-15",
    "username2": "2024-01-14"
  }
}
```

Stored at: `chrome.storage.local` with key `leetfriends_notifications`

### Friend Data
```javascript
{
  friends: {
    "username": {
      profile: {...},
      stats: { streak: 15, total: 450, easy: 150, medium: 250, hard: 50 },
      submissionCalendar: { "1705276800": 5, ... },
      lastUpdated: 1705362000000
    }
  }
}
```

## API Functions

### notification-manager.js

#### `getNotificationState()`
Returns current notification state from storage.
```javascript
const state = await getNotificationState();
// { mutedUntilUTC: "2024-01-16", lastNotified: {...} }
```

#### `setNotificationMuted(untilUTC)`
Mutes notifications until specified UTC date. Pass `null` to unmute.
```javascript
await setNotificationMuted("2024-01-16"); // Mute until tomorrow
await setNotificationMuted(null);         // Unmute
```

#### `isNotificationMuted()`
Checks if notifications are currently muted.
```javascript
const muted = await isNotificationMuted(); // true/false
```

#### `shouldNotifyForFriend(username)`
Checks if friend can be notified today (max 1/day rule).
```javascript
const canNotify = await shouldNotifyForFriend("user123"); // true/false
```

#### `markFriendNotified(username)`
Records that friend was notified today.
```javascript
await markFriendNotified("user123");
// Sets lastNotified.user123 = todayUTC
```

#### `batchNotify(events)`
Sends multiple notifications as a batch.
```javascript
await batchNotify([
  { username: "alice", type: "solved_today", message: "...", priority: 1 },
  { username: "bob", type: "milestone", message: "...", priority: 2 }
]);
```

### activity-detector.js

#### `detectSolvedToday(submissionCalendar)`
Checks if user solved any problem today (UTC).
```javascript
const solved = detectSolvedToday(calendar); // true/false
```

#### `hasNewActivity(currentData, previousData)`
Detects if user has new activity since last sync.
```javascript
const newActivity = hasNewActivity(newData, oldData); // true/false
```

#### `detectMilestone(streak)`
Checks if streak is a notable milestone (7, 30, 100).
```javascript
const isMilestone = detectMilestone(30); // true
```

#### `isStreakAtRisk(submissionCalendar, streak)`
Checks if user's streak is about to break.
```javascript
const atRisk = isStreakAtRisk(calendar, 15); // true/false
```

#### `buildNotificationMessage(username, eventType, data)`
Generates notification message for event type.
```javascript
const msg = buildNotificationMessage("alice", "milestone", { streak: 30 });
// "alice hit 30 day streak! 🔥"
```

## Message Protocol

### From UI to Service Worker

#### Get Notification State
```javascript
chrome.runtime.sendMessage(
  { type: 'GET_NOTIFICATION_STATE' },
  (response) => {
    // response.state = { mutedUntilUTC, lastNotified }
  }
);
```

#### Mute Notifications
```javascript
chrome.runtime.sendMessage(
  { type: 'MUTE_NOTIFICATIONS', untilUTC: '2024-01-16' },
  (response) => {
    // response.success = true/false
  }
);
```

## UI Components

### NotificationSettings Modal
- Shows current mute status
- "Mute Until Tomorrow" button
- "Unmute Notifications" button
- Display recent notification history
- Info about notification rules

### Access
Click the bell icon (🔔) in the top-right of the popup header.

## Sync Behavior

### Timing
- Background sync every **30 minutes** via Chrome alarms
- Manual refresh available in UI
- On extension install/update

### Process
1. Iterate through all friends sequentially
2. Wait 500ms between API requests (rate limiting)
3. For each friend:
   - Fetch new data from LeetCode API
   - Compare with previous data
   - Detect events
   - Check notification rules
   - Add eligible events to batch
4. Send batched notifications at end
5. Check current user's streak at risk

### Idempotency
- Each sync is independent
- Uses UTC dates for all comparisons
- State persists in chrome.storage.local
- No duplicate notifications (max 1/day per friend)

## Testing Scenarios

### Test 1: Friend Solves Today
1. Add friend who hasn't solved today
2. Wait for friend to submit a solution
3. Trigger sync (refresh or wait 30 min)
4. Should receive notification: "{username} solved today! 🎯"

### Test 2: Milestone Reached
1. Add friend with 6-day streak
2. Wait for friend to solve and reach 7-day streak
3. Trigger sync
4. Should receive notification: "{username} hit 7 day streak! 🔥"

### Test 3: Daily Limit
1. Receive notification for friend A
2. Friend A submits another solution same UTC day
3. Trigger sync
4. Should NOT receive second notification

### Test 4: Muting
1. Open notification settings
2. Click "Mute Until Tomorrow"
3. Trigger sync with eligible events
4. Should NOT receive any notifications
5. Wait until next UTC day, unmute
6. Should receive notifications again

### Test 5: Streak At Risk
1. Build a streak of 5+ days
2. Don't submit today or yesterday (UTC)
3. Add your own username as friend
4. Trigger sync
5. Should receive: "Your {streak} day streak needs attention! ⚠️"

## Debugging

### Enable Console Logs
1. Open Chrome DevTools
2. Go to Service Worker section
3. Check "Preserve log"
4. Logs show:
   - Sync start/completion
   - Each friend processed
   - Events detected
   - Notifications sent
   - Errors encountered

### Inspect Storage
```javascript
chrome.storage.local.get(null, (data) => {
  console.log('All storage:', data);
  console.log('Notification state:', data.leetfriends_notifications);
});
```

### Force Sync
```javascript
chrome.runtime.sendMessage(
  { type: 'FETCH_STATS', forceRefresh: true },
  (response) => console.log('Sync result:', response)
);
```

## Best Practices

1. **Always use UTC dates** - Never use local time for comparisons
2. **Check muted state** - Before sending any notification
3. **Enforce daily limits** - Use `shouldNotifyForFriend()` before adding events
4. **Batch notifications** - Collect all events, send once at end
5. **Handle errors gracefully** - Continue processing other friends if one fails
6. **Rate limit API** - 500ms delay between LeetCode requests
7. **Validate data** - Check submissionCalendar exists before processing

## Future Enhancements

- Custom notification schedules (morning/evening only)
- Notification sound preferences
- Friend-specific notification settings
- Weekly summary notifications
- Contest participation alerts
- Streak recovery reminders (multiple days)

## Troubleshooting

### Notifications Not Appearing
1. Check if notifications are muted (see settings)
2. Verify Chrome notifications are enabled for extension
3. Check if friend was already notified today (UTC)
4. Inspect service worker logs for errors
5. Ensure sync is running (check chrome.alarms)

### Wrong Notification Timing
1. Verify device timezone doesn't affect UTC calculations
2. Check submissionCalendar timestamp conversion
3. Ensure all date comparisons use ISO 8601 format (YYYY-MM-DD)

### Duplicate Notifications
1. Should be impossible due to daily limit
2. If occurring, check lastNotified storage state
3. Verify UTC date calculation is consistent

## Performance Considerations

- **Storage**: Chrome storage.local is unlimited for extensions
- **API Calls**: Sequential with delays, total sync ~5 seconds for 10 friends
- **Notifications**: Batched, sent once per sync
- **Memory**: Service worker may terminate between syncs (expected behavior)
- **Battery**: Minimal impact, only runs every 30 minutes
