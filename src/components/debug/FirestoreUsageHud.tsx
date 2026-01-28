import React from 'react';
import { useDebug } from '../../contexts/DebugContext';

const FirestoreUsageHud: React.FC = () => {
  const { enabled, firestore, resetFirestoreUsage } = useDebug();

  if (!enabled) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 rounded-lg border border-slate-200/70 bg-white/95 p-3 text-xs shadow-lg backdrop-blur dark:border-slate-700/60 dark:bg-slate-900/90">
      <div className="flex items-center justify-between gap-4">
        <div className="font-semibold text-slate-700 dark:text-slate-200">Firestore</div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={resetFirestoreUsage}
            className="rounded border border-slate-200/70 px-2 py-0.5 text-[10px] text-slate-600 transition hover:bg-slate-100 dark:border-slate-700/60 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            Reset
          </button>
          <button
            type="button"
            onClick={() => {
              resetFirestoreUsage();
              window.location.reload();
            }}
            className="rounded border border-slate-200/70 px-2 py-0.5 text-[10px] text-slate-600 transition hover:bg-slate-100 dark:border-slate-700/60 dark:text-slate-300 dark:hover:bg-slate-800"
            title="Reset counters and reload the app to measure cold-start reads"
          >
            Reset+Reload
          </button>
        </div>
      </div>
      <div className="mt-2 grid gap-1 text-slate-600 dark:text-slate-300">
        <div className="flex items-center justify-between gap-6">
          <span>Reads</span>
          <span className="font-mono font-semibold text-slate-800 dark:text-slate-100">{firestore.reads}</span>
        </div>
        <div className="flex items-center justify-between gap-6">
          <span>Writes</span>
          <span className="font-mono font-semibold text-slate-800 dark:text-slate-100">{firestore.writes}</span>
        </div>
        <div className="flex items-center justify-between gap-6">
          <span>Batches</span>
          <span className="font-mono font-semibold text-slate-800 dark:text-slate-100">{firestore.batches}</span>
        </div>
      </div>
    </div>
  );
};

export default FirestoreUsageHud;