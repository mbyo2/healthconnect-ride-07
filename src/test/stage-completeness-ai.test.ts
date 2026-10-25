/**
 * Completeness pass Part C pins (2026-10-25): AI must be usable per role,
 * honest about what it does, and must NOT collect conversation data.
 *
 * These are source pins over the edge functions and AI client surfaces —
 * the behavioural proofs (real calls + server-side row checks) run with
 * QA users against the deployed functions.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const read = (p: string) => readFileSync(resolve(process.cwd(), p), 'utf8');

describe('AI no-collection guarantees', () => {
  it('doc-chat stores no conversation server-side', () => {
    const s = read('supabase/functions/doc-chat/index.ts');
    expect(s).not.toMatch(/\.from\(['"]ai_diagnosis_history['"]\)\s*\n?\s*\.insert/);
    expect(s).not.toContain('ai_chat_messages');
    expect(s).not.toContain('ai_chat_conversations');
    expect(s).toContain('NOT stored server-side');
  });

  it('medgemma-chat stores no conversation server-side', () => {
    const s = read('supabase/functions/medgemma-chat/index.ts');
    expect(s).not.toMatch(/\.from\(['"]ai_diagnosis_history['"]\)\s*\n?\s*\.insert/);
    expect(s).toContain('NOT stored server-side');
  });

  it('the reply-printing console.log is gone from MedGemmaChat', () => {
    const s = read('src/components/MedGemmaChat.tsx');
    expect(s).not.toContain('response:`, { data, error }');
    expect(s).not.toContain('MedGemma 1.5 4B');
    expect(s).not.toContain('GPT-3.5');
    expect(s).not.toContain('longitudinal analysis');
  });

  it('the DB-persisting orphaned chat stack is deleted', () => {
    expect(() => read('src/hooks/useAIChat.ts')).toThrow();
    expect(() => read('src/components/ai/ConversationList.tsx')).toThrow();
    expect(() => read('src/components/ai/ChatSettings.tsx')).toThrow();
    expect(() => read('src/utils/medgemma.ts')).toThrow();
  });
});

describe('AI honesty + role gates', () => {
  it('ambient-scribe is clinicians-only, verified under the caller JWT', () => {
    const s = read('supabase/functions/ambient-scribe/index.ts');
    expect(s).toContain('SCRIBE_ROLES');
    expect(s).toContain("from('user_roles')");
    expect(s).toContain('available to clinicians only');
    expect(s).toContain('Authorization: `Bearer ${token}`');
  });

  it('doc-chat and medgemma-chat run role reads under the caller JWT', () => {
    for (const f of ['doc-chat', 'medgemma-chat']) {
      expect(read(`supabase/functions/${f}/index.ts`)).toContain('Authorization: `Bearer ${token}`');
    }
  });

  it('medgemma-chat really sends images to the vision model', () => {
    const s = read('supabase/functions/medgemma-chat/index.ts');
    expect(s).toContain("type: 'image_url'");
    expect(s).not.toContain('User has attached ${images.length} medical image(s) for analysis');
    expect(s).toMatch(/multimodal,\s*\n/);
  });

  it('document analysis sends the document image, never a placeholder', () => {
    const s = read('supabase/functions/medgemma-document-analysis/index.ts');
    expect(s).toContain("type: 'image_url'");
    expect(s).not.toContain('Document image attached for analysis');
    expect(s).not.toContain('powered by MedGemma');
  });

  it('3D imaging is an honest slice review, not volumetric', () => {
    const s = read('supabase/functions/medgemma-3d-imaging/index.ts');
    expect(s).toContain('native_3d_imaging: false');
    expect(s).toContain('volumetric_analysis: false');
    expect(s).toContain("type: 'image_url'");
    expect(s).not.toContain('Slice ${i + 1}/${slices.length}');
  });

  it('triage records the answering source honestly', () => {
    const s = read('supabase/functions/triage-assess/index.ts');
    expect(s).toContain('model: triageModel');
    expect(s).toContain('"rule-based-fallback"');
  });

  it('WorkOS copilot calls the real assistant (no canned telemetry)', () => {
    const s = read('src/components/workos/WorkOSAICopilotBar.tsx');
    expect(s).toContain("functions.invoke('doc-chat'");
    expect(s).not.toContain('AI Telemetry Execution Complete');
    expect(s).not.toContain('Confidence 98.4%');
  });

  it('AIDiagnostics makes no false model claims', () => {
    const s = read('src/pages/AIDiagnostics.tsx');
    expect(s).not.toContain('MedGemma 27B');
    expect(s).not.toContain('3D Volumetric Imaging');
  });
});
