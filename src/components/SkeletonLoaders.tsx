import React from 'react';

export const DashboardSkeleton: React.FC = () => (
  <div className="space-y-6 animate-pulse">
    <div className="h-44 glass-panel rounded-3xl bg-slate-900/60 border border-slate-800" />
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="h-28 glass-panel rounded-2xl bg-slate-900/60 border border-slate-800" />
      ))}
    </div>
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {[1, 2, 3, 4, 5].map((i) => (
        <div key={i} className="h-40 glass-panel rounded-2xl bg-slate-900/60 border border-slate-800" />
      ))}
    </div>
  </div>
);

export const TaskListSkeleton: React.FC = () => (
  <div className="space-y-4 animate-pulse">
    {[1, 2, 3, 4, 5].map((i) => (
      <div key={i} className="h-28 glass-panel rounded-3xl bg-slate-900/60 border border-slate-800" />
    ))}
  </div>
);

export const TableSkeleton: React.FC = () => (
  <div className="space-y-3 animate-pulse">
    {[1, 2, 3, 4, 5].map((i) => (
      <div key={i} className="h-14 glass-panel rounded-xl bg-slate-900/60 border border-slate-800" />
    ))}
  </div>
);
