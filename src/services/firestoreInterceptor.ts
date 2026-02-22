export * from '@firebase/firestore';

import {
  getDoc as _getDoc,
  getDocs as _getDocs,
  getDocFromServer as _getDocFromServer,
  getDocFromCache as _getDocFromCache,
  getDocsFromServer as _getDocsFromServer,
  getDocsFromCache as _getDocsFromCache,
  getCountFromServer as _getCountFromServer,
  getAggregateFromServer as _getAggregateFromServer,
  onSnapshot as _onSnapshot,
  setDoc as _setDoc,
  updateDoc as _updateDoc,
  addDoc as _addDoc,
  deleteDoc as _deleteDoc,
  writeBatch as _writeBatch,
  runTransaction as _runTransaction,
} from '@firebase/firestore';

import type { DocumentReference, Query, Firestore } from '@firebase/firestore';
import { UsageTracker } from '../components/debug/FirebaseMonitor';

function getCollName(ref: unknown): string {
  try {
    const maybePathRef = ref as { path?: string };
    if (maybePathRef.path) {
      const parts = maybePathRef.path.split('/');
      if (parts.length <= 2) {
        return parts[0] || '?';
      }
      return parts.filter((_, index) => index % 2 === 0).join('/');
    }

    const maybeQueryRef = ref as { _query?: { path?: { segments?: string[] } } };
    const segments = maybeQueryRef._query?.path?.segments;
    if (segments && segments.length > 0) {
      return segments.filter((_, index) => index % 2 === 0).join('/') || '?';
    }
  } catch (_) {
    return '?';
  }

  return '?';
}

function getDocPath(ref: unknown): string | undefined {
  try {
    const maybePathRef = ref as { path?: string };
    return maybePathRef.path;
  } catch (_) {
    return undefined;
  }
}

export async function getDoc(ref: DocumentReference) {
  const collection = getCollName(ref);
  const docPath = getDocPath(ref);
  const snapshot = await _getDoc(ref);
  UsageTracker.trackRead(1, collection, snapshot.metadata.fromCache, docPath);
  return snapshot;
}

export async function getDocFromServer(ref: DocumentReference) {
  const collection = getCollName(ref);
  const docPath = getDocPath(ref);
  const snapshot = await _getDocFromServer(ref);
  UsageTracker.trackRead(1, collection, false, docPath);
  return snapshot;
}

export async function getDocFromCache(ref: DocumentReference) {
  const collection = getCollName(ref);
  const docPath = getDocPath(ref);
  const snapshot = await _getDocFromCache(ref);
  UsageTracker.trackRead(1, collection, true, docPath);
  return snapshot;
}

export async function getDocs(queryRef: Query) {
  const collection = getCollName(queryRef);
  const snapshot = await _getDocs(queryRef);
  UsageTracker.trackRead(snapshot.size || 1, collection, snapshot.metadata.fromCache);
  return snapshot;
}

export async function getDocsFromServer(queryRef: Query) {
  const collection = getCollName(queryRef);
  const snapshot = await _getDocsFromServer(queryRef);
  UsageTracker.trackRead(snapshot.size || 1, collection, false);
  return snapshot;
}

export async function getDocsFromCache(queryRef: Query) {
  const collection = getCollName(queryRef);
  const snapshot = await _getDocsFromCache(queryRef);
  UsageTracker.trackRead(snapshot.size || 1, collection, true);
  return snapshot;
}

export async function getCountFromServer(queryRef: unknown) {
  const collection = getCollName(queryRef);
  const snapshot = await _getCountFromServer(queryRef as Parameters<typeof _getCountFromServer>[0]);
  UsageTracker.trackRead(1, collection, false);
  return snapshot;
}

export async function getAggregateFromServer(source: unknown, aggregateSpec: unknown) {
  const collection = getCollName(source);
  const snapshot = await _getAggregateFromServer(
    source as Parameters<typeof _getAggregateFromServer>[0],
    aggregateSpec as Parameters<typeof _getAggregateFromServer>[1],
  );
  UsageTracker.trackRead(1, collection, false);
  return snapshot;
}

