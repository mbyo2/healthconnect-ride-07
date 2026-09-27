import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useInstitutionContext } from "@/hooks/useInstitutionContext";
import { useCurrency } from "@/hooks/use-currency";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { AlertTriangle, CalendarClock, ShieldAlert } from "lucide-react";
import { format } from "date-fns";
import {
  daysToExpiry,
  expiryBandOf,
  listBatches,
  quarantineExpired,
  setQaStatus,
  type MedicineBatch,
} from "./pharmacyStockService";

type RadarBand = "expired" | "le30" | "le90";

const RADAR_BANDS: Array<{
  band: RadarBand;
  title: string;
  icon: typeof AlertTriangle;
  cardClassName: string;
  badgeClassName: string;
}> = [
  {
    band: "expired",
    title: "Expired",
    icon: ShieldAlert,
    cardClassName: "border-red-200",
    badgeClassName: "border-red-200 bg-red-100 text-red-800 hover:bg-red-100",
  },
  {
    band: "le30",
    title: "Expiring within 30 days",
    icon: AlertTriangle,
    cardClassName: "border-amber-200",
    badgeClassName: "border-amber-200 bg-amber-100 text-amber-800 hover:bg-amber-100",
  },
  {
    band: "le90",
    title: "Expiring in 31–90 days",
    icon: CalendarClock,
    cardClassName: "border-blue-200",
    badgeClassName: "border-blue-200 bg-blue-100 text-blue-800 hover:bg-blue-100",
  },
];

function batchValue(batch: MedicineBatch): number {
  return (batch.quantity_remaining || 0) * (batch.unit_cost || 0);
}

function isHandled(batch: MedicineBatch): boolean {
  return batch.qa_status === "quarantined" || batch.qa_status === "rejected";
}

function expiryLabel(batch: MedicineBatch): string {
  const days = daysToExpiry(batch.expiry_date);
  const date = format(new Date(batch.expiry_date), "d MMM yyyy");
  if (days < 0) {
    const ago = -days;
    return `Expired ${ago} day${ago === 1 ? "" : "s"} ago · ${date}`;
  }
  if (days === 0) return `Expires today · ${date}`;
  return `Expires in ${days} day${days === 1 ? "" : "s"} · ${date}`;
}

