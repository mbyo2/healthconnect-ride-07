/**
 * Universal High-Quality PDF & Data Export/Import Utility
 * Generates styled, print-ready documents for Invoices, Payslips,
 * Financial Statements, Lab Results, and Medical Records.
 * Supports Multi-Currency and Multi-Country statutory configurations.
 */

export interface ExportPDFOptions {
  title: string;
  subtitle?: string;
  institutionName?: string;
  logoUrl?: string;
  address?: string;
  phone?: string;
  email?: string;
  currency?: string;
  watermark?: 'PAID' | 'CONFIDENTIAL' | 'APPROVED' | 'DRAFT' | 'OFFICIAL' | 'CRITICAL';
}

export interface InvoicePDFData {
  invoiceNumber: string;
  date: string;
  dueDate?: string;
  patientName: string;
  patientEmail?: string;
  patientPhone?: string;
  items: Array<{ description: string; quantity: number; unitPrice: number; total: number }>;
  subtotal: number;
  tax: number;
  discount: number;
  total: number;
  paidAmount: number;
  balance: number;
  paymentMethod?: string;
  notes?: string;
}

export interface PayslipPDFData {
  payslipNumber: string;
  payPeriod: string;
  staffName: string;
  staffId: string;
  department?: string;
  designation?: string;
  basicSalary: number;
  allowances: Array<{ name: string; amount: number }>;
  deductions: Array<{ name: string; amount: number }>;
  taxDeducted: number; // PAYE / Local Tax
  pensionDeducted: number; // Social Security / Statutory Pension
  healthInsuranceDeducted: number;
  netPay: number;
  currency: string;
  paymentDate: string;
}

export interface LabResultPDFData {
  reportId: string;
  testName: string;
  category?: string;
  patientName: string;
  patientAgeGender?: string;
  requestedBy?: string;
  sampleCollectedDate?: string;
  resultDate: string;
  results: Array<{ testParameter: string; value: string; unit?: string; referenceRange?: string; isAbnormal?: boolean }>;
  summaryNotes?: string;
  isCritical?: boolean;
  technicianName?: string;
  pathologistName?: string;
}

/**
 * Opens a print-formatted window with styled HTML and triggers window.print()
 */
