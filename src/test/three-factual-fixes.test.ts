/**
 * Three factual fixes (2026-11-13, CEO-approved):
 * 1. Landing footer copyright reads "Doc'O Clock", never "Ltd."
 *    (CEO correction 2026-11-14: the 2026-11-13 change to the consultancy
 *    name was wrong — the brand line is Doc'O Clock.)
 * 2. The /workos demo showcase (mock Zambian patient records) is gone.
 * 3. The landing "patients" count excludes demo signups.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { resolve, join } from 'node:path';

const read = (p: string) => readFileSync(resolve(process.cwd(), p), 'utf8');

const walkSrc = (dir: string, out: string[] = []): string[] => {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walkSrc(full, out);
    else if (/\.(ts|tsx)$/.test(entry)) out.push(full);
  }
  return out;
};

describe('three factual fixes 2026-11-13', () => {
  it('landing footer copyright reads Doc\'O Clock, not a Ltd. or the consultancy', () => {
    const s = read('src/components/landing/LandingFooter.tsx');
    expect(s).not.toContain('Ltd.');
    expect(s).not.toContain('Mabvuto Banda Science, Information Technical Consultancy');
    expect(s).toContain("Doc&apos; O Clock. All rights reserved.");
    // The in-app footer already reads Doc'O Clock; it stays as-is.
    expect(read('src/components/Footer.tsx')).not.toContain('Ltd.');
    expect(read('src/components/Footer.tsx')).toContain("Doc&apos; O Clock. All rights reserved.");
  });

  it('the /workos demo showcase is deleted: routes, page, components', () => {
    expect(() => read('src/pages/BespokeWorkOSShowcase.tsx')).toThrow();
    expect(() => read('src/components/workos/WorkOSSidebar.tsx')).toThrow();
    expect(() => read('src/components/workos/WorkOSTableBoard.tsx')).toThrow();
    expect(() => read('src/components/workos/WorkOSAICopilotBar.tsx')).toThrow();
    const app = read('src/App.tsx');
    expect(app).not.toContain('/workos');
    expect(app).not.toContain('/showcase');
    expect(app).not.toContain('BespokeWorkOSShowcase');
    const skeleton = read('src/lib/routeSkeleton.tsx');
    expect(skeleton).not.toContain('/workos');
    expect(skeleton).not.toContain('/showcase');
    const robots = read('public/robots.txt');
    expect(robots).not.toContain('/workos');
    expect(robots).not.toContain('/showcase');
  });

  it('no mock showcase patient records remain anywhere in src', () => {
    // Names are built by concatenation so this file itself holds no
    // literal mock name — the walk below covers every src file.
    const mockNames = [
      'Chanda ' + 'Mulenga',
      'Thandiwe ' + 'Banda',
      'Kabwe ' + 'Bwalya',
      'Nalikena ' + 'Phiri',
      'Grace ' + 'Tembo',
      'Mwamba ' + 'Kasonde',
      'PAT-' + '101',
      'PAT-' + '102',
    ];
    for (const file of walkSrc(resolve(process.cwd(), 'src'))) {
      const s = readFileSync(file, 'utf8');
      for (const name of mockNames) {
        expect(s, `${file} still contains mock patient ${name}`).not.toContain(name);
      }
    }
  });

  it('the platform-counts function excludes demo signups from patients', () => {
    const s = read('supabase/migrations/20261113235500_landing_patients_exclude_demo.sql');
    expect(s).toContain('get_public_platform_counts');
    expect(s).toContain('doctor@healthconnect.com');
    expect(s).toContain('me@me.com');
    expect(s).toContain('NOT IN');
  });

  it('no user-visible surface names the consultancy (CEO order 2026-11-14)', () => {
    // Brand surfaces carry Doc'O Clock only — never
    // "Mabvuto Banda Science, Information Technical Consultancy".
    // (This test file itself holds the string as an assertion literal;
    // the check below reads only the rendered surfaces, not src.)
    const banned = [
      'Mabvuto Banda Science',
      'Information Technical Consultancy',
    ];
    const llms = read('public/llms.txt');
    for (const b of banned) expect(llms, 'public/llms.txt').not.toContain(b);
    expect(llms).toContain('Operator: Doc\'O Clock');
    for (const tpl of [
      'change-email',
      'confirm-signup',
      'invite-user',
      'magic-link',
      'reset-password',
    ]) {
      const s = read(`supabase/email-templates/${tpl}.html`);
      for (const b of banned) expect(s, `email template ${tpl}`).not.toContain(b);
      expect(s).toContain('&copy; 2026 Doc\'O Clock');
    }
  });
});
