<div align="center">
  <img src="public/logo.png" alt="LeetStreak Logo" width="120" height="120">
  
  # 🔥 LeetStreak
  
  **A social Chrome extension to track LeetCode streaks with your friends**
  
  Compare stats, view leaderboards, and stay motivated together!
  
  [![Chrome Extension](https://img.shields.io/badge/Chrome-Extension-4285F4?style=for-the-badge&logo=google-chrome&logoColor=white)](https://chrome.google.com/webstore)
  [![React](https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://reactjs.org/)
  [![Vite](https://img.shields.io/badge/Vite-7.2-646CFF?style=for-the-badge&logo=vite&logoColor=white)](https://vitejs.dev/)
  
</div>

## ✨ Features

- **Friend Management**: Add/remove friends by their LeetCode username
- **Leaderboard**: Compare streaks, problems solved, and difficulty breakdown
- **Detailed Stats**: View badges, contest ratings, and recent submissions
- **Real-time Updates**: Background sync every 30 minutes
- **Smart Caching**: Intelligent data refresh strategy to avoid rate limits
- **Notifications**: Get notified when friends hit streak milestones

## 🚀 Tech Stack

- **React 19** + **Vite** - Modern frontend development
- **Tailwind CSS** - Utility-first styling
- **Chrome Extension Manifest V3** - Latest extension APIs
- **LeetCode GraphQL API** - Official data source

## 📦 Installation

### Development Mode

1. **Clone and Install Dependencies**
   ```bash
   cd L:\Projects\LeetStreak
   npm install
   ```

2. **Build the Extension**
   ```bash
   npm run build
   ```

3. **Load in Chrome**
   - Open Chrome and go to `chrome://extensions/`
   - Enable "Developer mode" (toggle in top-right)
   - Click "Load unpacked"
   - Select the `dist` folder

4. **Development with Hot Reload**
   ```bash
   npm run build:watch
   ```
   Then reload the extension in Chrome after changes.

## 🎯 Architecture Overview

### Core Components

- **Background Service Worker** (`src/background/service-worker.js`)
  - Handles 30-minute alarm-based sync
  - Sequential API fetching with 500ms delays
  - Manages Chrome storage and notifications

- **LeetCode API Service** (`src/background/leetcode-api.js`)
  - GraphQL queries for user data
  - Fetches profile, stats, badges, submissions, and calendar

- **Streak Calculator** (`src/shared/streak-calculator.js`)
  - UTC-based consecutive day calculation
  - Matches LeetCode's official streak logic

- **Storage Manager** (`src/shared/storage.js`)
  - Handles chrome.storage.local operations
  - Structured data management

- **Popup UI** (`src/popup/`)
  - Main leaderboard view
  - Friend cards with expandable details
  - Add friend functionality

- **Options Page** (`src/options/`)
  - Full friend list management
  - Storage statistics
  - Extension settings

## 📐 Technical Decisions

### Streak Calculation
- **Method**: Consecutive days with at least 1 submission
- **Timezone**: UTC (matches LeetCode server time)
- **Data Source**: `submissionCalendar` from GraphQL API

### Data Fetching Strategy
- **Background Sync**: Every 30 minutes via Chrome alarms
- **User-Triggered**: Popup checks for stale data (>15 mins)
- **Rate Limiting**: Sequential fetching with 500ms delays
- **Caching**: Chrome.storage.local for offline support

### Storage Structure
```javascript
{
  leetfriends_data: {
    friends: {
      "username1": {
        profile: { username, realName, avatar, ranking },
        stats: { easy, medium, hard, total, streak },
        contest: { rating, attended, ranking },
        badges: [...],
        recentSubmissions: [...],
        submissionCalendar: {...},
        lastUpdated: 1234567890
      }
    }
  }
}
```

## 🎨 UI Components

- **Skeleton Loaders**: Shown during initial data fetch
- **Expandable Cards**: Click to view detailed stats
- **Rank Badges**: 🥇🥈🥉 for top 3 friends
- **Difficulty Colors**: 
  - Easy: `#00B8A3` (teal)
  - Medium: `#FFC01E` (yellow)
  - Hard: `#FF375F` (red)

## 🔔 Notifications

Notifications are triggered when:
- A friend's streak increases
- A friend enters the top 3 leaderboard

## 🛠️ Build Scripts

- `npm run build` - Production build + extension packaging
- `npm run build:watch` - Watch mode for development
- `npm run dev` - Vite dev server (for component testing only)
- `npm run lint` - ESLint code checking

## 📁 Project Structure

```
LeetStreak/
├── public/
│   ├── manifest.json          # Extension manifest
│   └── icons/                 # Extension icons
├── src/
│   ├── background/
│   │   ├── service-worker.js  # Background service worker
│   │   └── leetcode-api.js    # API wrapper
│   ├── popup/
│   │   ├── App.jsx            # Main popup component
│   │   ├── Leaderboard.jsx    # Leaderboard view
│   │   ├── FriendCard.jsx     # Friend card component
│   │   ├── AddFriend.jsx      # Add friend form
│   │   └── LoadingSkeleton.jsx
│   ├── options/
│   │   ├── App.jsx            # Options page
│   │   └── FriendManager.jsx  # Friend management
│   ├── shared/
│   │   ├── streak-calculator.js
│   │   └── storage.js
│   └── styles/
│       └── globals.css        # Tailwind styles
├── scripts/
│   └── build-extension.js     # Build script
├── popup.html                 # Popup entry point
├── options.html               # Options entry point
├── vite.config.js             # Vite configuration
├── tailwind.config.js         # Tailwind configuration
└── package.json
```

## 🐛 Known Limitations

- LeetCode API has rate limits - extension fetches data sequentially with delays
- Private profiles cannot be tracked
- Daily Challenge detection is approximate (LeetCode doesn't expose this directly)
- Maximum ~200 friends before hitting Chrome storage limits

## 🤝 Contributing

This is a personal project, but feel free to fork and customize!

## 📝 License

---

**Built with ❤️ for the LeetCode community**
**By Sankalp Sharma**
**From Chitkara University**
