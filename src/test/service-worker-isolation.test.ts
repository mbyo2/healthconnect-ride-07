import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * P2-31 proof (code-level): the production service worker must never serve
 * one user's cached Supabase API responses to another user on a shared
 * device. No browser/device proof is possible in CI, so this test pins
 * the isolation contract directly against public/sw.js:
 *
 *  1. API caches are keyed per-user: the cache name is built from the
 *     JWT `sub` decoded from the request's Authorization header.
 *  2. /auth/v1/ is never intercepted (network-only).
 *  3. Requests without a decodable user token are never cached.
 *  4. Sign-out (CLEAR_API_CACHE) wipes every per-user API cache, and the
 *     legacy pre-fix shared cache is deleted on activate.
 *
 * The pure helpers are extracted from the shipped file and executed, so
 * the behavioural claims are tested against the real code, not a copy.
 */

const swSource = readFileSync(join(process.cwd(), 'public/sw.js'), 'utf8');

function extractFunction(name: string): string {
  const start = swSource.indexOf(`function ${name}(`);
  if (start < 0) throw new Error(`function ${name} not found in sw.js`);
  // Find the matching closing brace by depth counting.
  let depth = 0;
  let i = swSource.indexOf('{', start);
  const fnStart = i;
  for (; i < swSource.length; i++) {
    if (swSource[i] === '{') depth++;
    if (swSource[i] === '}') {
      depth--;
      if (depth === 0) return swSource.slice(start, i + 1);
    }
  }
  throw new Error(`unbalanced braces in ${name}`);
}

function loadHelpers() {
  const prefixMatch = swSource.match(/const API_CACHE_PREFIX = '([^']+)'/);
  if (!prefixMatch) throw new Error('API_CACHE_PREFIX not found');
  const code = [
    `const API_CACHE_PREFIX = '${prefixMatch[1]}';`,
    extractFunction('userIdFromRequest'),
    extractFunction('apiCacheNameFor'),
  ].join('\n');
  // eslint-disable-next-line @typescript-eslint/no-implied-eval
  const factory = new Function(
    `${code}; return { userIdFromRequest, apiCacheNameFor, API_CACHE_PREFIX };`
  );
  return factory() as {
    userIdFromRequest: (req: { headers: { get: (h: string) => string | null } }) => string | null;
    apiCacheNameFor: (sub: string) => string;
    API_CACHE_PREFIX: string;
  };
}

function fakeJwt(payload: Record<string, unknown>): string {
  const b64 = (o: unknown) =>
    Buffer.from(JSON.stringify(o)).toString('base64url');
  return `${b64({ alg: 'HS256', typ: 'JWT' })}.${b64(payload)}.fakesig`;
}

function reqWithToken(token: string | null) {
  return {
    headers: {
      get: (h: string) => (h === 'Authorization' && token ? `Bearer ${token}` : null),
    },
  };
}

describe('P2-31: service worker per-user API cache isolation', () => {
  const { userIdFromRequest, apiCacheNameFor, API_CACHE_PREFIX } = loadHelpers();

  it('keys the API cache by the JWT sub of the requesting user', () => {
    const userA = 'aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa';
    const userB = 'bbbbbbbb-2222-4222-8222-bbbbbbbbbbbb';
    const nameA = apiCacheNameFor(userIdFromRequest(reqWithToken(fakeJwt({ sub: userA, role: 'authenticated' })))!);
    const nameB = apiCacheNameFor(userIdFromRequest(reqWithToken(fakeJwt({ sub: userB, role: 'authenticated' })))!);
    expect(nameA).toBe(`${API_CACHE_PREFIX}${userA}`);
    expect(nameB).toBe(`${API_CACHE_PREFIX}${userB}`);
    expect(nameA).not.toBe(nameB);
  });

  it('never caches requests without a decodable user sub (anon key, garbage, missing)', () => {
    // The anon key JWT carries role=anon and no user sub.
    expect(userIdFromRequest(reqWithToken(fakeJwt({ role: 'anon' })))).toBeNull();
    expect(userIdFromRequest(reqWithToken('not-a-jwt'))).toBeNull();
    expect(userIdFromRequest(reqWithToken(null))).toBeNull();
  });

  it('fetch router never intercepts /auth/v1/ requests', () => {
    const fetchHandler = swSource.slice(
      swSource.indexOf("self.addEventListener('fetch'"),
      swSource.indexOf('// Cache-first for content-hashed build assets')
    );
    // The auth check must appear, and must return before handleAPIRequest
    // can run for the request.
    expect(fetchHandler).toContain('isAuthRequest(request)');
    const authIdx = fetchHandler.indexOf('if (isAuthRequest(request))');
    const apiIdx = fetchHandler.indexOf('handleAPIRequest(request)');
    expect(authIdx).toBeGreaterThan(-1);
    expect(apiIdx).toBeGreaterThan(authIdx);
    expect(fetchHandler.slice(authIdx, apiIdx)).toContain('return;');
    // isAuthRequest matches the /auth/v1/ prefix only.
    expect(swSource).toContain("url.pathname.startsWith('/auth/v1/')");
  });

  it('sign-out wipes all per-user API caches (CLEAR_API_CACHE -> clearApiCaches by prefix)', () => {
    expect(swSource).toContain("case 'CLEAR_API_CACHE':");
    const clearFn = extractFunction('clearApiCaches');
    // Wipe is by cache-name prefix (dynamic names), not one fixed name,
    // and also removes the legacy shared cache.
    expect(clearFn).toContain('name.startsWith(API_CACHE_PREFIX)');
    expect(clearFn).toContain('LEGACY_API_CACHES');
    expect(clearFn).toContain('caches.delete(name)');
  });

  it('deletes the legacy shared API cache on activate', () => {
    expect(swSource).toContain("const LEGACY_API_CACHES = ['healthconnect-api-v5'];");
    const activate = swSource.slice(
      swSource.indexOf("self.addEventListener('activate'"),
      swSource.indexOf('// Fetch event')
    );
    expect(activate).toContain('LEGACY_API_CACHES.includes(cacheName)');
    expect(activate).toContain('caches.delete(cacheName)');
  });

  it('app sign-out triggers both the SW message and the direct page-side wipe', () => {
    const util = readFileSync(join(process.cwd(), 'src/utils/service-worker.ts'), 'utf8');
    expect(util).toContain('clearApiCaches');
    const authCtx = readFileSync(join(process.cwd(), 'src/context/AuthContext.tsx'), 'utf8');
    expect(authCtx).toContain("postMessage({ type: 'CLEAR_API_CACHE' })");
    expect(authCtx).toContain('await clearApiCaches()');
  });
});
