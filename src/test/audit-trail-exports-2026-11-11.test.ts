import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { buildCsv } from "@/utils/csvExport";
import {
  AUDIT_TRAIL_FETCH_LIMIT,
  PATIENT_ACCESS_EXPORT_COLUMNS,
  SECURITY_AUDIT_EXPORT_COLUMNS,
  buildPatientAccessCsv,
  buildSecurityAuditCsv,
  securityAuditTarget,
} from "@/utils/auditExports";
import {
  WALLET_HISTORY_LIMIT,
  WALLET_STATEMENT_COLUMNS,
  buildWalletStatementCsv,
  buildWalletStatementHtml,
  statementSignedAmount,
} from "@/utils/walletStatement";

const readSrc = (p: string) => readFileSync(resolve(__dirname, "../../", p), "utf8");

// AUDIT / TRANSACTION TRAIL EXPORTS (2026-11-11, CEO: "Can the transactions
// trail be exported?"). Pins lock: the exact column sets, csvSafe-based
// escaping everywhere (no hand-rolled CSV), exports built from the rows
// already on screen (filtered admin rows / the patient's OWN fetched wallet
// history), and the honest fetch caps surfaced in the UI.

describe("csvExport: shared builder is csvSafe-based", () => {
  it("quotes every cell and neutralizes spreadsheet formula injection", () => {
    const csv = buildCsv(["A", "B"], [["=2+5", 'say "hi", ok']]);
    const lines = csv.split("\n");
    expect(lines[0]).toBe('"A","B"');
    expect(lines[1]).toBe(`"'=2+5","say ""hi"", ok"`);
  });

  it("csvExport.ts delegates escaping to csvSafe", () => {
    expect(readSrc("src/utils/csvExport.ts")).toContain(
      'import { csvCell } from "@/utils/csvSafe"',
    );
  });
});

describe("security audit log export", () => {
  const categoryOf = (t: string) => (t.includes("role") ? "Admin Actions" : "Other");
  const csv = buildSecurityAuditCsv(
    [
      {
        created_at: "2026-11-11T17:59:48.000Z",
        user_email: "admin@doc0clock.online",
        event_type: "role_assigned",
        event_data: { role: "institution_admin", target_user_id: "11111111-2222-3333-4444-555555555555" },
        ip_address: "41.60.1.2",
        user_agent: "Mozilla/5.0 Chrome",
      },
    ],
    categoryOf,
  );

  it("has the pinned column set", () => {
    expect([...SECURITY_AUDIT_EXPORT_COLUMNS]).toEqual([
      "Timestamp",
      "Actor",
      "Action",
      "Category",
      "Target / Resource",
      "Details",
      "IP Address",
      "Device / User Agent",
    ]);
    expect(csv.split("\n")[0]).toBe(
      [...SECURITY_AUDIT_EXPORT_COLUMNS].map((c) => `"${c}"`).join(","),
    );
  });

  it("carries the row's actor, action, category, target and full details", () => {
    expect(csv).toContain("admin@doc0clock.online");
    expect(csv).toContain('"role_assigned"');
    expect(csv).toContain('"Admin Actions"');
    expect(csv).toContain("target_user_id: 11111111-2222-3333-4444-555555555555");
    expect(csv).toContain("institution_admin");
    expect(csv).toContain("41.60.1.2");
  });

  it("target extraction falls back to the role transition, then blank", () => {
    expect(securityAuditTarget({ old_role: "patient", new_role: "doctor" })).toBe(
      "role: patient → doctor",
    );
    expect(securityAuditTarget({ role: "admin" })).toBe("role: admin");
    expect(securityAuditTarget({})).toBe("");
    expect(securityAuditTarget(null)).toBe("");
  });

  it("the viewer exports its filtered rows and shows the fetch cap", () => {
    const src = readSrc("src/components/admin/SecurityAuditLogs.tsx");
    expect(src).toContain("buildSecurityAuditCsv(filteredLogs, getEventCategory)");
    expect(src).toContain("Export CSV");
    expect(src).toContain(".limit(AUDIT_TRAIL_FETCH_LIMIT)");
    expect(AUDIT_TRAIL_FETCH_LIMIT).toBe(500);
    expect(src).not.toContain("new Blob"); // no hand-rolled CSV download
  });
});

