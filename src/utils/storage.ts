// Safe storage and crypto helpers to avoid SecurityError in environments
// where storage/IndexedDB is blocked (e.g., Safari private mode).

export const safeLocalGet = (key: string): string | null => {
  try {
    if (typeof localStorage === 'undefined') return null;
    return localStorage.getItem(key);
  } catch (err) {
    console.warn('safeLocalGet blocked:', err);
    return null;
  }
};

export const safeLocalSet = (key: string, value: string): void => {
  try {
    if (typeof localStorage === 'undefined') return;
    localStorage.setItem(key, value);
  } catch (err) {
    console.warn('safeLocalSet blocked:', err);
  }
};

export const safeLocalRemove = (key: string): void => {
  try {
    if (typeof localStorage === 'undefined') return;
    localStorage.removeItem(key);
  } catch (err) {
    console.warn('safeLocalRemove blocked:', err);
  }
};

export const safeLocalClear = (): void => {
  try {
    if (typeof localStorage === 'undefined') return;
    localStorage.clear();
  } catch (err) {
    console.warn('safeLocalClear blocked:', err);
  }
};

export const safeSessionGet = (key: string): string | null => {
  try {
    if (typeof sessionStorage === 'undefined') return null;
    return sessionStorage.getItem(key);
  } catch (err) {
    console.warn('safeSessionGet blocked:', err);
    return null;
  }
};

export const safeSessionSet = (key: string, value: string): void => {
  try {
    if (typeof sessionStorage === 'undefined') return;
    sessionStorage.setItem(key, value);
  } catch (err) {
    console.warn('safeSessionSet blocked:', err);
  }
};

export const safeSessionRemove = (key: string): void => {
  try {
    if (typeof sessionStorage === 'undefined') return;
    sessionStorage.removeItem(key);
  } catch (err) {
    console.warn('safeSessionRemove blocked:', err);
  }
};

export const safeSessionClear = (): void => {
  try {
    if (typeof sessionStorage === 'undefined') return;
    sessionStorage.clear();
  } catch (err) {
    console.warn('safeSessionClear blocked:', err);
  }
};

export const safeCryptoUUID = (): string => {
  try {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID();
    }
  } catch (err) {
    console.warn('safeCryptoUUID blocked:', err);
  }

  return `${Date.now()}-${Math.random()}`;
};

export const openIndexedDB = (name = 'appIndexedDB', version = 1): Promise<IDBDatabase | null> => {
  return new Promise((resolve) => {
    try {
      if (typeof indexedDB === 'undefined' || indexedDB === null) return resolve(null);

      const request = indexedDB.open(name, version);

      request.onerror = () => {
        console.warn('openIndexedDB error:', request.error);
        resolve(null);
      };

      request.onsuccess = () => {
        resolve(request.result);
      };

      // Caller can still implement onupgradeneeded if needed after resolving
      request.onupgradeneeded = () => {
        // No-op: callers that need schema should open their own DB or handle upgrade
      };
    } catch (err) {
      console.warn('openIndexedDB blocked:', err);
      resolve(null);
    }
  });
};

export default {
  safeLocalGet,
  safeLocalSet,
  safeLocalRemove,
  safeLocalClear,
  safeSessionGet,
  safeSessionSet,
  safeSessionRemove,
  safeSessionClear,
  safeCryptoUUID,
  openIndexedDB,
};
