import React from 'react';
import { useAuth } from '../context/AuthContext';
import { Megaphone, X, AlertTriangle, Info } from 'lucide-react';

export const AnnouncementBanner: React.FC = () => {
  const { settings } = useAuth();
  const [dismissed, setDismissed] = React.useState(false);

  const banner = settings?.announcementBanner;

  if (!banner || !banner.active || !banner.message || dismissed) {
    return null;
  }

  const getStyle = () => {
    switch (banner.type) {
      case 'warning':
        return 'bg-amber-950/80 border-amber-500/30 text-amber-200';
      case 'alert':
        return 'bg-rose-950/80 border-rose-500/30 text-rose-200';
      case 'info':
      default:
        return 'bg-purple-950/80 border-purple-500/30 text-purple-200';
    }
  };

  const getIcon = () => {
    switch (banner.type) {
      case 'warning':
      case 'alert':
        return <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />;
      case 'info':
      default:
        return <Info className="w-4 h-4 text-purple-400 shrink-0" />;
    }
  };

  return (
    <div className={`w-full border-b px-4 py-2.5 backdrop-blur-md transition-all flex items-center justify-between gap-3 text-xs sm:text-sm font-medium ${getStyle()}`}>
      <div className="flex items-center gap-2 max-w-5xl mx-auto">
        <Megaphone className="w-4 h-4 text-purple-400 animate-bounce shrink-0" />
        <span className="truncate">{banner.message}</span>
      </div>
      <button 
        onClick={() => setDismissed(true)} 
        className="p-1 hover:bg-white/10 rounded-lg text-slate-400 hover:text-white transition-colors"
        title="Dismiss announcement"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
};
