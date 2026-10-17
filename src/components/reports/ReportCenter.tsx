// ReportCenter — Frappe/Marley-style report hub for Doc'O Clock.
// Filters first, preview before export, designed PDF + CSV download.
// Reports are role-gated: each role sees the reports relevant to them.
import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { FileText, Download, Eye, Loader2, Calendar } from 'lucide-react';
import { toast } from 'sonner';
import { jsPDF } from 'jspdf';
import { buildMisReport, downloadCsv } from '@/services/misReports';
import { useCurrency } from '@/hooks/use-currency';

// ── Report catalogue with role gating ────────────────────────────
interface ReportDef {
  title: string;
  description: string;
  roles: string[]; // empty = all roles
  category: string;
}

const REPORTS: ReportDef[] = [
  { title: 'Daily Census Report', description: 'OPD queue, admissions, bed status for today', roles: [], category: 'Operations' },
  { title: 'Revenue & Collection', description: 'Billed, collected, outstanding — with date filter', roles: ['admin', 'finance_manager', 'cxo'], category: 'Finance' },
  { title: 'Department-wise Revenue', description: 'Revenue broken down by department', roles: ['admin', 'finance_manager', 'cxo'], category: 'Finance' },
  { title: 'Doctor Performance', description: 'Consultations and revenue per doctor', roles: ['admin', 'cxo'], category: 'Clinical' },
  { title: 'Bed Occupancy Trends', description: 'Occupancy rates over the selected period', roles: [], category: 'Operations' },
  { title: 'OT Utilization', description: 'Theatre usage and procedures', roles: ['admin', 'cxo'], category: 'Operations' },
  { title: 'Lab TAT Report', description: 'Turnaround times for lab orders', roles: [], category: 'Clinical' },
  { title: 'Outsourced Tests Report', description: 'Tests sent to external labs', roles: [], category: 'Clinical' },
  { title: 'Pharmacy Sales', description: 'Dispensary sales with date filter', roles: ['admin', 'finance_manager', 'pharmacist'], category: 'Pharmacy' },
  { title: 'Monthly Purchase (Supplier-wise)', description: 'Procurement by supplier', roles: ['admin', 'finance_manager'], category: 'Pharmacy' },
  { title: 'Near-Expiry Drug Report', description: 'Stock expiring soon — act fast', roles: ['pharmacist', 'admin'], category: 'Pharmacy' },
  { title: 'Insurance Receivables', description: 'Outstanding insurance claims', roles: ['admin', 'finance_manager'], category: 'Finance' },
  { title: 'Sales & Return Tax Report', description: 'Tax summary for the period', roles: ['admin', 'finance_manager'], category: 'Finance' },
  { title: 'Check-in vs Billed Report', description: 'Visit-to-billing conversion', roles: ['admin', 'cxo'], category: 'Operations' },
  { title: 'Discharge Summary Report', description: 'Discharges in the period', roles: [], category: 'Clinical' },
  { title: 'Referral Analytics', description: 'Inbound/outbound referrals', roles: ['admin', 'cxo'], category: 'Clinical' },
  { title: 'Inventory Consumption', description: 'Stock usage by item', roles: ['pharmacist', 'admin'], category: 'Pharmacy' },
  { title: 'Infection Surveillance Report', description: 'Infection tracking', roles: [], category: 'Clinical' },
  { title: 'Patient Feedback Analysis', description: 'Ratings and feedback summary', roles: ['admin', 'cxo'], category: 'Quality' },
];

