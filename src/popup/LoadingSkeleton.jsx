import React from 'react';

function LoadingSkeleton() {
  return (
    <div className="w-[400px] h-[600px] bg-gradient-to-br from-background via-background to-surface/30 flex flex-col items-center justify-center relative overflow-hidden">
      {/* Animated Background Gradient */}
      <div className="absolute inset-0 opacity-30">
        <div className="absolute top-0 left-0 w-72 h-72 bg-primary/20 rounded-full blur-3xl animate-float"></div>
        <div className="absolute bottom-0 right-0 w-72 h-72 bg-secondary/20 rounded-full blur-3xl animate-float-delayed"></div>
      </div>

      {/* Main Content */}
      <div className="relative z-10 flex flex-col items-center">
        {/* Custom Loader */}
        <div className="loader mb-8"></div>

        {/* Loading Text */}
        <h2 className="text-xl font-bold text-text-main mb-2 animate-fade-in">
          Loading LeetStreak
        </h2>
        <p className="text-sm text-text-muted animate-fade-in" style={{ animationDelay: '0.15s' }}>
          Fetching your coding journey...
        </p>
      </div>

      <style>{`
        .loader {
          width: 65px;
          height: 30px;
          position: relative;
        }
        .loader:before {
          content: "";
          position: absolute;
          border-radius: 50px;
          box-shadow: 0 0 0 3px inset var(--color-primary);
          animation: l3 0.75s infinite alternate;
        }
        @keyframes l3 {
          0% {
            inset: 0 35px 0 0;
          }
          50% {
            inset: 0 0 0 0;
          }
          100% {
            inset: 0 0 0 35px;
          }
        }
        @keyframes float {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(30px, -30px) scale(1.1); }
          66% { transform: translate(-20px, 20px) scale(0.9); }
        }
        @keyframes float-delayed {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(-30px, 30px) scale(0.9); }
          66% { transform: translate(20px, -20px) scale(1.1); }
        }
        .animate-float {
          animation: float 8s ease-in-out infinite;
        }
        .animate-float-delayed {
          animation: float-delayed 8s ease-in-out infinite;
          animation-delay: -4s;
        }
      `}</style>
    </div>
  );
}

export default LoadingSkeleton;
