/**
 * Shared PDF receipt generator for Doc'O Clock.
 *
 * Produces well-formatted, branded PDF receipts for every transaction in the
 * webapp: pharmacy POS sales, prescription dispensing, billing/invoices,
 * lab orders, appointment bookings, and wallet payments.
 *
 * Uses jsPDF (client-side, no server round-trip). All receipts share the
 * Doc'O Clock brand header, receipt metadata block, line-item table,
 * totals section, and footer.
 */

import { jsPDF } from "jspdf";

export interface ReceiptLineItem {
  description: string;
  quantity: number;
  unitPrice: number;
  /** Optional per-line note, e.g. dosage or batch number */
  note?: string;
}

export interface ReceiptData {
  /** e.g. "PHARMACY SALE", "PRESCRIPTION DISPENSING", "LAB ORDER", "APPOINTMENT", "PAYMENT" */
  title: string;
  receiptNumber: string;
  date: Date | string;
  /** Institution/business issuing the receipt */
  issuerName: string;
  issuerAddress?: string;
  issuerPhone?: string;
  /** Customer/patient */
  customerName: string;
  customerPhone?: string;
  customerEmail?: string;
  items: ReceiptLineItem[];
  /** Discount applied (absolute amount) */
  discount?: number;
  /** Tax/VAT amount */
  tax?: number;
  /** Amount actually paid */
  amountPaid?: number;
  paymentMethod?: string;
  paymentReference?: string;
  currency?: string;
  notes?: string;
  /** Served by (staff name) */
  servedBy?: string;
}

const BRAND_BLUE: [number, number, number] = [0, 115, 234]; // #0073ea
const DARK: [number, number, number] = [15, 23, 42]; // slate-900
const MUTED: [number, number, number] = [100, 116, 139]; // slate-500
const LIGHT_BG: [number, number, number] = [241, 245, 249]; // slate-100