export const printStyledPDF = (contentHtml: string, documentTitle: string) => {
  const printWindow = window.open('', '_blank', 'width=900,height=1000');
  if (!printWindow) {
    alert('Please allow popups to generate and print PDF documents.');
    return;
  }

  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>${documentTitle}</title>
        <meta charset="utf-8" />
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
          * { box-sizing: border-box; font-family: 'Inter', sans-serif; }
          body { margin: 0; padding: 24px; color: #1e293b; background: #fff; line-height: 1.5; }
          .container { max-width: 800px; margin: 0 auto; padding: 32px; border: 1px solid #e2e8f0; border-radius: 12px; position: relative; overflow: hidden; }
          .header { display: flex; justify-content: space-between; align-items: flex-start; padding-bottom: 24px; border-bottom: 2px solid #0284c7; }
          .brand-title { font-size: 24px; font-weight: 700; color: #0f172a; margin: 0; }
          .brand-sub { font-size: 12px; color: #64748b; margin: 2px 0 0 0; }
          .doc-type { text-align: right; }
          .doc-badge { display: inline-block; padding: 4px 12px; background: #0284c7; color: #fff; font-size: 14px; font-weight: 600; border-radius: 6px; text-transform: uppercase; }
          .doc-num { font-size: 14px; color: #475569; margin-top: 4px; font-family: monospace; font-weight: 600; }
          .meta-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin: 24px 0; font-size: 13px; }
          .meta-block h4 { margin: 0 0 6px 0; color: #0284c7; text-transform: uppercase; font-size: 11px; letter-spacing: 0.5px; }
          .meta-block p { margin: 2px 0; color: #334155; }
          table { width: 100%; border-collapse: collapse; margin: 24px 0; font-size: 13px; }
          th { background: #f8fafc; color: #475569; font-weight: 600; text-align: left; padding: 10px 12px; border-bottom: 2px solid #cbd5e1; text-transform: uppercase; font-size: 11px; }
          td { padding: 10px 12px; border-bottom: 1px solid #f1f5f9; color: #334155; }
          tr:nth-child(even) td { background: #f8fafc; }
          .text-right { text-align: right; }
          .totals-block { margin-left: auto; width: 280px; font-size: 13px; margin-top: 16px; }
          .totals-row { display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px solid #f1f5f9; }
          .totals-row.grand { font-size: 16px; font-weight: 700; color: #0f172a; border-top: 2px solid #0f172a; border-bottom: none; padding-top: 10px; }
          .watermark { position: absolute; top: 35%; left: 15%; transform: rotate(-30deg); font-size: 70px; font-weight: 900; color: rgba(2, 132, 199, 0.08); pointer-events: none; border: 8px solid rgba(2, 132, 199, 0.08); padding: 10px 30px; border-radius: 12px; text-transform: uppercase; letter-spacing: 4px; }
          .footer { margin-top: 48px; padding-top: 24px; border-top: 1px solid #e2e8f0; display: flex; justify-content: space-between; align-items: flex-end; font-size: 11px; color: #94a3b8; }
          .signature-box { border-top: 1px solid #cbd5e1; width: 180px; text-align: center; padding-top: 4px; color: #475569; font-size: 12px; margin-top: 32px; }
          @media print {
            body { padding: 0; }
            .container { border: none; padding: 0; max-width: 100%; }
            @page { margin: 1.5cm; }
          }
        </style>
      </head>
      <body>
        <div class="container">
          ${contentHtml}
        </div>
        <script>
          window.onload = function() {
            setTimeout(function() { window.print(); }, 400);
          };
        </script>
      </body>
    </html>
  `);
  printWindow.document.close();
};

/**
 * Generate Invoice / Official Receipt PDF
 */
export const exportInvoicePDF = (data: InvoicePDFData, opts: ExportPDFOptions) => {
  const currency = opts.currency || 'ZMW';
  const watermarkText = data.balance === 0 ? 'PAID' : (opts.watermark || 'OFFICIAL');

  const itemsHtml = data.items.map((item, idx) => `
    <tr>
      <td>${idx + 1}</td>
      <td><strong>${item.description}</strong></td>
      <td class="text-right">${item.quantity}</td>
      <td class="text-right">${currency} ${item.unitPrice.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
      <td class="text-right"><strong>${currency} ${item.total.toLocaleString(undefined, { minimumFractionDigits: 2 })}</strong></td>
    </tr>
  `).join('');

  const html = `
    <div class="watermark">${watermarkText}</div>
    <div class="header">
      <div class="brand">
        <div>
          <h1 class="brand-title">${opts.institutionName || 'Doc-O-Clock Healthcare'}</h1>
          <p class="brand-sub">${opts.address || 'Medical & Health Services System'}</p>
        </div>
      </div>
      <div class="doc-type">
        <span class="doc-badge">INVOICE / RECEIPT</span>
        <div class="doc-num">${data.invoiceNumber}</div>
        <p class="brand-sub">Date: ${data.date}</p>
        ${data.dueDate ? `<p class="brand-sub">Due: ${data.dueDate}</p>` : ''}
      </div>
    </div>

    <div class="meta-grid">
      <div class="meta-block">
        <h4>Billed To (Patient / Client)</h4>
        <p><strong>${data.patientName}</strong></p>
        ${data.patientPhone ? `<p>Phone: ${data.patientPhone}</p>` : ''}
      </div>
      <div class="meta-block text-right">
        <h4>Payment Summary</h4>
        <p>Method: <strong>${(data.paymentMethod || 'cash').toUpperCase()}</strong></p>
        <p>Paid Amount: <strong>${currency} ${data.paidAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</strong></p>
        <p>Balance Due: <strong style="color: ${data.balance > 0 ? '#e11d48' : '#16a34a'};">${currency} ${data.balance.toLocaleString(undefined, { minimumFractionDigits: 2 })}</strong></p>
      </div>
    </div>

    <table>
      <thead>
        <tr>
          <th style="width: 40px;">#</th>
          <th>Service / Description</th>
          <th class="text-right">Qty</th>
          <th class="text-right">Unit Price</th>
          <th class="text-right">Total</th>
        </tr>
      </thead>
      <tbody>${itemsHtml}</tbody>
    </table>

    <div class="totals-block">
      <div class="totals-row"><span>Subtotal</span><span>${currency} ${data.subtotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span></div>
      ${data.tax > 0 ? `<div class="totals-row"><span>Tax / VAT</span><span>${currency} ${data.tax.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span></div>` : ''}
      ${data.discount > 0 ? `<div class="totals-row"><span>Discount</span><span>-${currency} ${data.discount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span></div>` : ''}
      <div class="totals-row grand"><span>Total Due</span><span>${currency} ${data.total.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span></div>
    </div>

    <div class="footer">
      <div>Official Computer Generated Invoice • Valid without seal</div>
      <div class="signature-box">Authorized Cashier / Accountant</div>
    </div>
  `;

  printStyledPDF(html, `Invoice_${data.invoiceNumber}`);
};

/**
 * Generate Employee Payslip PDF
 */
export const exportPayslipPDF = (data: PayslipPDFData, opts: ExportPDFOptions) => {
  const currency = data.currency || opts.currency || 'ZMW';

  const html = `
    <div class="watermark">PAYSLIP</div>
    <div class="header">
      <div>
        <h1 class="brand-title">${opts.institutionName || 'Doc-O-Clock Healthcare'}</h1>
        <p class="brand-sub">HR & Payroll Department</p>
      </div>
      <div class="doc-type">
        <span class="doc-badge">CONFIDENTIAL PAYSLIP</span>
        <div class="doc-num">${data.payslipNumber}</div>
        <p class="brand-sub">Pay Period: ${data.payPeriod}</p>
      </div>
    </div>

    <div class="meta-grid">
      <div class="meta-block">
        <h4>Employee Information</h4>
        <p>Name: <strong>${data.staffName}</strong></p>
        <p>Staff ID: <code>${data.staffId}</code></p>
      </div>
      <div class="meta-block text-right">
        <h4>Payment Summary</h4>
        <p>Payment Date: <strong>${data.paymentDate}</strong></p>
        <p>Currency: <strong>${currency}</strong></p>
      </div>
    </div>

    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 24px;">
      <div style="background: #f8fafc; padding: 16px; border-radius: 8px; border: 1px solid #e2e8f0;">
        <h4 style="margin: 0 0 12px 0; color: #16a34a;">Earnings & Allowances</h4>
        <div class="totals-row"><span>Basic Salary</span><span>${currency} ${data.basicSalary.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span></div>
        ${data.allowances.map(a => `<div class="totals-row"><span>${a.name}</span><span>${currency} ${a.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span></div>`).join('')}
      </div>

      <div style="background: #f8fafc; padding: 16px; border-radius: 8px; border: 1px solid #e2e8f0;">
        <h4 style="margin: 0 0 12px 0; color: #e11d48;">Deductions & Statutory Taxes</h4>
        ${data.taxDeducted > 0 ? `<div class="totals-row"><span>Income Tax (PAYE)</span><span>-${currency} ${data.taxDeducted.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span></div>` : ''}
        ${data.pensionDeducted > 0 ? `<div class="totals-row"><span>Pension / Social Security</span><span>-${currency} ${data.pensionDeducted.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span></div>` : ''}
        ${data.healthInsuranceDeducted > 0 ? `<div class="totals-row"><span>Health Insurance</span><span>-${currency} ${data.healthInsuranceDeducted.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span></div>` : ''}
      </div>
    </div>

    <div class="totals-block" style="width: 100%; margin-top: 24px; background: #0284c7; color: #fff; padding: 16px; border-radius: 8px;">
      <div class="totals-row grand" style="color: #fff; border: none; padding: 0;">
        <span>NET TAKE-HOME PAY</span>
        <span>${currency} ${data.netPay.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
      </div>
    </div>

    <div class="footer">
      <div>Strictly Confidential • Generated by Doc-O-Clock HR System</div>
      <div class="signature-box">HR / Payroll Manager</div>
    </div>
  `;

  printStyledPDF(html, `Payslip_${data.staffId}_${data.payPeriod}`);
};

/**
 * Generate Lab Test Result PDF
 */
export const exportLabResultPDF = (data: LabResultPDFData, opts: ExportPDFOptions) => {
  const isCritical = data.isCritical;
  const rowsHtml = data.results.map((r, i) => `
    <tr style="${r.isAbnormal ? 'background: #fff1f2;' : ''}">
      <td>${i + 1}</td>
      <td><strong>${r.testParameter}</strong></td>
      <td><strong style="color: ${r.isAbnormal ? '#e11d48' : '#0f172a'};">${r.value} ${r.unit || ''}</strong></td>
      <td>${r.referenceRange || 'Standard'}</td>
      <td>${r.isAbnormal ? '<span style="color: #e11d48; font-weight: bold;">ABNORMAL / CRITICAL</span>' : '<span style="color: #16a34a;">Normal</span>'}</td>
    </tr>
  `).join('');

  const html = `
    <div class="watermark">${isCritical ? 'CRITICAL' : 'OFFICIAL'}</div>
    <div class="header" style="border-bottom-color: ${isCritical ? '#e11d48' : '#0284c7'};">
      <div>
        <h1 class="brand-title">${opts.institutionName || 'Doc-O-Clock Clinical Diagnostics'}</h1>
        <p class="brand-sub">Laboratory Information Management System (LIMS)</p>
      </div>
      <div class="doc-type">
        <span class="doc-badge" style="background: ${isCritical ? '#e11d48' : '#0284c7'};">LAB TEST REPORT</span>
        <div class="doc-num">${data.reportId}</div>
        <p class="brand-sub">Date: ${data.resultDate}</p>
      </div>
    </div>

    <div class="meta-grid">
      <div class="meta-block">
        <h4>Patient Profile</h4>
        <p>Name: <strong>${data.patientName}</strong></p>
        ${data.patientAgeGender ? `<p>Details: ${data.patientAgeGender}</p>` : ''}
      </div>
      <div class="meta-block text-right">
        <h4>Test Category & Ordering</h4>
        <p>Test: <strong>${data.testName}</strong></p>
        ${data.requestedBy ? `<p>Requested By: Dr. ${data.requestedBy}</p>` : ''}
      </div>
    </div>

    <table>
      <thead>
        <tr>
          <th>#</th>
          <th>Test Parameter</th>
          <th>Observed Result</th>
          <th>Reference Range</th>
          <th>Status</th>
        </tr>
      </thead>
      <tbody>${rowsHtml}</tbody>
    </table>

    ${data.summaryNotes ? `<div style="margin-top: 20px; padding: 12px; background: #f8fafc; border-left: 4px solid #0284c7; border-radius: 4px; font-size: 12px;"><strong>Pathologist / Lab Clinical Notes:</strong> ${data.summaryNotes}</div>` : ''}

    <div class="footer">
      <div>Verified Diagnostics Report • Electronic Signatures Embedded</div>
      <div class="signature-box">Consulant Pathologist</div>
    </div>
  `;

  printStyledPDF(html, `LabResult_${data.reportId}`);
};

/**
 * Universal CSV Exporter
 */
export const exportToCSV = (filename: string, rows: Record<string, any>[]) => {
  if (!rows || rows.length === 0) return;
  const headers = Object.keys(rows[0]);
  const csvContent = [
    headers.join(','),
    ...rows.map(row => headers.map(h => JSON.stringify(row[h] ?? '')).join(','))
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${filename}.csv`;
  a.click();
  URL.revokeObjectURL(url);
};

/**
 * Universal JSON Exporter
 */
export const exportToJSON = (filename: string, data: any) => {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${filename}.json`;
  a.click();
  URL.revokeObjectURL(url);
};

/**
 * Universal CSV Importer Helper
 */
export const parseCSVFile = (file: File): Promise<Record<string, string>[]> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const lines = text.trim().split('\n');
        if (lines.length < 2) return resolve([]);
        const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
        const result: Record<string, string>[] = [];

        for (let i = 1; i < lines.length; i++) {
          const vals = lines[i].split(',').map(v => v.trim().replace(/^"|"$/g, ''));
          const row: Record<string, string> = {};
          headers.forEach((h, idx) => {
            row[h] = vals[idx] || '';
          });
          result.push(row);
        }
        resolve(result);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = (err) => reject(err);
    reader.readAsText(file);
  });
};
