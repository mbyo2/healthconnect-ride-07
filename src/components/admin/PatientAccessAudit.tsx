import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { DataTable } from '@/components/ui/data-table';
import { ColumnDef } from '@tanstack/react-table';
import { toast } from 'sonner';
import { Eye, Search, RefreshCw } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';

interface PatientAccessRow {
  id: string;
  accessed_at: string;
  accessor_id: string;
  patient_id: string;
  access_type: string;
  search_term: string | null;
  reason: string | null;
  accessor_label?: string;
  patient_label?: string;
}

const ACCESS_TYPES = ['view', 'self_view', 'search', 'emergency_lookup', 'break_glass'];
const SURFACES = ['medical_records', 'prescriptions', 'lab_results', 'other'];

function personLabel(p: { first_name?: string | null; last_name?: string | null; email?: string | null } | undefined, fallback: string): string {
  if (!p) return fallback;
  const name = [p.first_name, p.last_name].filter(Boolean).join(' ').trim();
  return name || p.email || fallback;
}

/**
 * Patient Access audit view (2026-11-11): reads public.patient_access_audit
 * — searches (existing RPC writers), break-glass grants, emergency lookups
 * and, since the view-logging mission, record/prescription/lab OPENS
 * ('view' / 'self_view'). Reads are restricted by the table's RLS to
 * admin / super_admin; this tab lives in the admin dashboard only.
 */
export function PatientAccessAudit() {
  const [rows, setRows] = useState<PatientAccessRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [surfaceFilter, setSurfaceFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const fetchRows = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await (supabase as any)
        .from('patient_access_audit')
        .select('id, accessed_at, accessor_id, patient_id, access_type, search_term, reason')
        .order('accessed_at', { ascending: false })
        .limit(500);
      if (error) throw error;

      const list = (data || []) as PatientAccessRow[];
      const ids = Array.from(new Set(list.flatMap((r) => [r.accessor_id, r.patient_id]).filter(Boolean)));
      const byId = new Map<string, any>();
      if (ids.length) {
        const { data: profs } = await supabase
          .from('profiles')
          .select('id, first_name, last_name, email')
          .in('id', ids);
        (profs || []).forEach((p: any) => byId.set(p.id, p));
      }
      setRows(list.map((r) => ({
        ...r,
        accessor_label: personLabel(byId.get(r.accessor_id), r.accessor_id),
        patient_label: personLabel(byId.get(r.patient_id), r.patient_id),
      })));
    } catch (error) {
      console.error('Error fetching patient access audit:', error);
      toast.error('Could not load the patient access log. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRows();
  }, []);

  const filtered = useMemo(() => {
    let out = rows;
    if (typeFilter !== 'all') out = out.filter((r) => r.access_type === typeFilter);
    if (surfaceFilter !== 'all') out = out.filter((r) => (r.search_term || '') === surfaceFilter);
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      out = out.filter((r) =>
        (r.accessor_label || '').toLowerCase().includes(q) ||
        (r.patient_label || '').toLowerCase().includes(q) ||
        r.access_type.toLowerCase().includes(q) ||
        (r.search_term || '').toLowerCase().includes(q),
      );
    }
    return out;
  }, [rows, typeFilter, surfaceFilter, searchQuery]);

  const badgeVariant = (t: string): 'default' | 'destructive' | 'outline' | 'secondary' => {
    switch (t) {
      case 'break_glass': return 'destructive';
      case 'emergency_lookup': return 'destructive';
      case 'view': return 'default';
      case 'self_view': return 'secondary';
      default: return 'outline';
    }
  };

  const columns: ColumnDef<PatientAccessRow>[] = [
    {
      accessorKey: 'accessed_at',
      header: 'When',
      cell: ({ row }) => new Date(row.original.accessed_at).toLocaleString(),
    },
    { accessorKey: 'accessor_label', header: 'Accessed by' },
    { accessorKey: 'patient_label', header: 'Patient' },
    {
      accessorKey: 'access_type',
      header: 'Access',
      cell: ({ row }) => (
        <Badge variant={badgeVariant(row.original.access_type)} className="gap-1">
          <Eye className="h-3 w-3" />
          {row.original.access_type.replace(/_/g, ' ')}
        </Badge>
      ),
    },
    {
      accessorKey: 'search_term',
      header: 'Surface / search',
      cell: ({ row }) => row.original.search_term || '—',
    },
    {
      accessorKey: 'reason',
      header: 'Detail',
      cell: ({ row }) => (
        <span className="block max-w-[280px] truncate" title={row.original.reason || undefined}>
          {row.original.reason || '—'}
        </span>
      ),
    },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Eye className="h-5 w-5" /> Patient Access Log
        </CardTitle>
        <CardDescription>
          Every recorded opening of a patient record, prescription list or lab results —
          plus patient searches, emergency lookups and break-glass access. Newest first.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search person, patient or surface"
              className="pl-9 w-64"
            />
          </div>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-44"><SelectValue placeholder="Access type" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All access types</SelectItem>
              {ACCESS_TYPES.map((t) => (
                <SelectItem key={t} value={t}>{t.replace(/_/g, ' ')}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={surfaceFilter} onValueChange={setSurfaceFilter}>
            <SelectTrigger className="w-44"><SelectValue placeholder="Surface" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All surfaces</SelectItem>
              {SURFACES.map((s) => (
                <SelectItem key={s} value={s}>{s.replace(/_/g, ' ')}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={fetchRows} className="gap-1.5">
            <RefreshCw className="h-4 w-4" /> Refresh
          </Button>
        </div>
        {isLoading ? (
          <p className="text-sm text-muted-foreground py-8 text-center">Loading patient access log…</p>
        ) : filtered.length === 0 ? (
          <p className="text-sm text-muted-foreground py-8 text-center">
            No patient access records match. Record views are logged as they happen.
          </p>
        ) : (
          <DataTable columns={columns} data={filtered} />
        )}
      </CardContent>
    </Card>
  );
}
