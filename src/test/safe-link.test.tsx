import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import { safeHttpsUrl } from '@/utils/safeLink';
import { FilePreview } from '@/components/chat/FilePreview';

// FilePreview resolves storage paths via supabase; for the link-safety
// tests every payload below must end up as NO link without depending on
// a signed URL ever being returned.
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    storage: {
      from: () => ({
        createSignedUrl: vi.fn().mockResolvedValue({ data: null, error: new Error('not found') }),
      }),
    },
  },
}));

describe('P2-33: safeHttpsUrl allowlist', () => {
  it('rejects javascript: payloads, including obfuscated variants', () => {
    expect(safeHttpsUrl('javascript:alert(1)')).toBeNull();
    expect(safeHttpsUrl('JaVaScRiPt:alert(1)')).toBeNull();
    expect(safeHttpsUrl('  javascript:alert(1)')).toBeNull();
    expect(safeHttpsUrl('java\tscript:alert(1)')).toBeNull();
    expect(safeHttpsUrl('\u0001javascript:alert(1)')).toBeNull();
  });

  it('rejects data:, http:, protocol-relative and credentialed URLs', () => {
    expect(safeHttpsUrl('data:text/html,<script>alert(1)</script>')).toBeNull();
    expect(safeHttpsUrl('http://files.example.test/x.pdf')).toBeNull();
    expect(safeHttpsUrl('//evil.example.test/x.pdf')).toBeNull();
    expect(safeHttpsUrl('https://user:pass@evil.example.test/x.pdf')).toBeNull();
    expect(safeHttpsUrl('vbscript:msgbox(1)')).toBeNull();
  });

  it('rejects storage paths and junk (they are not links)', () => {
    expect(safeHttpsUrl('user-1/report.pdf')).toBeNull();
    expect(safeHttpsUrl('')).toBeNull();
    expect(safeHttpsUrl(null)).toBeNull();
    expect(safeHttpsUrl(undefined)).toBeNull();
  });

  it('allows genuine https URLs, incl. Supabase storage URLs', () => {
    const signed =
      'https://tthzcijscedgxjfnfnky.supabase.co/storage/v1/object/sign/chat-attachments/u1/a.pdf?token=abc';
    expect(safeHttpsUrl(signed)).toBe(signed);
    expect(safeHttpsUrl('https://example.test/report.pdf')).toBe('https://example.test/report.pdf');
  });
});

describe('P2-33: FilePreview rendering', () => {
  it('renders a javascript: file_url as plain text, never as a link', async () => {
    const { container, findByText } = render(
      <FilePreview
        attachment={{
          id: 'att-1',
          file_url: 'javascript:alert(document.domain)',
          file_name: 'evil.pdf',
          file_type: 'application/pdf',
          file_size: 123,
        } as any}
      />
    );
    expect(await findByText('evil.pdf')).toBeTruthy();
    expect(container.querySelector('a')).toBeNull();
  });

  it('renders an https file_url as a link', async () => {
    const { container } = render(
      <FilePreview
        attachment={{
          id: 'att-2',
          file_url: 'https://example.test/report.pdf',
          file_name: 'report.pdf',
          file_type: 'application/pdf',
          file_size: 123,
        } as any}
      />
    );
    const a = container.querySelector('a');
    expect(a).not.toBeNull();
    expect(a!.getAttribute('href')).toBe('https://example.test/report.pdf');
    expect(a!.getAttribute('rel')).toContain('noopener');
  });
});