export function ExpiryRadar() {
  const { institutionId } = useInstitutionContext();
  const { formatPrice } = useCurrency();
  const queryClient = useQueryClient();

  const [confirmAllOpen, setConfirmAllOpen] = useState(false);
  const [confirmBatch, setConfirmBatch] = useState<MedicineBatch | null>(null);

  const {
    data: batches = [],
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["expiry-radar", institutionId],
    queryFn: () => listBatches(institutionId!, {}),
    enabled: !!institutionId,
  });

  const grouped = useMemo(() => {
    const result: Record<RadarBand, MedicineBatch[]> = {
      expired: [],
      le30: [],
      le90: [],
    };
    for (const batch of batches) {
      const band = expiryBandOf(batch.expiry_date);
      if (band === "expired" || band === "le30" || band === "le90") {
        result[band].push(batch);
      }
    }
    return result;
  }, [batches]);

  const quarantineOneMutation = useMutation({
    mutationFn: (batch: MedicineBatch) =>
      setQaStatus(batch.id, "quarantined", "Quarantined from expiry radar"),
    onSuccess: () => {
      toast.success("Batch quarantined");
      queryClient.invalidateQueries({ queryKey: ["expiry-radar"] });
      queryClient.invalidateQueries({ queryKey: ["medicine-batches"] });
      setConfirmBatch(null);
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to quarantine batch");
    },
  });

  const quarantineAllMutation = useMutation({
    mutationFn: () => quarantineExpired(institutionId!),
    onSuccess: (count) => {
      toast.success(
        count > 0
          ? `Quarantined ${count} expired batch${count === 1 ? "" : "es"}`
          : "No expired batches needed quarantine"
      );
      queryClient.invalidateQueries({ queryKey: ["expiry-radar"] });
      queryClient.invalidateQueries({ queryKey: ["medicine-batches"] });
      setConfirmAllOpen(false);
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to quarantine expired batches");
    },
  });

  if (!institutionId) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-sm text-muted-foreground">
          No institution selected. Please sign in with an institution account to view the
          expiry radar.
        </CardContent>
      </Card>
    );
  }

  const expiredCount = grouped.expired.length;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Expiry radar</h2>
          <p className="text-sm text-muted-foreground">
            Batches that are expired or approaching expiry, grouped by urgency.
          </p>
        </div>
        {expiredCount > 0 && (
          <Button
            variant="destructive"
            onClick={() => setConfirmAllOpen(true)}
            disabled={quarantineAllMutation.isPending}
          >
            <ShieldAlert className="mr-2 h-4 w-4" />
            Quarantine all expired
          </Button>
        )}
      </div>

      {isLoading ? (
        <p className="py-10 text-center text-sm text-muted-foreground">
          Loading expiry data...
        </p>
      ) : isError ? (
        <p className="py-10 text-center text-sm text-destructive">
          Failed to load expiry data. Please try again.
        </p>
      ) : (
        <div className="grid gap-4 md:grid-cols-3">
          {RADAR_BANDS.map(({ band, title, icon: Icon, cardClassName }) => {
            const rows = grouped[band];
            const valueAtRisk = rows
              .filter((b) => !isHandled(b))
              .reduce((sum, b) => sum + batchValue(b), 0);
            return (
              <Card key={band} className={cardClassName}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">{title}</CardTitle>
                  <Icon className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{rows.length}</div>
                  <p className="text-xs text-muted-foreground">
                    batch{rows.length === 1 ? "" : "es"} · {formatPrice(valueAtRisk)} at
                    risk
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {!isLoading &&
        !isError &&
        RADAR_BANDS.map(({ band, title, badgeClassName }) => {
          const rows = grouped[band];
          if (rows.length === 0) return null;
          return (
            <Card key={band}>
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold">
                  {title} ({rows.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="divide-y">
                  {rows.map((batch) => {
                    const handled = isHandled(batch);
                    return (
                      <li
                        key={batch.id}
                        className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between"
                      >
                        <div className="min-w-0 space-y-1">
                          <p className="truncate text-sm font-medium">
                            {batch.product_name}
                            <span className="ml-2 font-normal text-muted-foreground">
                              Batch {batch.batch_number}
                            </span>
                          </p>
                          <p className="text-xs text-muted-foreground">
                            <Badge className={badgeClassName}>
                              {expiryLabel(batch)}
                            </Badge>
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {batch.quantity_remaining} units remaining ·{" "}
                            {formatPrice(batchValue(batch))} value
                          </p>
                        </div>
                        <span
                          className="shrink-0"
                          title={handled ? "Already quarantined" : undefined}
                        >
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={
                              handled || quarantineOneMutation.isPending
                            }
                            onClick={() => setConfirmBatch(batch)}
                          >
                            Quarantine
                          </Button>
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </CardContent>
            </Card>
          );
        })}

      {/* Confirm: quarantine a single batch */}
      <AlertDialog
        open={!!confirmBatch}
        onOpenChange={(open) => !open && setConfirmBatch(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Quarantine this batch?</AlertDialogTitle>
            <AlertDialogDescription>
              {confirmBatch &&
                `${confirmBatch.product_name} (batch ${confirmBatch.batch_number}) will be quarantined and excluded from normal stock use.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() =>
                confirmBatch && quarantineOneMutation.mutate(confirmBatch)
              }
            >
              Quarantine
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Confirm: quarantine all expired */}
      <AlertDialog open={confirmAllOpen} onOpenChange={setConfirmAllOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Quarantine all expired batches?</AlertDialogTitle>
            <AlertDialogDescription>
              This will quarantine all {expiredCount} expired batch
              {expiredCount === 1 ? "" : "es"}, removing them from available stock.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => quarantineAllMutation.mutate()}>
              {quarantineAllMutation.isPending ? "Quarantining..." : "Quarantine all"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
