import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Bed, Plus, ArrowRightLeft, FileOutput, Loader2, RefreshCw } from "lucide-react";
import { ListSkeleton } from "@/components/ui/list-skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { useHospitalModule } from "@/hooks/useHospitalModule";
import { useHospitalPatients } from "@/hooks/useHospitalPatients";
import { usePatientNames } from "@/hooks/usePatientNames";
import { HospitalPatientSelect } from "./HospitalPatientSelect";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";

const BED_TYPES = ["general", "private", "semi_private"];
const BED_STATUSES = ["available", "occupied", "maintenance"];

const getStatusPill = (status: string) => {
  if (status === "occupied") return <Badge className="bg-primary-500">Occupied</Badge>;
  if (status === "maintenance") return <Badge className="bg-warning-500">Maintenance</Badge>;
  return <Badge className="bg-success-500">Available</Badge>;
};

const bedTypeLabel = (t: string) => t === "semi_private" ? "Semi-private" : t.charAt(0).toUpperCase() + t.slice(1);

export const IPDWards = ({ hospital }: { hospital: any }) => {
  const [activeTab, setActiveTab] = useState<"wards" | "transfers">("wards");
  const [showAddBed, setShowAddBed] = useState(false);
  const [showAdmitDialog, setShowAdmitDialog] = useState(false);
  const [showTransferDialog, setShowTransferDialog] = useState(false);
  const [selectedBed, setSelectedBed] = useState<any>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [bedForm, setBedForm] = useState({ ward_name: "", bed_number: "", bed_type: "general" });
  const [admitForm, setAdmitForm] = useState({ patient_id: "" });
  const [transferForm, setTransferForm] = useState({ to_ward: "", to_bed_id: "", reason: "" });

  const { data: beds, loading, error, refresh } = useHospitalModule<any>("ward_beds", "institution_id", hospital?.id, { orderBy: "ward_name", ascending: true });
  const { data: transfers, loading: transfersLoading, refresh: refreshTransfers } = useHospitalModule<any>("ward_transfers", "institution_id", hospital?.id, { orderBy: "transfer_date", ascending: false });
  const { patients, loading: patientsLoading } = useHospitalPatients(hospital?.id);
  const { nameFor } = usePatientNames(beds.map((b) => b.patient_id).concat(transfers.map((t) => t.patient_id)));

  const wards = beds.reduce<Record<string, any[]>>((acc, bed) => {
    const w = bed.ward_name || "Unassigned";
    if (!acc[w]) acc[w] = [];
    acc[w].push(bed);
    return acc;
  }, {});
  const occupiedCount = beds.filter((b) => b.status === "occupied").length;
  const availableBeds = beds.filter((b) => b.status === "available");
  const occupancyPct = beds.length > 0 ? Math.round((occupiedCount / beds.length) * 100) : 0;

  const handleAddBed = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bedForm.ward_name.trim()) { toast.error("Ward name is required"); return; }
    if (!bedForm.bed_number.trim()) { toast.error("Bed number is required"); return; }
    setIsSubmitting(true);
    try {
      const { error: err } = await (supabase.from("ward_beds" as any) as any).insert({
        institution_id: hospital.id,
        ward_name: bedForm.ward_name.trim(),
        bed_number: bedForm.bed_number.trim(),
        bed_type: bedForm.bed_type,
        status: "available",
      });
      if (err) throw err;
      toast.success(`Bed ${bedForm.bed_number} added to ${bedForm.ward_name}`);
      setBedForm({ ward_name: "", bed_number: "", bed_type: "general" });
      setShowAddBed(false);
      refresh();
    } catch (e: any) { toast.error(e?.message || "Failed to add bed"); }
    finally { setIsSubmitting(false); }
  };

  const openAdmit = (bed: any) => {
    setSelectedBed(bed);
    setAdmitForm({ patient_id: "" });
    setShowAdmitDialog(true);
  };

  const handleAdmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!admitForm.patient_id) { toast.error("Select a patient to admit"); return; }
    setIsSubmitting(true);
    try {
      const { error: err } = await (supabase.from("ward_beds" as any) as any)
        .update({ patient_id: admitForm.patient_id, status: "occupied", admitted_at: new Date().toISOString() })
        .eq("id", selectedBed.id);
      if (err) throw err;
      toast.success(`Patient admitted to bed ${selectedBed.bed_number}`);
      setShowAdmitDialog(false);
      refresh();
    } catch (e: any) { toast.error(e?.message || "Failed to admit patient"); }
    finally { setIsSubmitting(false); }
  };

  const handleDischarge = async (bed: any) => {
    if (!confirm(`Discharge ${nameFor(bed.patient_id)} from bed ${bed.bed_number}?`)) return;
    setIsSubmitting(true);
    try {
      const { error: err } = await (supabase.from("ward_beds" as any) as any)
        .update({ patient_id: null, status: "available", admitted_at: null })
        .eq("id", bed.id);
      if (err) throw err;
      toast.success(`Bed ${bed.bed_number} is now available`);
      refresh();
    } catch (e: any) { toast.error(e?.message || "Failed to discharge"); }
    finally { setIsSubmitting(false); }
  };

  const handleToggleMaintenance = async (bed: any) => {
    if (bed.status === "occupied") {
      toast.error(`Bed ${bed.bed_number} is occupied — discharge or transfer the patient first`);
      return;
    }
    const next = bed.status === "maintenance" ? "available" : "maintenance";
    setIsSubmitting(true);
    try {
      const { error: err } = await (supabase.from("ward_beds" as any) as any)
        .update({ status: next })
        .eq("id", bed.id);
      if (err) throw err;
      toast.success(`Bed ${bed.bed_number} marked ${next}`);
      refresh();
    } catch (e: any) { toast.error(e?.message || "Failed to update bed"); }
    finally { setIsSubmitting(false); }
  };

  const openTransfer = (bed: any) => {
    setSelectedBed(bed);
    setTransferForm({ to_ward: "", to_bed_id: "", reason: "" });
    setShowTransferDialog(true);
  };

  const handleTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!transferForm.to_bed_id) { toast.error("Select a destination bed"); return; }
    const destBed = beds.find((b: any) => b.id === transferForm.to_bed_id);
    if (!destBed || destBed.status !== "available") { toast.error("Destination bed is not available"); return; }
    setIsSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const patientId = selectedBed.patient_id;
      // Free the source bed
      const { error: srcErr } = await (supabase.from("ward_beds" as any) as any)
        .update({ patient_id: null, status: "available", admitted_at: null })
        .eq("id", selectedBed.id);
      if (srcErr) throw srcErr;
      // Occupy the destination bed
      const { error: dstErr } = await (supabase.from("ward_beds" as any) as any)
        .update({ patient_id: patientId, status: "occupied", admitted_at: new Date().toISOString() })
        .eq("id", destBed.id);
      if (dstErr) throw dstErr;
      // Record the transfer
      const { error: trErr } = await (supabase.from("ward_transfers" as any) as any).insert({
        institution_id: hospital.id,
        patient_id: patientId,
        from_ward: selectedBed.ward_name,
        to_ward: destBed.ward_name,
        from_bed_id: selectedBed.id,
        to_bed_id: destBed.id,
        transfer_date: new Date().toISOString(),
        reason: transferForm.reason.trim() || null,
        transferred_by: user?.id || null,
      });
      if (trErr) throw trErr;
      toast.success(`Patient transferred from ${selectedBed.bed_number} to ${destBed.bed_number}`);
      setShowTransferDialog(false);
      refresh();
      refreshTransfers();
    } catch (e: any) { toast.error(e?.message || "Failed to transfer patient"); }
    finally { setIsSubmitting(false); }
  };

  const transferDestOptions = availableBeds.filter((b: any) => b.id !== selectedBed?.id);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2"><Bed className="h-5 w-5" /> IPD Wards</h2>
          <p className="text-sm text-muted-foreground">
            {beds.length} beds · {occupiedCount} occupied · {availableBeds.length} available
            {beds.length > 0 && ` · ${occupancyPct}% occupancy`}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => { refresh(); refreshTransfers(); }}><RefreshCw className="h-4 w-4 mr-1" /> Refresh</Button>
          <Button size="sm" onClick={() => setShowAddBed(true)}><Plus className="h-4 w-4 mr-1" /> Add Bed</Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
        <TabsList>
          <TabsTrigger value="wards">Ward Overview</TabsTrigger>
          <TabsTrigger value="transfers">Transfer History ({transfers.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="wards" className="space-y-4">
          {loading ? <ListSkeleton /> : error ? (
            <Card><CardContent className="py-8 text-center"><p className="text-error-500">{error}</p><Button variant="outline" size="sm" className="mt-2" onClick={refresh}>Retry</Button></CardContent></Card>
          ) : beds.length === 0 ? (
            <EmptyState title="No beds yet" description="Add beds to start managing your inpatient wards." actionLabel="Add Bed" onAction={() => setShowAddBed(true)} />
          ) : (
            Object.keys(wards).sort().map((ward) => {
              const wardBeds = wards[ward];
              const occ = wardBeds.filter((b) => b.status === "occupied").length;
              return (
                <Card key={ward}>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center justify-between">
                      <span>{ward}</span>
                      <span className="text-xs font-normal text-muted-foreground">{occ}/{wardBeds.length} occupied</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                      {wardBeds.map((bed) => (
                        <div key={bed.id} className="rounded-lg border p-3 space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="font-semibold text-sm">{bed.bed_number}</span>
                            {getStatusPill(bed.status)}
                          </div>
                          <p className="text-xs text-muted-foreground">{bedTypeLabel(bed.bed_type)}</p>
                          {bed.status === "occupied" && (
                            <p className="text-xs truncate">{nameFor(bed.patient_id)}</p>
                          )}
                          <div className="flex flex-wrap gap-1">
                            {bed.status === "available" && (
                              <Button size="sm" variant="outline" className="text-xs h-7" onClick={() => openAdmit(bed)}>Admit</Button>
                            )}
                            {bed.status === "occupied" && (
                              <>
                                <Button size="sm" variant="outline" className="text-xs h-7" onClick={() => openTransfer(bed)}><ArrowRightLeft className="h-3 w-3 mr-1" /> Transfer</Button>
                                <Button size="sm" variant="outline" className="text-xs h-7" onClick={() => handleDischarge(bed)}><FileOutput className="h-3 w-3 mr-1" /> Discharge</Button>
                              </>
                            )}
                            {bed.status !== "occupied" && (
                              <Button size="sm" variant="ghost" className="text-xs h-7" onClick={() => handleToggleMaintenance(bed)}>
                                {bed.status === "maintenance" ? "Mark Available" : "Maintenance"}
                              </Button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </TabsContent>

        <TabsContent value="transfers">
          <Card>
            <CardHeader><CardTitle className="text-base">Ward Transfer History</CardTitle></CardHeader>
            <CardContent>
              {transfersLoading ? <ListSkeleton /> : transfers.length === 0 ? (
                <EmptyState title="No transfers yet" description="Patient transfers between wards and beds will appear here." />
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Patient</TableHead>
                      <TableHead>From</TableHead>
                      <TableHead>To</TableHead>
                      <TableHead>Reason</TableHead>
                      <TableHead>Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {transfers.map((t: any) => (
                      <TableRow key={t.id}>
                        <TableCell>{nameFor(t.patient_id)}</TableCell>
                        <TableCell>{t.from_ward || "—"}</TableCell>
                        <TableCell>{t.to_ward}</TableCell>
                        <TableCell className="max-w-[200px] truncate">{t.reason || "—"}</TableCell>
                        <TableCell>{t.transfer_date ? format(new Date(t.transfer_date), "MMM d, yyyy HH:mm") : "—"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Add Bed */}
      <Dialog open={showAddBed} onOpenChange={setShowAddBed}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Bed</DialogTitle>
            <DialogDescription>Add a new bed to an inpatient ward.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAddBed} className="space-y-3">
            <div><Label>Ward Name</Label><Input value={bedForm.ward_name} onChange={(e) => setBedForm({ ...bedForm, ward_name: e.target.value })} placeholder="e.g. General Ward" /></div>
            <div><Label>Bed Number</Label><Input value={bedForm.bed_number} onChange={(e) => setBedForm({ ...bedForm, bed_number: e.target.value })} placeholder="e.g. GW-01" /></div>
            <div>
              <Label>Bed Type</Label>
              <Select value={bedForm.bed_type} onValueChange={(v) => setBedForm({ ...bedForm, bed_type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{BED_TYPES.map((t) => <SelectItem key={t} value={t}>{bedTypeLabel(t)}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowAddBed(false)}>Cancel</Button>
              <Button type="submit" disabled={isSubmitting}>{isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Add Bed"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Admit Patient */}
      <Dialog open={showAdmitDialog} onOpenChange={setShowAdmitDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Admit Patient</DialogTitle>
            <DialogDescription>Admit a patient to bed {selectedBed?.bed_number} ({selectedBed?.ward_name}).</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAdmit} className="space-y-3">
            <HospitalPatientSelect patients={patients} loading={patientsLoading} value={admitForm.patient_id} onChange={(id) => setAdmitForm({ patient_id: id })} />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowAdmitDialog(false)}>Cancel</Button>
              <Button type="submit" disabled={isSubmitting}>{isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Admit"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Transfer Patient */}
      <Dialog open={showTransferDialog} onOpenChange={setShowTransferDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Transfer Patient</DialogTitle>
            <DialogDescription>Transfer {selectedBed && nameFor(selectedBed.patient_id)} from {selectedBed?.ward_name} bed {selectedBed?.bed_number}.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleTransfer} className="space-y-3">
            <div>
              <Label>Destination Bed</Label>
              <Select value={transferForm.to_bed_id} onValueChange={(v) => setTransferForm({ ...transferForm, to_bed_id: v })}>
                <SelectTrigger><SelectValue placeholder="Select an available bed" /></SelectTrigger>
                <SelectContent>
                  {transferDestOptions.map((b: any) => (
                    <SelectItem key={b.id} value={b.id}>{b.ward_name} — {b.bed_number} ({bedTypeLabel(b.bed_type)})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {transferDestOptions.length === 0 && <p className="text-xs text-muted-foreground mt-1">No available beds to transfer to.</p>}
            </div>
            <div><Label>Reason</Label><Textarea value={transferForm.reason} onChange={(e) => setTransferForm({ ...transferForm, reason: e.target.value })} placeholder="e.g. Requires closer monitoring" /></div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowTransferDialog(false)}>Cancel</Button>
              <Button type="submit" disabled={isSubmitting}>{isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Transfer"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};
