import React, { createContext, useContext, useMemo, useSyncExternalStore } from 'react';
import {
  getFirestoreUsageCounts,
  isFirestoreUsageMonitorEnabled,
  resetFirestoreUsageCounts,
  subscribeFirestoreUsage
} from '../debug/firestoreUsageMonitor';

type DebugContextValue = {
  enabled: boolean;
  firestore: {
    reads: number;
    writes: number;
    batches: number;
  };
  resetFirestoreUsage: () => void;
};

const DebugContext = createContext<DebugContextValue | undefined>(undefined);

export const DebugProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const enabled = isFirestoreUsageMonitorEnabled();
  const counts = useSyncExternalStore(
    subscribeFirestoreUsage,
    getFirestoreUsageCounts,
    getFirestoreUsageCounts
  );

  const value = useMemo(
    () => ({
      enabled,
      firestore: counts,
      resetFirestoreUsage: resetFirestoreUsageCounts
    }),
    [enabled, counts]
  );

  return <DebugContext.Provider value={value}>{children}</DebugContext.Provider>;
};

export const useDebug = () => {
  const context = useContext(DebugContext);
  if (!context) {
    throw new Error('useDebug must be used within a DebugProvider');
  }
  return context;
};