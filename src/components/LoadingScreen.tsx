import React from 'react';

export const LoadingScreen: React.FC = () => {
  return (
    <div
      id="app-loading-screen"
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#050206] text-slate-100 overflow-hidden select-none animate-screen-fade"
    >
      {/* Background Lighting Gradients */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[28rem] h-[28rem] sm:w-[36rem] sm:h-[36rem] bg-rose-600/20 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute top-1/4 left-1/3 w-72 h-72 bg-red-700/15 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-1/3 right-1/4 w-80 h-80 bg-rose-900/20 rounded-full blur-[100px] pointer-events-none" />

      {/* Floating Red Ambient Particles */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {[...Array(12)].map((_, i) => (
          <div
            key={i}
            className="absolute rounded-full bg-rose-500/30 blur-[1px]"
            style={{
              width: `${(i % 3) * 3 + 4}px`,
              height: `${(i % 3) * 3 + 4}px`,
              top: `${12 + (i * 7) % 78}%`,
              left: `${8 + (i * 13) % 84}%`,
              animation: `particleFloat ${4.5 + (i % 4)}s ease-in-out infinite`,
              animationDelay: `${i * 0.35}s`
            }}
          />
        ))}
      </div>

      {/* Main Center Container */}
      <div className="relative z-10 flex flex-col items-center max-w-xs sm:max-w-sm px-6 text-center space-y-6">
        {/* Logo Container with Soft Rotating Ring Behind */}
        <div className="relative flex items-center justify-center">
          {/* Soft Rotating Light Ring behind Logo */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 sm:w-56 sm:h-56 rounded-full border border-rose-500/25 bg-gradient-to-r from-rose-600/20 via-transparent to-red-500/20 animate-ring-spin pointer-events-none blur-[2px]" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-40 h-40 sm:w-48 sm:h-48 rounded-full bg-rose-600/15 blur-2xl pointer-events-none" />

          {/* Logo Entrance & Breathing/Floating Wrapper */}
          <div className="relative animate-logo-entrance">
            <div className="animate-logo-float-breath">
              <img
                src="/veloura-logo.png"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = 'https://lh3.googleusercontent.com/d/1ztGHTiifIgk6YlzX0LqprR3UF5mTQc6f';
                }}
                alt="Veloura Quest Logo"
                className="w-44 sm:w-52 md:w-56 object-contain h-auto drop-shadow-[0_0_25px_rgba(225,29,72,0.65)]"
              />
            </div>
          </div>
        </div>

        {/* Loading Text */}
        <div className="space-y-1.5 animate-text-pulse">
          <h1 className="text-xl sm:text-2xl font-black tracking-[0.2em] text-transparent bg-clip-text bg-gradient-to-r from-rose-300 via-rose-500 to-red-400 uppercase drop-shadow">
            VELOURA QUEST
          </h1>
          <p className="text-xs sm:text-sm font-medium text-slate-300 tracking-wider">
            Preparing Your Quest...
          </p>
        </div>

        {/* Loading Progress Bar */}
        <div className="w-full max-w-[180px] sm:max-w-[220px] space-y-2 pt-1">
          <div className="h-1.5 w-full bg-slate-900/90 rounded-full overflow-hidden border border-rose-900/40 relative shadow-inner">
            <div className="h-full w-full bg-gradient-to-r from-rose-600 via-red-500 to-rose-400 rounded-full animate-progress-infinite shadow-[0_0_12px_rgba(225,29,72,0.8)]" />
          </div>
        </div>
      </div>
    </div>
  );
};
