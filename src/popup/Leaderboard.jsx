import React, { useState } from 'react';
import FriendCard from './FriendCard';

function Leaderboard({ friends, myData, myUsername, onRefresh }) {
  const [selectedFriend, setSelectedFriend] = useState(null);
  const [timeFilter, setTimeFilter] = useState('all'); // 'all', 'week', 'month'

  // Helper to check if friend solved today
  const isSolvingToday = (submissionCalendar) => {
    if (!submissionCalendar) return false;
    const calendar = typeof submissionCalendar === 'string' ? JSON.parse(submissionCalendar) : submissionCalendar;
    const today = new Date().toISOString().split('T')[0];
    
    for (const [timestamp, count] of Object.entries(calendar)) {
      if (count > 0) {
        const date = new Date(parseInt(timestamp) * 1000).toISOString().split('T')[0];
        if (date === today) return true;
      }
    }
    return false;
  };

  // Get problems solved in a time period
  const getProblemsInPeriod = (submissionCalendar, period) => {
    if (!submissionCalendar) return 0;
    
    try {
      const calendar = typeof submissionCalendar === 'string' ? JSON.parse(submissionCalendar) : submissionCalendar;
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      let startDate;
      if (period === 'week') {
        // This week (Monday to Sunday)
        startDate = new Date(today);
        const dayOfWeek = today.getDay();
        const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
        startDate.setDate(today.getDate() - daysToMonday);
      } else if (period === 'month') {
        // This month
        startDate = new Date(today.getFullYear(), today.getMonth(), 1);
      } else {
        return 0;
      }
      
      startDate.setHours(0, 0, 0, 0);
      const startTimestamp = Math.floor(startDate.getTime() / 1000);
      
      let count = 0;
      for (const [timestamp, problemCount] of Object.entries(calendar)) {
        if (parseInt(timestamp) >= startTimestamp && problemCount > 0) {
          count += problemCount;
        }
      }
      
      return count;
    } catch (error) {
      console.error('Error calculating period problems:', error);
      return 0;
    }
  };

  // Remove current user from friends list if they exist there, then add myData
  const friendsWithoutMe = friends.filter(f => f.profile?.username !== myUsername);
  const allFriends = myData ? [...friendsWithoutMe, myData] : friendsWithoutMe;

  // Sort friends based on selected time filter
  const sortedFriends = [...allFriends].sort((a, b) => {
    if (timeFilter === 'all') {
      return (b.stats?.total || 0) - (a.stats?.total || 0);
    } else if (timeFilter === 'week') {
      const aWeekCount = getProblemsInPeriod(a.submissionCalendar, 'week');
      const bWeekCount = getProblemsInPeriod(b.submissionCalendar, 'week');
      return bWeekCount - aWeekCount;
    } else if (timeFilter === 'month') {
      const aMonthCount = getProblemsInPeriod(a.submissionCalendar, 'month');
      const bMonthCount = getProblemsInPeriod(b.submissionCalendar, 'month');
      return bMonthCount - aMonthCount;
    }
    return 0;
  });

  const handleCardClick = (friend) => {
    if (!friend || !friend.profile) return;
    setSelectedFriend(selectedFriend?.profile?.username === friend.profile.username ? null : friend);
  };

  return (
    <div className="bg-background">
      {/* Filter Tabs */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b border-surfaceHover px-4 py-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setTimeFilter('all')}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-semibold transition-all ${
              timeFilter === 'all' 
                ? 'bg-primary text-inverted shadow-lg' 
                : 'bg-surface text-text-muted hover:text-text-main'
            }`}
          >
            All Time
          </button>
          <button
            onClick={() => setTimeFilter('week')}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-semibold transition-all ${
              timeFilter === 'week' 
                ? 'bg-primary text-inverted shadow-lg' 
                : 'bg-surface text-text-muted hover:text-text-main'
            }`}
          >
            This Week
          </button>
          <button
            onClick={() => setTimeFilter('month')}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-semibold transition-all ${
              timeFilter === 'month' 
                ? 'bg-primary text-inverted shadow-lg' 
                : 'bg-surface text-text-muted hover:text-text-main'
            }`}
          >
            This Month
          </button>
        </div>
        
        {/* Active Today Indicator */}
        {allFriends.filter(f => f && f.submissionCalendar && isSolvingToday(f.submissionCalendar)).length > 0 && (
          <div className="mt-2 px-3 py-1.5 bg-secondary/10 border border-secondary/30 rounded-lg flex items-center gap-2">
            <span className="text-lg animate-bounce">🔥</span>
            <span className="text-xs text-secondary font-semibold">
              {allFriends.filter(f => f && f.submissionCalendar && isSolvingToday(f.submissionCalendar)).length} {
                allFriends.filter(f => f && f.submissionCalendar && isSolvingToday(f.submissionCalendar)).length === 1 ? 'person' : 'people'
              } solving today!
            </span>
          </div>
        )}
      </div>

      {sortedFriends.length === 0 ? (
        <div className="p-8 text-center text-text-muted animate-fade-in">
          <p>No friends to display</p>
        </div>
      ) : (
        <div className="p-4 space-y-2.5 animate-slide-up">
          {sortedFriends.filter(f => f && f.profile).map((friend, index) => {
            const isActiveToday = friend.submissionCalendar && isSolvingToday(friend.submissionCalendar);
            
            // Calculate filtered stats for display
            let displayStats = friend.stats;
            if (timeFilter !== 'all') {
              const problemsInPeriod = getProblemsInPeriod(friend.submissionCalendar, timeFilter);
              displayStats = {
                ...friend.stats,
                total: problemsInPeriod,
                // Note: We don't have difficulty breakdown for time periods, so we show total only
                _filteredByTime: true
              };
            }
            
            return (
              <div key={friend.profile.username}>
                <FriendCard
                  friend={{ ...friend, stats: displayStats }}
                  rank={index + 1}
                  isExpanded={selectedFriend?.profile?.username === friend.profile.username}
                  onClick={() => handleCardClick(friend)}
                  isCurrentUser={myUsername && friend.profile.username === myUsername}
                  mySubmissionCalendar={myData?.submissionCalendar}
                  timeFilter={timeFilter}
                />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default Leaderboard;