describe("patient access log export", () => {
  const csv = buildPatientAccessCsv([
    {
      accessed_at: "2026-11-11T18:01:00.000Z",
      accessor_id: "aaaaaaaa-0000-0000-0000-000000000001",
      accessor_label: "Dr Proof Provider",
      patient_id: "bbbbbbbb-0000-0000-0000-000000000002",
      patient_label: "Proof Patient",
      access_type: "view",
      search_term: "lab_results",
      reason: '{"via":"live-proof-2026-11-11"}',
    },
  ]);

  it("has the pinned column set and carries labels + surface", () => {
    expect([...PATIENT_ACCESS_EXPORT_COLUMNS]).toEqual([
      "Timestamp",
      "Accessed By",
      "Patient",
      "Access Type",
      "Surface / Search",
      "Detail",
    ]);
    expect(csv).toContain("Dr Proof Provider");
    expect(csv).toContain("Proof Patient");
    expect(csv).toContain('"view"');
    expect(csv).toContain('"lab_results"');
  });

  it("the viewer exports its filtered rows and shows the fetch cap", () => {
    const src = readSrc("src/components/admin/PatientAccessAudit.tsx");
    expect(src).toContain("buildPatientAccessCsv(filtered)");
    expect(src).toContain("Export CSV");
    expect(src).toContain(".limit(AUDIT_TRAIL_FETCH_LIMIT)");
    expect(src).not.toContain("new Blob");
  });
});

// The exact rows inserted live for the QA statement proof (direct-SQL
// wallet rows for qa.statement@doc0clock.qa, labelled as such).
export const QA_PROOF_TRANSACTIONS = [
  {
    id: "qa-proof-tx-2",
    transaction_type: "debit",
    amount: 75.5,
    balance_after: 174.5,
    description: "QA statement proof — consultation payment",
    gateway_ref: null,
    payment_id: null,
    created_at: "2026-11-11T18:35:00.000Z",
  },
  {
    id: "qa-proof-tx-1",
    transaction_type: "credit",
    amount: 250,
    balance_after: 250,
    description: "QA statement proof — wallet top-up",
    gateway_ref: "QA-PROOF-2026-11-11-001",
    payment_id: null,
    created_at: "2026-11-11T18:30:00.000Z",
  },
];

describe("patient wallet statement export", () => {
  const csv = buildWalletStatementCsv(QA_PROOF_TRANSACTIONS);

  it("has the pinned column set", () => {
    expect([...WALLET_STATEMENT_COLUMNS]).toEqual([
      "Date",
      "Description",
      "Type",
      "Amount",
      "Balance After",
      "Gateway / Reference",
      "Status",
    ]);
    expect(csv.split("\n")[0]).toBe(
      [...WALLET_STATEMENT_COLUMNS].map((c) => `"${c}"`).join(","),
    );
  });

  it("signs amounts by direction and includes the known proof rows in full", () => {
    expect(statementSignedAmount(QA_PROOF_TRANSACTIONS[0])).toBe(-75.5);
    expect(statementSignedAmount(QA_PROOF_TRANSACTIONS[1])).toBe(250);
    // CSV amount = stored magnitude; direction rides in the Type column
    // (a signed "-75.50" cell would be formula-prefixed by csvSafe).
    expect(csv).toContain('"debit","75.50","174.50"');
    expect(csv).toContain('"credit","250.00","250.00","QA-PROOF-2026-11-11-001","Completed"');
    expect(csv).toContain("QA statement proof — consultation payment");
    expect(csv).toContain("QA statement proof — wallet top-up");
  });

  it("PDF statement HTML carries holder, rows, balances — and escapes markup", () => {
    const html = buildWalletStatementHtml({
      holderName: "Proof Patient",
      holderEmail: "qa.statement@doc0clock.qa",
      transactions: QA_PROOF_TRANSACTIONS,
    });
    expect(html).toContain("Proof Patient");
    expect(html).toContain("QA statement proof — wallet top-up");
    expect(html).toContain("QA-PROOF-2026-11-11-001");
    expect(html).toContain("ZMW 250.00"); // credit amount + its balance_after
    expect(html).toContain("ZMW 174.50"); // current balance = newest row's balance_after
    expect(html).toContain("Completed");

    const evil = buildWalletStatementHtml({
      holderName: "<script>alert(1)</script>",
      transactions: [],
    });
    expect(evil).not.toContain("<script>alert(1)</script>");
    expect(evil).toContain("&lt;script&gt;");
  });

  it("the history view exports only its own-user fetched rows", () => {
    const src = readSrc("src/components/wallet/WalletHistory.tsx");
    // Own-data scoping: the query is unchanged and owner-filtered.
    expect(src).toContain(".eq('user_wallets.user_id', user.id)");
    expect(src).toContain(".limit(WALLET_HISTORY_LIMIT)");
    expect(WALLET_HISTORY_LIMIT).toBe(1000);
    // Exports are built from the fetched/filtered rows only.
    expect(src).toContain("buildWalletStatementCsv(filteredTransactions)");
    expect(src).toContain("downloadWalletStatementPdf");
    expect(src).toContain("transactions: filteredTransactions");
    expect(src).not.toContain("service_role");
    expect(src).not.toContain("new Blob");
  });
});
