import { useState, useEffect, useCallback } from 'react';

const DB_NAME = 'healthconnect_offline';
const DB_VERSION = 1;
const STORE_NAME = 'pending_actions';

interface PendingAction {
  id: string;
  table: string;
  operation: 'insert' | 'update' | 'delete';
  data: any;
  createdAt: string;
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    try {
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    } catch {
      reject(new Error('IndexedDB not available'));
    }
  });
}

export function useOfflineSync() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [pendingCount, setPendingCount] = useState(0);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    const goOnline = () => setIsOnline(true);
    const goOffline = () => setIsOnline(false);
    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);
    return () => {
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
    };
  }, []);

  const countPending = useCallback(async () => {
    try {
      const db = await openDB();
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const countReq = store.count();
      countReq.onsuccess = () => setPendingCount(countReq.result);
    } catch {
      setPendingCount(0);
    }
  }, []);

  useEffect(() => { countPending(); }, [countPending, isOnline]);

  const queueAction = useCallback(async (action: Omit<PendingAction, 'id' | 'createdAt'>) => {
    try {
      const db = await openDB();
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const id = crypto.randomUUID?.() || Date.now().toString();
      store.put({ ...action, id, createdAt: new Date().toISOString() });
      await new Promise((res, rej) => { tx.oncomplete = res; tx.onerror = rej; });
      countPending();
      return true;
    } catch {
      return false;
    }
  }, [countPending]);

  const syncAll = useCallback(async () => {
    if (!isOnline || syncing) return;
    setSyncing(true);
    try {
      const { supabase } = await import('@/integrations/supabase/client');
      const db = await openDB();
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const allReq = store.getAll();

      await new Promise((res) => { allReq.onsuccess = res; });
      const actions: PendingAction[] = allReq.result || [];

      for (const action of actions) {
        let error: any = null;
        if (action.operation === 'insert') {
          const res = await supabase.from(action.table).insert(action.data);
          error = res.error;
        } else if (action.operation === 'update') {
          const { id, ...rest } = action.data;
          const res = await supabase.from(action.table).update(rest).eq('id', id);
          error = res.error;
        }

        if (!error) {
          const delTx = db.transaction(STORE_NAME, 'readwrite');
          delTx.objectStore(STORE_NAME).delete(action.id);
          await new Promise((res) => { delTx.oncomplete = res; });
        }
      }
      countPending();
    } catch (err) {
      console.error('Offline sync error:', err);
    } finally {
      setSyncing(false);
    }
  }, [isOnline, syncing, countPending]);

  // Auto-sync when coming online
  useEffect(() => {
    if (isOnline && pendingCount > 0) {
      syncAll();
    }
  }, [isOnline, pendingCount, syncAll]);

  return { isOnline, pendingCount, syncing, queueAction, syncAll };
}
