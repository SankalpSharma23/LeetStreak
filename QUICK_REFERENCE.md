# LeetStreak Notification System - Quick Reference

## 🚀 Quick Start

### Enable Notifications
1. Click bell icon (🔔) in popup header
2. Notifications are **active by default**
3. Use "Mute Until Tomorrow" to temporarily disable

### How It Works
- Background sync every **30 minutes**
- Detects: friend solved today, milestones (7/30/100 days), your streak at risk
- Max **1 notification per friend per UTC day**
- Batched notifications sent after each sync

---

## 📁 File Structure

```
src/
├── shared/
│   ├── notification-manager.js    # Notification state & batching
│   ├── activity-detector.js       # Event detection logic
│   ├── storage.js                 # Chrome storage wrapper
│   └── streak-calculator.js       # UTC streak calculation
├── background/
│   └── service-worker.js          # Sync & notification dispatch
└── popup/
    ├── NotificationSettings.jsx   # Settings modal UI
    └── App.jsx                    # Main app with settings button
```

---

## 🔧 Key Functions

### Notification Manager (`src/shared/notification-manager.js`)

```javascript
// Get current notification state
const state = await getNotificationState();
// Returns: { mutedUntilUTC: "2024-01-16" | null, lastNotified: {...} }

// Mute notifications
await setNotificationMuted("2024-01-16"); // Until specific date
await setNotificationMuted(null);         // Unmute

// Check if muted
const muted = await isNotificationMuted(); // true/false

// Check daily limit
const canNotify = await shouldNotifyForFriend("username"); // true/false

// Mark as notified
await markFriendNotified("username");

// Send batch
await batchNotify([
  { username: "alice", type: "solved_today", message: "...", priority: 1 }
]);
```

### Activity Detector (`src/shared/activity-detector.js`)

```javascript
// Check if solved today (UTC)
const solved = detectSolvedToday(submissionCalendar);

// Check for new activity
const hasNew = hasNewActivity(currentData, previousData);

// Check milestone
const isMilestone = detectMilestone(streak); // 7, 30, 100 only

// Check if streak at risk
const atRisk = isStreakAtRisk(submissionCalendar, streak);

// Build message
const msg = buildNotificationMessage("alice", "milestone", { streak: 30 });
```

---

## 📊 Storage Structure

### Notification State
**Key:** `leetfriends_notifications`
```javascript
{
  mutedUntilUTC: "2024-01-16" | null,
  lastNotified: {
    "alice": "2024-01-15",
    "bob": "2024-01-14"
  }
}
```

### Friend Data
**Key:** `leetfriends_data`
```javascript
{
  friends: {
    "alice": {
      profile: { username, realName, avatar, ranking },
      stats: { streak, total, easy, medium, hard },
      submissionCalendar: { "1705276800": 5, ... },
      lastUpdated: 1705362000000
    }
  }
}
```

---

## 🎯 Event Types

| Event | Trigger | Priority | Example Message |
|-------|---------|----------|-----------------|
| **Solved Today** | New submission on current UTC date | 1 (low) | "alice solved today! 🎯" |
| **Milestone** | Streak reaches 7, 30, or 100 days | 2 (med) | "alice hit 30 day streak! 🔥" |
| **Streak At Risk** | Your streak about to break (no submission today/yesterday) | 3 (high) | "Your 15 day streak needs attention! ⚠️" |

---

## 🔄 Sync Flow

```
1. Alarm triggers (every 30 min)
   ↓
2. Check if notifications muted
   ↓
3. For each friend:
   - Fetch new data
   - Compare with old data
   - Detect events
   - Check shouldNotifyForFriend()
   - Add to events array
   - Wait 500ms
   ↓
4. Check current user's streak at risk
   ↓
5. batchNotify(events)
```

---

## 🧪 Testing Commands

### Force Sync
```javascript
chrome.runtime.sendMessage(
  { type: 'FETCH_STATS', forceRefresh: true },
  (response) => console.log(response)
);
```

### Get Notification State
```javascript
chrome.runtime.sendMessage(
  { type: 'GET_NOTIFICATION_STATE' },
  (response) => console.log(response.state)
);
```

### Mute Notifications
```javascript
chrome.runtime.sendMessage(
  { type: 'MUTE_NOTIFICATIONS', untilUTC: '2024-01-16' },
  (response) => console.log(response)
);
```

### Inspect Storage
```javascript
chrome.storage.local.get('leetfriends_notifications', (data) => {
  console.log('Notification State:', data.leetfriends_notifications);
});
```

---

## 🐛 Debugging

### Check Service Worker Logs
1. Open `chrome://extensions/`
2. Find LeetStreak extension
3. Click "service worker" link
4. Open DevTools console

