# 🚀 Quick Start Guide - LeetFriends

## ✅ Build Successful!

Your LeetFriends extension has been built successfully in the `dist/` folder.

## 📋 Next Steps

### 1. Load Extension in Chrome

1. Open Google Chrome
2. Navigate to `chrome://extensions/`
3. Enable **"Developer mode"** (toggle in top-right corner)
4. Click **"Load unpacked"**
5. Select the `L:\Projects\LeetStreak\dist` folder
6. ✓ Extension loaded!

### 2. Pin the Extension

1. Click the puzzle piece icon in Chrome toolbar (Extensions)
2. Find "LeetFriends" in the list
3. Click the pin icon to keep it visible

### 3. Add Your First Friend

1. Click the LeetFriends icon in your toolbar
2. Enter a LeetCode username (e.g., `errichto`, `awice`, or your own)
3. Click "+ Add"
4. Wait a few seconds for data to load

### 4. Explore Features

**Popup:**
- View leaderboard sorted by streak
- Click any friend card to see detailed stats
- Click "⟳" button to manually refresh data
- Click "⚙️ Manage Friends" to open settings

**Options Page:**
- Right-click extension icon → "Options"
- Or click "Manage Friends" in popup
- Add/remove friends
- View storage usage

## 🔍 Testing

### Test with Real Users

Try adding these active LeetCode users:
- `errichto` - Competitive programmer
- `awice` - LeetCode contest winner
- `Bakerston` - High-ranked user

### Debugging

If something doesn't work:

1. **Check Console Logs**
   - Right-click extension → "Inspect Popup"
   - Go to `chrome://extensions/` → Click "Errors"
   
2. **Verify Background Service Worker**
   - Go to `chrome://extensions/`
   - Click "Service Worker" under LeetFriends
   - Check console for errors

3. **Check Storage**
   - In popup console, run:
   ```javascript
   chrome.storage.local.get('leetfriends_data', console.log)
   ```

## 🛠️ Development Workflow

### Making Changes

1. **Edit Code**
   ```bash
   # Edit files in src/
   code src/popup/App.jsx
   ```

2. **Rebuild**
   ```bash
   npm run build
   ```

3. **Reload Extension**
   - Go to `chrome://extensions/`
   - Click reload icon (↻) under LeetFriends
   - Or use keyboard shortcut: `Ctrl+R` when on extensions page

### Watch Mode (Auto-rebuild)

```bash
npm run build:watch
```
This rebuilds automatically when you save files. You still need to manually reload the extension in Chrome.

## 📝 Customization Ideas

### Change Colors
Edit `tailwind.config.js`:
```javascript
colors: {
  leetcode: {
    easy: '#00B8A3',    // Change these!
    medium: '#FFC01E',
    hard: '#FF375F'
  }
}
```

### Add New Stats
Edit `src/shared/streak-calculator.js` to calculate new metrics.

### Modify Sync Interval
In `src/background/service-worker.js`:
```javascript
const SYNC_INTERVAL_MINUTES = 30; // Change to 15, 60, etc.
```

## 🎨 Adding Icons

You need to create 3 icon files:
- `public/icons/icon16.png` - 16x16px
- `public/icons/icon48.png` - 48x48px  
- `public/icons/icon128.png` - 128x128px

Quick options:
1. Use [favicon.io/emoji-favicons](https://favicon.io/emoji-favicons/) with 🏆 or 🔥
2. Design in [Canva](https://www.canva.com/)
3. Use [Figma](https://www.figma.com/)

## ⚠️ Important Notes

### API Rate Limits
- LeetCode may rate-limit requests if you have too many friends
- Extension uses 500ms delays between requests
- Data refreshes every 30 minutes automatically

### Private Profiles
- Cannot fetch data from private LeetCode profiles
- User will get "User not found or profile is private" error

### Browser Notifications
- First notification may ask for permission
- Click "Allow" to receive streak updates

## 🐛 Common Issues

### "User not found"
- Check spelling of username
- Verify profile is public on LeetCode
- Try accessing `leetcode.com/[username]` in browser

### Extension Won't Load
- Make sure you selected the `dist` folder, not `src`
- Rebuild with `npm run build`
- Check Chrome console for errors

### Data Not Updating
- Click refresh button (⟳) in popup
- Check background service worker console
- Verify internet connection

### Styling Looks Wrong
- Rebuild with `npm run build`
- Hard refresh popup (Ctrl+Shift+R)
- Clear browser cache

## 📚 Resources

- [Chrome Extension Docs](https://developer.chrome.com/docs/extensions/)
- [LeetCode GraphQL API](https://leetcode.com/graphql)
- [React Documentation](https://react.dev/)
- [Tailwind CSS](https://tailwindcss.com/)

## 🎉 You're Ready!

Your extension is ready to use. Start adding friends and tracking streaks!

**Need help?** Check the [README.md](README.md) for architecture details.
