<div align="center">
  
  # 🔥 LeetStreak
  
  **A social Chrome extension to track LeetCode progress with your friends**
  
  Compare stats, view leaderboards, and stay motivated together!
  
  [![Chrome Extension](https://img.shields.io/badge/Chrome-Extension-4285F4?style=for-the-badge&logo=google-chrome&logoColor=white)](https://chrome.google.com/webstore)
  [![React](https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://reactjs.org/)
  [![Vite](https://img.shields.io/badge/Vite-7-646CFF?style=for-the-badge&logo=vite&logoColor=white)](https://vitejs.dev/)
  [![License](https://img.shields.io/badge/License-MIT-green.svg?style=for-the-badge)](LICENSE)
  
</div>

---

## 📋 Table of Contents

- [Features](#-features)
- [Screenshots](#-screenshots)
- [Installation](#-installation)
- [Tech Stack](#-tech-stack)
- [Architecture](#-architecture)
- [Usage](#-usage)
- [Development](#-development)
- [Project Structure](#-project-structure)
- [Contributing](#-contributing)
- [Bug Reports](#-bug-reports)
- [License](#-license)

---

## ✨ Features

### 🎯 Core Functionality
- **Friend Management**: Add/remove friends by LeetCode username with real-time validation
- **Leaderboard View**: Compare streaks, problems solved, and rankings at a glance
- **Detailed Analytics**: Deep insights into solving patterns, difficulty distribution, and progress trends
- **Progress Tracking**: Visual charts showing your coding journey over time
- **Streak Calculation**: UTC-based consecutive day tracking matching LeetCode's official logic

### 🔄 Smart Sync & Caching
- **Auto-sync**: Background updates every 30 minutes
- **Smart Caching**: Intelligent refresh strategy to minimize API calls
- **Offline Support**: Works seamlessly with cached data
- **Rate Limit Protection**: Sequential fetching with delays to respect LeetCode API

### 🔔 Notifications & Alerts
- **Milestone Celebrations**: Get notified when friends hit streak milestones
- **Leaderboard Alerts**: Know when friends enter top 3
- **Daily Challenge Tracking**: Stay updated on daily challenges

### 🎨 Modern UI/UX
- **Dark/Light Mode**: Seamless theme switching
- **Responsive Design**: Optimized for extension popup (400x600px)
- **Beautiful Animations**: Smooth transitions and loading states
- **Custom Loading Screen**: Elegant animated loader
- **Fixed Footer**: Quick access to GitHub repo and bug reporting

### 🔗 GitHub Integration
- **Code Sync**: Optional GitHub repository integration
- **Solution Tracking**: Keep track of your LeetCode solutions

---

## 📸 Screenshots

*Coming Soon - Extension screenshots showcasing the leaderboard, analytics, and friend cards*

---

## 🚀 Installation

### For Users

1. **Download from Chrome Web Store** *(Coming Soon)*
   - Visit the Chrome Web Store
   - Click "Add to Chrome"
   - Start tracking your friends!

### For Developers

1. **Clone the Repository**
   ```bash
   git clone https://github.com/sankalpsharma99/LeetStreak.git
   cd LeetStreak
   ```

2. **Install Dependencies**
   ```bash
   npm install
   ```

3. **Build the Extension**
   ```bash
   npm run build
   ```

4. **Load in Chrome**
   - Open Chrome and navigate to `chrome://extensions/`
   - Enable "Developer mode" (toggle in top-right corner)
   - Click "Load unpacked"
   - Select the `dist` folder from the project directory

5. **Start Using**
   - Click the LeetStreak icon in your Chrome toolbar
   - Enter your LeetCode username to get started
   - Add friends and start competing!

---

## 🛠️ Tech Stack

### Frontend
- **React 19** - Modern UI development with latest features
- **Vite 7** - Lightning-fast build tool
- **Tailwind CSS 4** - Utility-first CSS framework
- **Lucide React** - Beautiful icon library

### Chrome Extension
- **Manifest V3** - Latest Chrome extension standard
- **Service Workers** - Background data synchronization
- **Chrome Storage API** - Persistent data storage
- **Chrome Alarms API** - Scheduled background tasks

### APIs & Data
- **LeetCode GraphQL API** - Official data source for user stats
- **GitHub API** - Optional repository integration

### Development Tools
- **ESLint** - Code linting and quality
- **PostCSS** - CSS processing
- **Jest** - Unit and integration testing

---

## 🏗️ Architecture

### Core Components

#### 1. **Background Service Worker** (`src/background/service-worker.js`)
- Manages 30-minute alarm-based synchronization
- Handles all LeetCode API requests
- Processes and stores user data
- Sends notifications for milestones

#### 2. **LeetCode API Service** (`src/background/leetcode-api.js`)
- GraphQL query wrapper for LeetCode API
- Fetches:
  - User profile (avatar, ranking, real name)
  - Problem stats (easy/medium/hard breakdown)
  - Contest ratings and participation
  - Badges and achievements
  - Recent submissions with details
  - Submission calendar for streak calculation

#### 3. **Streak Calculator** (`src/shared/streak-calculator.js`)
- UTC-based consecutive day calculation
- Matches LeetCode's official streak methodology
- Handles timezone conversions
- Calculates current and longest streaks

#### 4. **Storage Manager** (`src/shared/storage.js`)
- Centralized Chrome storage operations
- Data structure management
- Storage quota monitoring
- Efficient data retrieval and updates

#### 5. **React Components**
- **Popup UI** (`src/popup/`)
  - Main app with navigation tabs
  - Leaderboard with friend rankings
  - Progress view with personal stats
  - Analytics dashboard with charts
  - GitHub sync integration
  - Settings and notifications

- **Options Page** (`src/options/`)
  - Full friend list management
  - Storage statistics and monitoring
  - Extension preferences

### Data Flow

```
┌─────────────────┐
│  LeetCode API   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Service Worker  │◄─── Chrome Alarms (30 min)
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Chrome Storage  │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│   React UI      │◄─── User Interactions
└─────────────────┘
```

### Storage Structure

```javascript
{
  // User's LeetCode username
  my_leetcode_username: "username",
  
  // Theme preference
  theme: "dark", // or "light"
  
  // Friend data with complete stats
  leetfriends_data: {
    friends: {
      "username1": {
        profile: {
          username: "username1",
          realName: "John Doe",
          avatar: "https://...",
          ranking: 12345
        },
        stats: {
          easy: 150,
          medium: 200,
          hard: 50,
          total: 400,
          currentStreak: 15,
          longestStreak: 30
        },
        contest: {
          rating: 1850,
          attended: 25,
          ranking: 5000
        },
        badges: [...],
        recentSubmissions: [...],
        submissionCalendar: {...},
        lastUpdated: 1234567890
      }
    }
  },
  
  // Notification preferences
  notification_settings: {
    enabled: true,
    streakMilestones: true,
    leaderboardChanges: true
  },
  
  // Unread notifications
  unread_notifications: [...]
}
```

---

## 💻 Usage

### Getting Started

1. **First Launch**
   - Click the extension icon
   - Enter your LeetCode username
   - Extension will fetch your data

2. **Adding Friends**
   - Navigate to "Friends" tab
   - Enter your friend's LeetCode username
   - Click the + icon to add

3. **Viewing Stats**
   - **Progress Tab**: Your personal stats and streak visualization
   - **Friends Tab**: Compare with friends on the leaderboard
   - **Analytics Tab**: Detailed insights and charts
   - **GitHub Tab**: Sync with your GitHub repository

4. **Customization**
   - Toggle dark/light theme
   - Configure notifications
   - Manage friend list in options page

### Features Guide

#### Leaderboard
- Friends are sorted by current streak (highest first)
- 🥇🥈🥉 badges for top 3 positions
- Click any friend card to expand details
- View ranking, badges, and recent submissions

#### Analytics
- Visual progress charts
- Problem difficulty distribution
- Activity heatmap
- Solving patterns and trends
- Comparative insights with friends

#### Notifications
- Streak milestone alerts (5, 10, 25, 50, 100+ days)
- Leaderboard position changes
- Daily challenge reminders
- Manage preferences in settings

---

## 🔧 Development

### Prerequisites
- Node.js 18+ and npm
- Chrome/Chromium browser
- Basic knowledge of React and Chrome Extensions

### Setup Development Environment

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Development Mode with Watch**
   ```bash
   npm run build:watch
   ```
   This watches for file changes and rebuilds automatically.

3. **Reload Extension in Chrome**
   - After making changes, go to `chrome://extensions/`
   - Click the reload icon on the LeetStreak card
   - Changes will be reflected immediately

### Available Scripts

```bash
# Build for production
npm run build

# Development mode with auto-rebuild
npm run build:watch

# Run linter
npm run lint

# Run unit tests
npm run test:unit

# Run integration tests
npm run test:integration

# Run all tests
npm run test:all
```

### Technical Decisions

#### Streak Calculation
- **Method**: Consecutive days with at least 1 accepted submission
- **Timezone**: UTC (matches LeetCode server time)
- **Data Source**: `submissionCalendar` from GraphQL API
- **Logic**: Iterates through calendar timestamps to find consecutive days

#### Rate Limiting Strategy
- **Sequential Fetching**: Friends are fetched one at a time
- **Delays**: 500ms delay between each API request
- **Caching**: Data is cached for 15 minutes to minimize API calls
- **Smart Refresh**: Only fetches when data is stale or user manually refreshes

#### Why These Choices?
- **UTC Timezone**: Ensures consistency with LeetCode's official system
- **Sequential Fetching**: Prevents API rate limiting and potential bans
- **Smart Caching**: Balances freshness with API respect
- **Manifest V3**: Future-proof with Chrome's latest standards

---

## 📁 Project Structure

```
LeetStreak/
├── public/
│   ├── manifest.json              # Extension manifest (Manifest V3)
│   └── icons/                     # Extension icons (16, 48, 128)
│
├── src/
│   ├── background/
│   │   ├── service-worker.js      # Background service worker
│   │   └── leetcode-api.js        # LeetCode GraphQL API wrapper
│   │
│   ├── content/
│   │   └── leetcode-integration.js # LeetCode page integration
│   │
│   ├── popup/
│   │   ├── App.jsx                # Main popup component
│   │   ├── Leaderboard.jsx        # Friend leaderboard view
│   │   ├── StreakView.jsx         # Personal progress view
│   │   ├── InsightsPanelEnhanced.jsx # Analytics dashboard
│   │   ├── ProgressChart.jsx      # Visual progress charts
│   │   ├── GitHubSync.jsx         # GitHub integration
│   │   ├── AddFriend.jsx          # Add friend form
│   │   ├── FriendCard.jsx         # Friend card component
│   │   ├── LoadingSkeleton.jsx    # Loading states
│   │   ├── NotificationSettings.jsx # Notification preferences
│   │   ├── NotificationToast.jsx  # Toast notifications
│   │   ├── Footer.jsx             # Footer with links
│   │   └── index.jsx              # Popup entry point
│   │
│   ├── options/
│   │   ├── App.jsx                # Options page component
│   │   ├── FriendManager.jsx      # Friend management UI
│   │   └── index.jsx              # Options entry point
│   │
│   ├── shared/
│   │   ├── streak-calculator.js   # Streak calculation logic
│   │   ├── storage.js             # Storage management
│   │   ├── github-sync.js         # GitHub API integration
│   │   ├── notification-manager.js # Notification handling
│   │   ├── insights-generator.js  # Analytics calculations
│   │   ├── goals-manager.js       # Goal tracking
│   │   └── validation.js          # Input validation
│   │
│   └── styles/
│       └── globals.css            # Global styles with Tailwind
│
├── scripts/
│   ├── build-extension.js         # Extension build script
│   └── create-icons.js            # Icon generation script
│
├── tests/
│   ├── unit/                      # Unit tests
│   ├── integration/               # Integration tests
│   └── e2e/                       # End-to-end tests
│
├── popup.html                     # Popup HTML entry
├── options.html                   # Options HTML entry
├── vite.config.js                 # Vite configuration
├── tailwind.config.js             # Tailwind configuration
├── postcss.config.js              # PostCSS configuration
├── eslint.config.js               # ESLint configuration
├── package.json                   # Dependencies and scripts
└── README.md                      # This file
```

---

## 🤝 Contributing

Contributions are welcome! Here's how you can help:

1. **Fork the Repository**
   ```bash
   git clone https://github.com/yourusername/LeetStreak.git
   ```

2. **Create a Feature Branch**
   ```bash
   git checkout -b feature/amazing-feature
   ```

3. **Make Your Changes**
   - Follow the existing code style
   - Add tests if applicable
   - Update documentation as needed

4. **Commit Your Changes**
   ```bash
   git commit -m "Add amazing feature"
   ```

5. **Push to Your Fork**
   ```bash
   git push origin feature/amazing-feature
   ```

6. **Open a Pull Request**
   - Describe your changes
   - Reference any related issues

### Code Style Guidelines
- Use ESLint configuration provided
- Follow React best practices
- Write clean, commented code
- Test your changes thoroughly

---

## 🐛 Bug Reports

Found a bug? Please report it!

**[Report a Bug](https://forms.gle/C3hsVfCnHrSw3c6)**

Or open an issue on GitHub with:
- Clear description of the bug
- Steps to reproduce
- Expected vs actual behavior
- Screenshots if applicable
- Browser version and extension version

---

## 📝 Known Limitations

- **API Rate Limits**: LeetCode API has rate limits; extension uses sequential fetching with delays
- **Private Profiles**: Cannot track users with private LeetCode profiles
- **Storage Limits**: Chrome storage has limits; recommended max ~200 friends
- **Daily Challenge**: Detection is approximate as LeetCode doesn't expose this directly in API
- **Real-time Updates**: Data refreshes every 30 minutes, not real-time

---

## 🔮 Future Enhancements

- [ ] Chrome Web Store publication
- [ ] Weekly/monthly summary emails
- [ ] Custom goals and challenges
- [ ] Team/group competitions
- [ ] Browser compatibility (Firefox, Edge)
- [ ] Mobile companion app
- [ ] Advanced analytics with ML insights
- [ ] Integration with other coding platforms

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 💖 Acknowledgments

- LeetCode for the amazing platform and API
- Chrome Extensions community for documentation
- React and Vite teams for excellent tools
- All contributors and users

---

## 👨‍💻 Author

**Sankalp Sharma**

- GitHub: [@sankalpsharma99](https://github.com/sankalpsharma99)
- Project Link: [https://github.com/sankalpsharma99/LeetStreak](https://github.com/sankalpsharma99/LeetStreak)

---

<div align="center">
  
  **Built with ❤️ for the LeetCode community**
  
  ⭐ Star this repo if you find it helpful!
  
</div>
  
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

**<u>By Sankalp Sharma</u>**

**From Chitkara University**