### Common Log Messages
```
✅ "Background sync triggered"
✅ "Syncing X friends..."
✅ "Already notified username today"
✅ "Sync completed"
⚠️ "Notifications muted - skipping notification detection"
❌ "Error syncing username: ..."
```

### Verify Alarms
```javascript
chrome.alarms.getAll((alarms) => {
  console.log('Active alarms:', alarms);
  // Should show: { name: 'leetfriends_sync', periodInMinutes: 30 }
});
```

---

## ⚙️ Configuration

### Adjust Sync Interval
In `src/background/service-worker.js`:
```javascript
const SYNC_INTERVAL_MINUTES = 30; // Change this (min: 1)
```

### Adjust Rate Limiting
In `src/background/service-worker.js`:
```javascript
const REQUEST_DELAY_MS = 500; // Delay between API calls
```

### Add New Event Type
1. Add detection function in `activity-detector.js`
2. Add case in `buildNotificationMessage()`
3. Call detection in `service-worker.js` `detectEvents()`
4. Document in NOTIFICATION_SYSTEM.md

---

## 📋 Checklist for New Features

When adding notification-related features:
- [ ] Use UTC dates only (`.toISOString().split('T')[0]`)
- [ ] Check `isNotificationMuted()` before sending
- [ ] Enforce daily limits with `shouldNotifyForFriend()`
- [ ] Call `markFriendNotified()` after successful notification
- [ ] Add to batch, don't send immediately
- [ ] Handle errors gracefully (try-catch)
- [ ] Add console logs for debugging
- [ ] Update documentation
- [ ] Test across UTC midnight boundary

---

## 🎨 UI Components

### Notification Settings Modal
**File:** `src/popup/NotificationSettings.jsx`

**Features:**
- Shows current status (Active/Muted)
- Mute/Unmute buttons
- Notification rules info
- Recent notification history

**Access:** Click bell icon in popup header

### Integration in App
**File:** `src/popup/App.jsx`
```jsx
import NotificationSettings from './NotificationSettings';

const [showNotificationSettings, setShowNotificationSettings] = useState(false);

<NotificationSettings 
  isOpen={showNotificationSettings}
  onClose={() => setShowNotificationSettings(false)}
/>
```

---

## 🔐 Best Practices

### ✅ DO
- Always use UTC dates for comparisons
- Batch notifications (collect → send once)
- Check muted state before detecting events
- Enforce daily limits per friend
- Handle API errors gracefully
- Add console logs for debugging
- Validate data before processing

### ❌ DON'T
- Use local time for logic
- Send individual notifications
- Notify same friend twice in one UTC day
- Compare streaks between users
- Assume submissionCalendar exists
- Skip error handling
- Hardcode timezones

---

## 📈 Performance

| Metric | Value |
|--------|-------|
| Service worker size | 13.22 kB (gzip: 3.84 kB) |
| Sync duration (10 friends) | ~5 seconds |
| Memory usage | Minimal (service worker terminates) |
| Battery impact | Negligible (30 min intervals) |
| Storage usage | < 1 MB (for 50 friends) |

---

## 🆘 Common Issues

### Notifications Not Showing
1. Check if muted (open settings)
2. Verify Chrome notifications enabled
3. Check if already notified today (UTC)
4. Inspect service worker console
5. Ensure alarms are active

### Wrong Notification Time
1. All dates should be UTC
2. Verify `.toISOString().split('T')[0]` used everywhere
3. Check device timezone doesn't affect calculations

### Duplicate Notifications
- Should be impossible (daily limit enforced)
- If occurring, check `lastNotified` in storage
- Verify `shouldNotifyForFriend()` called before adding events

---

## 📞 Message Protocol

### UI → Service Worker

```javascript
// Get notification state
chrome.runtime.sendMessage({ type: 'GET_NOTIFICATION_STATE' }, (res) => {
  // res.state = { mutedUntilUTC, lastNotified }
});

// Mute notifications
chrome.runtime.sendMessage({ 
  type: 'MUTE_NOTIFICATIONS', 
  untilUTC: '2024-01-16' 
}, (res) => {
  // res.success = true/false
});
```

---

## 🎓 Learning Resources

- [Chrome Extension Manifest V3](https://developer.chrome.com/docs/extensions/mv3/)
- [Chrome Storage API](https://developer.chrome.com/docs/extensions/reference/storage/)
- [Chrome Alarms API](https://developer.chrome.com/docs/extensions/reference/alarms/)
- [Chrome Notifications API](https://developer.chrome.com/docs/extensions/reference/notifications/)
- [ISO 8601 Date Format](https://en.wikipedia.org/wiki/ISO_8601)

---

## 📝 Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2024 | Initial implementation |

---

**Need more help?** See [NOTIFICATION_SYSTEM.md](NOTIFICATION_SYSTEM.md) for detailed documentation.
