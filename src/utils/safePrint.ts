import DOMPurify from 'dompurify';

/** HTML-escape a value before interpolating it into markup. */
export const escapeHtml = (v: unknown): string =>
  String(v ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

/**
 * Safe replacement for `win.document.write(html)` in print windows.
 * Sanitises the full document (strips scripts, event handlers, javascript: URLs)
 * so stored patient/staff values can never execute in the app origin.
 * Inline `window.print()` scripts are removed by sanitising, so printing is
 * triggered from the parent when the original markup asked for it.
 */
export const safeDocumentWrite = (win: Window, html: string): void => {
  const wantsPrint = /window\.print\s*\(/.test(html);
  const clean = DOMPurify.sanitize(html, {
    WHOLE_DOCUMENT: true,
    ADD_TAGS: ['style', 'link', 'meta', 'title'],
    FORBID_TAGS: ['script', 'iframe', 'object', 'embed', 'form'],
  });
  win.document.open();
  win.document.write('<!DOCTYPE html>' + clean);
  win.document.close();
  if (wantsPrint) {
    setTimeout(() => {
      try { win.focus(); win.print(); } catch { /* window closed */ }
    }, 400);
  }
};
