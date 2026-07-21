// Safe settings cache with error handling and timeout protection
import { safeLocalGet, safeLocalSet } from './storage';

const SETTINGS_CACHE_KEY = 'doc_oclock_settings_cache';
const SETTINGS_CACHE_TIMEOUT = 5 * 60 * 1000; // 5 minutes

interface CachedSetting {
  key: string;
  value: any;
  timestamp: number;
  ttl: number;
}

interface SettingsCacheData {
  [key: string]: CachedSetting;
}

/**
 * Get a setting from cache with staleness check
 */
export const getSettingFromCache = (settingKey: string): any | null => {
  try {
    const raw = safeLocalGet(SETTINGS_CACHE_KEY);
    if (!raw) return null;

    const cache: SettingsCacheData = JSON.parse(raw);
    const setting = cache[settingKey];

    if (!setting) return null;

    // Check if setting is stale
    const age = Date.now() - setting.timestamp;
    if (age > setting.ttl) {
      delete cache[settingKey];
      safeLocalSet(SETTINGS_CACHE_KEY, JSON.stringify(cache));
      return null;
    }

    return setting.value;
  } catch (err) {
    console.warn('Error reading settings cache:', err);
    return null;
  }
};

/**
 * Cache a setting with TTL
 */
export const cacheSettingValue = (
  settingKey: string,
  value: any,
  ttlMs = SETTINGS_CACHE_TIMEOUT
): void => {
  try {
    const raw = safeLocalGet(SETTINGS_CACHE_KEY) || '{}';
    const cache: SettingsCacheData = JSON.parse(raw);

    cache[settingKey] = {
      key: settingKey,
      value,
      timestamp: Date.now(),
      ttl: ttlMs,
    };

    safeLocalSet(SETTINGS_CACHE_KEY, JSON.stringify(cache));
  } catch (err) {
    console.warn('Error caching setting:', err);
  }
};

/**
 * Clear all cached settings
 */
export const clearSettingsCache = (): void => {
  try {
    safeLocalSet(SETTINGS_CACHE_KEY, '{}');
  } catch (err) {
    console.warn('Error clearing settings cache:', err);
  }
};

/**
 * Remove a specific cached setting
 */
export const removeSettingFromCache = (settingKey: string): void => {
  try {
    const raw = safeLocalGet(SETTINGS_CACHE_KEY);
    if (!raw) return;

    const cache: SettingsCacheData = JSON.parse(raw);
    delete cache[settingKey];
    safeLocalSet(SETTINGS_CACHE_KEY, JSON.stringify(cache));
  } catch (err) {
    console.warn('Error removing cached setting:', err);
  }
};

/**
 * Safely get async setting with fallback to cache
 */
export const getSettingAsync = async (
  settingKey: string,
  fetchFn: () => Promise<any>,
  options = { useCache: true, cacheTtl: SETTINGS_CACHE_TIMEOUT }
): Promise<any | null> => {
  // Try cache first
  if (options.useCache) {
    const cached = getSettingFromCache(settingKey);
    if (cached !== null) {
      return cached;
    }
  }

  try {
    // Set a timeout for the async operation
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Settings fetch timeout')), 3000)
    );

    const result = await Promise.race([fetchFn(), timeoutPromise]);

    // Cache the result
    if (options.useCache) {
      cacheSettingValue(settingKey, result, options.cacheTtl);
    }

    return result;
  } catch (err) {
    console.error(`Error fetching setting ${settingKey}:`, err);
    // Return cached value or null as fallback
    if (options.useCache) {
      return getSettingFromCache(settingKey);
    }
    return null;
  }
};

export default {
  getSettingFromCache,
  cacheSettingValue,
  clearSettingsCache,
  removeSettingFromCache,
  getSettingAsync,
};
