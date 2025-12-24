import React, { useState } from 'react';
import { getTimeSinceUpdate } from '../shared/streak-calculator';

function FriendManager({ friends, loading, onFriendRemoved, onFriendAdded }) {
  const [newUsername, setNewUsername] = useState('');
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleAddFriend = async (e) => {
    e.preventDefault();
    
    if (!newUsername.trim()) {
      setError('Please enter a username');
      return;
    }

    setAdding(true);
    setError('');
    setSuccess('');

    try {
      const response = await chrome.runtime.sendMessage({
        type: 'ADD_FRIEND',
        username: newUsername.trim()
      });

      if (response.success) {
        setSuccess(`${newUsername} added successfully!`);
        setNewUsername('');
        setTimeout(() => {
          setSuccess('');
        }, 3000);
        onFriendAdded();
      } else {
        setError(response.error || 'Failed to add friend');
      }
    } catch (err) {
      console.error('Error adding friend:', err);
      setError('Failed to add friend. Please try again.');
    } finally {
      setAdding(false);
    }
  };

  const handleRemoveFriend = async (username) => {
    if (!confirm(`Remove ${username} from your friends list?`)) {
      return;
    }

    try {
      const response = await chrome.runtime.sendMessage({
        type: 'REMOVE_FRIEND',
        username
      });

      if (response.success) {
        onFriendRemoved();
      } else {
        alert('Failed to remove friend: ' + response.error);
      }
    } catch (err) {
      console.error('Error removing friend:', err);
      alert('Failed to remove friend');
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-2xl font-bold mb-6">👥 Friends List</h2>

      {/* Add Friend Form */}
      <div className="mb-6 pb-6 border-b border-gray-200">
        <h3 className="font-semibold mb-3">Add New Friend</h3>
        <form onSubmit={handleAddFriend} className="flex gap-3">
          <input
            type="text"
            value={newUsername}
            onChange={(e) => setNewUsername(e.target.value)}
            placeholder="Enter LeetCode username..."
            disabled={adding}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-leetcode-medium focus:border-transparent disabled:bg-gray-100"
          />
          <button
            type="submit"
            disabled={adding}
            className="px-6 py-2 bg-leetcode-medium hover:bg-yellow-500 text-white font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {adding ? 'Adding...' : '+ Add Friend'}
          </button>
        </form>
        
        {error && (
          <p className="mt-2 text-sm text-red-600">{error}</p>
        )}
        
        {success && (
          <p className="mt-2 text-sm text-green-600">✓ {success}</p>
        )}
      </div>

      {/* Friends List */}
      {loading ? (
        <div className="text-center py-8 text-gray-500">
          Loading friends...
        </div>
      ) : friends.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <div className="text-6xl mb-4">👥</div>
          <h3 className="text-lg font-semibold mb-2">No friends added yet</h3>
          <p className="text-sm">Add your first friend using the form above!</p>
        </div>
      ) : (
        <div className="space-y-3">
          <h3 className="font-semibold mb-3">
            Current Friends ({friends.length})
          </h3>
          {friends.map((friend) => (
            <div
              key={friend.profile.username}
              className="flex items-center gap-4 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              {/* Avatar */}
              <img
                src={friend.profile.avatar || 'https://via.placeholder.com/56'}
                alt={friend.profile.username}
                className="w-14 h-14 rounded-full border-2 border-gray-200"
              />

              {/* Info */}
              <div className="flex-1">
                <h4 className="font-bold text-lg">{friend.profile.username}</h4>
                {friend.profile.realName && (
                  <p className="text-sm text-gray-600">{friend.profile.realName}</p>
                )}
                <p className="text-xs text-gray-500 mt-1">
                  Last updated: {getTimeSinceUpdate(friend.lastUpdated)}
                </p>
              </div>

              {/* Stats */}
              <div className="flex gap-6 text-center mr-4">
                <div>
                  <div className="text-2xl font-bold text-orange-500">
                    {friend.stats.streak}
                  </div>
                  <div className="text-xs text-gray-500">🔥 Streak</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-gray-700">
                    {friend.stats.total}
                  </div>
                  <div className="text-xs text-gray-500">Total</div>
                </div>
              </div>

              {/* Remove Button */}
              <button
                onClick={() => handleRemoveFriend(friend.profile.username)}
                className="px-4 py-2 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg transition-colors"
                title="Remove friend"
              >
                Remove
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default FriendManager;