export function onSnapshot(...args: unknown[]): () => void {
  const source = args[0];
  const collection = getCollName(source);
  UsageTracker.trackListener(1, collection);

  let isFirstSnapshot = true;

  const wrappedArgs = args.map((arg, index) => {
    if (index === 0) {
      return arg;
    }

    if (typeof arg === 'function') {
      const originalCallback = arg as (snapshot: any) => void;
      return (snapshot: any) => {
        if (isFirstSnapshot) {
          const readCount = snapshot.docs ? snapshot.docs.length : 1;
          const fromCache = snapshot.metadata?.fromCache ?? false;
          UsageTracker.trackRead(readCount || 1, collection, fromCache);
          isFirstSnapshot = false;
        } else if (snapshot.docChanges) {
          const changes = typeof snapshot.docChanges === 'function' ? snapshot.docChanges() : snapshot.docChanges;
          const serverChanges = changes.filter((change: any) => change.type !== 'metadata' && !change.doc?.metadata?.fromCache);
          if (serverChanges.length > 0) {
            UsageTracker.trackRead(serverChanges.length, collection, false);
          }
        } else {
          const fromCache = snapshot.metadata?.fromCache ?? false;
          if (!fromCache) {
            UsageTracker.trackRead(1, collection, false);
          }
        }

        originalCallback(snapshot);
      };
    }

    if (typeof arg === 'object' && arg !== null && typeof (arg as { next?: unknown }).next === 'function') {
      const observer = arg as { next: (snapshot: any) => void } & Record<string, unknown>;
      const originalNext = observer.next;
      return {
        ...observer,
        next: (snapshot: any) => {
          if (isFirstSnapshot) {
            const readCount = snapshot.docs ? snapshot.docs.length : 1;
            const fromCache = snapshot.metadata?.fromCache ?? false;
            UsageTracker.trackRead(readCount || 1, collection, fromCache);
            isFirstSnapshot = false;
          } else if (snapshot.docChanges) {
            const changes = typeof snapshot.docChanges === 'function' ? snapshot.docChanges() : snapshot.docChanges;
            const serverChanges = changes.filter((change: any) => change.type !== 'metadata' && !change.doc?.metadata?.fromCache);
            if (serverChanges.length > 0) {
              UsageTracker.trackRead(serverChanges.length, collection, false);
            }
          } else {
            const fromCache = snapshot.metadata?.fromCache ?? false;
            if (!fromCache) {
              UsageTracker.trackRead(1, collection, false);
            }
          }

          originalNext(snapshot);
        },
      };
    }

    return arg;
  });

  const unsubscribe = (_onSnapshot as (...innerArgs: unknown[]) => () => void)(...wrappedArgs);

  return () => {
    UsageTracker.trackListener(-1, collection);
    unsubscribe();
  };
}

export const setDoc: typeof _setDoc = (async (...args: any[]) => {
  const collection = getCollName(args[0]);
  const docPath = getDocPath(args[0]);
  const result = await (_setDoc as any)(...args);
  UsageTracker.trackWrite(1, collection, docPath);
  return result;
}) as typeof _setDoc;

export const updateDoc: typeof _updateDoc = (async (...args: any[]) => {
  const collection = getCollName(args[0]);
  const docPath = getDocPath(args[0]);
  const result = await (_updateDoc as any)(...args);
  UsageTracker.trackWrite(1, collection, docPath);
  return result;
}) as typeof _updateDoc;

export const addDoc: typeof _addDoc = (async (...args: any[]) => {
  const collection = getCollName(args[0]);
  const result = await (_addDoc as any)(...args);
  UsageTracker.trackWrite(1, collection);
  return result;
}) as typeof _addDoc;

export const deleteDoc: typeof _deleteDoc = (async (...args: any[]) => {
  const collection = getCollName(args[0]);
  const docPath = getDocPath(args[0]);
  const result = await (_deleteDoc as any)(...args);
  UsageTracker.trackDelete(1, collection, docPath);
  return result;
}) as typeof _deleteDoc;

export function writeBatch(db: Firestore) {
  const batch = _writeBatch(db);

  let setCount = 0;
  let updateCount = 0;
  let deleteCount = 0;
  let lastCollection = 'batch';

  const originalSet = batch.set.bind(batch);
  const originalUpdate = batch.update.bind(batch);
  const originalDelete = batch.delete.bind(batch);
  const originalCommit = batch.commit.bind(batch);

  batch.set = ((...args: any[]) => {
    setCount += 1;
    lastCollection = getCollName(args[0]);
    return (originalSet as any)(...args);
  }) as typeof batch.set;

  batch.update = ((...args: any[]) => {
    updateCount += 1;
    lastCollection = getCollName(args[0]);
    return (originalUpdate as any)(...args);
  }) as typeof batch.update;

  batch.delete = ((...args: any[]) => {
    deleteCount += 1;
    lastCollection = getCollName(args[0]);
    return (originalDelete as any)(...args);
  }) as typeof batch.delete;

  batch.commit = (async () => {
    const result = await originalCommit();
    if (setCount > 0) {
      UsageTracker.trackWrite(setCount, lastCollection);
    }
    if (updateCount > 0) {
      UsageTracker.trackWrite(updateCount, lastCollection);
    }
    if (deleteCount > 0) {
      UsageTracker.trackDelete(deleteCount, lastCollection);
    }
    return result;
  }) as typeof batch.commit;

  return batch;
}

export async function runTransaction(db: Firestore, updateFunction: any, options?: any) {
  const result = await _runTransaction(db, updateFunction, options);
  UsageTracker.trackWrite(1, 'transaction');
  return result;
}