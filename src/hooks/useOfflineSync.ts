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
// Anything else is stripped before replay. Column names verified against
// the live schema (types.ts) 2026-10-20 — vital_signs/health tables key
// the patient as user_id; symptoms_diary uses patient_id.
const ALLOWED_FIELDS: Record<string, Set<string>> = {
  appointments: new Set(['id','patient_id','provider_id','date','time','reason','type','status','notes','dependent_id','booked_for_name','duration','patient_visit_type','consultation_fee']),
  symptoms_diary: new Set(['id','patient_id','symptoms','severity','notes','date']),
  health_reminders: new Set(['id','user_id','title','description','frequency','is_active','scheduled_time','next_trigger','type','priority']),
  medication_reminders: new Set(['id','user_id','medication_name','dosage','frequency','reminder_time','start_date','end_date','active']),
  vital_signs: new Set(['id','user_id','heart_rate','blood_pressure_systolic','blood_pressure_diastolic','temperature','respiratory_rate','oxygen_saturation','blood_glucose','weight','recorded_at','metadata']),
  comprehensive_health_metrics: new Set(['id','user_id','metric_name','metric_category','value','unit','recorded_at','notes','recorded_by','is_patient_entered','status']),
};

function sanitizePayload(table: string, data: any): Record<string, unknown> | null { if (!data || typeof data !== 'object' || Array.isArray(data)) return null;
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
      let timeout: NodeJS.Timeout | null = null;

      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        }
      };
      req.onsuccess = () => {
        if (timeout) clearTimeout(timeout);
        resolve(req.result);
      };
      req.onerror = () => {
        if (timeout) clearTimeout(timeout);
        reject(req.error);
      };
      req.onblocked = () => {
        if (timeout) clearTimeout(timeout);
        console.warn('IndexedDB open blocked');
      };

      // Timeout after 3 seconds
      timeout = setTimeout(() => {
        reject(new Error('IndexedDB open timeout'));
      }, 3000);
    } catch (e) {
      reject(new Error('IndexedDB not available'));
    }
  });
}

// Shared across all hook instances: only one replay loop may run at a
// time, or two mounted consumers (banner, booking modal) could insert the
// same queued action twice.
let syncInProgress = false;

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

      return new Promise<void>((resolve) => {
        countReq.onsuccess = () => {
          setPendingCount(countReq.result);
          resolve();
        };
        countReq.onerror = () => {
          setPendingCount(0);
          resolve();
        };
        tx.onerror = () => {
          setPendingCount(0);
          resolve();
        };
      });
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
      const putReq = store.put({ ...action, id, createdAt: new Date().toISOString() });

      return new Promise<boolean>((resolve) => {
        tx.oncomplete = () => {
          countPending();
          resolve(true);
        };
        tx.onerror = () => {
          console.error('Transaction error:', tx.error);
          resolve(false);
        };
        putReq.onerror = () => {
          console.error('Put error:', putReq.error);
          resolve(false);
        };

        // Timeout safeguard
        setTimeout(() => resolve(false), 2000);
      });
    } catch (e) {
      console.error('Queue action error:', e);
      return false;
    }
  }, [countPending]);

  const syncAll = useCallback(async () => {
    if (!navigator.onLine || syncInProgress) return;
    syncInProgress = true;
    syncingRef.current = true;
    setSyncing(true);
    try {
      const { supabase } = await import('@/integrations/supabase/client');
      // Identity guard: queued actions are replayed ONLY under the account
      // that created them. On a shared device, another user's queued items
      // are dropped rather than replayed under the wrong identity (RLS
      // would reject most, but never rely on that for privacy).
      const { data: authData } = await supabase.auth.getUser();
      const currentUserId = authData?.user?.id ?? null;
      const db = await openDB();
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const allReq = store.getAll();

      const actions = await new Promise<PendingAction[]>((resolve) => {
        allReq.onsuccess = () => resolve(allReq.result || []);
        allReq.onerror = () => {
          console.error('GetAll error:', allReq.error);
          resolve([]);
        };
        tx.onerror = () => {
          console.error('Sync transaction error:', tx.error);
          resolve([]);
        };

        // Timeout safeguard
        setTimeout(() => resolve([]), 3000);
      });


      for (const action of actions) {
        let error: any = null;
        let drop = false;

        if (typeof action.table !== 'string' || !ALLOWED_SYNC_TABLES.has(action.table)) {
          // Unknown/unauthorized table — drop from queue silently.
          drop = true;
        } else if (
          currentUserId &&
          typeof (action.data?.patient_id ?? action.data?.user_id) === 'string' &&
          (action.data.patient_id ?? action.data.user_id) !== currentUserId &&
          action.table !== 'vital_signs' &&
          action.table !== 'comprehensive_health_metrics'
        ) {
          // Patient-owned action queued by a different account — drop it.
          // (vital_signs / metrics are excluded: a nurse queues them for a
          // patient, so their user_id is the patient's, not the nurse's;
          // RLS on the server remains the enforcement for those.)
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
          const store = delTx.objectStore(STORE_NAME);
          const delReq = store.delete(action.id);

          await new Promise<void>((resolve) => {
            delTx.oncomplete = () => resolve();
            delTx.onerror = () => {
              console.error('Delete transaction error:', delTx.error);
              resolve();
            };
            delReq.onerror = () => {
              console.error('Delete error:', delReq.error);
              resolve();
            };

            // Timeout safeguard
            setTimeout(() => resolve(), 1000);
          });
        }
      }

      countPending();
    } catch (err) {
      console.error('Offline sync error:', err);
    } finally {
      syncInProgress = false;
      syncingRef.current = false;
      setSyncing(false);
    }
  }, [countPending]); // Stable deps - no syncing in deps

  // Auto-sync when coming online, and once on mount — items queued in a
  // previous session (e.g. a full day offline, app closed overnight) have
  // no 'online' transition to trigger them. syncAll reads the queue itself
  // and no-ops when empty or offline.
  useEffect(() => {
    if (isOnline) {
      syncAll();
    }
  }, [isOnline]); // Only trigger on online status change, not pendingCount

  return { isOnline, pendingCount, syncing, queueAction, syncAll };
}
