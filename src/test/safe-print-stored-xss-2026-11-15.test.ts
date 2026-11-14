// Workstream D (2026-11-15) — stored-XSS re-verification for Doc'O Clock.
//
// A live QA-stored payload (fhir-inbound MedicationRequest dosage +
// instructions, prescription 3a2f12f8-3d45-4fc1-b8cf-cc231b5cd976 for
// QA patient qawsd-b) is fed through the exact print path the pharmacy
// dispensing slip uses (raw interpolation into the slip HTML, then
// safeDocumentWrite). The payload must NOT survive sanitisation and
// must NOT execute when the written document is parsed with scripts on.
import { describe, it, expect } from "vitest";
import { JSDOM } from "jsdom";
import { safeDocumentWrite, escapeHtml } from "@/utils/safePrint";

// Live-stored values (verbatim from comprehensive_prescriptions).
const PAYLOAD = `<img src=x onerror="window.__WSD_XSS__=1">`;
const SCRIPT_PAYLOAD = `<script>window.__WSD_XSS__=1</script>`;

function dispensingSlipHtml(medicationName: string, dosage: string, instructions: string): string {
  // Mirrors PrescriptionFulfillment.handlePrintDispensingSlip: values are
  // interpolated raw into the slip markup; safeDocumentWrite is the sink
  // that must neutralise them.
  return `
      <!DOCTYPE html>
      <html>
        <head><title>Dispensing Slip</title></head>
        <body>
          <table>
            <tr>
              <td>${medicationName}</td>
              <td>${dosage}</td>
              <td>${instructions}</td>
            </tr>
          </table>
          <script>window.print()</script>
        </body>
      </html>`;
}

function writeAndCapture(html: string): string {
  let written = "";
  const win = {
    document: {
      open: () => {},
      write: (s: string) => {
        written += s;
      },
      close: () => {},
    },
    focus: () => {},
    print: () => {},
  } as unknown as Window;
  safeDocumentWrite(win, html);
  return written;
}

describe("stored XSS via prescription print (Workstream D)", () => {
  it("live-stored img-onerror payload does not survive safeDocumentWrite", async () => {
    const out = writeAndCapture(dispensingSlipHtml("Paracetamol", PAYLOAD, PAYLOAD));
    // DOMPurify keeps the inert <img> tag but strips the handler and the
    // script body: no event handler, no payload JS may remain.
    expect(out).not.toContain("onerror");
    expect(out).not.toContain("__WSD_XSS__");
    expect(out).not.toMatch(/\son\w+\s*=/i);
    expect(out).toContain('<img src="x">');
    const dom = new JSDOM(out, { runScripts: "dangerously", url: "https://doc0clock.online/" });
    await new Promise((r) => setTimeout(r, 300));
    expect((dom.window as unknown as { __WSD_XSS__?: number }).__WSD_XSS__).toBeUndefined();
  });

  it("live-stored script payload does not survive or execute", async () => {
    const out = writeAndCapture(dispensingSlipHtml(SCRIPT_PAYLOAD, SCRIPT_PAYLOAD, SCRIPT_PAYLOAD));
    expect(out).not.toContain("<script");
    const dom = new JSDOM(out, { runScripts: "dangerously", url: "https://doc0clock.online/" });
    await new Promise((r) => setTimeout(r, 300));
    expect((dom.window as unknown as { __WSD_XSS__?: number }).__WSD_XSS__).toBeUndefined();
  });

  it("escapeHtml neutralises the payload for interpolated markup", () => {
    expect(escapeHtml(PAYLOAD)).toBe(
      "&lt;img src=x onerror=&quot;window.__WSD_XSS__=1&quot;&gt;",
    );
    expect(escapeHtml(SCRIPT_PAYLOAD)).not.toContain("<script");
  });
});
