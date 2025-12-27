// LeetCode GraphQL API endpoint
const LEETCODE_API = 'https://leetcode.com/graphql';

// Network configuration
const MAX_RETRIES = 3;
const TIMEOUT_MS = 10000; // 10 seconds

/**
 * Sleep utility for retry delays
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Fetch with retry, timeout, and offline detection
 * @param {string} url - URL to fetch
 * @param {Object} options - Fetch options
 * @param {number} retries - Number of retries
 * @returns {Promise<Response>} Fetch response
 */
async function fetchWithRetry(url, options, retries = MAX_RETRIES) {
  let lastError;
  
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      // Check online status (in service worker context)
      if (typeof navigator !== 'undefined' && !navigator.onLine) {
        throw new Error('No internet connection. Please check your network.');
      }
      
      // Create abort controller for timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);
      
      const response = await fetch(url, {
        ...options,
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      // Handle rate limiting with retry
      if (response.status === 429) {
        const retryAfter = parseInt(response.headers.get('Retry-After')) || Math.pow(2, attempt);
        console.log(`[API] Rate limited. Retrying after ${retryAfter}s`);
        await sleep(retryAfter * 1000);
        continue;
      }
      
      // Success or non-retryable error
      return response;
      
    } catch (error) {
      lastError = error;
      
      if (error.name === 'AbortError') {
        console.error(`[API] Request timeout (${TIMEOUT_MS}ms)`);
        lastError = new Error(`Request timed out after ${TIMEOUT_MS / 1000} seconds`);
      }
      
      // Don't retry on offline or user errors
      if (error.message.includes('No internet connection')) {
        throw error;
      }
      
      // Exponential backoff: 1s, 2s, 4s
      if (attempt < retries - 1) {
        const delay = Math.pow(2, attempt) * 1000;
        console.log(`[API] Retry ${attempt + 1}/${retries} in ${delay}ms`);
        await sleep(delay);
      }
    }
  }
  
  throw lastError || new Error('Network request failed after multiple retries');
}

// GraphQL queries
const USER_PROFILE_QUERY = `
  query getUserProfile($username: String!) {
    matchedUser(username: $username) {
      username
      profile {
        realName
        userAvatar
        ranking
      }
      submitStats {
        acSubmissionNum {
          difficulty
          count
        }
      }
      submissionCalendar
    }
    userContestRanking(username: $username) {
      attendedContestsCount
      rating
      globalRanking
    }
  }
`;

const BADGES_QUERY = `
  query getUserBadges($username: String!) {
    matchedUser(username: $username) {
      badges {
        id
        displayName
        icon
      }
    }
  }
`;

const RECENT_SUBMISSIONS_QUERY = `
  query getRecentSubmissions($username: String!) {
    recentSubmissionList(username: $username, limit: 15) {
      title
      titleSlug
      timestamp
      statusDisplay
      lang
    }
  }
`;

export async function fetchUserData(username) {
  try {
    console.log(`[API] Fetching data for user: ${username}`);
    
    // Fetch user profile, stats, and submission calendar with retry/timeout
    const profileResponse = await fetchWithRetry(LEETCODE_API, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: USER_PROFILE_QUERY,
        variables: { username },
      }),
    });

    console.log(`[API] Profile response status: ${profileResponse.status}`);

    if (!profileResponse.ok) {
      const errorText = await profileResponse.text();
      console.error('[API] Profile request failed:', profileResponse.status, errorText);
      throw new Error(`API request failed: ${profileResponse.status}`);
    }

    const profileData = await profileResponse.json();
    console.log('[API] Profile data received:', profileData);
    
    if (profileData.errors) {
      console.error('[API] GraphQL errors:', profileData.errors);
      throw new Error(profileData.errors[0]?.message || 'GraphQL error');
    }
    
    if (!profileData.data?.matchedUser) {
      console.error('[API] No matched user in response');
      throw new Error('User not found or profile is private');
    }

    const matchedUser = profileData.data.matchedUser;
    
    // Parse submission calendar
    const submissionCalendar = matchedUser.submissionCalendar 
      ? JSON.parse(matchedUser.submissionCalendar)
      : {};

    // Fetch badges separately (non-critical)
    let badges = [];
    try {
      const badgesResponse = await fetch(LEETCODE_API, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: BADGES_QUERY,
          variables: { username },
        }),
      });
      
      if (badgesResponse.ok) {
        const badgesData = await badgesResponse.json();
        badges = badgesData.data?.matchedUser?.badges || [];
      }
    } catch (err) {
      console.warn('[API] Failed to fetch badges:', err);
    }

    // Fetch recent submissions separately (non-critical)
    let recentSubmissions = [];
    try {
      const submissionsResponse = await fetch(LEETCODE_API, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: RECENT_SUBMISSIONS_QUERY,
          variables: { username },
        }),
      });
      
      if (submissionsResponse.ok) {
        const submissionsData = await submissionsResponse.json();
        recentSubmissions = submissionsData.data?.recentSubmissionList || [];
      }
    } catch (err) {
      console.warn('[API] Failed to fetch recent submissions:', err);
    }
    
    console.log(`[API] Successfully fetched data for ${username}`);
    
    return {
      profile: {
        ...matchedUser,
        badges: badges,
        recentSubmissions: recentSubmissions
      },
      contestRanking: profileData.data.userContestRanking,
      submissionCalendar: submissionCalendar
    };
  } catch (error) {
    console.error('Error fetching LeetCode data:', error);
    throw error;
  }
}

