import { useEffect, useRef, useCallback, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js';

interface RealtimeConfig<T> {
  table: string;
  schema?: string;
  filter?: string;
  onInsert?: (payload: T) => void;
  onUpdate?: (payload: T) => void;
  onDelete?: (payload: { old: T }) => void;
  throttleMs?: number;
  enabled?: boolean;
}

interface RealtimeState<T> {
  data: T[];
  isConnected: boolean;
  lastUpdate: Date | null;
  error: Error | null;
}

/**
 * Optimized hook for real-time data subscriptions with throttling and connection management
 */
export function useRealtimeData<T extends Record<string, any>>(
  config: RealtimeConfig<T>
): RealtimeState<T> & { refresh: () => void } {
  const {
    table,
    schema = 'public',
    filter,
    onInsert,
    onUpdate,
    onDelete,
    throttleMs = 100,
    enabled = true,
  } = config;

  const [state, setState] = useState<RealtimeState<T>>({
    data: [],
    isConnected: false,
    lastUpdate: null,
    error: null,
  });

  const channelRef = useRef<RealtimeChannel | null>(null);
  const lastUpdateRef = useRef<number>(0);
  const pendingUpdatesRef = useRef<T[]>([]);
  const throttleTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Throttled state update to prevent excessive re-renders
  const flushUpdates = useCallback(() => {
    if (pendingUpdatesRef.current.length > 0) {
      setState(prev => ({
        ...prev,
        data: [...pendingUpdatesRef.current],
        lastUpdate: new Date(),
      }));
      pendingUpdatesRef.current = [];
    }
  }, []);

  const scheduleUpdate = useCallback((newData: T[]) => {
    const now = Date.now();
    pendingUpdatesRef.current = newData;

    if (now - lastUpdateRef.current >= throttleMs) {
      lastUpdateRef.current = now;
      flushUpdates();
    } else {
      if (throttleTimeoutRef.current) {
        clearTimeout(throttleTimeoutRef.current);
      }
      throttleTimeoutRef.current = setTimeout(() => {
        lastUpdateRef.current = Date.now();
        flushUpdates();
      }, throttleMs - (now - lastUpdateRef.current));
    }
  }, [throttleMs, flushUpdates]);

  const refresh = useCallback(async () => {
    try {
      const { data, error } = await (supabase as any)
        .from(table)
        .select('*');
      
      if (error) throw error;
      setState(prev => ({
        ...prev,
        data: (data as T[]) || [],
        lastUpdate: new Date(),
        error: null,
      }));
    } catch (err) {
      setState(prev => ({
        ...prev,
        error: err instanceof Error ? err : new Error('Failed to fetch data'),
      }));
    }
  }, [table]);

  useEffect(() => {
    if (!enabled) return;

    const setupSubscription = async () => {
      try {
        // Initial data fetch
        await refresh();

        // Set up real-time subscription
        const channelName = `${table}_${filter || 'all'}_${Date.now()}`;
        const channel = supabase
          .channel(channelName)
          .on(
            'postgres_changes',
            {
              event: '*',
              schema,
              table,
              filter,
            },
            (payload: RealtimePostgresChangesPayload<T>) => {
              const { eventType, new: newRecord, old: oldRecord } = payload;

              setState(prev => {
                let newData = [...prev.data];

                switch (eventType) {
                  case 'INSERT':
                    if (newRecord) {
                      newData.push(newRecord as T);
                      onInsert?.(newRecord as T);
                    }
                    break;
                  case 'UPDATE':
                    if (newRecord) {
                      const index = newData.findIndex(
                        (item) => (item as any).id === (newRecord as any).id
                      );
                      if (index !== -1) {
                        newData[index] = newRecord as T;
                      }
                      onUpdate?.(newRecord as T);
                    }
                    break;
                  case 'DELETE':
                    if (oldRecord) {
                      newData = newData.filter(
                        (item) => (item as any).id !== (oldRecord as any).id
                      );
                      onDelete?.({ old: oldRecord as T });
                    }
                    break;
                }

                scheduleUpdate(newData);
                return prev; // Let scheduleUpdate handle the state update
              });
            }
          )
          .subscribe((status) => {
            setState(prev => ({
              ...prev,
              isConnected: status === 'SUBSCRIBED',
            }));
          });

        channelRef.current = channel;
      } catch (err) {
        setState(prev => ({
          ...prev,
          error: err instanceof Error ? err : new Error('Subscription failed'),
          isConnected: false,
        }));
      }
    };

    setupSubscription();

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
      if (throttleTimeoutRef.current) {
        clearTimeout(throttleTimeoutRef.current);
      }
    };
  }, [enabled, table, schema, filter, refresh, scheduleUpdate, onInsert, onUpdate, onDelete]);

  return { ...state, refresh };
}

/**
 * Hook for batched real-time updates (for high-frequency data like IoT)
 */
export function useBatchedRealtimeData<T extends Record<string, any>>(
  table: string,
  batchIntervalMs = 500
) {
  const [batch, setBatch] = useState<T[]>([]);
  const batchRef = useRef<T[]>([]);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const channel = supabase
      .channel(`batched_${table}_${Date.now()}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table },
        (payload) => {
          batchRef.current.push(payload.new as T);
        }
      )
      .subscribe();

    intervalRef.current = setInterval(() => {
      if (batchRef.current.length > 0) {
        setBatch([...batchRef.current]);
        batchRef.current = [];
      }
    }, batchIntervalMs);

    return () => {
      supabase.removeChannel(channel);
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [table, batchIntervalMs]);

  return batch;
}
