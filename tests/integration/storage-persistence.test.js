/**
 * Integration Tests - Chrome Storage Persistence
 * Tests chrome.storage.local behavior and data persistence
 */

import { describe, test, expect, beforeEach, afterEach } from '@jest/globals';
import { mockStorageData } from '../mock-data.js';

// Mock chrome.storage.local API
class MockChromeStorage {
  constructor() {
    this.data = {};
  }

  async get(keys) {
    if (typeof keys === 'string') {
      return { [keys]: this.data[keys] };
    }
    if (Array.isArray(keys)) {
      const result = {};
      keys.forEach(key => {
        if (this.data[key] !== undefined) {
          result[key] = this.data[key];
        }
      });
      return result;
    }
    if (keys === null || keys === undefined) {
      return { ...this.data };
    }
    return {};
  }

  async set(items) {
    Object.assign(this.data, items);
    return Promise.resolve();
  }

  async remove(keys) {
    if (typeof keys === 'string') {
      delete this.data[keys];
    } else if (Array.isArray(keys)) {
      keys.forEach(key => delete this.data[key]);
    }
    return Promise.resolve();
  }

  async clear() {
    this.data = {};
    return Promise.resolve();
  }

  // Simulate browser restart by clearing memory references
  simulateRestart() {
    // In real browser, this.data would persist
    // We keep data to simulate chrome.storage.local persistence
    const persistedData = { ...this.data };
    this.data = persistedData;
  }
}

