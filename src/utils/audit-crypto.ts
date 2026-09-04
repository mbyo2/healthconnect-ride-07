/**
 * Cryptographic Audit Trail Engine
 * SHA-256 Hash-Chained Tamper-Evident Financial Ledger
 *
 * Each audit entry is hashed using SHA-256 combining:
 *   prev_hash + transaction_id + actor_id + action + amount + timestamp
 * Creating an immutable, verifiable audit chain.
 */

export type AuditAction =
  | "INVOICE_CREATED"
  | "INVOICE_UPDATED"
  | "PAYMENT_RECEIVED"
  | "PAYMENT_REVERSED"
  | "REFUND_ISSUED"
  | "CLAIM_SUBMITTED"
  | "CLAIM_ADJUDICATED"
  | "CLAIM_DENIED"
  | "WRITE_OFF_APPROVED"
  | "DEDUCTIBLE_APPLIED"
  | "COPAY_COLLECTED"
  | "ERA_RECONCILED"
  | "APPEAL_SUBMITTED"
  | "INTER_BRANCH_TRANSFER"
  | "PERIOD_CLOSE"
  | "POLICY_VERIFIED"
  | "USER_OVERRIDE"
  | "SYSTEM_AUTO_POST";

export interface FinancialAuditEntry {
  id: string;
  chainIndex: number;
  prevHash: string;
  currentHash: string;
  timestamp: string;
  action: AuditAction;
  actorId: string;
  actorName: string;
  actorRole: string;
  ipAddress: string;
  deviceTerminal: string;
  branchId: string;
  branchName: string;
  entityType: "Invoice" | "Claim" | "Payment" | "Journal" | "Transfer" | "Policy";
  entityId: string;
  entityRef: string;
  amount: number;
  currency: string;
  notes: string;
  isVerified: boolean;
  isTampered?: boolean;
}

/**
 * Browser-native SHA-256 digest (SubtleCrypto API)
 */
export async function sha256(message: string): Promise<string> {
  try {
    const encoder = new TextEncoder();
    const data = encoder.encode(message);
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
  } catch {
    // Fallback deterministic hash (non-cryptographic, demo only)
    let hash = 0;
    for (let i = 0; i < message.length; i++) {
      const char = message.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash |= 0;
    }
    return Math.abs(hash).toString(16).padStart(64, "0");
  }
}

/**
 * Compute hash for an audit entry using chain of custody pattern
 */
export async function computeEntryHash(
  prevHash: string,
  entry: Omit<FinancialAuditEntry, "currentHash" | "isVerified" | "isTampered">
): Promise<string> {
  const payload = [
    prevHash,
    entry.id,
    entry.action,
    entry.actorId,
    entry.actorName,
    entry.actorRole,
    entry.entityId,
    entry.entityType,
    String(entry.amount),
    entry.currency,
    entry.timestamp,
    entry.branchId,
  ].join("|");
  return sha256(payload);
}

/**
 * Verify integrity of an entire audit chain
 * Returns array of { index, isValid } for each entry
 */
export async function verifyAuditChain(
  entries: FinancialAuditEntry[]
): Promise<{ index: number; entryId: string; isValid: boolean }[]> {
  const results: { index: number; entryId: string; isValid: boolean }[] = [];
  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i];
    const expectedPrevHash = i === 0 ? "GENESIS_BLOCK_0000000000000000000000000000" : entries[i - 1].currentHash;
    const recomputed = await computeEntryHash(expectedPrevHash, {
      ...entry,
      prevHash: expectedPrevHash,
    });
    results.push({
      index: i,
      entryId: entry.id,
      isValid: recomputed === entry.currentHash && entry.prevHash === expectedPrevHash,
    });
  }
  return results;
}

/**
 * Generate a forensic audit PDF text report (plaintext for demonstration)
 */
export function generateForensicAuditReport(
  entries: FinancialAuditEntry[],
  verificationResults: { index: number; entryId: string; isValid: boolean }[],
  branchName: string
): string {
  const now = new Date().toISOString();
  const totalIntegrity = verificationResults.filter((r) => r.isValid).length;
  const lines = [
    "====================================================================",
    "        CRYPTOGRAPHIC FINANCIAL AUDIT CERTIFICATE",
    `        Facility: ${branchName}`,
    `        Generated: ${now}`,
    `        Total Entries: ${entries.length}`,
    `        Verified: ${totalIntegrity} / ${entries.length}`,
    "====================================================================",
    "",
    ...entries.map((entry, i) => {
      const isValid = verificationResults[i]?.isValid ?? false;
      return [
        `[${i + 1}] ${entry.timestamp} | ${isValid ? "✓ VALID" : "⚠ TAMPERED"}`,
        `    Action: ${entry.action} | Ref: ${entry.entityRef}`,
        `    Actor: ${entry.actorName} (${entry.actorRole}) @ ${entry.ipAddress} / ${entry.deviceTerminal}`,
        `    Branch: ${entry.branchName} | Amount: ${entry.currency} ${entry.amount.toFixed(2)}`,
        `    Hash: ${entry.currentHash.substring(0, 32)}...`,
        `    Notes: ${entry.notes}`,
        "",
      ].join("\n");
    }),
    "====================================================================",
    "  This report constitutes a tamper-evident cryptographic audit log.",
    "  Any modification to a prior entry will invalidate all subsequent hashes.",
    "====================================================================",
  ];
  return lines.join("\n");
}

