import { buildCsv } from "@/utils/csvExport";
import { printStyledPDF } from "@/utils/pdfExport";
import { escapeHtml } from "@/utils/safePrint";

/**
 * Patient wallet statement export (CSV + PDF).
 *
 * Built purely from the wallet_transactions rows the wallet history view
 * already fetched for the signed-in user — the history query is scoped to
 * the user's own wallet (user_wallets.user_id = auth user, RLS owner-only)
 * and this module opens no new data path.
 *
 * History fetch cap: WALLET_HISTORY_LIMIT rows, newest first — the same
 * bound PostgREST applies by default, made explicit. The history view
 * tells the user when the cap is hit, and a statement covers exactly the
 * transactions shown.
 */
export const WALLET_HISTORY_LIMIT = 1000;

export interface WalletStatementTransaction {
  id: string;
  transaction_type: string; // 'credit' | 'debit' | 'refund'
  amount: number;
  balance_after: number;
  description: string | null;
  gateway_ref?: string | null;
  payment_id?: string | null;
  created_at: string;
}

export const WALLET_STATEMENT_COLUMNS = [
  "Date",
  "Description",
  "Type",
  "Amount",
  "Balance After",
  "Gateway / Reference",
  "Status",
] as const;

/**
 * wallet_transactions stores amount as a positive magnitude with the
 * direction in transaction_type; the PDF statement signs it (debit
 * negative, credit/refund positive) exactly as the history view renders
 * it. The CSV keeps magnitude + Type (see buildWalletStatementCsv).
 */
export function statementSignedAmount(tx: WalletStatementTransaction): number {
  const magnitude = Math.abs(Number(tx.amount) || 0);
  return tx.transaction_type === "debit" ? -magnitude : magnitude;
}

function statementDescription(tx: WalletStatementTransaction): string {
  if (tx.description) return tx.description;
  if (tx.transaction_type === "credit") return "Wallet Top-Up";
  if (tx.transaction_type === "refund") return "Wallet Refund";
  return "Wallet Payment";
}

/**
 * wallet_transactions has no status column: a row exists only once the
 * movement has posted to the ledger, so every statement line is a
 * completed posting.
 */
export const WALLET_STATEMENT_ROW_STATUS = "Completed";

export function buildWalletStatementCsv(
  transactions: WalletStatementTransaction[],
): string {
  // Amount travels as the stored positive magnitude with direction in the
  // Type column (exactly how the ledger records it). A signed "-75.50"
  // cell would be prefixed by csvSafe's formula-injection defence
  // (leading '-'), corrupting the number for spreadsheet import; the PDF
  // statement keeps the signed visual form.
  const rows = transactions.map((tx) => [
    new Date(tx.created_at).toISOString(),
    statementDescription(tx),
    tx.transaction_type,
    (Math.abs(Number(tx.amount) || 0)).toFixed(2),
    (Number(tx.balance_after) || 0).toFixed(2),
    tx.gateway_ref || tx.payment_id || "",
    WALLET_STATEMENT_ROW_STATUS,
  ]);
  return buildCsv([...WALLET_STATEMENT_COLUMNS], rows);
}

export interface WalletStatementPdfOptions {
  holderName: string;
  holderEmail?: string;
  transactions: WalletStatementTransaction[];
  currency?: string;
}

function fmtMoney(n: number, currency: string): string {
  return `${currency} ${n.toLocaleString("en-ZM", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function buildWalletStatementHtml(opts: WalletStatementPdfOptions): string {
  const currency = opts.currency || "ZMW";
  const txs = opts.transactions;
  // Rows arrive newest-first (history view order): the first row's
  // balance_after is the current balance; the period runs from the
  // oldest row's date to the newest.
  const currentBalance = txs.length ? Number(txs[0].balance_after) || 0 : 0;
  const newest = txs.length ? new Date(txs[0].created_at) : null;
  const oldest = txs.length ? new Date(txs[txs.length - 1].created_at) : null;
  const generated = new Date();

  const rowsHtml = txs
    .map((tx) => {
      const signed = statementSignedAmount(tx);
      return `
      <tr>
        <td>${escapeHtml(new Date(tx.created_at).toLocaleString("en-ZM"))}</td>
        <td><strong>${escapeHtml(statementDescription(tx))}</strong></td>
        <td>${escapeHtml(tx.transaction_type)}</td>
        <td class="text-right" style="color: ${signed < 0 ? "#e11d48" : "#16a34a"};">${escapeHtml(fmtMoney(signed, currency))}</td>
        <td class="text-right">${escapeHtml(fmtMoney(Number(tx.balance_after) || 0, currency))}</td>
        <td>${escapeHtml(tx.gateway_ref || tx.payment_id || "—")}</td>
        <td>${WALLET_STATEMENT_ROW_STATUS}</td>
      </tr>`;
    })
    .join("");

  return `
    <div class="header">
      <div class="brand">
        <div>
          <h1 class="brand-title">Doc'O Clock</h1>
          <p class="brand-sub">Patient Wallet</p>
        </div>
      </div>
      <div class="doc-type">
        <span class="doc-badge">WALLET STATEMENT</span>
        <p class="brand-sub">Generated: ${escapeHtml(generated.toLocaleString("en-ZM"))}</p>
      </div>
    </div>

    <div class="meta-grid">
      <div class="meta-block">
        <h4>Account Holder</h4>
        <p><strong>${escapeHtml(opts.holderName)}</strong></p>
        ${opts.holderEmail ? `<p>${escapeHtml(opts.holderEmail)}</p>` : ""}
      </div>
      <div class="meta-block text-right">
        <h4>Statement Summary</h4>
        <p>Transactions: <strong>${txs.length}</strong></p>
        ${oldest && newest ? `<p>Period: <strong>${escapeHtml(oldest.toLocaleDateString("en-ZM"))} – ${escapeHtml(newest.toLocaleDateString("en-ZM"))}</strong></p>` : ""}
        <p>Current Balance: <strong>${escapeHtml(fmtMoney(currentBalance, currency))}</strong></p>
      </div>
    </div>

    <table>
      <thead>
        <tr>
          <th>Date</th>
          <th>Description</th>
          <th>Type</th>
          <th class="text-right">Amount</th>
          <th class="text-right">Balance After</th>
          <th>Gateway / Reference</th>
          <th>Status</th>
        </tr>
      </thead>
      <tbody>${rowsHtml}</tbody>
    </table>

    <div class="footer">
      <div>Computer-generated wallet statement • Doc'O Clock</div>
      <div>Page 1 of 1</div>
    </div>
  `;
}

/** Open the print-ready statement (Save as PDF) via the shared pdfExport shell. */
export function downloadWalletStatementPdf(opts: WalletStatementPdfOptions): void {
  printStyledPDF(buildWalletStatementHtml(opts), "Wallet Statement");
}
