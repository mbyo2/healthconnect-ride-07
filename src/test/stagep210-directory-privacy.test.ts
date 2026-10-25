import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

// P2-10: provider_directory must never carry providers' personal email or
// phone — it is granted to anon and backs the public /provider/:id page.
// These tests pin the migration + the three client surfaces that read the
// view with contact fields (the two profile pages and the appointments
// list, whose directory select would 400 once the columns are gone).

const readSrc = (p: string) => readFileSync(resolve(__dirname, '../../', p), 'utf8');

const MIGRATION = 'supabase/migrations/20261025_stagep210_provider_directory_contact_removal.sql';

describe('P2-10 · provider_directory carries no personal contact data', () => {
  const migration = readSrc(MIGRATION);

  it('migration drops and recreates the view without email/phone', () => {
    expect(migration).toContain('DROP VIEW public.provider_directory');
    expect(migration).toContain('CREATE VIEW public.provider_directory');
    const createBlock = migration.slice(migration.indexOf('CREATE VIEW'));
    expect(createBlock).not.toMatch(/^\s+p\.email/m);
    expect(createBlock).not.toMatch(/^\s+p\.phone/m);
    // Directory content providers/patients rely on stays.
    for (const col of ['first_name', 'last_name', 'specialty', 'consultation_fee_min', 'consultation_fee_max', 'is_verified']) {
      expect(createBlock).toContain(`p.${col}`);
    }
  });

  it('migration normalises grants to SELECT-only for anon/authenticated', () => {
    expect(migration).toContain('REVOKE ALL ON public.provider_directory FROM anon, authenticated');
    expect(migration).toContain('GRANT SELECT ON public.provider_directory TO anon, authenticated');
  });

  it('public provider page neither selects nor renders email/phone', () => {
    const page = readSrc('src/pages/ProviderDetail.tsx');
    expect(page).not.toContain('provider.phone');
    expect(page).not.toContain('provider.email');
    expect(page).not.toContain('mailto:');
    expect(page).not.toContain('title="Contact"');
    // The directory select itself must not request the removed columns.
    const select = page.slice(page.indexOf('.from("provider_directory")'), page.indexOf('.eq("id", id)'));
    expect(select).not.toMatch(/\bemail\b/);
    expect(select).not.toMatch(/\bphone\b/);
  });

  it('authenticated provider profile page neither selects nor renders email/phone', () => {
    const page = readSrc('src/pages/ProviderProfile.tsx');
    expect(page).not.toContain('provider.phone');
    expect(page).not.toContain('provider.email');
    const select = page.slice(page.indexOf('.from("provider_directory")'), page.indexOf('.eq("id", providerId)'));
    expect(select).not.toMatch(/\bemail\b/);
    expect(select).not.toMatch(/\bphone\b/);
  });

  it('patient appointments list does not request phone from the directory', () => {
    const page = readSrc('src/pages/Appointments.tsx');
    const dirSelect = page.slice(page.indexOf('.from("provider_directory")'), page.indexOf('.in("id", providerIds)'));
    expect(dirSelect).not.toMatch(/\bphone\b/);
    expect(dirSelect).not.toMatch(/\bemail\b/);
    // The provider name/specialty enrichment the list renders stays.
    expect(dirSelect).toContain('first_name');
    expect(dirSelect).toContain('specialty');
  });

  it('generated types for the view no longer declare email/phone', () => {
    const types = readSrc('src/integrations/supabase/types.ts');
    const block = types.slice(
      types.indexOf('      provider_directory: {'),
      types.indexOf('      provider_directory: {') + 4000,
    );
    expect(block).not.toMatch(/^\s+email\??:/m);
    expect(block).not.toMatch(/^\s+phone\??:/m);
  });
});
