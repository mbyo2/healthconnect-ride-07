import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";

// PAYPAL ANATOMY ROLLOUT — WAVE 3 (institution module shells), CEO order
// 2026-11-11: the shared InstitutionPageHeader takes the greeting ramp;
// the copy-pasted slate-900 module banner family (15 surfaces: Patient
// Hub, Queue Desk, Dispensary, Care, Procedures, LIS/RIS, FHIR, ERP
// stock, Pediatrics, Physio, Connections, five role workflows, the
// institutions directory hero) converts to calm hairline headers; module
// tab bars become segmented pale-pill tracks; ERP tables stay tables
// (hairline, flat); PublicQueueDisplay's navy TV board becomes the calm
// anatomy with ONE sky hero — huge type and contrast kept for TV.
// Presentation only — no handlers, queries or data flow changed.
const read = (rel: string) => readFileSync(resolve(__dirname, rel), "utf8");

const pageHeader = read("../components/institution/InstitutionPageHeader.tsx");
const erpAdmin = read("../components/erp/ERPAdministration.tsx");
const erpStock = read("../components/erp/ERPPharmacyInventory.tsx");
const queueDisplay = read("../pages/PublicQueueDisplay.tsx");
const care = read("../components/clinical/CareManagementSuite.tsx");
const lis = read("../components/laboratory/LISRadiologySuite.tsx");
const dispensary = read("../components/specialized/DispensaryOperations.tsx");
const patientHub = read("../components/patient/UnifiedPatientHub.tsx");
const queueDesk = read("../components/scheduling/CentralizedQueueDesk.tsx");
const institutions = read("../pages/HealthcareInstitutions.tsx");

describe("rollout wave 3: shared institution shell", () => {
  it("InstitutionPageHeader defaults are the greeting ramp with a 13px subline, no shadow", () => {
    expect(pageHeader).toContain('titleClassName = "text-greeting text-midnight"');
    expect(pageHeader).toContain('subtitleClassName = "text-[13px] text-muted-foreground"');
    expect(pageHeader).toContain('className = "py-4"');
    expect(pageHeader).not.toContain("shadow-2xs");
  });
});

describe("rollout wave 3: the slate banner family is gone", () => {
  it("no module banner keeps the slate-900 band", () => {
    for (const f of [erpStock, care, lis, dispensary, patientHub, queueDesk, institutions]) {
      expect(f).not.toContain("bg-slate-900");
    }
    expect(erpStock).toContain("rounded-[24px] bg-card border border-border");
  });

  it("banner status pills are pale pills now, not white-on-navy ghosts", () => {
    for (const f of [care, lis, dispensary]) {
      expect(f).not.toContain("bg-white/20");
      expect(f).toContain("bg-pill text-pill-foreground");
    }
  });
});

describe("rollout wave 3: module tabs + ERP tables", () => {
  it("module tab bars are segmented pale-pill tracks with white active pills", () => {
    for (const f of [care, lis, erpAdmin, erpStock]) {
      expect(f).toContain("rounded-full bg-pill p-1");
      expect(f).toContain('"bg-card text-foreground"');
      expect(f).not.toContain("bg-primary-500 text-white shadow-xs");
    }
  });

  it("ERP surfaces are flat: no shadow-xs piles remain", () => {
    expect(erpAdmin).not.toContain("shadow-xs");
    expect(erpStock).not.toContain("shadow-xs");
  });

  it("ERP tables stay tables with hairline headers (clinical density kept)", () => {
    expect(erpAdmin).toContain("border-b border-border bg-background text-xs font-semibold uppercase");
    expect(erpAdmin).toContain("divide-y divide-border");
  });
});

describe("rollout wave 3: PublicQueueDisplay", () => {
  it("the navy board is gone; the page rides canvas tokens", () => {
    expect(queueDisplay).not.toContain("min-h-screen bg-slate-950");
    expect(queueDisplay).not.toContain("bg-navy");
    expect(queueDisplay).not.toContain("bg-slate-900");
    expect(queueDisplay).toContain("bg-canvas text-foreground");
  });

  it("exactly ONE sky hero carries Now Calling; dark mode makes it a hairline card", () => {
    expect(queueDisplay.match(/60CDFF/g)?.length).toBe(2); // bg + border of the single hero
    expect(queueDisplay).toContain("dark:bg-card");
    expect(queueDisplay).toContain("rounded-[24px]");
  });

  it("TV legibility is preserved: the token number stays huge", () => {
    expect(queueDisplay).toContain("text-7xl sm:text-9xl");
    expect(queueDisplay).toContain("bg-slate-950 dark:bg-primary-500"); // Now Calling pill
  });

  it("waiting rows are hairline card rows with pale Next pills", () => {
    expect(queueDisplay).toContain("bg-card border border-border flex items-center justify-between");
    expect(queueDisplay).toContain("bg-pill text-pill-foreground");
  });
});