export function calculateStreak(submissionCalendar) {
  if (!submissionCalendar || typeof submissionCalendar !== 'object') {
    return 0;
  }

  const now = new Date();
  const todayUTC = Math.floor(now.getTime() / 1000);
  const oneDay = 86400;
  let streak = 0;
  
  // Convert submission calendar to Set of dates with submissions
  const submissionDates = new Set();
  Object.entries(submissionCalendar).forEach(([timestamp, count]) => {
    if (count > 0) {
      const date = new Date(parseInt(timestamp) * 1000);
      const dateStr = date.toISOString().split('T')[0];
      submissionDates.add(dateStr);
    }
  });

  // Calculate current streak
  let currentDate = new Date();
  while (true) {
    const dateStr = currentDate.toISOString().split('T')[0];
    if (submissionDates.has(dateStr)) {
      streak++;
      currentDate.setDate(currentDate.getDate() - 1);
    } else {
      break;
    }
  }

  return streak;
}

export function isDailyChallengeCompleted(recentSubmissions) {
  if (!recentSubmissions || recentSubmissions.length === 0) {
    return false;
  }

  const today = new Date().toISOString().split('T')[0];
  
  // Check if any submission from today has "Daily Challenge" in title
  // Note: This might need adjustment based on how LeetCode marks daily challenges
  return recentSubmissions.some(submission => {
    const submissionDate = new Date(submission.timestamp * 1000)
      .toISOString()
      .split('T')[0];
    return submissionDate === today && 
           submission.statusDisplay === 'Accepted' &&
           (submission.title.includes('Daily') || 
            submission.title.toLowerCase().includes('challenge'));
  });
}
// GraphQL query for daily coding challenge
const DAILY_QUESTION_QUERY = `
  query questionOfToday {
    activeDailyCodingChallengeQuestion {
      date
      link
      question {
        questionId
        questionFrontendId
        title
        titleSlug
        difficulty
        likes
        dislikes
        topicTags {
          name
          slug
        }
      }
    }
  }
`;

/**
 * Fetch today's LeetCode daily question
 */
export async function getDailyQuestion() {
  try {
    const response = await fetch(LEETCODE_API, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: DAILY_QUESTION_QUERY,
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    
    if (result.errors) {
      console.error('GraphQL errors:', result.errors);
      throw new Error(result.errors[0]?.message || 'GraphQL query failed');
    }

    const dailyQuestion = result.data?.activeDailyCodingChallengeQuestion;
    
    if (!dailyQuestion) {
      throw new Error('No daily question data received');
    }

    return {
      date: dailyQuestion.date,
      link: `https://leetcode.com${dailyQuestion.link}`,
      questionId: dailyQuestion.question.questionFrontendId,
      title: dailyQuestion.question.title,
      titleSlug: dailyQuestion.question.titleSlug,
      difficulty: dailyQuestion.question.difficulty,
      likes: dailyQuestion.question.likes,
      dislikes: dailyQuestion.question.dislikes,
      topics: dailyQuestion.question.topicTags.map(tag => tag.name),
    };
  } catch (error) {
    console.error('Error fetching daily question:', error);
    return null;
  }
}
