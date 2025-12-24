export const STORAGE_KEYS = {
  FRIEND_LIST: 'friendList',
  CACHE: 'cache',
  SETTINGS: 'settings'
};

export const DEFAULT_SETTINGS = {
  updateInterval: 30, // minutes
  notifications: {
    streakUpdates: true,
    dailyChallenge: true
  },
  theme: 'light'
};

export const CACHE_CONFIG = {
  MAX_FRIENDS: 15,
  STALE_THRESHOLD: 60 * 60 * 1000, // 1 hour
  MAX_CACHE_SIZE: 10 * 1024 * 1024 // 10MB
};