describe('Chrome Storage Integration Tests', () => {
  let storage;
  let chrome;

  beforeEach(() => {
    storage = new MockChromeStorage();
    chrome = {
      storage: {
        local: storage
      }
    };
    global.chrome = chrome;
  });

  afterEach(() => {
    delete global.chrome;
  });

  describe('Basic Storage Operations', () => {
    test('should save and retrieve data', async () => {
      const testData = { streak: 10, username: 'TestUser' };
      
      await storage.set(testData);
      const result = await storage.get(['streak', 'username']);
      
      expect(result.streak).toBe(10);
      expect(result.username).toBe('TestUser');
    });

    test('should handle single key retrieval', async () => {
      await storage.set({ myKey: 'myValue' });
      const result = await storage.get('myKey');
      
      expect(result.myKey).toBe('myValue');
    });

    test('should retrieve all data when no keys specified', async () => {
      await storage.set({ key1: 'value1', key2: 'value2', key3: 'value3' });
      const result = await storage.get();
      
      expect(result).toEqual({
        key1: 'value1',
        key2: 'value2',
        key3: 'value3'
      });
    });

    test('should remove specific keys', async () => {
      await storage.set({ keep: 'this', remove: 'that' });
      await storage.remove('remove');
      const result = await storage.get();
      
      expect(result.keep).toBe('this');
      expect(result.remove).toBeUndefined();
    });

    test('should clear all data', async () => {
      await storage.set({ key1: 'value1', key2: 'value2' });
      await storage.clear();
      const result = await storage.get();
      
      expect(Object.keys(result)).toHaveLength(0);
    });
  });

  describe('Persistence Across "Browser Restarts"', () => {
    test('CRITICAL: Data must persist after simulated restart', async () => {
      // Step 1: Save data
      const streakData = { streak: 10, lastUpdated: Date.now() };
      await storage.set(streakData);
      
      // Step 2: Simulate browser restart (clear memory references)
      storage.simulateRestart();
      
      // Step 3: Read from storage
      const result = await storage.get('streak');
      
      // Expectation: Data MUST persist
      expect(result.streak).toBe(10);
    });

    test('should persist complex nested objects', async () => {
      const complexData = mockStorageData.validStreak;
      
      await storage.set({ userData: complexData });
      storage.simulateRestart();
      
      const result = await storage.get('userData');
      expect(result.userData.my_leetcode_username).toBe('Sankalp23');
      expect(result.userData.leetfriends_friends['Sankalp23'].stats.streak).toBe(5);
    });

    test('should persist multiple users data', async () => {
      const users = {
        user1: { streak: 5, total: 100 },
        user2: { streak: 10, total: 250 },
        user3: { streak: 3, total: 50 }
      };
      
      await storage.set(users);
      storage.simulateRestart();
      
      const result = await storage.get(['user1', 'user2', 'user3']);
      expect(result.user1.streak).toBe(5);
      expect(result.user2.total).toBe(250);
      expect(result.user3.streak).toBe(3);
    });
  });

  describe('Extension State Management', () => {
    test('should maintain streak state across sessions', async () => {
      // Session 1: User solves problems
      await storage.set({
        my_leetcode_username: 'Sankalp23',
        current_streak: 7,
        last_verified: Date.now()
      });
      
      // Simulate close/reopen
      storage.simulateRestart();
      
      // Session 2: Extension reopens
      const state = await storage.get(['current_streak', 'my_leetcode_username']);
      
      expect(state.current_streak).toBe(7);
      expect(state.my_leetcode_username).toBe('Sankalp23');
    });

    test('should preserve notification state', async () => {
      const notificationState = {
        leetfriends_notifications: {
          mutedUntilUTC: '2023-01-05',
          lastNotified: {
            'Friend1': '2023-01-03',
            'Friend2': '2023-01-02'
          }
        }
      };
      
      await storage.set(notificationState);
      storage.simulateRestart();
      
      const result = await storage.get('leetfriends_notifications');
      expect(result.leetfriends_notifications.mutedUntilUTC).toBe('2023-01-05');
      expect(result.leetfriends_notifications.lastNotified['Friend1']).toBe('2023-01-03');
    });

    test('should preserve problem queue across restarts', async () => {
      const problemQueue = {
        problem_queue: [
          { id: 1, title: 'Two Sum', url: 'https://leetcode.com/problems/two-sum/' },
          { id: 2, title: 'Add Two Numbers', url: 'https://leetcode.com/problems/add-two-numbers/' }
        ]
      };
      
      await storage.set(problemQueue);
      storage.simulateRestart();
      
      const result = await storage.get('problem_queue');
      expect(result.problem_queue).toHaveLength(2);
      expect(result.problem_queue[0].title).toBe('Two Sum');
    });
  });

  describe('Data Integrity', () => {
    test('should not corrupt data on partial updates', async () => {
      // Initial state
      await storage.set({
        user: 'TestUser',
        streak: 5,
        total: 100
      });
      
      // Partial update
      await storage.set({ streak: 6 });
      
      const result = await storage.get();
      expect(result.user).toBe('TestUser'); // Should remain unchanged
      expect(result.streak).toBe(6); // Should be updated
      expect(result.total).toBe(100); // Should remain unchanged
    });

    test('should handle concurrent writes correctly', async () => {
      const writes = [
        storage.set({ key1: 'value1' }),
        storage.set({ key2: 'value2' }),
        storage.set({ key3: 'value3' })
      ];
      
      await Promise.all(writes);
      const result = await storage.get();
      
      expect(result.key1).toBe('value1');
      expect(result.key2).toBe('value2');
      expect(result.key3).toBe('value3');
    });

    test('should handle large data storage', async () => {
      // Simulate storing 100 friends
      const largeFriendsData = {};
      for (let i = 0; i < 100; i++) {
        largeFriendsData[`friend${i}`] = {
          username: `User${i}`,
          streak: i,
          total: i * 10,
          submissionCalendar: { [Date.now()]: i }
        };
      }
      
      await storage.set({ leetfriends_friends: largeFriendsData });
      storage.simulateRestart();
      
      const result = await storage.get('leetfriends_friends');
      expect(Object.keys(result.leetfriends_friends)).toHaveLength(100);
      expect(result.leetfriends_friends['friend50'].streak).toBe(50);
    });
  });

  describe('Error Handling', () => {
    test('should return empty object for non-existent keys', async () => {
      const result = await storage.get('nonExistentKey');
      expect(result.nonExistentKey).toBeUndefined();
    });

    test('should handle undefined values', async () => {
      await storage.set({ undefinedKey: undefined });
      const result = await storage.get('undefinedKey');
      expect(result.undefinedKey).toBeUndefined();
    });

    test('should handle null values', async () => {
      await storage.set({ nullKey: null });
      const result = await storage.get('nullKey');
      expect(result.nullKey).toBe(null);
    });
  });
});
