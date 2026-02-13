export type FirestoreUsageCounts = {
  reads: number;
  writes: number;
  batches: number;
};

const HUD_FLAG_KEY = 'showFirestoreHud';

const isFlagEnabled = () => {
  if (typeof window === 'undefined') {
    return false;
  }

  const value = window.localStorage.getItem(HUD_FLAG_KEY);
  return value === 'true' || value === '1';
};

const isEnabled = () => import.meta.env.DEV || isFlagEnabled();

let counts: FirestoreUsageCounts = {
  reads: 0,
  writes: 0,
  batches: 0
};

type Listener = (counts: FirestoreUsageCounts) => void;
const listeners = new Set<Listener>();

const emit = () => {
  if (!isEnabled()) {
    return;
  }

  const snapshot = { ...counts };
  listeners.forEach(listener => listener(snapshot));
};

export const isFirestoreUsageMonitorEnabled = () => isEnabled();

export const getFirestoreUsageCounts = () => counts;

export const subscribeFirestoreUsage = (listener: Listener) => {
  if (!isEnabled()) {
    return () => undefined;
  }

  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

export const resetFirestoreUsageCounts = () => {
  if (!isEnabled()) {
    return;
  }

  counts = {
    reads: 0,
    writes: 0,
    batches: 0
  };
  emit();
};

export const incrementFirestoreReads = (delta = 1) => {
  if (!isEnabled() || delta <= 0) {
    return;
  }

  counts = {
    ...counts,
    reads: counts.reads + delta
  };
  emit();
};

export const incrementFirestoreWrites = (delta = 1) => {
  if (!isEnabled() || delta <= 0) {
    return;
  }

  counts = {
    ...counts,
    writes: counts.writes + delta
  };
  emit();
};

export const incrementFirestoreBatches = (delta = 1) => {
  if (!isEnabled() || delta <= 0) {
    return;
  }

  counts = {
    ...counts,
    batches: counts.batches + delta
  };
  emit();
};