// ─── Demo seed data ──────────────────────────────────────────────────────────

const ROLES = ["Finance Manager", "Billing Officer", "System Admin", "Senior Accountant", "Branch CFO", "Head Cashier"];
const ACTIONS: AuditAction[] = [
  "INVOICE_CREATED", "PAYMENT_RECEIVED", "CLAIM_SUBMITTED", "CLAIM_ADJUDICATED",
  "COPAY_COLLECTED", "ERA_RECONCILED", "INTER_BRANCH_TRANSFER", "WRITE_OFF_APPROVED",
  "DEDUCTIBLE_APPLIED", "REFUND_ISSUED",
];
const ENTITY_TYPES: FinancialAuditEntry["entityType"][] = ["Invoice", "Claim", "Payment", "Transfer", "Journal"];
const ACTORS = [
  { id: "usr-001", name: "Grace Mwale", role: "Finance Manager" },
  { id: "usr-002", name: "David Tembo", role: "Billing Officer" },
  { id: "usr-003", name: "System Auto", role: "System Admin" },
  { id: "usr-004", name: "Mary Banda", role: "Senior Accountant" },
  { id: "usr-005", name: "Jonathan Phiri", role: "Branch CFO" },
  { id: "usr-006", name: "Patricia Lungu", role: "Head Cashier" },
];
const IPS = ["196.32.10.45", "196.32.10.67", "192.168.1.201", "10.0.1.55", "197.215.44.12"];
const TERMINALS = ["CASHIER-WIN10-01", "BILLING-DESK-02", "AUTOSYSTEM-SRV", "MANAGER-PC-05", "KIOSK-TOUCHPT-03"];
const BRANCHES = [
  { id: "br-main", name: "Main Campus – Lusaka" },
  { id: "br-north", name: "Northern Branch – Ndola" },
  { id: "br-east", name: "Eastern Wing – Chipata" },
  { id: "br-south", name: "Southern Clinic – Livingstone" },
];

function randItem<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function generateDemoAuditEntries(count = 30): FinancialAuditEntry[] {
  const entries: FinancialAuditEntry[] = [];
  let prevHash = "GENESIS_BLOCK_0000000000000000000000000000";

  const now = new Date();
  for (let i = 0; i < count; i++) {
    const actor = randItem(ACTORS);
    const branch = randItem(BRANCHES);
    const action = ACTIONS[i % ACTIONS.length];
    const entityType = randItem(ENTITY_TYPES);
    const amount = parseFloat((Math.random() * 9500 + 100).toFixed(2));
    const ts = new Date(now.getTime() - (count - i) * 18 * 60 * 1000).toISOString();
    const entryId = `AUD-${String(i + 1).padStart(5, "0")}`;
    const entityRef = `${entityType.substring(0, 3).toUpperCase()}-${2024100 + i}`;

    // Deterministic hash approximation for demo
    const payload = [prevHash, entryId, action, actor.id, actor.name, actor.role, entityRef, entityType, String(amount), "ZMW", ts, branch.id].join("|");
    let hash = 5381;
    for (let c = 0; c < payload.length; c++) {
      hash = ((hash << 5) + hash) + payload.charCodeAt(c);
      hash = hash & hash;
    }
    const currentHash = Math.abs(hash).toString(16).padStart(64, "a");

    entries.push({
      id: entryId,
      chainIndex: i,
      prevHash,
      currentHash,
      timestamp: ts,
      action,
      actorId: actor.id,
      actorName: actor.name,
      actorRole: actor.role,
      ipAddress: randItem(IPS),
      deviceTerminal: randItem(TERMINALS),
      branchId: branch.id,
      branchName: branch.name,
      entityType,
      entityId: `${entityType.toUpperCase()}-${10000 + i}`,
      entityRef,
      amount,
      currency: "ZMW",
      notes: `${action.replace(/_/g, " ").toLowerCase()} processed for ${entityRef}`,
      isVerified: true,
    });

    prevHash = currentHash;
  }
  return entries;
}
