/**
 * MIS report builders — every HMS report generates a real CSV from live
 * tables. No sample data anywhere: empty results export an explicit
 * "no records" row so the file is always honest.
 */
import { supabase } from '@/integrations/supabase/client';

export interface MisReportResult {
  filename: string;
  rows: string[][];
}

const N = (v: any): number => Number(v) || 0;
const D = (v: any): string => (v ? new Date(v).toLocaleString() : '—');
const last30 = () => new Date(Date.now() - 30 * 86400000).toISOString();
const slug = (s: string) =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

export function downloadCsv(filename: string, rows: string[][]) {
  const csv = rows
    .map((row) => row.map((v) => `"${String(v ?? '').replace(/"/g, '""')}"`).join(','))
    .join('\n');
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

const emptyRow = (msg: string): string[][] => [['Note', msg]];

async function profileNames(ids: string[]): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  const unique = [...new Set(ids.filter(Boolean))].slice(0, 500);
  if (unique.length === 0) return map;
  const { data } = await supabase
    .from('profiles')
    .select('id, first_name, last_name')
    .in('id', unique);
  ((data || []) as any[]).forEach((p) =>
    map.set(p.id, [p.first_name, p.last_name].filter(Boolean).join(' ') || p.id)
  );
  return map;
}

type Builder = (hospitalId: string) => Promise<string[][]>;

