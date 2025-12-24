import React from 'react';

function LoadingSkeleton({ count = 3 }) {
  return (
    <div className="w-[400px] h-[600px] bg-background flex flex-col items-center justify-center">
      {/* Loading Animation */}
      <div className="mb-8">
        <div className="loader"></div>
      </div>

      {/* Loading Text */}
      <h2 className="text-xl font-bold text-text-main mb-2 animate-fade-in">Loading LeetStreak</h2>
      <p className="text-sm text-text-muted mb-8 animate-fade-in" style={{ animationDelay: '0.2s' }}>
        Fetching your coding journey...
      </p>

      {/* Loading Bar */}
      <div className="w-64 h-2 bg-surfaceHover rounded-full overflow-hidden">
        <div className="h-full bg-gradient-to-r from-primary via-primaryHover to-primary rounded-full animate-loading-bar"></div>
      </div>

      <style>{`
        .loader {
          width: 40px;
          height: 20px;
          --c:no-repeat radial-gradient(farthest-side, var(--color-primary) 93%, #0000);
          background:
            var(--c) 0    0,
            var(--c) 50%  0;
          background-size: 8px 8px;
          position: relative;
          clip-path: inset(-200% -100% 0 0);
          animation: l6-0 1.5s linear infinite;
        }
        .loader:before {
          content: "";
          position: absolute;
          width: 8px;
          height: 12px;
          background: var(--color-primary);
          left: -16px;
          top: 0;
          animation: 
            l6-1 1.5s linear infinite,
            l6-2 0.5s cubic-bezier(0, 200, 0.8, 200) infinite;
        }
        .loader:after {
          content: "";
          position: absolute;
          inset: 0 0 auto auto;
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: var(--color-primary); 
          animation: l6-3 1.5s linear infinite;
        }
        @keyframes l6-0 {
          0%, 30%  { background-position: 0 0, 50% 0; }
          33%      { background-position: 0 100%, 50% 0; }
          41%, 63% { background-position: 0 0, 50% 0; }
          66%      { background-position: 0 0, 50% 100%; }
          74%, 100% { background-position: 0 0, 50% 0; }
        }
        @keyframes l6-1 {
          90%  { transform: translateY(0); }
          95%  { transform: translateY(15px); }
          100% { transform: translateY(15px); left: calc(100% - 8px); }
        }
        @keyframes l6-2 {
          100% { top: -0.1px; }
        }
        @keyframes l6-3 {
          0%, 80%, 100% { transform: translate(0); }
          90%           { transform: translate(26px); }
        }
        @keyframes loading-bar {
          0%   { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
        .animate-loading-bar {
          animation: loading-bar 1.5s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}

export default LoadingSkeleton;