// ── Designed PDF export ──────────────────────────────────────────
function exportReportPdf(title: string, rows: string[][], filters: { from: string; to: string }, hospitalName: string) {
  const doc = new jsPDF();
  const pageW = doc.internal.pageSize.getWidth();
  let y = 20;

  // Brand header
  doc.setFillColor(0, 115, 234);
  doc.rect(0, 0, pageW, 28, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text("Doc'O Clock", 14, 12);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(hospitalName, 14, 20);

  y = 38;
  doc.setTextColor(30, 30, 30);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text(title, 14, y);
  y += 7;
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(120, 120, 120);
  doc.text(`Period: ${filters.from || '—'} to ${filters.to || '—'}  ·  Generated ${new Date().toLocaleString()}`, 14, y);
  y += 10;

  // Table
  const colW = (pageW - 28) / Math.max(1, rows[0]?.length || 1);
  doc.setFontSize(8);
  rows.forEach((row, ri) => {
    if (y > 270) {
      doc.addPage();
      y = 20;
    }
    const isHeader = ri === 0;
    if (isHeader) {
      doc.setFillColor(240, 242, 245);
      doc.rect(14, y - 4, pageW - 28, 8, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(60, 60, 60);
    } else {
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(40, 40, 40);
      if (ri % 2 === 0) {
        doc.setFillColor(250, 250, 252);
        doc.rect(14, y - 4, pageW - 28, 8, 'F');
      }
    }
    row.forEach((cell, ci) => {
      const text = String(cell ?? '').slice(0, 40);
      doc.text(text, 16 + ci * colW, y, { maxWidth: colW - 4 });
    });
    y += 7;
  });

  // Footer
  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text(`Page ${i} of ${pages}  ·  Doc'O Clock Report`, pageW / 2, 290, { align: 'center' });
  }

  doc.save(`${title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${Date.now()}.pdf`);
}

// ── Main component ───────────────────────────────────────────────
export const ReportCenter = ({
  hospital,
  userRole,
}: {
  hospital: any;
  userRole?: string;
}) => {
  const [filters, setFilters] = useState({ from: '', to: '' });
  const [preview, setPreview] = useState<{ title: string; rows: string[][] } | null>(null);
  const [working, setWorking] = useState<string | null>(null);
  const { formatPrice } = useCurrency();

  const visibleReports = REPORTS.filter(
    (r) => r.roles.length === 0 || !userRole || r.roles.includes(userRole)
  );
  const categories = [...new Set(visibleReports.map((r) => r.category))];

  const runReport = async (title: string, forPreview: boolean) => {
    if (!hospital?.id || working) return;
    setWorking(title);
    try {
      const result = await buildMisReport(title, hospital.id);
      if (forPreview) {
        setPreview({ title, rows: result.rows });
      } else {
        downloadCsv(result.filename, result.rows);
        toast.success(`${title} exported as CSV.`);
      }
    } catch (e: any) {
      toast.error(e?.message || 'Failed to generate report');
    } finally {
      setWorking(null);
    }
  };

  const exportPreviewPdf = () => {
    if (!preview) return;
    exportReportPdf(preview.title, preview.rows, filters, hospital?.name || 'Facility');
    toast.success('PDF downloaded.');
  };

  const exportPreviewCsv = () => {
    if (!preview) return;
    const csv = preview.rows.map((row) => row.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `${preview.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${Date.now()}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success('CSV downloaded.');
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-xl font-bold tracking-tight">Report Center</h3>
        <p className="text-sm text-muted-foreground">Filter, preview, then export as PDF or CSV.</p>
      </div>

      {/* Filters — applied before generation */}
      <div className="flex flex-wrap items-end gap-3 p-4 rounded-2xl border border-border bg-card">
        <div className="space-y-1.5">
          <Label className="text-xs">From date</Label>
          <div className="relative">
            <Calendar className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="date"
              value={filters.from}
              onChange={(e) => setFilters({ ...filters, from: e.target.value })}
              className="pl-9 w-44"
            />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">To date</Label>
          <div className="relative">
            <Calendar className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="date"
              value={filters.to}
              onChange={(e) => setFilters({ ...filters, to: e.target.value })}
              className="pl-9 w-44"
            />
          </div>
        </div>
        <p className="text-xs text-muted-foreground pb-2.5">
          Date filters apply to reports that support a period. Pick a report below to preview it first.
        </p>
      </div>

      {/* Report catalogue by category */}
      {categories.map((cat) => (
        <div key={cat}>
          <h4 className="text-sm font-semibold mb-2.5">{cat}</h4>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {visibleReports.filter((r) => r.category === cat).map((r) => (
              <div key={r.title} className="p-4 rounded-2xl border border-border bg-card hover:shadow-sm transition-shadow">
                <div className="flex items-start gap-2.5">
                  <FileText className="h-5 w-5 text-primary-500 shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold">{r.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{r.description}</p>
                  </div>
                </div>
                <div className="flex gap-2 mt-3">
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1 gap-1.5"
                    disabled={working === r.title}
                    onClick={() => runReport(r.title, true)}
                  >
                    {working === r.title ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Eye className="h-3.5 w-3.5" />}
                    Preview
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="gap-1.5"
                    disabled={working === r.title}
                    onClick={() => runReport(r.title, false)}
                    title="Download CSV directly"
                  >
                    <Download className="h-3.5 w-3.5" />
                    CSV
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}

      {/* Preview dialog — view before export */}
      <Dialog open={!!preview} onOpenChange={() => setPreview(null)}>
        <DialogContent className="sm:max-w-3xl max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>{preview?.title}</DialogTitle>
            <p className="text-xs text-muted-foreground">
              Preview — {preview?.rows.length ? preview.rows.length - 1 : 0} data rows
              {filters.from || filters.to ? ` · ${filters.from || '—'} to ${filters.to || '—'}` : ''}
            </p>
          </DialogHeader>
          <div className="overflow-auto flex-1 border border-border rounded-xl">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-muted">
                <tr>
                  {(preview?.rows[0] || []).map((h, i) => (
                    <th key={i} className="text-left px-3 py-2 text-xs font-semibold">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {(preview?.rows.slice(1) || []).map((row, ri) => (
                  <tr key={ri} className={ri % 2 === 0 ? 'bg-background' : 'bg-muted/30'}>
                    {row.map((cell, ci) => (
                      <td key={ci} className="px-3 py-2 text-xs">{cell}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={exportPreviewCsv} className="gap-1.5">
              <Download className="h-4 w-4" /> Download CSV
            </Button>
            <Button onClick={exportPreviewPdf} className="gap-1.5">
              <Download className="h-4 w-4" /> Download PDF
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
