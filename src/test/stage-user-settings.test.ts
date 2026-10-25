import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

// Phantom table repair (2026-10-25): `public.user_settings` was defined by
// 20240322000001_settings_tables.sql but never existed live, so Settings
// Language / Timezone / Date-format writes 404'd (PGRST205) and silently
// never persisted (see stage-a11y-toggle addendum). The recreate migration
// must carry every column the CURRENT callers read/write:
//   - Settings.tsx: wide preference columns + upsert onConflict "user_id"
//     (=> UNIQUE(user_id) is load-bearing, not cosmetic).
//   - src/utils/settings-workflows.ts: key-value columns
//     (setting_key / value / status / change_history).
// These tests pin that reconciliation so neither caller can drift again.

const readSrc = (p: string) => readFileSync(resolve(__dirname, '../../', p), 'utf8');

const MIGRATION = 'supabase/migrations/20261025_stageusettings_recreate_user_settings.sql';

const tableBlock = (sql: string) => {
  const start = sql.indexOf('CREATE TABLE IF NOT EXISTS public.user_settings');
  const end = sql.indexOf(');', start);
  return sql.slice(start, end);
};

describe('user_settings · recreated table serves every current caller', () => {
  const migration = readSrc(MIGRATION);
  const block = tableBlock(migration);

  it('migration creates the table with the Settings.tsx wide columns', () => {
    expect(block).toContain('CREATE TABLE IF NOT EXISTS public.user_settings');
    for (const col of ['id', 'user_id', 'language', 'timezone', 'date_format', 'notifications_enabled', 'accessibility_mode', 'created_at', 'updated_at']) {
      expect(block).toMatch(new RegExp(`\\b${col}\\b`));
    }
  });

  it('migration adds the settings-workflows.ts key-value columns', () => {
    for (const col of ['setting_key', 'value', 'status', 'change_history']) {
      expect(block).toMatch(new RegExp(`\\b${col}\\b`));
    }
    // status is constrained to the helper's SettingStatus union.
    expect(block).toContain("'active', 'inactive', 'pending', 'archived'");
  });

  it('user_id is UNIQUE with an auth.users cascade FK (upsert onConflict depends on it)', () => {
    expect(block).toMatch(/user_id UUID NOT NULL UNIQUE REFERENCES auth\.users\(id\) ON DELETE CASCADE/);
  });

  it('RLS is enabled with own-row-only select/insert/update policies', () => {
    expect(migration).toContain('ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY');
    expect(migration).toContain('CREATE POLICY "Users can view their own settings"');
    expect(migration).toContain('CREATE POLICY "Users can insert their own settings"');
    expect(migration).toContain('CREATE POLICY "Users can update their own settings"');
    expect(migration).toContain('USING (auth.uid() = user_id)');
    expect(migration).toContain('WITH CHECK (auth.uid() = user_id)');
  });

  it('updated_at is maintained by the shared trigger function', () => {
    expect(migration).toContain('CREATE TRIGGER handle_updated_at_user_settings');
    expect(migration).toContain('EXECUTE FUNCTION public.handle_updated_at()');
  });

  it('Settings.tsx still upserts the wide columns on user_id conflict', () => {
    const page = readSrc('src/pages/Settings.tsx');
    expect(page).toContain('.from("user_settings" as any)');
    expect(page).toContain('{ onConflict: "user_id" }');
    for (const patch of ['{ language: value }', '{ timezone: value }', '{ date_format: value }']) {
      expect(page).toContain(patch);
    }
    // Read-back path reads the same fields it writes.
    expect(page).toContain('(userSettings as any).language');
    expect(page).toContain('(userSettings as any).timezone');
    expect(page).toContain('(userSettings as any).date_format');
  });

  it('every column settings-workflows.ts queries exists in the migration', () => {
    const workflows = readSrc('src/utils/settings-workflows.ts');
    expect(workflows).toContain(".from('user_settings')");
    for (const col of ['setting_key', 'value', 'status', 'change_history', 'updated_at', 'user_id']) {
      expect(workflows).toContain(col);
      expect(block).toMatch(new RegExp(`\\b${col}\\b`));
    }
  });

  it('notification_settings carries the UNIQUE(user_id) arbiter its upsert needs', () => {
    // Adjacent proven defect (same 2024 migration, partial apply): the
    // live table lacked UNIQUE(user_id), so upsertNotificationSettings
    // failed 42P10 on every Settings email/push preference write.
    const fix = readSrc('supabase/migrations/20261025_stageusettings_notification_settings_unique_user.sql');
    expect(fix).toContain('CREATE UNIQUE INDEX IF NOT EXISTS notification_settings_user_id_key');
    expect(fix).toContain('ON public.notification_settings (user_id)');
    const page = readSrc('src/pages/Settings.tsx');
    expect(page).toContain('.from("notification_settings")');
    expect(page).toContain('const upsertNotificationSettings');
  });

  it('the accessibility toggle stays off this table (a11y fix boundary)', () => {
    const page = readSrc('src/pages/Settings.tsx');
    const handler = page.slice(page.indexOf('const handleAccessibilityToggle'), page.indexOf('if (loading)'));
    expect(handler).not.toContain('upsertUserSettings');
    expect(handler).not.toContain('accessibility_mode');
    expect(handler).toContain('enableEasyReading()');
    expect(handler).toContain('disableEasyReading()');
  });
});