function fmtMoney(n: number, currency = "K"): string {
  return `${currency}${n.toLocaleString("en-ZM", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function fmtDate(d: Date | string): string {
  const dt = typeof d === "string" ? new Date(d) : d;
  return dt.toLocaleString("en-ZM", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Generate and download a branded PDF receipt.
 * Returns the jsPDF instance for further customization if needed.
 */
export function generateReceiptPdf(data: ReceiptData): jsPDF {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const currency = data.currency || "K";
  const pageW = doc.internal.pageSize.getWidth();
  const margin = 15;
  const contentW = pageW - margin * 2;
  let y = 0;

  // ---- Brand header band ----
  doc.setFillColor(...BRAND_BLUE);
  doc.rect(0, 0, pageW, 32, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.text("Doc' O Clock", margin, 13);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text("Healthcare, on your schedule", margin, 20);
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text(data.title.toUpperCase(), pageW - margin, 13, { align: "right" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text("doc0clock.online", pageW - margin, 20, { align: "right" });
  y = 40;

  // ---- Issuer block ----
  doc.setTextColor(...DARK);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text(data.issuerName, margin, y);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...MUTED);
  y += 5;
  if (data.issuerAddress) {
    doc.text(data.issuerAddress, margin, y);
    y += 5;
  }
  if (data.issuerPhone) {
    doc.text(`Tel: ${data.issuerPhone}`, margin, y);
    y += 5;
  }
  y += 2;

  // ---- Receipt meta + customer (two columns) ----
  const colX = pageW / 2 + 5;
  doc.setTextColor(...DARK);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text("RECEIPT", margin, y);
  doc.text("BILLED TO", colX, y);
  y += 5;
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...MUTED);
  doc.text(`No: ${data.receiptNumber}`, margin, y);
  doc.setTextColor(...DARK);
  doc.text(data.customerName, colX, y);
  y += 5;
  doc.setTextColor(...MUTED);
  doc.text(`Date: ${fmtDate(data.date)}`, margin, y);
  if (data.customerPhone) {
    doc.setTextColor(...DARK);
    doc.text(data.customerPhone, colX, y);
    y += 5;
  }
  if (data.customerEmail) {
    doc.setTextColor(...DARK);
    doc.text(data.customerEmail, colX, y);
    y += 5;
  }
  if (data.servedBy) {
    doc.setTextColor(...MUTED);
    doc.text(`Served by: ${data.servedBy}`, margin, y);
    y += 5;
  }
  y += 4;

  // ---- Line items table ----
  const colDesc = margin;
  const colQty = margin + contentW * 0.58;
  const colPrice = margin + contentW * 0.72;
  const colTotal = pageW - margin;

  doc.setFillColor(...LIGHT_BG);
  doc.rect(margin, y - 4, contentW, 8, "F");
  doc.setTextColor(...DARK);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text("DESCRIPTION", colDesc, y + 1.5);
  doc.text("QTY", colQty, y + 1.5);
  doc.text("UNIT PRICE", colPrice, y + 1.5);
  doc.text("TOTAL", colTotal, y + 1.5, { align: "right" });
  y += 8;

  doc.setFont("helvetica", "normal");
  let subtotal = 0;
  for (const item of data.items) {
    const lineTotal = item.quantity * item.unitPrice;
    subtotal += lineTotal;

    // Wrap long descriptions
    const descLines = doc.splitTextToSize(item.description, contentW * 0.55);
    doc.setTextColor(...DARK);
    doc.text(descLines, colDesc, y);
    doc.text(String(item.quantity), colQty, y);
    doc.text(fmtMoney(item.unitPrice, currency), colPrice, y);
    doc.text(fmtMoney(lineTotal, currency), colTotal, y, { align: "right" });
    y += descLines.length * 5;

    if (item.note) {
      doc.setTextColor(...MUTED);
      doc.setFontSize(8);
      const noteLines = doc.splitTextToSize(item.note, contentW * 0.55);
      doc.text(noteLines, colDesc, y);
      y += noteLines.length * 4;
      doc.setFontSize(9);
    }
    y += 2;

    // Light row separator
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.2);
    doc.line(margin, y, pageW - margin, y);
    y += 4;

    if (y > 250) {
      doc.addPage();
      y = 20;
    }
  }

  // ---- Totals ----
  y += 2;
  const totalsX = pageW - margin - 55;
  doc.setFontSize(9);
  doc.setTextColor(...MUTED);
  doc.text("Subtotal", totalsX, y);
  doc.setTextColor(...DARK);
  doc.text(fmtMoney(subtotal, currency), colTotal, y, { align: "right" });
  y += 6;

  const discount = data.discount || 0;
  if (discount > 0) {
    doc.setTextColor(...MUTED);
    doc.text("Discount", totalsX, y);
    doc.setTextColor(...DARK);
    doc.text(`-${fmtMoney(discount, currency)}`, colTotal, y, { align: "right" });
    y += 6;
  }

  const tax = data.tax || 0;
  if (tax > 0) {
    doc.setTextColor(...MUTED);
    doc.text("Tax / VAT", totalsX, y);
    doc.setTextColor(...DARK);
    doc.text(fmtMoney(tax, currency), colTotal, y, { align: "right" });
    y += 6;
  }

  const grandTotal = subtotal - discount + tax;
  doc.setDrawColor(...BRAND_BLUE);
  doc.setLineWidth(0.6);
  doc.line(totalsX - 5, y - 1, pageW - margin, y - 1);
  y += 5;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(...BRAND_BLUE);
  doc.text("TOTAL", totalsX, y);
  doc.text(fmtMoney(grandTotal, currency), colTotal, y, { align: "right" });
  y += 8;

  // ---- Payment info ----
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...MUTED);
  if (data.paymentMethod) {
    doc.text(`Payment method: ${data.paymentMethod}`, margin, y);
    y += 5;
  }
  if (data.paymentReference) {
    doc.text(`Reference: ${data.paymentReference}`, margin, y);
    y += 5;
  }
  if (data.amountPaid !== undefined) {
    const balance = grandTotal - data.amountPaid;
    doc.setTextColor(...DARK);
    doc.text(`Amount paid: ${fmtMoney(data.amountPaid, currency)}`, margin, y);
    y += 5;
    if (balance > 0.005) {
      doc.setTextColor(220, 38, 38);
      doc.text(`Balance due: ${fmtMoney(balance, currency)}`, margin, y);
      y += 5;
    } else if (balance < -0.005) {
      doc.setTextColor(22, 163, 74);
      doc.text(`Change: ${fmtMoney(-balance, currency)}`, margin, y);
      y += 5;
    }
    doc.setTextColor(...MUTED);
  }
  y += 4;

  if (data.notes) {
    doc.setFontSize(8);
    const noteLines = doc.splitTextToSize(`Notes: ${data.notes}`, contentW);
    doc.text(noteLines, margin, y);
    y += noteLines.length * 4 + 4;
  }

  // ---- Footer ----
  const footerY = doc.internal.pageSize.getHeight() - 18;
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.3);
  doc.line(margin, footerY - 6, pageW - margin, footerY - 6);
  doc.setFontSize(8);
  doc.setTextColor(...MUTED);
  doc.text(
    "Thank you for choosing Doc' O Clock. This is a system-generated receipt.",
    pageW / 2,
    footerY,
    { align: "center" }
  );
  doc.text("doc0clock.online", pageW / 2, footerY + 4, { align: "center" });

  return doc;
}

/**
 * Generate the PDF and trigger a download in the browser.
 */
export function downloadReceiptPdf(data: ReceiptData, filename?: string): void {
  const doc = generateReceiptPdf(data);
  const name = filename || `receipt-${data.receiptNumber}.pdf`;
  doc.save(name);
}

// ---------------------------------------------------------------------------
// Consolidated patient bill — one receipt for everything
// ---------------------------------------------------------------------------

export interface ConsolidatedReceiptSection {
  /** e.g. "Consultations", "Laboratory", "Pharmacy", "Clinical Procedures" */
  title: string;
  items: ReceiptLineItem[];
}

export interface ConsolidatedReceiptData extends Omit<ReceiptData, "items" | "title"> {
  title?: string;
  sections: ConsolidatedReceiptSection[];
}

/**
 * Generate a single consolidated bill covering all charge categories.
 * Each section gets its own subheader + subtotal; the PDF ends with one
 * grand total so the patient receives a single bill for everything.
 */
export function generateConsolidatedReceiptPdf(data: ConsolidatedReceiptData): jsPDF {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const currency = data.currency || "K";
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 15;
  let y = 0;

  const ensureSpace = (needed: number) => {
    if (y + needed > pageH - 25) {
      doc.addPage();
      y = 15;
    }
  };

  // ---- Brand header band ----
  doc.setFillColor(...BRAND_BLUE);
  doc.rect(0, 0, pageW, 32, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.text("Doc' O Clock", margin, 13);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text("Healthcare, on your schedule", margin, 20);
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text((data.title || "CONSOLIDATED BILL").toUpperCase(), pageW - margin, 13, { align: "right" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text("doc0clock.online", pageW - margin, 20, { align: "right" });
  y = 40;

  // ---- Issuer block ----
  doc.setTextColor(...DARK);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text(data.issuerName, margin, y);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...MUTED);
  y += 5;
  if (data.issuerAddress) { doc.text(data.issuerAddress, margin, y); y += 5; }
  if (data.issuerPhone) { doc.text(`Tel: ${data.issuerPhone}`, margin, y); y += 5; }
  y += 2;

  // ---- Receipt meta + customer (two columns) ----
  const colX = pageW / 2 + 5;
  doc.setTextColor(...DARK);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text("BILL", margin, y);
  doc.text("BILLED TO", colX, y);
  y += 5;
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...MUTED);
  doc.text(`No: ${data.receiptNumber}`, margin, y);
  doc.setTextColor(...DARK);
  doc.text(data.customerName, colX, y);
  y += 5;
  doc.setTextColor(...MUTED);
  doc.text(`Date: ${fmtDate(data.date)}`, margin, y);
  if (data.customerPhone) {
    doc.setTextColor(...DARK);
    doc.text(data.customerPhone, colX, y);
    y += 5;
  }
  if (data.customerEmail) {
    doc.setTextColor(...DARK);
    doc.text(data.customerEmail, colX, y);
    y += 5;
  }
  y += 6;

  const colQty = pageW - margin - 52;
  const colUnit = pageW - margin - 30;
  const colAmt = pageW - margin;

  let grandTotal = 0;

  for (const section of data.sections) {
    if (section.items.length === 0) continue;
    const sectionTotal = section.items.reduce((s, i) => s + i.quantity * i.unitPrice, 0);
    grandTotal += sectionTotal;

    ensureSpace(24);
    // Section header band
    doc.setFillColor(...LIGHT_BG);
    doc.rect(margin, y - 4, pageW - margin * 2, 9, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(...BRAND_BLUE);
    doc.text(section.title.toUpperCase(), margin + 2, y + 2);
    doc.setFontSize(9);
    doc.setTextColor(...MUTED);
    doc.text(fmtMoney(sectionTotal, currency), colAmt, y + 2, { align: "right" });
    y += 10;

    // Column headers
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(...MUTED);
    doc.text("DESCRIPTION", margin, y);
    doc.text("QTY", colQty, y, { align: "right" });
    doc.text("UNIT", colUnit, y, { align: "right" });
    doc.text("AMOUNT", colAmt, y, { align: "right" });
    y += 5;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(...DARK);
    for (const item of section.items) {
      ensureSpace(8);
      const descLines = doc.splitTextToSize(item.description, colQty - margin - 8);
      doc.text(descLines, margin, y);
      doc.text(String(item.quantity), colQty, y, { align: "right" });
      doc.text(fmtMoney(item.unitPrice, currency), colUnit, y, { align: "right" });
      doc.text(fmtMoney(item.quantity * item.unitPrice, currency), colAmt, y, { align: "right" });
      y += Math.max(descLines.length * 4.5, 6);
      if (item.note) {
        doc.setFontSize(8);
        doc.setTextColor(...MUTED);
        doc.text(item.note, margin + 2, y - 1);
        doc.setFontSize(9);
        doc.setTextColor(...DARK);
        y += 4;
      }
    }
    y += 4;
  }

  // ---- Totals ----
  ensureSpace(40);
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.3);
  doc.line(margin, y, pageW - margin, y);
  y += 7;

  const totalLabelX = pageW - margin - 55;
  doc.setFontSize(10);
  const discount = data.discount || 0;
  const tax = data.tax || 0;
  if (discount > 0) {
    doc.setTextColor(...MUTED);
    doc.setFont("helvetica", "normal");
    doc.text("Discount", totalLabelX, y, { align: "right" });
    doc.text(`-${fmtMoney(discount, currency)}`, colAmt, y, { align: "right" });
    y += 6;
  }
  if (tax > 0) {
    doc.setTextColor(...MUTED);
    doc.setFont("helvetica", "normal");
    doc.text("Tax", totalLabelX, y, { align: "right" });
    doc.text(fmtMoney(tax, currency), colAmt, y, { align: "right" });
    y += 6;
  }
  const finalTotal = grandTotal - discount + tax;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.setTextColor(...BRAND_BLUE);
  doc.text("TOTAL DUE", totalLabelX, y, { align: "right" });
  doc.text(fmtMoney(finalTotal, currency), colAmt, y, { align: "right" });
  y += 8;

  if (data.amountPaid != null && data.amountPaid > 0) {
    doc.setFontSize(10);
    doc.setTextColor(...DARK);
    doc.setFont("helvetica", "normal");
    doc.text("Amount paid", totalLabelX, y, { align: "right" });
    doc.text(fmtMoney(data.amountPaid, currency), colAmt, y, { align: "right" });
    y += 6;
    const balance = finalTotal - data.amountPaid;
    doc.setFont("helvetica", "bold");
    if (balance > 0) {
      doc.setTextColor(185, 28, 28);
      doc.text("Balance", totalLabelX, y, { align: "right" });
      doc.text(fmtMoney(balance, currency), colAmt, y, { align: "right" });
    } else if (balance < 0) {
      doc.setTextColor(21, 128, 61);
      doc.text("Change", totalLabelX, y, { align: "right" });
      doc.text(fmtMoney(-balance, currency), colAmt, y, { align: "right" });
    } else {
      doc.setTextColor(21, 128, 61);
      doc.text("PAID IN FULL", colAmt, y, { align: "right" });
    }
    y += 6;
    if (data.paymentMethod) {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(...MUTED);
      doc.text(`via ${data.paymentMethod}${data.paymentReference ? ` · ${data.paymentReference}` : ""}`, colAmt, y, { align: "right" });
      y += 6;
    }
  }
  y += 4;

  if (data.notes) {
    ensureSpace(16);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(...DARK);
    doc.text("Notes", margin, y);
    y += 5;
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...MUTED);
    const noteLines = doc.splitTextToSize(data.notes, pageW - margin * 2);
    doc.text(noteLines, margin, y);
    y += noteLines.length * 4 + 4;
  }

  if (data.servedBy) {
    doc.setFontSize(9);
    doc.setTextColor(...MUTED);
    doc.text(`Served by: ${data.servedBy}`, margin, y);
    y += 6;
  }

  // ---- Footer ----
  const footerY = pageH - 18;
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.3);
  doc.line(margin, footerY - 6, pageW - margin, footerY - 6);
  doc.setFontSize(8);
  doc.setTextColor(...MUTED);
  doc.text(
    "Thank you for choosing Doc' O Clock. This is a system-generated bill.",
    pageW / 2,
    footerY,
    { align: "center" }
  );
  doc.text("doc0clock.online", pageW / 2, footerY + 4, { align: "center" });

  return doc;
}

/**
 * Generate the consolidated bill PDF and trigger a download in the browser.
 */
export function downloadConsolidatedReceiptPdf(data: ConsolidatedReceiptData, filename?: string): void {
  const doc = generateConsolidatedReceiptPdf(data);
  const name = filename || `consolidated-bill-${data.receiptNumber}.pdf`;
  doc.save(name);
}
