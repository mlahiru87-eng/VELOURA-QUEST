import React, { useState, useEffect } from 'react';
import { WifiOff, Wifi } from 'lucide-react';

export const OfflineBanner: React.FC = () => {
  const [isOffline, setIsOffline] = useState<boolean>(!navigator.onLine);
  const [showReconnected, setShowReconnected] = useState<boolean>(false);

  useEffect(() => {
    const handleOffline = () => {
      setIsOffline(true);
      setShowReconnected(false);
    };

    const handleOnline = () => {
      setIsOffline(false);
      setShowReconnected(true);
      setTimeout(() => setShowReconnected(false), 3000);
    };

    window.addEventListener('offline', handleOffline);
    window.addEventListener('online', handleOnline);

    return () => {
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('online', handleOnline);
    };
  }, []);

  if (!isOffline && !showReconnected) return null;

  return (
    <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 z-[9990] animate-bounce">
      {isOffline ? (
        <div className="px-4 py-2.5 rounded-full bg-slate-900/90 border border-amber-500/40 text-amber-300 text-xs font-bold shadow-2xl backdrop-blur-md flex items-center gap-2">
          <WifiOff className="w-4 h-4 text-amber-400" />
          <span>Offline Mode — Changes will sync automatically when online</span>
        </div>
      ) : (
        <div className="px-4 py-2.5 rounded-full bg-slate-900/90 border border-emerald-500/40 text-emerald-300 text-xs font-bold shadow-2xl backdrop-blur-md flex items-center gap-2">
          <Wifi className="w-4 h-4 text-emerald-400" />
          <span>Reconnected to Veloura Quest Cloud</span>
        </div>
      )}
    </div>
  );
};
