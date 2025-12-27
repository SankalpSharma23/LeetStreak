import React, { useState, useEffect } from 'react';
import { Trophy, BarChart2 } from 'lucide-react';
import FriendManager from './FriendManager';
import Footer from '../popup/Footer';

function App() {
  const [friends, setFriends] = useState({});
  const [loading, setLoading] = useState(true);
  const [storageInfo, setStorageInfo] = useState(null);

  useEffect(() => {
    loadFriends();
    loadStorageInfo();
  }, []);

  const loadFriends = async () => {
    try {
      const response = await chrome.runtime.sendMessage({
        type: 'GET_FRIENDS'
      });

      if (response.success) {
        setFriends(response.friends);
      }
    } catch (err) {
      console.error('Error loading friends:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadStorageInfo = async () => {
    const { getStorageInfo } = await import('../shared/storage.js');
    const info = await getStorageInfo();
    setStorageInfo(info);
  };

  const handleFriendRemoved = () => {
    loadFriends();
    loadStorageInfo();
  };

  const handleFriendAdded = () => {
    loadFriends();
    loadStorageInfo();
  };

  const friendsList = Object.values(friends);

  return (
    <div className="min-h-screen bg-gray-50 pb-12">
      {/* Header */}
      <div className="bg-gradient-to-r from-leetcode-medium to-leetcode-easy text-white shadow-lg">
        <div className="container mx-auto px-8 py-6">
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Trophy className="w-8 h-8" />
            LeetFriends Settings
          </h1>
          <p className="text-sm opacity-90 mt-2">
            Manage your friend list and extension preferences
          </p>
        </div>
      </div>

      <div className="container mx-auto px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2">
            <FriendManager
              friends={friendsList}
              loading={loading}
              onFriendRemoved={handleFriendRemoved}
              onFriendAdded={handleFriendAdded}
            />
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Stats Card */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                <BarChart2 className="w-5 h-5" />
                Statistics
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">Total Friends:</span>
                  <span className="font-semibold">{friendsList.length}</span>
                </div>
                {storageInfo && (
                  <>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Storage Used:</span>
                      <span className="font-semibold">
                        {(storageInfo.bytesUsed / 1024).toFixed(2)} KB
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Storage:</span>
                      <span className="font-semibold">{storageInfo.percentUsed}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-leetcode-medium h-2 rounded-full transition-all"
                        style={{ width: `${storageInfo.percentUsed}%` }}
                      ></div>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Info Card */}
            <div className="bg-blue-50 rounded-lg p-6 border border-blue-200">
              <h3 className="font-bold text-lg mb-2">ℹ️ How it Works</h3>
              <ul className="text-sm space-y-2 text-gray-700">
                <li>• Data refreshes every 30 minutes</li>
                <li>• Streaks are calculated using UTC timezone</li>
                <li>• Click a friend card to see detailed stats</li>
                <li>• Get notifications for streak milestones</li>
              </ul>
            </div>

            {/* Actions */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="font-bold text-lg mb-4">⚙️ Actions</h3>
              <button
                onClick={async () => {
                  if (confirm('Are you sure you want to clear all data?')) {
                    const { clearAllData } = await import('../shared/storage.js');
                    await clearAllData();
                    window.location.reload();
                  }
                }}
                className="w-full py-2 px-4 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg transition-colors"
              >
                🗑️ Clear All Data
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <Footer />
    </div>
  );
}

export default App;
