/**
 * Unit Tests - Streak Calculation Logic
 * Tests pure JavaScript functions without browser dependencies
 */

import { describe, test, expect, beforeEach, afterEach } from '@jest/globals';
import sinon from 'sinon';

// Import functions to test
import { calculateStreak, needsRefresh } from '../../src/shared/streak-calculator.js';

describe('Streak Calculation Logic', () => {
  let clock;

  beforeEach(() => {
    // Create a fake timer for time manipulation
    clock = sinon.useFakeTimers(new Date('2023-01-03T12:00:00Z').getTime());
  });

  afterEach(() => {
    // Restore real timers
    clock.restore();
  });

  describe('Basic Streak Calculation', () => {
    test('should increment streak when user solved yesterday and today', () => {
      const submissionCalendar = {
        // Today (2023-01-03)
        [Math.floor(Date.UTC(2023, 0, 3, 0, 0, 0) / 1000)]: 3,
        // Yesterday (2023-01-02)
        [Math.floor(Date.UTC(2023, 0, 2, 0, 0, 0) / 1000)]: 2,
        // Day before (2023-01-01)
        [Math.floor(Date.UTC(2023, 0, 1, 0, 0, 0) / 1000)]: 1
      };

      const streak = calculateStreak(submissionCalendar);
      expect(streak).toBe(3); // 3 consecutive days
    });

    test('should reset streak to 0 when 2 days gap detected', () => {
      const submissionCalendar = {
        // Today (2023-01-03)
        [Math.floor(Date.UTC(2023, 0, 3, 0, 0, 0) / 1000)]: 1,
        // 3 days ago (2023-12-31) - gap of 2 days!
        [Math.floor(Date.UTC(2022, 11, 31, 0, 0, 0) / 1000)]: 2
      };

      const streak = calculateStreak(submissionCalendar);
      expect(streak).toBe(1); // Only today counts, streak broken
    });

    test('should return 0 when no submissions today', () => {
      const submissionCalendar = {
        // Yesterday only
        [Math.floor(Date.UTC(2023, 0, 2, 0, 0, 0) / 1000)]: 5
      };

      const streak = calculateStreak(submissionCalendar);
      expect(streak).toBe(0);
    });

    test('should handle single day streak correctly', () => {
      const submissionCalendar = {
        // Only today
        [Math.floor(Date.UTC(2023, 0, 3, 0, 0, 0) / 1000)]: 1
      };

      const streak = calculateStreak(submissionCalendar);
      expect(streak).toBe(1);
    });

    test('should ignore future dates', () => {
      const submissionCalendar = {
        // Today
        [Math.floor(Date.UTC(2023, 0, 3, 0, 0, 0) / 1000)]: 1,
        // Tomorrow (should be ignored)
        [Math.floor(Date.UTC(2023, 0, 4, 0, 0, 0) / 1000)]: 5
      };

      const streak = calculateStreak(submissionCalendar);
      expect(streak).toBe(1);
    });
  });

  describe('Time Travel Scenarios', () => {
    test('LastLogin: Yesterday, TodaySolved: True -> Streak + 1', () => {
      const lastLogin = new Date('2023-01-02T12:00:00Z').getTime();
      const submissionCalendar = {
        [Math.floor(Date.UTC(2023, 0, 3, 0, 0, 0) / 1000)]: 2, // Today
        [Math.floor(Date.UTC(2023, 0, 2, 0, 0, 0) / 1000)]: 1  // Yesterday
      };

      const streak = calculateStreak(submissionCalendar);
      expect(streak).toBe(2);
    });

    test('LastLogin: 2 Days Ago -> Streak Reset to 0', () => {
      clock.restore();
      clock = sinon.useFakeTimers(new Date('2023-01-03T12:00:00Z').getTime());

      const submissionCalendar = {
        // Last activity was Jan 1 (2 days ago from Jan 3)
        [Math.floor(Date.UTC(2023, 0, 1, 0, 0, 0) / 1000)]: 3
        // No activity on Jan 2 or Jan 3
      };

      const streak = calculateStreak(submissionCalendar);
      expect(streak).toBe(0);
    });

    test('LastLogin: Today -> No change in streak', () => {
      const submissionCalendar = {
        [Math.floor(Date.UTC(2023, 0, 3, 0, 0, 0) / 1000)]: 5
      };

      const streak1 = calculateStreak(submissionCalendar);
      
      // Simulate another check on same day
      const streak2 = calculateStreak(submissionCalendar);
      
      expect(streak1).toBe(streak2);
      expect(streak1).toBe(1);
    });
  });

  describe('Long Streak Scenarios', () => {
    test('should correctly calculate 30-day streak', () => {
      const submissionCalendar = {};
      const baseDate = new Date('2023-01-03T00:00:00Z');
      
      // Create 30 consecutive days
      for (let i = 0; i < 30; i++) {
        const date = new Date(baseDate);
        date.setUTCDate(date.getUTCDate() - i);
        const timestamp = Math.floor(date.getTime() / 1000);
        submissionCalendar[timestamp] = i + 1;
      }

      const streak = calculateStreak(submissionCalendar);
      expect(streak).toBe(30);
    });

    test('should handle 100+ day streak', () => {
      const submissionCalendar = {};
      const baseDate = new Date('2023-01-03T00:00:00Z');
      
      for (let i = 0; i < 105; i++) {
        const date = new Date(baseDate);
        date.setUTCDate(date.getUTCDate() - i);
        const timestamp = Math.floor(date.getTime() / 1000);
        submissionCalendar[timestamp] = 1;
      }

      const streak = calculateStreak(submissionCalendar);
      expect(streak).toBe(105);
    });
  });

  describe('Edge Cases', () => {
    test('should handle empty submission calendar', () => {
      const streak = calculateStreak({});
      expect(streak).toBe(0);
    });

    test('should handle null/undefined calendar', () => {
      expect(calculateStreak(null)).toBe(0);
      expect(calculateStreak(undefined)).toBe(0);
    });

    test('should handle invalid calendar format', () => {
      const streak = calculateStreak("invalid");
      expect(streak).toBe(0);
    });

    test('should handle calendar with zero counts', () => {
      const submissionCalendar = {
        [Math.floor(Date.UTC(2023, 0, 3, 0, 0, 0) / 1000)]: 0,
        [Math.floor(Date.UTC(2023, 0, 2, 0, 0, 0) / 1000)]: 5
      };

      const streak = calculateStreak(submissionCalendar);
      expect(streak).toBe(0); // Zero count today = no streak
    });
  });
});

describe('Data Refresh Logic', () => {
  let clock;

  beforeEach(() => {
    clock = sinon.useFakeTimers(new Date('2023-01-03T12:00:00Z').getTime());
  });

  afterEach(() => {
    clock.restore();
  });

  test('should need refresh when data is older than 15 minutes', () => {
    const sixteenMinutesAgo = Date.now() - (16 * 60 * 1000);
    expect(needsRefresh(sixteenMinutesAgo)).toBe(true);
  });

  test('should not need refresh when data is fresher than 15 minutes', () => {
    const tenMinutesAgo = Date.now() - (10 * 60 * 1000);
    expect(needsRefresh(tenMinutesAgo)).toBe(false);
  });

  test('should need refresh when no timestamp provided', () => {
    expect(needsRefresh(null)).toBe(true);
    expect(needsRefresh(undefined)).toBe(true);
  });
});
