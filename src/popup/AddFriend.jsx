import React, { useState } from 'react';
import { UserPlus, Loader2, AlertTriangle, CheckCircle2 } from 'lucide-react';

function AddFriend({ onFriendAdded }) {
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!username.trim()) {
      setError('Please enter a username');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await chrome.runtime.sendMessage({
        type: 'ADD_FRIEND',
        username: username.trim()
      });

      if (response.success) {
        setSuccess(`${username} added successfully!`);
        setUsername('');
        // Immediately trigger refresh
        onFriendAdded();
        setTimeout(() => {
          setSuccess('');
        }, 1500);
      } else {
        setError(response.error || 'Failed to add friend');
      }
    } catch (err) {
      console.error('Error adding friend:', err);
      setError('Failed to add friend. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 bg-surface/50 border-b border-surfaceHover backdrop-blur-sm">
      <form onSubmit={handleSubmit} className="flex gap-2">
        <div className="flex-1 relative group">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted text-lg group-focus-within:text-primary transition-colors">👤</span>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Add friend..."
            disabled={loading}
            className="w-full px-4 py-3 pl-11 bg-background border-2 border-surfaceHover rounded-3xl focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary disabled:opacity-50 transition-all duration-300 text-sm text-text-main placeholder-text-muted shadow-sm hover:border-primary/50"
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="px-6 py-3 bg-primary hover:bg-primaryHover text-inverted font-bold rounded-3xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-primary/20 active:scale-95 text-sm"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
        </button>
      </form>
      
      {error && (
        <div className="mt-2 p-3 bg-red-500/10 rounded-2xl flex items-start gap-2 text-sm shadow-md border border-red-500/20 animate-shake">
          <AlertTriangle className="w-4 h-4 text-red-400" />
          <p className="text-red-400 flex-1">{error}</p>
        </div>
      )}
      
      {success && (
        <div className="mt-2 p-3 bg-secondary/10 rounded-2xl flex items-center gap-2 text-sm shadow-md border border-secondary/20 animate-fade-in">
          <CheckCircle2 className="w-4 h-4 text-secondary" />
          <p className="text-secondary font-medium">{success}</p>
        </div>
      )}
    </div>
  );
}

export default AddFriend;
