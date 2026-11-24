import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { useInstitutionContext } from "@/hooks/useInstitutionContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Calendar, Loader2, Clock, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { InstitutionPatientPicker } from "@/components/hospital/InstitutionPatientPicker";
import type { InstitutionPatient } from "@/lib/patients";
import { friendlyErrorMessage } from "@/utils/friendly-error";
import { toast } from "sonner";
import { format } from "date-fns";
import { NoShowManager, MarkNoShowButton } from "@/components/appointments/NoShowWorkflow";

const InstitutionAppointments = () => {
    const { user } = useAuth();
    const { institution, institutionId, loading: instLoading } = useInstitutionContext();
    const [loading, setLoading] = useState(true);
    const [appointments, setAppointments] = useState<any[]>([]);

    // PW-20: staff booking for walk-ins — pick (or create) the patient via
    // the roster picker, choose one of the institution's providers, and
    // insert the appointment with the master patient_id, provider and
    // institution set, mirroring the self-booking payload shape.
    const [showBook, setShowBook] = useState(false);
    const [bookingPatient, setBookingPatient] = useState<InstitutionPatient | null>(null);
    const [providers, setProviders] = useState<Array<{ id: string; name: string; role: string }>>([]);
    const [bookingForm, setBookingForm] = useState({
        provider_id: "",
        date: new Date().toISOString().split("T")[0],
        time: "09:00",
        type: "in_person",
        notes: "",
    });
    const [booking, setBooking] = useState(false);

    useEffect(() => {
        if (!institutionId) return;
        (async () => {
            const { data } = await (supabase.from("institution_staff" as any) as any)
                .select("provider_id, role, profiles!institution_staff_provider_id_fkey(first_name, last_name)")
                .eq("institution_id", institutionId)
                .eq("is_active", true)
                .order("role");
            const list = ((data as any[]) || [])
                .map((r: any) => ({
                    id: r.provider_id,
                    name: [r.profiles?.first_name, r.profiles?.last_name].filter(Boolean).join(" ") || r.role,
                    role: r.role,
                }))
                .filter((r: any) => r.id);
            setProviders(list);
        })();
    }, [institutionId]);

    const handleStaffBook = async () => {
        if (!bookingPatient) {
            toast.error("Select a patient first — pick them from the list, or create their record right here.");
            return;
        }
        if (!bookingForm.provider_id) {
            toast.error("Choose the provider for this appointment.");
            return;
        }
        if (!bookingForm.date || !bookingForm.time) {
            toast.error("Pick a date and time for the appointment.");
            return;
        }
        setBooking(true);
        try {
            const payload = {
                patient_id: bookingPatient.id,
                provider_id: bookingForm.provider_id,
                institution_id: institutionId,
                date: bookingForm.date,
                time: bookingForm.time,
                appointment_date: bookingForm.date,
                appointment_time: bookingForm.time,
                appointment_type: bookingForm.type,
                type: bookingForm.type,
                status: "pending",
                notes: bookingForm.notes || null,
                duration: 30,
            };
            const { error } = await (supabase.from("appointments") as any).insert(payload);
            if (error) throw error;
            toast.success(`Appointment booked for ${bookingPatient.name}`);
            setShowBook(false);
            setBookingPatient(null);
            setBookingForm({
                provider_id: "",
                date: new Date().toISOString().split("T")[0],
                time: "09:00",
                type: "in_person",
                notes: "",
            });
            fetchAppointments();
        } catch (err: any) {
            toast.error(friendlyErrorMessage(err, "Could not book the appointment. Please try again."));
        } finally {
            setBooking(false);
        }
    };

    useEffect(() => {
        fetchAppointments();
    }, [institutionId]);

    const fetchAppointments = async () => {
        if (!institutionId) { setLoading(false); return; }
        setLoading(true);
        try {
            // Use the SECURITY DEFINER RPC so patient/provider names resolve
            // without tripping profiles RLS recursion. The function enforces
            // institution staff/admin authorization internally and matches
            // appointments by provider affiliation OR direct institution_id
            // linkage (set at booking time via trg_set_appointment_institution).
            const { data: appts, error: apptsError } = await supabase
                .rpc('get_institution_appointments', { p_institution_id: institutionId });

            if (apptsError) throw apptsError;
            // Normalize RPC shape to what the table renderer expects
            const normalized = (appts || []).map((a: any) => ({
                ...a,
                date: a.appointment_date,
                time: a.appointment_time,
                type: a.appointment_type,
                patient: {
                    first_name: a.patient_first_name,
                    last_name: a.patient_last_name,
                    email: a.patient_email,
                },
                provider: {
                    first_name: a.provider_first_name,
                    last_name: a.provider_last_name,
                },
            }));
            setAppointments(normalized);

        } catch (error) {
            console.error("Error fetching appointments:", error);
            toast.error("Failed to load appointments");
        } finally {
            setLoading(false);
        }
    };

    // A no-show can only be marked once the appointment time has arrived:
    // status still scheduled/confirmed and the slot is today or in the past.
    const canMarkNoShow = (appt: any) => {
        if (!["scheduled", "confirmed"].includes(appt.status) || !appt.date) return false;
        const dt = new Date(`${appt.date}T${appt.time || "00:00"}`);
        if (isNaN(dt.getTime())) return false;
        const today = new Date();
        const isToday = dt.getFullYear() === today.getFullYear() && dt.getMonth() === today.getMonth() && dt.getDate() === today.getDate();
        return isToday || dt.getTime() <= Date.now();
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'completed': return 'default';
            case 'cancelled': return 'destructive';
            case 'scheduled': return 'secondary';
            default: return 'outline';
        }
    };

    if (instLoading) {
      return <div className="min-h-screen bg-canvas flex items-center justify-center p-6"><div className="h-8 w-8 rounded-full border-2 border-primary-500 border-t-transparent animate-spin" aria-hidden /><span className="sr-only">Loading institution</span></div>;
    }

    if (loading) return <div className="flex justify-center p-8"><Loader2 className="animate-spin" /></div>;

    if (!institution) {
      return <div className="min-h-screen bg-canvas flex items-center justify-center p-6 text-center"><p className="text-sm text-graphite-500">No institution linked to your account. Contact support.</p></div>;
    }

    return (
        <div className="min-h-screen bg-canvas text-midnight font-sans transition-colors pb-16">
          <div className="doc-page-header px-4 sm:px-6 py-5">
            <div className="max-w-content mx-auto flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-primary-500 text-white flex items-center justify-center shadow-button"><Calendar className="h-5 w-5" /></div>
              <div>
                <h1 className="text-2xl font-medium tracking-tight">Appointments</h1>
                <p className="text-sm text-graphite-500 font-medium tracking-wide">{appointments.length} appointment{appointments.length !== 1 ? 's' : ''} · institutional scope</p>
              </div>
              <div className="ml-auto">
                <Button onClick={() => setShowBook(true)}>
                  <Plus className="h-4 w-4 mr-1.5" /> Book for patient
                </Button>
              </div>
            </div>
          </div>
          <div className="max-w-content mx-auto px-4 sm:px-6 pt-6 space-y-6">
            <NoShowManager institutionId={institutionId} />
            <div className="vf-card !p-0 overflow-hidden">
              <div className="px-5 py-4 border-b border-border flex items-center justify-between">
                <h2 className="font-medium text-base flex items-center gap-2"><Calendar className="h-4 w-4 text-primary-500" /> All Appointments ({appointments.length})</h2>
              </div>
              <div className="p-5">
                    {appointments.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                            No appointments found for this institution.
                        </div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Date & Time</TableHead>
                                    <TableHead>Patient</TableHead>
                                    <TableHead>Provider</TableHead>
                                    <TableHead>Type</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {appointments.map((appt) => (
                                    <TableRow key={appt.id}>
                                        <TableCell>
                                            <div className="flex flex-col">
                                                <span className="font-medium">{format(new Date(appt.date), 'MMM d, yyyy')}</span>
                                                <span className="text-xs text-muted-foreground flex items-center gap-1">
                                                    <Clock className="h-3 w-3" />
                                                    {appt.time}
                                                </span>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="font-medium">
                                                {appt.patient?.first_name} {appt.patient?.last_name}
                                            </div>
                                            <div className="text-xs text-muted-foreground">{appt.patient?.email}</div>
                                        </TableCell>
                                        <TableCell>
                                            {[appt.provider?.first_name, appt.provider?.last_name].filter(Boolean).join(' ') || 'Provider'}
                                        </TableCell>
                                        <TableCell>{appt.type}</TableCell>
                                        <TableCell>
                                            <Badge variant={getStatusColor(appt.status) as any}>
                                                {appt.status}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            {canMarkNoShow(appt) && (
                                                <MarkNoShowButton appointmentId={appt.id} onMarked={fetchAppointments} />
                                            )}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
              </div>
            </div>

            {/* PW-20: staff walk-in booking dialog */}
            <Dialog open={showBook} onOpenChange={setShowBook}>
              <DialogContent className="sm:max-w-[480px]">
                <DialogHeader>
                  <DialogTitle>Book an appointment for a patient</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <InstitutionPatientPicker
                    institutionId={institutionId}
                    value={bookingPatient}
                    onChange={setBookingPatient}
                    label="Patient *"
                    createSource="booking"
                  />
                  <div>
                    <Label>Provider *</Label>
                    <Select value={bookingForm.provider_id} onValueChange={(v) => setBookingForm({ ...bookingForm, provider_id: v })}>
                      <SelectTrigger className="mt-1"><SelectValue placeholder="Choose a provider" /></SelectTrigger>
                      <SelectContent>
                        {providers.map((prov) => (
                          <SelectItem key={prov.id} value={prov.id}>{prov.name} · {prov.role}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {providers.length === 0 && (
                      <p className="mt-1 text-xs text-muted-foreground">No active staff found for this institution yet — add the provider to the staff roster first.</p>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label>Date *</Label>
                      <Input type="date" value={bookingForm.date} onChange={(e) => setBookingForm({ ...bookingForm, date: e.target.value })} />
                    </div>
                    <div>
                      <Label>Time *</Label>
                      <Input type="time" value={bookingForm.time} onChange={(e) => setBookingForm({ ...bookingForm, time: e.target.value })} />
                    </div>
                  </div>
                  <div>
                    <Label>Visit type</Label>
                    <Select value={bookingForm.type} onValueChange={(v) => setBookingForm({ ...bookingForm, type: v })}>
                      <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="in_person">In person</SelectItem>
                        <SelectItem value="video_consultation">Video consultation</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Reason / notes</Label>
                    <Input value={bookingForm.notes} onChange={(e) => setBookingForm({ ...bookingForm, notes: e.target.value })} placeholder="Optional" />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setShowBook(false)}>Cancel</Button>
                  <Button onClick={handleStaffBook} disabled={booking || !bookingPatient || !bookingForm.provider_id}>
                    {booking ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : null}
                    Book appointment
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
        </div>
    </div>
    );
};

export default InstitutionAppointments;
