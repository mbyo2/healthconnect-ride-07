import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Copy, Search, GitMerge, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface CandidatePair {
  id_a: string;
  id_b: string;
  name_a: string;
  name_b: string;
  dob_a: string | null;
  dob_b: string | null;
  phone_a: string | null;
  phone_b: string | null;
  match_reason: string;
  score: number;
}

/**
 * Duplicate Patient Detection & Merge (Epic parity)
 * Scans profiles for likely duplicates (same phone/email, same name+DOB),
 * lets an admin review pairs side-by-side, choose the survivor record,
 * and merge — all clinical history moves to the survivor atomically,
 * the duplicate is flagged, and the merge is audit-logged.
 */
export default function DuplicatePatients() {
  const queryClient = useQueryClient();
  const [scanRequested, setScanRequested] = useState(false);
  const [pending, setPending] = useState<{
    pair: CandidatePair;
    survivor: string;
    duplicate: string;
  } | null>(null);
  const [reason, setReason] = useState("");

  const { data: pairs, isLoading, error } = useQuery({
    queryKey: ["duplicate-scan"],
    queryFn: async () => {
      const { data, error } = await (supabase as any).rpc("find_potential_duplicates", {
        p_limit: 100,
      });
      if (error) throw error;
      return (data as CandidatePair[]) || [];
    },
    enabled: scanRequested,
  });

  const mergeMutation = useMutation({
    mutationFn: async (args: { survivor: string; duplicate: string; reason: string }) => {
      const { data, error } = await (supabase as any).rpc("merge_patients", {
        p_survivor: args.survivor,
        p_duplicate: args.duplicate,
        p_reason: args.reason || null,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (result: any) => {
      const moved = result?.tables_moved || {};
      const tableCount = Object.keys(moved).length;
      queryClient.invalidateQueries({ queryKey: ["duplicate-scan"] });
      setPending(null);
      setReason("");
      toast.success(
        `Merged. History moved across ${tableCount} table${tableCount === 1 ? "" : "s"}.`
      );
    },
    onError: (e: any) => toast.error(e?.message || "Merge failed"),
  });

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <Copy className="h-4 w-4" />
            Duplicate Patients
          </CardTitle>
          <Button
            size="sm"
            onClick={() => {
              setScanRequested(true);
              queryClient.invalidateQueries({ queryKey: ["duplicate-scan"] });
            }}
          >
            <Search className="h-3 w-3 mr-1" />
            {scanRequested ? "Re-scan" : "Scan for duplicates"}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {!scanRequested ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            Scan profiles for likely duplicates — same phone, same email, or the
            same name and date of birth. Merging is permanent and audit-logged:
            review each pair carefully.
          </p>
        ) : isLoading ? (
          <p className="text-sm text-muted-foreground">Scanning...</p>
        ) : error ? (
          <p className="text-sm text-destructive">
            Scan failed. Only administrators can run a duplicate scan.
          </p>
        ) : !pairs || pairs.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            No likely duplicates found. 
          </p>
        ) : (
          pairs.map((pair) => (
            <div key={`${pair.id_a}-${pair.id_b}`} className="p-3 rounded-xl border space-y-3">
              <div className="flex items-center justify-between">
                <Badge variant={pair.score >= 90 ? "destructive" : "secondary"}>
                  {pair.score}% — {pair.match_reason}
                </Badge>
                <AlertTriangle className="h-4 w-4 text-amber-500" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { id: pair.id_a, name: pair.name_a, dob: pair.dob_a, phone: pair.phone_a, label: "Record A" },
                  { id: pair.id_b, name: pair.name_b, dob: pair.dob_b, phone: pair.phone_b, label: "Record B" },
                ].map((rec) => (
                  <div key={rec.id} className="p-3 rounded-lg bg-muted/50">
                    <p className="text-xs text-muted-foreground">{rec.label}</p>
                    <p className="text-sm font-bold">{rec.name || "—"}</p>
                    <p className="text-xs text-muted-foreground">
                      DOB: {rec.dob || "—"} · {rec.phone || "No phone"}
                    </p>
                    <Button
                      size="sm"
                      className="mt-2"
                      onClick={() =>
                        setPending({
                          pair,
                          survivor: rec.id,
                          duplicate: rec.id === pair.id_a ? pair.id_b : pair.id_a,
                        })
                      }
                    >
                      <GitMerge className="h-3 w-3 mr-1" />
                      Keep this, merge the other in
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </CardContent>

      <AlertDialog open={!!pending} onOpenChange={(o) => !o && setPending(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Merge patient records?</AlertDialogTitle>
            <AlertDialogDescription>
              All clinical history (appointments, vitals, labs, prescriptions,
              billing, records) on the duplicate record moves to the surviving
              record. The duplicate is flagged as merged and can no longer be
              used as a separate patient. This cannot be undone from the app.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-2">
            <label className="text-sm font-medium">Reason for merging</label>
            <Input
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Same person registered twice at reception"
              className="mt-1"
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (!pending) return;
                mergeMutation.mutate({
                  survivor: pending.survivor,
                  duplicate: pending.duplicate,
                  reason,
                });
              }}
              disabled={mergeMutation.isPending}
            >
              {mergeMutation.isPending ? "Merging..." : "Merge records"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