const builders: Record<string, Builder> = {
  'Daily Census Report': async (h) => {
    const today = new Date().toISOString().split('T')[0];
    const [tokens, adm, beds] = await Promise.all([
      supabase.from('queue_tokens' as any).select('status, department').eq('institution_id', h).gte('check_in_time', `${today}T00:00:00`),
      supabase.from('hospital_admissions' as any).select('id').eq('hospital_id', h).eq('status', 'admitted'),
      supabase.from('hospital_beds' as any).select('status').eq('hospital_id', h),
    ]);
    const t = ((tokens.data || []) as any[]);
    const b = ((beds.data || []) as any[]);
    const rows: string[][] = [['Metric', 'Value']];
    rows.push(['Date', today]);
    rows.push(['OPD waiting', String(t.filter((x) => x.status === 'waiting').length)]);
    rows.push(['OPD in consultation', String(t.filter((x) => x.status === 'serving').length)]);
    rows.push(['OPD completed', String(t.filter((x) => x.status === 'completed').length)]);
    rows.push(['Active inpatients', String(((adm.data || []) as any[]).length)]);
    rows.push(['Beds occupied', String(b.filter((x) => x.status === 'occupied').length)]);
    rows.push(['Beds available', String(b.filter((x) => x.status === 'available').length)]);
    return rows;
  },

  'Revenue & Collection': async (h) => {
    const { data } = await supabase.from('hospital_billing' as any)
      .select('invoice_number, total_amount, paid_amount, balance, payment_status, created_at')
      .eq('hospital_id', h).gte('created_at', last30()).order('created_at', { ascending: false }).limit(1000);
    const rows: string[][] = [['Invoice', 'Date', 'Billed', 'Paid', 'Balance', 'Status']];
    ((data || []) as any[]).forEach((r) =>
      rows.push([r.invoice_number || r.id, D(r.created_at), String(N(r.total_amount)), String(N(r.paid_amount)), String(N(r.balance)), r.payment_status || 'pending'])
    );
    if (rows.length === 1) return emptyRow('No invoices in the last 30 days.');
    return rows;
  },

  'Department-wise Revenue': async (h) => {
    const [bills, admissions, depts] = await Promise.all([
      supabase.from('hospital_billing' as any).select('admission_id, total_amount, paid_amount').eq('hospital_id', h).gte('created_at', last30()).limit(2000),
      supabase.from('hospital_admissions' as any).select('id, department_id').eq('hospital_id', h).limit(2000),
      supabase.from('hospital_departments' as any).select('id, name').eq('hospital_id', h),
    ]);
    const deptName = new Map(((depts.data || []) as any[]).map((d) => [d.id, d.name]));
    const admDept = new Map(((admissions.data || []) as any[]).map((a) => [a.id, a.department_id]));
    const byDept = new Map<string, { billed: number; collected: number }>();
    ((bills.data || []) as any[]).forEach((b) => {
      const key = (b.admission_id && deptName.get(admDept.get(b.admission_id))) || 'General / Walk-in';
      const cur = byDept.get(key) || { billed: 0, collected: 0 };
      cur.billed += N(b.total_amount);
      cur.collected += N(b.paid_amount);
      byDept.set(key, cur);
    });
    const rows: string[][] = [['Department', 'Billed (30d)', 'Collected (30d)']];
    [...byDept.entries()].forEach(([k, v]) => rows.push([k, String(Math.round(v.billed)), String(Math.round(v.collected))]));
    if (rows.length === 1) return emptyRow('No billing activity in the last 30 days.');
    return rows;
  },

  'Doctor Performance': async (h) => {
    const [personnel, staff] = await Promise.all([
      supabase.from('institution_personnel').select('user_id').eq('institution_id', h),
      supabase.from('institution_staff').select('provider_id').eq('institution_id', h).eq('is_active', true),
    ]);
    const ids = [...new Set([...((personnel.data || []).map((p: any) => p.user_id)), ...((staff.data || []).map((s: any) => s.provider_id))].filter(Boolean))];
    if (ids.length === 0) return emptyRow('No clinical staff linked to this facility yet.');
    const { data: appts } = await supabase.from('appointments').select('provider_id, status, date').in('provider_id', ids).gte('date', last30().split('T')[0]).limit(3000);
    const names = await profileNames(ids);
    const byDoc = new Map<string, { total: number; completed: number; cancelled: number }>();
    ((appts || []) as any[]).forEach((a) => {
      const cur = byDoc.get(a.provider_id) || { total: 0, completed: 0, cancelled: 0 };
      cur.total += 1;
      if (a.status === 'completed') cur.completed += 1;
      if (a.status === 'cancelled') cur.cancelled += 1;
      byDoc.set(a.provider_id, cur);
    });
    const rows: string[][] = [['Doctor', 'Consultations (30d)', 'Completed', 'Cancelled']];
    [...byDoc.entries()].forEach(([id, v]) => rows.push([names.get(id) || id, String(v.total), String(v.completed), String(v.cancelled)]));
    if (rows.length === 1) return emptyRow('No consultations in the last 30 days.');
    return rows;
  },

  'Bed Occupancy Trends': async (h) => {
    const [beds, depts] = await Promise.all([
      supabase.from('hospital_beds' as any).select('status, department_id').eq('hospital_id', h),
      supabase.from('hospital_departments' as any).select('id, name').eq('hospital_id', h),
    ]);
    const deptName = new Map(((depts.data || []) as any[]).map((d) => [d.id, d.name]));
    const byDept = new Map<string, { total: number; occupied: number }>();
    ((beds.data || []) as any[]).forEach((b) => {
      const key = deptName.get(b.department_id) || 'Unassigned';
      const cur = byDept.get(key) || { total: 0, occupied: 0 };
      cur.total += 1;
      if (b.status === 'occupied') cur.occupied += 1;
      byDept.set(key, cur);
    });
    const rows: string[][] = [['Department', 'Total Beds', 'Occupied', 'Occupancy %']];
    [...byDept.entries()].forEach(([k, v]) =>
      rows.push([k, String(v.total), String(v.occupied), v.total ? String(Math.round((v.occupied / v.total) * 100)) : '0'])
    );
    if (rows.length === 1) return emptyRow('No beds registered yet — add beds under Bed Wards.');
    return rows;
  },

  'OT Utilization': async (h) => {
    const { data } = await supabase.from('ot_surgeries' as any)
      .select('procedure_name, ot_room, status, scheduled_date, started_at, completed_at')
      .eq('institution_id', h).gte('scheduled_date', last30().split('T')[0]).order('scheduled_date', { ascending: false }).limit(500);
    const rows: string[][] = [['Procedure', 'Theatre', 'Date', 'Status', 'Cut-to-close (min)']];
    ((data || []) as any[]).forEach((s) => {
      let mins = '';
      if (s.started_at && s.completed_at) {
        mins = String(Math.max(0, Math.round((new Date(s.completed_at).getTime() - new Date(s.started_at).getTime()) / 60000)));
      }
      rows.push([s.procedure_name || '—', s.ot_room || '—', s.scheduled_date || '—', s.status || '—', mins]);
    });
    if (rows.length === 1) return emptyRow('No surgeries scheduled in the last 30 days.');
    return rows;
  },

  'Lab TAT Report': async (h) => {
    const { data: adm } = await supabase.from('hospital_admissions' as any).select('patient_id').eq('hospital_id', h).limit(2000);
    const pids = [...new Set(((adm.data || []) as any[]).map((a) => a.patient_id).filter(Boolean))];
    if (pids.length === 0) return emptyRow('No admitted patients to report on.');
    const { data } = await supabase.from('lab_tests' as any)
      .select('test_type, status, created_at, results_date').in('patient_id', pids).gte('created_at', last30()).limit(1000);
    const byTest = new Map<string, { count: number; tatSum: number; tatN: number }>();
    ((data || []) as any[]).forEach((t) => {
      const cur = byTest.get(t.test_type) || { count: 0, tatSum: 0, tatN: 0 };
      cur.count += 1;
      if (t.created_at && t.results_date) {
        cur.tatSum += (new Date(t.results_date).getTime() - new Date(t.created_at).getTime()) / 3600000;
        cur.tatN += 1;
      }
      byTest.set(t.test_type, cur);
    });
    const rows: string[][] = [['Test Type', 'Ordered (30d)', 'Avg Turnaround (hrs)']];
    [...byTest.entries()].forEach(([k, v]) =>
      rows.push([k, String(v.count), v.tatN ? (v.tatSum / v.tatN).toFixed(1) : 'pending'])
    );
    if (rows.length === 1) return emptyRow('No lab orders in the last 30 days.');
    return rows;
  },

  'Outsourced Tests Report': async (h) => {
    const { data: adm } = await supabase.from('hospital_admissions' as any).select('patient_id').eq('hospital_id', h).limit(2000);
    const pids = [...new Set(((adm.data || []) as any[]).map((a) => a.patient_id).filter(Boolean))];
    if (pids.length === 0) return emptyRow('No admitted patients to report on.');
    const { data } = await supabase.from('lab_tests' as any)
      .select('test_type, status, created_at, results_date').in('patient_id', pids).gte('created_at', last30()).limit(1000);
    const rows: string[][] = [['Test Type', 'Status', 'Ordered', 'Resulted']];
    ((data || []) as any[]).forEach((t) =>
      rows.push([t.test_type || '—', t.status || '—', D(t.created_at), t.results_date ? D(t.results_date) : 'awaiting result'])
    );
    if (rows.length === 1) return emptyRow('No lab orders in the last 30 days.');
    return rows;
  },

  'Pharmacy Sales': async (h) => {
    const { data } = await supabase.from('pharmacy_sales' as any)
      .select('transaction_id, total_amount, paid_amount, payment_method, payment_status, created_at')
      .eq('pharmacy_id', h).gte('created_at', last30()).order('created_at', { ascending: false }).limit(1000);
    const rows: string[][] = [['Transaction', 'Date', 'Total', 'Paid', 'Method', 'Status']];
    ((data || []) as any[]).forEach((s) =>
      rows.push([s.transaction_id || s.id, D(s.created_at), String(N(s.total_amount)), String(N(s.paid_amount)), s.payment_method || '—', s.payment_status || '—'])
    );
    if (rows.length === 1) return emptyRow('No pharmacy sales in the last 30 days.');
    return rows;
  },

  'Monthly Purchase (Supplier-wise)': async (h) => {
    const [orders, suppliers] = await Promise.all([
      supabase.from('purchase_orders' as any).select('order_number, supplier_id, total_amount, status, order_date').eq('institution_id', h).gte('order_date', last30().split('T')[0]).order('order_date', { ascending: false }).limit(500),
      supabase.from('suppliers').select('id, name').eq('institution_id', h),
    ]);
    const supName = new Map(((suppliers.data || []) as any[]).map((s) => [s.id, s.name]));
    const bySup = new Map<string, { count: number; total: number }>();
    ((orders.data || []) as any[]).forEach((o) => {
      const key = supName.get(o.supplier_id) || 'Unknown supplier';
      const cur = bySup.get(key) || { count: 0, total: 0 };
      cur.count += 1;
      cur.total += N(o.total_amount);
      bySup.set(key, cur);
    });
    const rows: string[][] = [['Supplier', 'Orders (30d)', 'Total Value']];
    [...bySup.entries()].forEach(([k, v]) => rows.push([k, String(v.count), String(Math.round(v.total))]));
    if (rows.length === 1) return emptyRow('No purchase orders in the last 30 days.');
    return rows;
  },

  'Near-Expiry Drug Report': async (h) => {
    const { data } = await supabase.from('pharmacy_inventory' as any)
      .select('product_name, batch_number, quantity, expiry_date').eq('pharmacy_id', h).order('expiry_date').limit(500);
    const now = Date.now();
    const rows: string[][] = [['Product', 'Batch', 'Qty', 'Expiry', 'Status']];
    ((data || []) as any[]).forEach((i) => {
      if (!i.expiry_date) return;
      const days = Math.round((new Date(i.expiry_date).getTime() - now) / 86400000);
      if (days <= 90) {
        rows.push([i.product_name || '—', i.batch_number || '—', String(i.quantity ?? 0), i.expiry_date, days < 0 ? 'EXPIRED' : `${days}d left`]);
      }
    });
    if (rows.length === 1) return emptyRow('No stock expiring within 90 days. Good stock health.');
    return rows;
  },

  'Insurance Receivables': async (h) => {
    const { data } = await supabase.from('insurance_claims' as any)
      .select('patient_name, insurance_provider, policy_number, claim_amount, approved_amount, status, submitted_at, created_at')
      .eq('institution_id', h).order('created_at', { ascending: false }).limit(500);
    const rows: string[][] = [['Patient', 'Insurer', 'Policy', 'Claimed', 'Approved', 'Status', 'Submitted']];
    ((data || []) as any[]).forEach((c) =>
      rows.push([c.patient_name || '—', c.insurance_provider || '—', c.policy_number || '—', String(N(c.claim_amount)), String(N(c.approved_amount)), c.status || '—', c.submitted_at ? D(c.submitted_at) : 'not submitted'])
    );
    if (rows.length === 1) return emptyRow('No insurance claims raised yet.');
    return rows;
  },

  'Sales & Return Tax Report': async (h) => {
    const { data } = await supabase.from('hospital_billing' as any)
      .select('total_amount, tax, payment_status, created_at').eq('hospital_id', h).gte('created_at', last30()).limit(2000);
    const byStatus = new Map<string, { n: number; total: number; tax: number }>();
    ((data || []) as any[]).forEach((b) => {
      const key = b.payment_status || 'pending';
      const cur = byStatus.get(key) || { n: 0, total: 0, tax: 0 };
      cur.n += 1;
      cur.total += N(b.total_amount);
      cur.tax += N(b.tax);
      byStatus.set(key, cur);
    });
    const rows: string[][] = [['Payment Status', 'Invoices (30d)', 'Total Value', 'Tax']];
    [...byStatus.entries()].forEach(([k, v]) => rows.push([k, String(v.n), String(Math.round(v.total)), String(Math.round(v.tax))]));
    if (rows.length === 1) return emptyRow('No billing activity in the last 30 days.');
    return rows;
  },

  'Check-in vs Billed Report': async (h) => {
    const today = new Date().toISOString().split('T')[0];
    const [tokens, bills] = await Promise.all([
      supabase.from('queue_tokens' as any).select('token_number, patient_name, status').eq('institution_id', h).gte('check_in_time', `${today}T00:00:00`),
      supabase.from('hospital_billing' as any).select('id').eq('hospital_id', h).gte('created_at', `${today}T00:00:00`),
    ]);
    const seen = ((tokens.data || []) as any[]).filter((t) => t.status === 'completed');
    const rows: string[][] = [['Metric', 'Count']];
    rows.push(['Completed check-ins today', String(seen.length)]);
    rows.push(['Invoices raised today', String(((bills.data || []) as any[]).length)]);
    rows.push(['Possible unbilled visits', String(Math.max(seen.length - ((bills.data || []) as any[]).length, 0))]);
    return rows;
  },

  'Discharge Summary Report': async (h) => {
    const { data } = await supabase.from('hospital_admissions' as any)
      .select('admission_number, status, admission_date, discharge_date, discharge_summary, diagnosis')
      .eq('hospital_id', h).in('status', ['discharged', 'transferred', 'deceased']).order('discharge_date', { ascending: false }).limit(500);
    const rows: string[][] = [['Admission', 'Status', 'Admitted', 'Discharged', 'Summary Filed', 'Diagnosis']];
    ((data || []) as any[]).forEach((a) =>
      rows.push([a.admission_number || a.id, a.status, D(a.admission_date), D(a.discharge_date), a.discharge_summary ? 'yes' : 'NO', (a.diagnosis || '—').toString().slice(0, 60)])
    );
    if (rows.length === 1) return emptyRow('No discharges, transfers or deaths recorded.');
    return rows;
  },

  'Referral Analytics': async (h) => {
    const [out, inc] = await Promise.all([
      supabase.from('referrals' as any).select('status, priority, referred_to_department').eq('hospital_id', h).limit(1000),
      supabase.from('referrals' as any).select('status, priority').eq('referred_to_hospital_id', h).limit(1000),
    ]);
    const tally = (list: any[], key: string) => {
      const m = new Map<string, number>();
      list.forEach((r) => m.set(r[key] || 'unknown', (m.get(r[key] || 'unknown') || 0) + 1));
      return m;
    };
    const rows: string[][] = [['Direction', 'Group', 'Count']];
    tally((out.data || []) as any[], 'status').forEach((v, k) => rows.push(['outgoing', `status:${k}`, String(v)]));
    tally((out.data || []) as any[], 'priority').forEach((v, k) => rows.push(['outgoing', `priority:${k}`, String(v)]));
    tally((inc.data || []) as any[], 'status').forEach((v, k) => rows.push(['incoming', `status:${k}`, String(v)]));
    if (rows.length === 1) return emptyRow('No referrals recorded yet.');
    return rows;
  },

  'Inventory Consumption': async (h) => {
    const { data: stock } = await supabase.from('medication_inventory' as any).select('id').eq('institution_id', h).limit(2000);
    const ids = ((stock.data || []) as any[]).map((s) => s.id);
    if (ids.length === 0) return emptyRow('No medication inventory registered yet.');
    const { data } = await supabase.from('inventory_transactions' as any)
      .select('transaction_type, quantity, unit_price, created_at').in('medication_inventory_id', ids).gte('created_at', last30()).limit(3000);
    const byType = new Map<string, { qty: number; value: number }>();
    ((data || []) as any[]).forEach((t) => {
      const cur = byType.get(t.transaction_type) || { qty: 0, value: 0 };
      cur.qty += N(t.quantity);
      cur.value += N(t.quantity) * N(t.unit_price);
      byType.set(t.transaction_type, cur);
    });
    const rows: string[][] = [['Movement', 'Units (30d)', 'Value (30d)']];
    [...byType.entries()].forEach(([k, v]) => rows.push([k, String(v.qty), String(Math.round(v.value))]));
    if (rows.length === 1) return emptyRow('No stock movements in the last 30 days.');
    return rows;
  },

  'Infection Surveillance Report': async (h) => {
    const { data } = await supabase.from('infection_records' as any)
      .select('infection_type, organism, infection_site, status, outcome, detection_date')
      .eq('hospital_id', h).order('detection_date', { ascending: false }).limit(500);
    const rows: string[][] = [['Type', 'Organism', 'Site', 'Status', 'Outcome', 'Detected']];
    ((data || []) as any[]).forEach((r) =>
      rows.push([r.infection_type || '—', r.organism || '—', r.infection_site || '—', r.status || '—', r.outcome || '—', D(r.detection_date)])
    );
    if (rows.length === 1) return emptyRow('No healthcare-associated infections recorded. Keep surveilling.');
    return rows;
  },

  'Patient Feedback Analysis': async (h) => {
    const { data: adm } = await supabase.from('hospital_admissions' as any).select('patient_id').eq('hospital_id', h).limit(2000);
    const pids = [...new Set(((adm.data || []) as any[]).map((a) => a.patient_id).filter(Boolean))];
    if (pids.length === 0) return emptyRow('No admitted patients to analyse feedback for.');
    const { data } = await supabase.from('patient_feedback' as any)
      .select('rating, created_at').in('patient_id', pids).gte('created_at', last30()).limit(1000);
    const ratings = ((data || []) as any[]).map((f) => N(f.rating)).filter((r) => r > 0);
    const rows: string[][] = [['Metric', 'Value']];
    rows.push(['Responses (30d)', String(ratings.length)]);
    rows.push(['Average rating', ratings.length ? (ratings.reduce((s, v) => s + v, 0) / ratings.length).toFixed(1) : 'no ratings']);
    [5, 4, 3, 2, 1].forEach((s) => rows.push([`${s}-star`, String(ratings.filter((r) => Math.round(r) === s).length)]));
    return rows;
  },
};

export async function buildMisReport(title: string, hospitalId: string): Promise<MisReportResult> {
  const builder = builders[title];
  const stamp = new Date().toISOString().split('T')[0];
  if (!builder) {
    return { filename: `${slug(title)}-${stamp}.csv`, rows: emptyRow('This report is not implemented yet.') };
  }
  try {
    const rows = await builder(hospitalId);
    return { filename: `${slug(title)}-${stamp}.csv`, rows };
  } catch (e: any) {
    return {
      filename: `${slug(title)}-${stamp}.csv`,
      rows: emptyRow(`Report failed: ${e?.message || 'query error'}. Check table permissions and try again.`),
    };
  }
}
