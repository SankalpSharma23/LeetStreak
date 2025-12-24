/**
 * Mock Data for LeetCode Extension Tests
 * Contains fake GraphQL responses and user data
 */

// Mock LeetCode GraphQL Response - User with submissions today
export const mockUserDataSolvedToday = {
  data: {
    matchedUser: {
      username: "Sankalp23",
      profile: {
        realName: "Sankalp Kumar",
        userAvatar: "https://assets.leetcode.com/users/default_avatar.jpg",
        ranking: 12345
      },
      submitStats: {
        acSubmissionNum: [
          { difficulty: "All", count: 550, submissions: 800 },
          { difficulty: "Easy", count: 250, submissions: 300 },
          { difficulty: "Medium", count: 200, submissions: 350 },
          { difficulty: "Hard", count: 100, submissions: 150 }
        ]
      },
      submissionCalendar: JSON.stringify({
        // Today's timestamp (will be mocked)
        [Math.floor(Date.now() / 1000)]: 3,
        // Yesterday
        [Math.floor((Date.now() - 86400000) / 1000)]: 5,
        // 2 days ago
        [Math.floor((Date.now() - 172800000) / 1000)]: 2,
        // 7 days ago
        [Math.floor((Date.now() - 604800000) / 1000)]: 4
      })
    }
  }
};

// Mock LeetCode GraphQL Response - User with NO submissions today
export const mockUserDataNotSolvedToday = {
  data: {
    matchedUser: {
      username: "TestUser",
      profile: {
        realName: "Test User",
        userAvatar: "https://assets.leetcode.com/users/default_avatar.jpg",
        ranking: 50000
      },
      submitStats: {
        acSubmissionNum: [
          { difficulty: "All", count: 100, submissions: 150 },
          { difficulty: "Easy", count: 50, submissions: 60 },
          { difficulty: "Medium", count: 40, submissions: 70 },
          { difficulty: "Hard", count: 10, submissions: 20 }
        ]
      },
      submissionCalendar: JSON.stringify({
        // Only yesterday and earlier (no today)
        [Math.floor((Date.now() - 86400000) / 1000)]: 2,
        [Math.floor((Date.now() - 172800000) / 1000)]: 1,
        [Math.floor((Date.now() - 259200000) / 1000)]: 3
      })
    }
  }
};

// Mock LeetCode GraphQL Response - User with broken streak (2 days gap)
export const mockUserDataBrokenStreak = {
  data: {
    matchedUser: {
      username: "BrokenStreakUser",
      profile: {
        realName: "Broken Streak",
        userAvatar: "https://assets.leetcode.com/users/default_avatar.jpg",
        ranking: 30000
      },
      submitStats: {
        acSubmissionNum: [
          { difficulty: "All", count: 200, submissions: 280 },
          { difficulty: "Easy", count: 100, submissions: 120 },
          { difficulty: "Medium", count: 80, submissions: 130 },
          { difficulty: "Hard", count: 20, submissions: 30 }
        ]
      },
      submissionCalendar: JSON.stringify({
        // Last submission was 3 days ago (streak broken)
        [Math.floor((Date.now() - 259200000) / 1000)]: 2,
        [Math.floor((Date.now() - 345600000) / 1000)]: 1,
        [Math.floor((Date.now() - 432000000) / 1000)]: 4
      })
    }
  }
};

// Mock Daily Question Response
export const mockDailyQuestion = {
  data: {
    activeDailyCodingChallengeQuestion: {
      date: new Date().toISOString().split('T')[0],
      link: "/problems/two-sum/",
      question: {
        questionId: "1",
        questionFrontendId: "1",
        title: "Two Sum",
        titleSlug: "two-sum",
        difficulty: "Easy",
        acRate: 49.5,
        topicTags: [
          { name: "Array", slug: "array" },
          { name: "Hash Table", slug: "hash-table" }
        ]
      }
    }
  }
};

// Mock submission improvement data
export const mockSubmissionImprovement = {
  problemSlug: "two-sum",
  oldSubmission: {
    timestamp: Date.now() - 86400000, // Yesterday
    runtime: 100,
    memory: 45.2,
    language: "javascript"
  },
  newSubmission: {
    timestamp: Date.now(),
    runtime: 80, // Improved!
    memory: 43.8,
    language: "javascript"
  }
};

// Mock submission NO improvement
export const mockSubmissionNoImprovement = {
  problemSlug: "two-sum",
  oldSubmission: {
    timestamp: Date.now() - 86400000,
    runtime: 50,
    memory: 40.1,
    language: "javascript"
  },
  newSubmission: {
    timestamp: Date.now(),
    runtime: 60, // Worse!
    memory: 41.5,
    language: "javascript"
  }
};

// Mock storage data
export const mockStorageData = {
  validStreak: {
    my_leetcode_username: "Sankalp23",
    leetfriends_friends: {
      "Sankalp23": {
        profile: {
          username: "Sankalp23",
          realName: "Sankalp Kumar",
          avatar: "https://assets.leetcode.com/users/default_avatar.jpg"
        },
        stats: {
          total: 550,
          easy: 250,
          medium: 200,
          hard: 100,
          streak: 5
        },
        submissionCalendar: {
          [Math.floor(Date.now() / 1000)]: 3
        },
        lastUpdated: Date.now()
      }
    }
  },
  brokenStreak: {
    my_leetcode_username: "TestUser",
    leetfriends_friends: {
      "TestUser": {
        profile: {
          username: "TestUser",
          realName: "Test User",
          avatar: "https://assets.leetcode.com/users/default_avatar.jpg"
        },
        stats: {
          total: 100,
          easy: 50,
          medium: 40,
          hard: 10,
          streak: 0
        },
        submissionCalendar: {
          [Math.floor((Date.now() - 259200000) / 1000)]: 2
        },
        lastUpdated: Date.now() - 259200000
      }
    }
  }
};

// Time travel scenarios
export const timeScenarios = {
  today: new Date('2023-01-03T12:00:00Z'),
  yesterday: new Date('2023-01-02T12:00:00Z'),
  twoDaysAgo: new Date('2023-01-01T12:00:00Z'),
  oneWeekAgo: new Date('2022-12-27T12:00:00Z')
};

export default {
  mockUserDataSolvedToday,
  mockUserDataNotSolvedToday,
  mockUserDataBrokenStreak,
  mockDailyQuestion,
  mockSubmissionImprovement,
  mockSubmissionNoImprovement,
  mockStorageData,
  timeScenarios
};
