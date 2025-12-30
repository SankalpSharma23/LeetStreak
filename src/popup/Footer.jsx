import React from 'react';
import { Github, Bug } from 'lucide-react';

function Footer() {
  const handleGitHubClick = () => {
    chrome.tabs.create({ 
      url: 'https://github.com/SankalpSharma23/LeetStreak' 
    });
  };

  const handleBugReportClick = () => {
    chrome.tabs.create({ 
      url: 'https://github.com/SankalpSharma23/LeetStreak/issues' 
    });
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-surface/80 backdrop-blur-md border-t border-surfaceHover/50 py-2.5 px-4 flex items-center justify-end z-40">
      <div className="flex items-center gap-2">
        {/* Bug Report Button */}
        <button
          onClick={handleBugReportClick}
          className="p-2 rounded-lg bg-surface hover:bg-surfaceHover transition-all duration-200 group shadow-sm hover:shadow-md"
          title="Report a bug"
        >
          <Bug className="w-4 h-4 text-red-500 group-hover:scale-110 transition-transform" />
        </button>

        {/* GitHub Button */}
        <button
          onClick={handleGitHubClick}
          className="p-2 rounded-lg bg-surface hover:bg-surfaceHover transition-all duration-200 group shadow-sm hover:shadow-md"
          title="View on GitHub"
        >
          <Github className="w-4 h-4 text-text-muted group-hover:text-primary group-hover:scale-110 transition-all" />
        </button>
      </div>
    </div>
  );
}

export default Footer;
