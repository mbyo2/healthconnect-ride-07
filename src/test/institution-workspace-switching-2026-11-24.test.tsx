import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { readFileSync } from "fs";
import { resolve } from "path";

import { hasRoutePermission } from "@/utils/rolePermissions";
import type { UserRole } from "@/config/roleConfig";
import {
  resolveActiveInstitutionId,
  type InstitutionAffiliation,
} from "@/hooks/useInstitutionContext";
import { InstitutionSwitcher } from "@/components/institution/InstitutionSwitcher";
import { movementLocationLabel } from "@/services/hospitalStockService";

/**
 * Multi-institution workspace fix (browser click-through finding,
 * 2026-11-24): a QA staff user who owned TWO institutions was pinned to
 * one of them — no reachable switcher on desktop, the dashboard header
 * had none, /hospital-inventory redirected away, and the inventory
 * workflow resolved an arbitrary single institution. These tests pin
 * each layer of the fix.
 */

const affil = (id: string, affiliation: "admin" | "staff"): InstitutionAffiliation => ({
  id,
  name: id,
  type: "hospital",
  affiliation,
});

describe("route permission: /hospital-inventory", () => {
  // Exactly the roles App.tsx gates the route with via requireRoles.
  const gated: UserRole[] = [
    "pharmacist",
    "doctor",
    "specialist",
    "clinical_officer",
    "institution_admin",
    "inventory_manager",
  ];
  for (const role of gated) {
    it(`allows ${role} (requireRoles passes AND the permission matrix agrees)`, () => {
      expect(hasRoutePermission([role], "/hospital-inventory")).toBe(true);
    });
  }
  it("still refuses roles outside the gate", () => {
    expect(hasRoutePermission(["patient"], "/hospital-inventory")).toBe(false);
  });
});

describe("resolveActiveInstitutionId (shared workspace resolution)", () => {
  const two = [affil("clinic", "admin"), affil("hospital", "admin")];

  it("honours the persisted override when it names an affiliation", () => {
    expect(resolveActiveInstitutionId(two, "hospital")).toEqual({
      activeId: "hospital",
      overrideStale: false,
    });
  });

  it("defaults to the first (newest) owned institution without an override", () => {
    expect(resolveActiveInstitutionId(two, null).activeId).toBe("clinic");
  });

  it("reports a stale override and falls back instead of pinning to it", () => {
    const res = resolveActiveInstitutionId(two, "deleted-institution");
    expect(res.overrideStale).toBe(true);
    expect(res.activeId).toBe("clinic");
  });

  it("falls back to the first staff affiliation when nothing is owned", () => {
    const staffOnly = [affil("a", "staff"), affil("b", "staff")];
    expect(resolveActiveInstitutionId(staffOnly, null).activeId).toBe("a");
    expect(resolveActiveInstitutionId(staffOnly, "b").activeId).toBe("b");
  });

  it("returns null for a user with no affiliations", () => {
    expect(resolveActiveInstitutionId([], null)).toEqual({
      activeId: null,
      overrideStale: false,
    });
  });
});

describe("InstitutionSwitcher gating", () => {
  const one = [affil("only", "admin")];
  const twoAffils: InstitutionAffiliation[] = [
    { id: "h1", name: "QA Click Hospital", type: "hospital", affiliation: "admin" },
    { id: "c1", name: "QA Click Clinic", type: "clinic", affiliation: "admin" },
  ];

  it("renders nothing for a single-institution user (no new clutter)", () => {
    const { container } = render(
      <InstitutionSwitcher affiliations={one} activeId="only" onSwitch={() => {}} />,
    );
    expect(container.firstChild).toBeNull();
  });

  it("renders a labelled switcher naming the active workspace for 2+ affiliations", () => {
    render(
      <InstitutionSwitcher affiliations={twoAffils} activeId="c1" onSwitch={() => {}} tone="light" />,
    );
    expect(screen.getByText("QA Click Clinic")).toBeTruthy();
  });
});

describe("switcher mounts (source pins)", () => {
  const read = (p: string) => readFileSync(resolve(__dirname, "..", p), "utf8");

  it("DesktopNav carries the context switcher (its only desktop mount)", () => {
    const src = read("components/DesktopNav.tsx");
    expect(src).toContain('from "@/components/InstitutionSwitcher"');
    expect(src).toContain("<InstitutionSwitcher />");
  });

  it("the mobile Header keeps its switcher mount", () => {
    const src = read("components/Header.tsx");
    expect(src).toContain("<InstitutionSwitcher />");
  });

  it("InstitutionDashboard renders the switcher in its header with the live affiliations", () => {
    const src = read("pages/InstitutionDashboard.tsx");
    expect(src).toContain('from "@/components/institution/InstitutionSwitcher"');
    expect(src).toContain("affiliations={affiliations}");
    expect(src).toContain("onSwitch={switchInstitution}");
  });

  it("useInstitutionAffiliation resolves through the shared workspace logic", () => {
    const src = read("hooks/useInstitutionAffiliation.ts");
    expect(src).toContain("resolveActiveInstitutionId");
    expect(src).toContain("getActiveInstitutionOverride");
    expect(src).toContain("INSTITUTION_SWITCH_EVENT");
    expect(src).not.toContain("maybeSingle()");
  });
});

describe("movementLocationLabel (history direction wording)", () => {
  const names: Record<string, string> = { store: "Main Store", ward: "Ward A" };
  const nameFor = (id: string | null) => (id ? names[id] ?? null : null);
  const move = (movement_type: string, from: string | null, to: string | null) => ({
    movement_type,
    from_department_id: from,
    to_department_id: to,
  });

  it("an issue reads From the department the stock left", () => {
    // The ledger mirrors to=from for non-transfers — the old UI printed
    // "To Main Store" for exactly this row shape.
    expect(movementLocationLabel(move("issued", "store", "store"), nameFor)).toBe("From Main Store");
  });

  it("a receive reads To the department the stock arrived into", () => {
    expect(movementLocationLabel(move("received", "store", "store"), nameFor)).toBe("To Main Store");
  });

  it("a transfer reads From the source to the destination", () => {
    expect(movementLocationLabel(move("transferred", "store", "ward"), nameFor)).toBe(
      "From Main Store → To Ward A",
    );
  });

  it("write-offs and adjustments also read From", () => {
    expect(movementLocationLabel(move("written_off", "ward", "ward"), nameFor)).toBe("From Ward A");
    expect(movementLocationLabel(move("adjusted", "ward", "ward"), nameFor)).toBe("From Ward A");
  });

  it("returns null when no department is recorded", () => {
    expect(movementLocationLabel(move("issued", null, null), nameFor)).toBeNull();
  });
});
