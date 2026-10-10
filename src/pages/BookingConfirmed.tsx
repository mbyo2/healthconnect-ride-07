import { useSearchParams, useNavigate } from "react-router-dom";
import { providerDisplayName } from "@/utils/providerDisplay";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format, parseISO } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  CheckCircle, Calendar, Clock, MapPin, Video,
  FileText, ArrowRight, Home, CreditCard, Loader2, XCircle, Receipt
} from "lucide-react";
import { downloadReceiptPdf } from "@/utils/receiptPdf";
import { Skeleton } from "@/components/ui/skeleton";

const BookingConfirmed = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const appointmentId = searchParams.get('id');

  const { data: appointment, isLoading, isError, refetch } = useQuery({
    queryKey: ['booking-confirmed', appointmentId],
    queryFn: async () => {
      if (!appointmentId) return null;
      // NOTE: appointments.provider_id FKs point at auth.users, so a
      // `profiles!appointments_provider_id_fkey` join hint is invalid
      // PostgREST. Provider details come from the public
      // provider_directory view instead.
      const { data, error } = await supabase
        .from('appointments')
        .select('*')
        .eq('id', appointmentId)
        .single();
      if (error) throw error;
      if (!data) return null;

      let provider: any = null;
      if ((data as any).provider_id) {
        const { data: dir, error: dirError } = await supabase
          .from('provider_directory')
          .select('first_name, last_name, specialty, avatar_url, role, city, primary_practice_location, location')
          .eq('id', (data as any).provider_id)
          .maybeSingle();
        if (dirError) {
          console.error('Error fetching booking provider:', dirError);
        } else if (dir) {
          provider = {
            ...dir,
            address: dir.primary_practice_location || dir.location || null,
          };
        }
      }
      return { ...data, provider };
    },
    enabled: !!appointmentId,
  });

  const { data: payment } = useQuery({
    queryKey: ['booking-confirmed-payment', appointmentId],
    queryFn: async () => {
      if (!appointmentId) return null;
      const { data } = await (supabase as any)
        .from('lenco_payments')
        .select('id, status, amount, currency, lenco_reference, result_message, created_at')
        .eq('reference_id', appointmentId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      return data;
    },
    enabled: !!appointmentId,
    refetchInterval: (q) => (q.state.data?.status === 'pending' ? 5000 : false),
  });

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-12 max-w-lg">
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="container mx-auto px-4 py-12 text-center space-y-3">
        <p className="text-muted-foreground">We couldn&apos;t load your booking details. Check your connection and try again.</p>
        <div className="flex flex-col sm:flex-row gap-2 justify-center">
          <Button onClick={() => refetch()} className="min-h-[44px]">Try again</Button>
          <Button variant="outline" onClick={() => navigate('/home')} className="min-h-[44px]">Go Home</Button>
        </div>
      </div>
    );
  }

  if (!appointment) {
    return (
      <div className="container mx-auto px-4 py-12 text-center">
        <p className="text-muted-foreground">Appointment not found. It may have been cancelled or the link is incorrect.</p>
        <Button onClick={() => navigate('/home')} className="mt-4 min-h-[44px]">Go Home</Button>
      </div>
    );
  }

  const provider = appointment.provider as any;
  const isVideo = appointment.type === 'video_consultation';

  const downloadIcs = () => {
    if (!appointment) return;
    const datePart = String(appointment.date || "").replace(/[-]/g, "");
    const timePart = String(appointment.time || "09:00").replace(/[:]/g, "");
    const icsContent = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//Doc O Clock Healthcare System//EN",
      "BEGIN:VEVENT",
      `SUMMARY:Medical Visit — Doc' O Clock`,
      `DESCRIPTION:Appointment with ${provider?.first_name || ""} ${provider?.last_name || ""}. Booking ref ${appointment.id}. Manage at https://doc0clock.online/appointments/${appointment.id}`,
      `DTSTART:${datePart}T${timePart}00`,
      `DTEND:${datePart}T${timePart}00`,
      "STATUS:CONFIRMED",
      "END:VEVENT",
      "END:VCALENDAR",
    ].join("\r\n");
    const blob = new Blob([icsContent], { type: "text/calendar;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `appointment-${appointment.date}.ics`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  const appointmentDate = (() => {
    try {
      const d = parseISO(appointment.date);
      return isNaN(d.getTime()) ? null : d;
    } catch {
      return null;
    }
  })();

  return (
    <div className="container mx-auto px-4 py-8 max-w-lg space-y-6">
      {/* Success Header */}
      <div className="text-center space-y-4">
        <div className="w-20 h-20 mx-auto rounded-full bg-emerald-500/10 flex items-center justify-center">
          <CheckCircle className="h-10 w-10 text-emerald-500" />
        </div>
        <h1 className="text-2xl font-bold text-foreground">Booking Confirmed!</h1>
        <p className="text-muted-foreground">
          Your appointment has been scheduled successfully.
        </p>
        <p className="text-xs text-muted-foreground font-mono">Booking ref: {String(appointment.id).slice(0, 8)}</p>
      </div>

      {/* Payment Status */}
      {payment && (() => {
        const s = payment.status as string;
        const cfg = {
          paid: { icon: CheckCircle, color: 'text-emerald-600', bg: 'bg-emerald-500/10', label: 'Payment successful', variant: 'default' as const },
          pending: { icon: Loader2, color: 'text-amber-600', bg: 'bg-amber-500/10', label: 'Payment pending', variant: 'secondary' as const },
          failed: { icon: XCircle, color: 'text-destructive', bg: 'bg-destructive/10', label: 'Payment failed', variant: 'destructive' as const },
          cancelled: { icon: XCircle, color: 'text-muted-foreground', bg: 'bg-muted', label: 'Payment cancelled', variant: 'outline' as const },
        }[s] || { icon: CreditCard, color: 'text-muted-foreground', bg: 'bg-muted', label: s, variant: 'outline' as const };
        const StatusIcon = cfg.icon;
        return (
          <Card>
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${cfg.bg}`}>
                  <StatusIcon className={`h-5 w-5 ${cfg.color} ${s === 'pending' ? 'animate-spin' : ''}`} />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-foreground text-sm">{cfg.label}</p>
                    <Badge variant={cfg.variant} className="text-xs">{s}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {Number(payment.amount).toFixed(2)} {payment.currency}
                    {payment.lenco_reference ? ` · ${payment.lenco_reference}` : ''}
                  </p>
                </div>
              </div>
              {payment.result_message && (
                <p className="text-xs text-muted-foreground">{payment.result_message}</p>
              )}
            </CardContent>
          </Card>
        );
      })()}

      {/* Appointment Card */}
      <Card className="border-primary/20">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Appointment Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Provider Info */}
          <div className="flex items-center gap-3 pb-4 border-b border-border">
            {provider?.avatar_url ? (
              <img src={provider.avatar_url} alt="" className="w-14 h-14 rounded-full object-cover" />
            ) : (
              <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center text-lg font-bold text-primary">
                {provider?.first_name?.[0]}{provider?.last_name?.[0]}
              </div>
            )}
            <div>
              <p className="font-semibold text-foreground">
                {providerDisplayName({ first_name: provider?.first_name, last_name: provider?.last_name, role: provider?.role })}
              </p>
              <p className="text-sm text-primary">{provider?.specialty}</p>
            </div>
          </div>

          {/* Date & Time */}
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-primary" />
              <div>
                <p className="text-xs text-muted-foreground">Date</p>
                <p className="font-medium text-foreground text-sm">
                  {appointmentDate ? format(appointmentDate, 'EEE, MMM d, yyyy') : 'Date to be confirmed'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-primary" />
              <div>
                <p className="text-xs text-muted-foreground">Time</p>
                <p className="font-medium text-foreground text-sm">{appointment.time}</p>
              </div>
            </div>
          </div>

          {/* Type */}
          <div className="flex items-center gap-2 pt-3 border-t border-border">
            {isVideo ? (
              <>
                <Video className="h-4 w-4 text-emerald-600" />
                <span className="text-sm font-medium text-foreground">Video Consultation</span>
                <Button
                  size="sm"
                  onClick={() => navigate(`/video-call/${appointment.id}`)}
                  className="ml-auto rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/20 text-xs font-bold"
                >
                  Join video visit
                  <ArrowRight className="h-3.5 w-3.5 ml-1" aria-hidden />
                </Button>
              </>
            ) : (
              <>
                <MapPin className="h-4 w-4 text-blue-600" />
                <span className="text-sm font-medium text-foreground">
                  {provider?.address || 'In-Person Visit'}
                </span>
              </>
            )}
          </div>

          {/* Map for in-person */}
          {!isVideo && provider?.address && (
            <Button variant="outline" className="w-full" asChild>
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(provider.address + (provider.city ? ', ' + provider.city : ''))}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <MapPin className="h-4 w-4 mr-2" />
                Get Directions
              </a>
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Next Steps */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Next Steps</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <button
            onClick={() => navigate(`/intake-form?appointment=${appointmentId}`)}
            className="w-full min-h-[44px] flex items-center gap-3 p-3 rounded-lg bg-primary/5 hover:bg-primary/10 transition-colors text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
          >
            <FileText className="h-5 w-5 text-primary flex-shrink-0" />
            <div className="flex-1">
              <p className="font-medium text-sm text-foreground">Complete Intake Form</p>
              <p className="text-xs text-muted-foreground">Save time by filling out your medical info ahead</p>
            </div>
            <ArrowRight className="h-4 w-4 text-muted-foreground" />
          </button>

          <button
            onClick={downloadIcs}
            className="w-full min-h-[44px] flex items-center gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
          >
            <Calendar className="h-5 w-5 text-muted-foreground flex-shrink-0" />
            <div className="flex-1">
              <p className="font-medium text-sm text-foreground">Add to Calendar</p>
              <p className="text-xs text-muted-foreground">Download a reminder file for your phone or computer</p>
            </div>
            <ArrowRight className="h-4 w-4 text-muted-foreground" />
          </button>

          <button
            onClick={() =>
              downloadReceiptPdf({
                title: "Appointment Booking",
                receiptNumber: String(appointment.id).slice(0, 8).toUpperCase(),
                date: appointment.created_at || new Date().toISOString(),
                issuerName: "Doc'O Clock",
                customerName: appointment.patient_name || "Patient",
                items: [
                  {
                    description: isVideo ? "Video Consultation" : "In-Person Visit",
                    quantity: 1,
                    unitPrice: Number(payment?.amount) || Number(appointment.consultation_fee) || 0,
                    note: provider ? `Provider: ${provider.first_name || ""} ${provider.last_name || ""}${provider.specialty ? ` (${provider.specialty})` : ""}` : undefined,
                  },
                ],
                amountPaid: payment?.status === "paid" ? Number(payment.amount) : 0,
                paymentMethod: payment?.payment_method || undefined,
                paymentReference: payment?.trans_ref || undefined,
                notes: `Date: ${appointment.date || ""} ${appointment.time || ""}`,
              })
            }
            className="w-full min-h-[44px] flex items-center gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
          >
            <Receipt className="h-5 w-5 text-muted-foreground flex-shrink-0" />
            <div className="flex-1">
              <p className="font-medium text-sm text-foreground">Download PDF Receipt</p>
              <p className="text-xs text-muted-foreground">Get a formatted receipt for this booking</p>
            </div>
            <ArrowRight className="h-4 w-4 text-muted-foreground" />
          </button>

          <button
            onClick={() => navigate('/appointments')}
            className="w-full min-h-[44px] flex items-center gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
          >
            <Calendar className="h-5 w-5 text-muted-foreground flex-shrink-0" />
            <div className="flex-1">
              <p className="font-medium text-sm text-foreground">View All Appointments</p>
              <p className="text-xs text-muted-foreground">Manage your upcoming visits</p>
            </div>
            <ArrowRight className="h-4 w-4 text-muted-foreground" />
          </button>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex gap-3">
        <Button variant="outline" className="flex-1" onClick={() => navigate('/home')}>
          <Home className="h-4 w-4 mr-2" />
          Home
        </Button>
        <Button className="flex-1" onClick={() => navigate('/appointments')}>
          My Appointments
          <ArrowRight className="h-4 w-4 ml-2" />
        </Button>
      </div>
    </div>
  );
};

export default BookingConfirmed;
