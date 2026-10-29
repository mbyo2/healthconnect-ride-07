// GlobalSearchPalette — Frappe "Awesome Bar" for Doc'O Clock.
// Ctrl+K / Cmd+K from anywhere: instantly find patients, invoices,
// appointments, queue tokens and jump to them. Role-aware: results are
// scoped to what the user's role can see.
import { useEffect, useMemo, useState } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Search, User, Receipt, CalendarClock, Ticket, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useInstitutionContext } from '@/context/InstitutionContext';
import { searchInstitutionPatients } from '@/lib/patients';

interface Hit {
  kind: 'patient' | 'invoice' | 'appointment' | 'queue';
  id: string;
  title: string;
  subtitle: string;
}

const KIND_ICON = {
  patient: <User className="h-4 w-4" />,
  invoice: <Receipt className="h-4 w-4" />,
  appointment: <CalendarClock className="h-4 w-4" />,
  queue: <Ticket className="h-4 w-4" />,
};

export const GlobalSearchPalette = ({
  onNavigate,
}: {
  onNavigate: (hit: Hit) => void;
}) => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [hits, setHits] = useState<Hit[]>([]);
  const [searching, setSearching] = useState(false);
  const { institution } = useInstitutionContext();

  // Ctrl+K / Cmd+K toggles the palette.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    if (!open) {
      setQuery('');
      setHits([]);
      return;
    }
    if (query.trim().length < 2) {
      setHits([]);
      return;
    }
    setSearching(true);
    const t = setTimeout(async () => {
      try {
        const q = query.trim();
        const hid = institution?.id;
        const results: Hit[] = [];

        // Patients: the active institution's roster search first (Patient
        // Unity W3 — one patient list everywhere); the relationship-gated
        // provider search remains the fallback when no institution is in
        // context (standalone providers).
        if (hid) {
          const rosterPatients = await searchInstitutionPatients(hid, q).catch(() => []);
          rosterPatients.slice(0, 5).forEach((p) => {
            results.push({
              kind: 'patient',
              id: p.id,
              title: p.name,
              subtitle: p.phone || p.email || 'Patient record',
            });
          });
        } else {
          const { data: patients } = await (supabase as any).rpc('search_patients_for_provider', { p_search: q });
          ((patients as any[]) || []).slice(0, 5).forEach((p: any) => {
            results.push({
              kind: 'patient',
              id: p.id,
              title: `${p.first_name || ''} ${p.last_name || ''}`.trim() || 'Patient',
              subtitle: p.phone || p.email || 'Patient record',
            });
          });
        }

        if (hid) {
          // Invoices by number.
          const { data: invoices } = await (supabase.from('hospital_billing' as any) as any)
            .select('id, invoice_number, total_amount')
            .eq('hospital_id', hid)
            .ilike('invoice_number', `%${q}%`)
            .limit(4);
          ((invoices as any[]) || []).forEach((i: any) => {
            results.push({ kind: 'invoice', id: i.id, title: i.invoice_number, subtitle: `K${Number(i.total_amount || 0).toLocaleString()} invoice` });
          });

          // Queue tokens by patient name.
          const { data: tokens } = await (supabase.from('queue_tokens' as any) as any)
            .select('id, token_number, patient_name, status')
            .eq('institution_id', hid)
            .ilike('patient_name', `%${q}%`)
            .order('check_in_time', { ascending: false })
            .limit(4);
          ((tokens as any[]) || []).forEach((tk: any) => {
            results.push({ kind: 'queue', id: tk.id, title: `${tk.token_number} — ${tk.patient_name}`, subtitle: `Queue · ${tk.status}` });
          });

          // Appointments by patient name via join.
          const { data: appts } = await (supabase.from('appointments' as any) as any)
            .select('id, date, time, status')
            .ilike('patient_name', `%${q}%`)
            .limit(4);
          ((appts as any[]) || []).forEach((a: any) => {
            results.push({ kind: 'appointment', id: a.id, title: `Appointment ${a.date || ''} ${a.time || ''}`.trim(), subtitle: `Status: ${a.status || '—'}` });
          });
        }

        setHits(results);
      } catch (e) {
        console.error('Global search failed:', e);
      } finally {
        setSearching(false);
      }
    }, 250);
    return () => clearTimeout(t);
  }, [query, open, institution?.id]);

  const hint = useMemo(
    () => (typeof navigator !== 'undefined' && /mac/i.test(navigator.userAgent) ? '⌘K' : 'Ctrl+K'),
    []
  );

  return (
    <>
      {/* Trigger — lives in the header; also keyboard accessible. */}
      <button
        onClick={() => setOpen(true)}
        className="hidden md:flex items-center gap-2 text-sm text-muted-foreground bg-muted/60 hover:bg-muted border border-border rounded-full pl-3 pr-2 py-1.5 transition-colors"
        aria-label="Global search"
      >
        <Search className="h-4 w-4" />
        <span className="text-xs">Search patients, invoices…</span>
        <kbd className="text-xs font-semibold bg-background border border-border rounded px-1.5 py-0.5">{hint}</kbd>
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg p-0 gap-0 overflow-hidden">
          <div className="flex items-center gap-2 px-4 border-b border-border">
            <Search className="h-4 w-4 text-muted-foreground shrink-0" />
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search patients, invoices, queue tokens, appointments…"
              className="w-full py-3.5 bg-transparent outline-none text-sm placeholder:text-muted-foreground"
            />
            {searching && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground shrink-0" />}
          </div>
          <div className="max-h-80 overflow-y-auto py-1">
            {hits.length === 0 && query.trim().length >= 2 && !searching && (
              <p className="px-4 py-6 text-sm text-muted-foreground text-center">No matches for “{query}”.</p>
            )}
            {hits.length === 0 && query.trim().length < 2 && (
              <p className="px-4 py-6 text-sm text-muted-foreground text-center">
                Type at least 2 characters. <kbd className="text-xs font-semibold bg-muted border border-border rounded px-1">esc</kbd> to close.
              </p>
            )}
            {hits.map((h) => (
              <button
                key={`${h.kind}-${h.id}`}
                onClick={() => {
                  setOpen(false);
                  onNavigate(h);
                }}
                className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-muted/60 text-left transition-colors"
              >
                <span className="text-muted-foreground">{KIND_ICON[h.kind]}</span>
                <span className="flex-1 min-w-0">
                  <span className="block text-sm font-medium truncate">{h.title}</span>
                  <span className="block text-xs text-muted-foreground truncate">{h.subtitle}</span>
                </span>
                <span className="text-xs uppercase font-semibold text-muted-foreground">{h.kind}</span>
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
