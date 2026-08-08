import React, { useState, useEffect } from 'react';
import { AlertOctagon, RotateCcw } from 'lucide-react';

interface Props {
  children: React.ReactNode;
}

export const ErrorBoundary: React.FC<Props> = ({ children }) => {
  const [hasError, setHasError] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>('');

  useEffect(() => {
    const handleGlobalError = (event: ErrorEvent) => {
      console.error("Global Error Caught:", event.error);
      setHasError(true);
      setErrorMsg(event.message || 'An unexpected application error occurred');
    };

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      console.error("Unhandled Rejection:", event.reason);
      setHasError(true);
      setErrorMsg(typeof event.reason === 'string' ? event.reason : 'Async promise error occurred');
    };

    window.addEventListener('error', handleGlobalError);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);

    return () => {
      window.removeEventListener('error', handleGlobalError);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, []);

  if (hasError) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-slate-950 text-slate-100">
        <div className="glass-panel p-8 rounded-3xl max-w-md w-full border border-rose-500/30 text-center space-y-4 shadow-2xl">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-rose-500/20 text-rose-400 flex items-center justify-center">
            <AlertOctagon className="w-8 h-8" />
          </div>
          <h3 className="text-xl font-bold text-slate-100">Unexpected Error Encountered</h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            {errorMsg || "Veloura Quest encountered a temporary issue. Don't worry, your wallet and quest status remain secure."}
          </p>
          <button
            onClick={() => {
              setHasError(false);
              window.location.reload();
            }}
            className="w-full py-3 rounded-xl electric-gradient-btn text-xs font-bold text-white shadow-lg flex items-center justify-center gap-2"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Reload Application</span>
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};
