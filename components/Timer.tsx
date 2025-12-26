
import React from 'react';

interface TimerProps {
  seconds: number;
}

export const Timer: React.FC<TimerProps> = ({ seconds }) => {
  const formatTime = (s: number) => {
    const mins = Math.floor(s / 60);
    const secs = s % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="bg-slate-800/50 backdrop-blur px-4 py-2 rounded-lg border border-slate-700/50 flex items-center gap-2">
      <svg className="w-5 h-5 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      <span className="font-mono text-xl text-indigo-100">{formatTime(seconds)}</span>
    </div>
  );
};
