import { useState, useEffect, useCallback, useRef } from 'react';

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

// Allowlist of tables that may be replayed from IndexedDB queue.
// Only user-owned, low-sensitivity tables are permitted. Any other table
// name in a queued action is dropped to prevent XSS/extension-injected
// writes to sensitive tables (payments, notifications, connections, etc.).
const ALLOWED_SYNC_TABLES = new Set<string>([
  'appointments',
  'symptoms_diary',
  'health_reminders',
  'medication_reminders',
  'vital_signs',
  'comprehensive_health_metrics',
]);

// Per-table allowlist of field names permitted in the queued payload.
// Anything else is stripped before replay.
const ALLOWED_FIELDS: Record<string, Set<string>> = {
  appointments: new Set(['id','patient_id','provider_id','date','time','reason','type','status','notes']),
  symptoms_diary: new Set(['id','patient_id','symptom','severity','notes','recorded_at']),
  health_reminders: new Set(['id','patient_id','title','description','remind_at','frequency','is_active']),
  medication_reminders: new Set(['id','patient_id','medication_id','remind_at','frequency','is_active']),
  vital_signs: new Set(['id','patient_id','heart_rate','blood_pressure_systolic','blood_pressure_diastolic','temperature','respiratory_rate','oxygen_saturation','glucose','weight','recorded_at','notes']),
  comprehensive_health_metrics: new Set(['id','patient_id','metric_type','value','unit','recorded_at','notes']),
};

function sanitizePayload(table: string, data: any): Record<string, unknown> | null {
  if (!data || typeof data !== 'object' || Array.isArray(data)) return null;
  const allowed = ALLOWED_FIELDS[table];
  if (!allowed) return null;
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(data)) {
    if (allowed.has(k)) out[k] = v;
  }
  return out;
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
  const syncingRef = useRef(false);

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
    if (!navigator.onLine || syncingRef.current) return;
    syncingRef.current = true;
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
        let drop = false;

        if (typeof action.table !== 'string' || !ALLOWED_SYNC_TABLES.has(action.table)) {
          // Unknown/unauthorized table — drop from queue silently.
          drop = true;
        } else if (action.operation === 'insert') {
          const clean = sanitizePayload(action.table, action.data);
          if (!clean) { drop = true; }
          else {
            const res = await (supabase.from(action.table as any) as any).insert(clean);
            error = res.error;
          }
        } else if (action.operation === 'update') {
          const clean = sanitizePayload(action.table, action.data);
          const rowId = action.data?.id;
          if (!clean || !rowId) { drop = true; }
          else {
            const { id: _omit, ...rest } = clean as any;
            const res = await (supabase.from(action.table as any) as any).update(rest).eq('id', rowId);
            error = res.error;
          }
        } else {
          drop = true;
        }

        if (drop || !error) {
          const delTx = db.transaction(STORE_NAME, 'readwrite');
          delTx.objectStore(STORE_NAME).delete(action.id);
          await new Promise((res) => { delTx.oncomplete = res; });
        }
      }

      countPending();
    } catch (err) {
      console.error('Offline sync error:', err);
    } finally {
      syncingRef.current = false;
      setSyncing(false);
    }
  }, [countPending]); // Stable deps - no syncing in deps

  // Auto-sync when coming online
  useEffect(() => {
    if (isOnline && pendingCount > 0) {
      syncAll();
    }
  }, [isOnline]); // Only trigger on online status change, not pendingCount

  return { isOnline, pendingCount, syncing, queueAction, syncAll };
}
