import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

// Final code-level pass (2026-10-25): pins the three browser-wave UI nits
// in Appointments.tsx and the service-worker update prompt.
//  B1 — provider appointment rows show the booking reference patients
//       quote from BookingConfirmed (String(id).slice(0, 8)).
//  B2 — the "Telemedicine" chip on an appointment row reflects the
//       appointment's own type, never the provider's directory capability.
//  B3 — the "New update available" toast fires only when a new service
//       worker has actually installed over an existing controller.

const readSrc = (p: string) => readFileSync(resolve(__dirname, '../../', p), 'utf8');

describe('B1 · provider appointment list shows the booking reference', () => {
  const page = readSrc('src/pages/Appointments.tsx');

  it('derives the reference exactly like the patient confirmation page', () => {
    expect(page).toContain('const bookingRef = (app: any): string => String(app?.id ?? "").slice(0, 8);');
    const confirmation = readSrc('src/pages/BookingConfirmed.tsx');
    expect(confirmation).toContain('String(appointment.id).slice(0, 8)');
  });

  it('renders the reference in the provider view at every list site', () => {
    const renders = page.match(/Ref \{bookingRef\(app\)\}/g) || [];
    // upcoming mobile card, upcoming desktop row, past mobile card, past desktop row
    expect(renders.length).toBe(4);
    // Each render is gated to the provider side of the list.
    const gates = page.match(/\{isProvider && \(\s*<div className="text-\[11px\] font-mono/g) || [];
    expect(gates.length).toBe(4);
  });
});

describe('B2 · Telemedicine chip reflects the appointment type, not provider capability', () => {
  const page = readSrc('src/pages/Appointments.tsx');

  it('video detection covers the written and legacy type values', () => {
    expect(page).toContain('app?.type === "video_consultation"');
    expect(page).toContain('app?.type === "telemedicine"');
    expect(page).toContain('app?.type === "telehealth"');
  });

  it('no appointment-row chip is gated on the provider capability flag', () => {
    // telemedicine_available may still be fetched from the directory, but
    // it must never decide a per-appointment tag again.
    expect(page).not.toMatch(/\{person\?\.telemedicine_available &&/);
    expect(page).not.toContain('|| person?.telemedicine_available)');
  });

  it('every row type label goes through the shared helper', () => {
    expect(page).not.toContain('app.type === "video_consultation"');
    const helperUses = page.match(/isVideoAppointment\(app\)/g) || [];
    expect(helperUses.length).toBeGreaterThanOrEqual(6);
  });
});

describe('B3 · service-worker update prompt fires only on a genuine update', () => {
  const sw = readSrc('src/utils/service-worker.ts');

  it('requires an installed worker AND an existing controller (not first install)', () => {
    expect(sw).toContain("newWorker.state === 'installed' && navigator.serviceWorker.controller");
    expect(sw).toContain("registration.addEventListener('updatefound'");
  });

  it('registers once at app boot, not per navigation', () => {
    const main = readSrc('src/main.tsx');
    expect(main).toContain('registerServiceWorker();');
    expect(main).toContain('if (import.meta.env.PROD)');
  });
});
