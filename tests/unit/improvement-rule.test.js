/**
 * Unit Tests - Submission Improvement Rule
 * For users with >500 problems, re-submissions must show improvement
 */

import { describe, test, expect } from '@jest/globals';
import { mockSubmissionImprovement, mockSubmissionNoImprovement } from '../mock-data.js';

/**
 * Validates if a re-submission shows improvement
 * @param {Object} oldSubmission - Previous submission data
 * @param {Object} newSubmission - New submission data
 * @param {number} totalSolved - Total problems solved by user
 * @returns {boolean} - True if valid (improved or <500 problems)
 */
function validateResubmission(oldSubmission, newSubmission, totalSolved) {
  // Rule only applies to users with >500 problems
  if (totalSolved <= 500) {
    return true; // Always valid for users with <=500 problems
  }

  // Check if runtime improved (lower is better)
  const runtimeImproved = newSubmission.runtime < oldSubmission.runtime;
  
  // Check if memory improved (lower is better)
  const memoryImproved = newSubmission.memory < oldSubmission.memory;

  // Valid if either runtime OR memory improved
  return runtimeImproved || memoryImproved;
}

describe('Submission Improvement Rule (>500 Problems)', () => {
  describe('Users with >500 problems', () => {
    const userWith550Problems = 550;

    test('should accept improved runtime submission', () => {
      const oldSub = mockSubmissionImprovement.oldSubmission;
      const newSub = mockSubmissionImprovement.newSubmission;

      const isValid = validateResubmission(oldSub, newSub, userWith550Problems);
      
      expect(isValid).toBe(true);
      expect(newSub.runtime).toBeLessThan(oldSub.runtime);
    });

    test('should reject submission with worse runtime', () => {
      const oldSub = mockSubmissionNoImprovement.oldSubmission;
      const newSub = mockSubmissionNoImprovement.newSubmission;

      const isValid = validateResubmission(oldSub, newSub, userWith550Problems);
      
      expect(isValid).toBe(false);
      expect(newSub.runtime).toBeGreaterThan(oldSub.runtime);
    });

    test('should accept improved memory even if runtime is same', () => {
      const oldSub = { runtime: 100, memory: 50 };
      const newSub = { runtime: 100, memory: 45 }; // Memory improved

      const isValid = validateResubmission(oldSub, newSub, userWith550Problems);
      
      expect(isValid).toBe(true);
    });

    test('should reject if both runtime and memory are worse', () => {
      const oldSub = { runtime: 80, memory: 40 };
      const newSub = { runtime: 90, memory: 45 }; // Both worse

      const isValid = validateResubmission(oldSub, newSub, userWith550Problems);
      
      expect(isValid).toBe(false);
    });

    test('should accept if runtime improved but memory worse', () => {
      const oldSub = { runtime: 100, memory: 40 };
      const newSub = { runtime: 80, memory: 45 }; // Runtime better, memory worse

      const isValid = validateResubmission(oldSub, newSub, userWith550Problems);
      
      expect(isValid).toBe(true); // One improvement is enough
    });
  });

  describe('Users with <=500 problems', () => {
    const userWith450Problems = 450;

    test('should always accept any resubmission', () => {
      const oldSub = { runtime: 50, memory: 40 };
      const newSub = { runtime: 100, memory: 60 }; // Worse in both

      const isValid = validateResubmission(oldSub, newSub, userWith450Problems);
      
      expect(isValid).toBe(true); // Rule doesn't apply
    });

    test('should accept improved submission', () => {
      const oldSub = mockSubmissionImprovement.oldSubmission;
      const newSub = mockSubmissionImprovement.newSubmission;

      const isValid = validateResubmission(oldSub, newSub, userWith450Problems);
      
      expect(isValid).toBe(true);
    });
  });

  describe('Edge Cases', () => {
    test('should handle exactly 500 problems', () => {
      const oldSub = { runtime: 50, memory: 40 };
      const newSub = { runtime: 60, memory: 45 }; // Worse

      const isValid = validateResubmission(oldSub, newSub, 500);
      
      expect(isValid).toBe(true); // 500 is <=500, rule doesn't apply
    });

    test('should handle exactly 501 problems', () => {
      const oldSub = { runtime: 50, memory: 40 };
      const newSub = { runtime: 60, memory: 45 }; // Worse

      const isValid = validateResubmission(oldSub, newSub, 501);
      
      expect(isValid).toBe(false); // 501 is >500, rule applies
    });

    test('should handle identical performance', () => {
      const oldSub = { runtime: 100, memory: 50 };
      const newSub = { runtime: 100, memory: 50 }; // Exactly same

      const isValid = validateResubmission(oldSub, newSub, 550);
      
      expect(isValid).toBe(false); // No improvement
    });

    test('should handle minimal improvement (1ms faster)', () => {
      const oldSub = { runtime: 100, memory: 50 };
      const newSub = { runtime: 99, memory: 50 };

      const isValid = validateResubmission(oldSub, newSub, 550);
      
      expect(isValid).toBe(true); // Any improvement counts
    });
  });

  describe('Real-world Scenarios', () => {
    test('Two Sum problem - optimization from O(n²) to O(n)', () => {
      const oldSub = {
        runtime: 150, // Brute force
        memory: 42.1,
        language: 'javascript'
      };
      const newSub = {
        runtime: 75, // Hash map approach
        memory: 44.2, // Slightly more memory for hash map
        language: 'javascript'
      };

      const isValid = validateResubmission(oldSub, newSub, 600);
      
      expect(isValid).toBe(true); // Runtime improvement outweighs memory increase
    });

    test('Dynamic Programming optimization', () => {
      const oldSub = {
        runtime: 200,
        memory: 40.0, // Top-down recursion
        language: 'python'
      };
      const newSub = {
        runtime: 120,
        memory: 38.5, // Bottom-up DP
        language: 'python'
      };

      const isValid = validateResubmission(oldSub, newSub, 750);
      
      expect(isValid).toBe(true); // Both metrics improved
    });
  });
});
