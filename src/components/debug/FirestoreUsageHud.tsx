import React, { useEffect, useState } from 'react';
import {
  getFirestoreUsageCounts,
  isFirestoreUsageMonitorEnabled,
  resetFirestoreUsageCounts,
  subscribeFirestoreUsage,
  type FirestoreUsageCounts
} from '../../debug/firestoreUsageMonitor';

const FirestoreUsageHud: React.FC = () => {
  const [collapsed, setCollapsed] = useState(false);
  const [counts, setCounts] = useState<FirestoreUsageCounts>(() => getFirestoreUsageCounts());

  useEffect(() => {
    if (!isFirestoreUsageMonitorEnabled()) {
      return;
    }

    setCounts(getFirestoreUsageCounts());
    return subscribeFirestoreUsage((nextCounts) => {
      setCounts(nextCounts);
    });
  }, []);

  if (!isFirestoreUsageMonitorEnabled()) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-[70]">
      <div className="bg-gray-900/95 text-white rounded-lg shadow-lg border border-gray-700 backdrop-blur-sm">
        <div className="flex items-center justify-between px-3 py-2 gap-2">
          <span className="text-xs font-semibold tracking-wide">Firestore</span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => resetFirestoreUsageCounts()}
              className="text-[10px] px-2 py-0.5 rounded bg-gray-700 hover:bg-gray-600"
            >
              Reset
            </button>
            <button
              onClick={() => setCollapsed(prev => !prev)}
              className="text-[11px] w-5 h-5 rounded bg-gray-700 hover:bg-gray-600"
              aria-label={collapsed ? 'Expand Firestore usage monitor' : 'Collapse Firestore usage monitor'}
            >
              {collapsed ? '+' : '−'}
            </button>
          </div>
        </div>

        {!collapsed && (
          <div className="px-3 pb-3 grid grid-cols-3 gap-2 min-w-[200px]">
            <div className="bg-gray-800 rounded px-2 py-1 text-center">
              <div className="text-[10px] text-gray-300">Reads</div>
              <div className="text-sm font-bold text-blue-300">{counts.reads}</div>
            </div>
            <div className="bg-gray-800 rounded px-2 py-1 text-center">
              <div className="text-[10px] text-gray-300">Writes</div>
              <div className="text-sm font-bold text-emerald-300">{counts.writes}</div>
            </div>
            <div className="bg-gray-800 rounded px-2 py-1 text-center">
              <div className="text-[10px] text-gray-300">Batches</div>
              <div className="text-sm font-bold text-amber-300">{counts.batches}</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default FirestoreUsageHud;