import { describe, it, expect, beforeEach } from 'vitest';
import {
  PROFILE_CACHE_KEY,
  toCachedProfile,
  cacheProfile,
  readCachedProfile,
  clearCachedProfile,
} from '@/utils/profileCache';

/**
 * P2-32: the full profile row (email, phone, DOB, address, clinical
 * extensions) must never be persisted to web storage. Only the minimal
 * display subset (id, first/last name, avatar) may be cached, and only
 * in sessionStorage — localStorage must stay empty so nothing survives
 * a browser restart on a shared device.
 */

const FULL_PROFILE = {
  id: 'user-1',
  first_name: 'Jane',
  last_name: 'Banda',
  avatar_url: 'https://example.test/avatar.png',
  role: 'doctor',
  email: 'jane@example.test',
  phone: '+260977000000',
  date_of_birth: '1990-01-01',
  gender: 'female',
  address: 'Plot 1, Independence Ave',
  city: 'Lusaka',
  blood_type: 'O+',
  allergies: ['penicillin'],
  medical_conditions: ['asthma'],
  current_medications: ['salbutamol'],
  specialty: 'Cardiology',
  admin_level: 'none',
};

describe('P2-32: profile cache minimisation', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  it('whitelists only id/first_name/last_name/avatar_url', () => {
    const minimal = toCachedProfile(FULL_PROFILE);
    expect(Object.keys(minimal!).sort()).toEqual(
      ['avatar_url', 'first_name', 'id', 'last_name'].sort()
    );
  });

  it('persists nothing to localStorage and only the subset to sessionStorage', () => {
    cacheProfile(FULL_PROFILE);
    expect(localStorage.getItem(PROFILE_CACHE_KEY)).toBeNull();
    const raw = sessionStorage.getItem(PROFILE_CACHE_KEY);
    expect(raw).toBeTruthy();
    const stored = JSON.parse(raw!);
    expect(stored.email).toBeUndefined();
    expect(stored.phone).toBeUndefined();
    expect(stored.date_of_birth).toBeUndefined();
    expect(stored.address).toBeUndefined();
    expect(stored.blood_type).toBeUndefined();
    expect(stored.allergies).toBeUndefined();
    expect(stored.medical_conditions).toBeUndefined();
    expect(stored.role).toBeUndefined();
    expect(stored.first_name).toBe('Jane');
  });

  it('purges a legacy full-profile localStorage copy on read', () => {
    localStorage.setItem(PROFILE_CACHE_KEY, JSON.stringify(FULL_PROFILE));
    const read = readCachedProfile();
    expect(localStorage.getItem(PROFILE_CACHE_KEY)).toBeNull();
    // Nothing was in sessionStorage, so no profile is resurrected.
    expect(read).toBeNull();
  });

  it('re-whitelists on read (a tampered session cache cannot smuggle PII back)', () => {
    sessionStorage.setItem(PROFILE_CACHE_KEY, JSON.stringify(FULL_PROFILE));
    const read = readCachedProfile();
    expect(read).toEqual({
      id: 'user-1',
      first_name: 'Jane',
      last_name: 'Banda',
      avatar_url: 'https://example.test/avatar.png',
    });
  });

  it('clearCachedProfile removes both storages (sign-out)', () => {
    cacheProfile(FULL_PROFILE);
    localStorage.setItem(PROFILE_CACHE_KEY, JSON.stringify(FULL_PROFILE));
    clearCachedProfile();
    expect(sessionStorage.getItem(PROFILE_CACHE_KEY)).toBeNull();
    expect(localStorage.getItem(PROFILE_CACHE_KEY)).toBeNull();
  });
});
