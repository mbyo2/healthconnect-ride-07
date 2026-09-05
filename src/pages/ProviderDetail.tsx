import { useParams, useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import {
  MapPin, Clock, Star, CalendarPlus, Video, Shield,
  Award, GraduationCap, Languages, CheckCircle, Building2,
  DollarSign, Home, Phone, Mail, Stethoscope, Users,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ProviderReviews } from "@/components/reviews/ProviderReviews";
import { BookingModal } from "@/components/booking/BookingModal";
import { WaitlistSignup } from "@/components/booking/WaitlistSignup";
import { useState } from "react";
import { Provider } from "@/types/provider";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";

// ── helpers ───────────────────────────────────────────────────────────────────

const Section = ({
  icon: Icon, title, children,
}: { icon: React.ElementType; title: string; children: React.ReactNode }) => (
  <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-[#e6e9ef] dark:border-slate-800 shadow-xs space-y-3">
    <h3 className="font-extrabold text-sm flex items-center gap-2 text-slate-800 dark:text-slate-100">
      <Icon className="h-4 w-4 text-[#0073ea]" />
      {title}
    </h3>
    {children}
  </div>
);

const InfoRow = ({ label, value }: { label: string; value: React.ReactNode }) => (
  <div className="flex items-start gap-2 text-xs">
    <span className="text-[#676879] font-bold w-36 shrink-0">{label}</span>
    <span className="text-slate-800 dark:text-slate-200 font-medium">{value}</span>
  </div>
);

// ── component ─────────────────────────────────────────────────────────────────

export const ProviderDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [isBookingOpen, setIsBookingOpen] = useState(false);
  const [isWaitlistOpen, setIsWaitlistOpen] = useState(false);

  const { data: provider, isLoading, error } = useQuery({
    queryKey: ["provider-detail", id],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await supabase
        .from("profiles")
        .select(`
          *,
          provider_statistics (
            average_rating,
            total_reviews,
            total_appointments
          )
        `)
        .eq("id", id)
        .single();
      if (error) throw error;
      return data as any;
    },
    enabled: !!id,
  });

  const { data: services = [] } = useQuery({
    queryKey: ["provider-services", id],
    queryFn: async () => {
      if (!id) return [];
      const { data } = await supabase
        .from("healthcare_services")
        .select("*")
        .eq("provider_id", id)
        .eq("is_available", true);
      return data || [];
    },
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#f5f6f8] p-6 flex justify-center items-center">
        <Skeleton className="h-64 w-full max-w-4xl rounded-2xl" />
      </div>
    );
  }

  if (error || !provider) {
    return (
      <div className="min-h-screen bg-[#f5f6f8] p-6 flex items-center justify-center">
        <div className="max-w-md w-full p-8 rounded-2xl bg-white border border-[#e6e9ef] text-center space-y-3">
          <h2 className="text-lg font-extrabold">Provider Profile Not Found</h2>
          <button
            onClick={() => navigate("/search")}
            className="px-4 py-2 rounded-md bg-[#0073ea] text-white font-bold text-xs"
          >
            Browse Verified Doctors
          </button>
        </div>
      </div>
    );
  }

  const stats = provider.provider_statistics?.[0];
  const rating = stats?.average_rating || provider.rating || 4.8;
  const reviewCount = stats?.total_reviews || 0;

  const providerName = `Dr. ${provider.first_name || ""} ${provider.last_name || ""}`.trim();
  const providerSpecialty = provider.specialty || "Healthcare Specialist";

  const feeLabel = (() => {
    if (provider.consultation_fee_min && provider.consultation_fee_max)
      return `K${provider.consultation_fee_min} – K${provider.consultation_fee_max}`;
    if (provider.consultation_fee_min) return `From K${provider.consultation_fee_min}`;
    return null;
  })();

  const subs: string[] = provider.subspecialties || [];
  const certs: string[] = provider.board_certifications || [];
  const langs: string[] = provider.languages_spoken || [];
  const hospitals: string[] = provider.affiliated_hospitals || [];
  const insurances: string[] = provider.insurance_providers_accepted || [];
  const apptTypes: string[] = provider.appointment_types || [];
  const schedule: Record<string, { available: boolean; hours: string[] }> | null =
    provider.availability_schedule || null;

  return (
    <>
      <Helmet>
        <title>{providerName} — {providerSpecialty} | Doc' O Clock</title>
      </Helmet>

      <div className="min-h-screen bg-[#f5f6f8] dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans pb-16">
        {/* Sticky top bar */}
        <div className="bg-white dark:bg-slate-900 border-b border-[#e6e9ef] dark:border-slate-800 px-4 sm:px-6 py-4 sticky top-0 z-30 shadow-xs">
          <div className="max-w-5xl mx-auto flex items-center justify-between gap-4">
            <div className="min-w-0">
              <h1 className="text-base font-extrabold tracking-tight truncate">{providerName}</h1>
              <p className="text-xs text-[#0073ea] font-bold truncate">{providerSpecialty}</p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => setIsWaitlistOpen(true)}
                className="px-3 py-1.5 rounded-md border border-[#e6e9ef] text-xs font-bold text-slate-600 hover:bg-[#f0f2f7]"
              >
                Join Waitlist
              </button>
              <button
                onClick={() => setIsBookingOpen(true)}
                className="px-4 py-2 rounded-md bg-[#0073ea] hover:bg-[#0060c4] text-white font-extrabold text-xs shadow-xs flex items-center gap-1.5"
              >
                <CalendarPlus className="h-4 w-4" /> Book Appointment
              </button>
            </div>
          </div>
        </div>

        <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-6 space-y-5">

          {/* ── Hero ── */}
          <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-[#e6e9ef] dark:border-slate-800 shadow-xs flex flex-col sm:flex-row gap-5">
            {/* Avatar */}
            <div className="shrink-0">
              {provider.avatar_url ? (
                <img
                  src={provider.avatar_url}
                  alt={providerName}
                  className="w-28 h-28 rounded-2xl object-cover border-2 border-[#0073ea]"
                />
              ) : (
                <div className="w-28 h-28 rounded-2xl bg-[#e5f0ff] text-[#0073ea] flex items-center justify-center text-3xl font-black border-2 border-[#0073ea]">
                  {provider.first_name?.[0]}{provider.last_name?.[0]}
                </div>
              )}
            </div>

            <div className="flex-1 space-y-3 min-w-0">
              <div>
                <h2 className="text-xl font-extrabold">{providerName}</h2>
                <p className="text-sm text-[#0073ea] font-extrabold">{providerSpecialty}</p>
              </div>

              {/* Capability badges */}
              <div className="flex flex-wrap gap-1.5">
                {provider.is_verified && (
                  <Badge className="bg-[#00c875] text-white border-0 gap-1">
                    <CheckCircle className="h-3 w-3" /> Verified
                  </Badge>
                )}
                {!!rating && (
                  <Badge className="bg-[#fdab3d] text-white border-0">
                    ★ {Number(rating).toFixed(1)} ({reviewCount} reviews)
                  </Badge>
                )}
                {provider.telemedicine_available && (
                  <Badge variant="secondary" className="gap-1">
                    <Video className="h-3 w-3" /> Telemedicine
                  </Badge>
                )}
                {provider.home_visits_available && (
                  <Badge variant="secondary" className="gap-1">
                    <Home className="h-3 w-3" /> Home Visits
                  </Badge>
                )}
                {provider.accepts_insurance && (
                  <Badge variant="secondary" className="gap-1">
                    <Shield className="h-3 w-3" /> Insurance Accepted
                  </Badge>
                )}
              </div>

              {/* Quick info row */}
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-[#676879]">
                {provider.primary_practice_location && (
                  <span className="flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5 shrink-0 text-[#0073ea]" />
                    {provider.primary_practice_location}
                  </span>
                )}
                {provider.typical_wait_time && (
                  <span className="flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5 shrink-0" />
                    Wait: {provider.typical_wait_time}
                  </span>
                )}
                {feeLabel && (
                  <span className="flex items-center gap-1 font-semibold text-[#0073ea]">
                    <DollarSign className="h-3.5 w-3.5 shrink-0" />
                    {feeLabel}
                  </span>
                )}
                {provider.years_experience && (
                  <span className="flex items-center gap-1">
                    <Star className="h-3.5 w-3.5 shrink-0" />
                    {provider.years_experience}+ years experience
                  </span>
                )}
              </div>

              {provider.bio && (
                <p className="text-xs text-[#676879] leading-relaxed line-clamp-3">{provider.bio}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {/* ── Left column (2/3 wide) ── */}
            <div className="lg:col-span-2 space-y-5">

              {/* Education & Credentials */}
              {(provider.medical_school || certs.length > 0 || subs.length > 0) && (
                <Section icon={GraduationCap} title="Education & Credentials">
                  {(provider.medical_school || provider.graduation_year) && (
                    <InfoRow
                      label="Medical School"
                      value={`${provider.medical_school || ""}${provider.graduation_year ? ` (${provider.graduation_year})` : ""}`}
                    />
                  )}
                  {provider.years_experience && (
                    <InfoRow label="Experience" value={`${provider.years_experience}+ years`} />
                  )}
                  {certs.length > 0 && (
                    <div>
                      <p className="text-[11px] font-extrabold uppercase text-[#676879] mb-1.5">Board Certifications</p>
                      <div className="flex flex-wrap gap-1.5">
                        {certs.map(c => (
                          <Badge key={c} variant="outline" className="gap-1 text-xs">
                            <Award className="h-3 w-3 text-[#0073ea]" /> {c}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  {subs.length > 0 && (
                    <div>
                      <p className="text-[11px] font-extrabold uppercase text-[#676879] mb-1.5">Subspecialties</p>
                      <div className="flex flex-wrap gap-1.5">
                        {subs.map(s => (
                          <Badge key={s} variant="secondary" className="text-xs">
                            <Stethoscope className="h-3 w-3 mr-1" /> {s}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </Section>
              )}

              {/* Practice Details */}
              {(hospitals.length > 0 || apptTypes.length > 0) && (
                <Section icon={Building2} title="Practice Details">
                  {hospitals.length > 0 && (
                    <div>
                      <p className="text-[11px] font-extrabold uppercase text-[#676879] mb-1.5">Affiliated Hospitals</p>
                      <ul className="space-y-1">
                        {hospitals.map(h => (
                          <li key={h} className="flex items-center gap-1.5 text-xs">
                            <CheckCircle className="h-3.5 w-3.5 text-[#00c875] shrink-0" /> {h}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {apptTypes.length > 0 && (
                    <div>
                      <p className="text-[11px] font-extrabold uppercase text-[#676879] mb-1.5">Appointment Types</p>
                      <div className="flex flex-wrap gap-1.5">
                        {apptTypes.map(t => <Badge key={t} variant="secondary" className="text-xs">{t}</Badge>)}
                      </div>
                    </div>
                  )}
                </Section>
              )}

              {/* Weekly Availability */}
              {schedule && Object.keys(schedule).length > 0 && (
                <Section icon={Clock} title="Weekly Availability">
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {Object.entries(schedule).map(([day, info]) => (
                      <div key={day} className="p-2 rounded-lg border border-[#e6e9ef] dark:border-slate-700 bg-[#f5f6f8] dark:bg-slate-800">
                        <p className="text-[11px] font-extrabold capitalize text-slate-700 dark:text-slate-200">{day}</p>
                        {info.available ? (
                          <div className="space-y-0.5 mt-1">
                            {(info.hours || []).map(h => (
                              <p key={h} className="text-[10px] text-[#0073ea] font-bold">{h}</p>
                            ))}
                            {(!info.hours || info.hours.length === 0) && (
                              <p className="text-[10px] text-[#00c875] font-bold">Available</p>
                            )}
                          </div>
                        ) : (
                          <p className="text-[10px] text-[#676879] mt-1">Not available</p>
                        )}
                      </div>
                    ))}
                  </div>
                </Section>
              )}

              {/* Services offered */}
              {services.length > 0 && (
                <Section icon={Stethoscope} title="Services Offered">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {services.map((svc: any) => (
                      <div key={svc.id} className="flex items-center justify-between p-2 rounded-lg border border-[#e6e9ef] dark:border-slate-700 text-xs">
                        <span className="font-medium">{svc.name}</span>
                        {svc.price && (
                          <span className="font-bold text-[#0073ea]">K{svc.price}</span>
                        )}
                      </div>
                    ))}
                  </div>
                </Section>
              )}

              {/* Reviews */}
              <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-[#e6e9ef] dark:border-slate-800 shadow-xs">
                <h3 className="font-extrabold text-sm mb-3 flex items-center gap-2">
                  <Star className="h-4 w-4 text-[#0073ea]" /> Patient Reviews
                </h3>
                <ProviderReviews providerId={id} />
              </div>
            </div>

            {/* ── Right sidebar (1/3) ── */}
            <div className="space-y-5">
              {/* Fees & Insurance */}
              {(feeLabel || insurances.length > 0) && (
                <Section icon={DollarSign} title="Fees & Insurance">
                  {feeLabel && <InfoRow label="Consultation fee" value={<span className="font-bold text-[#0073ea]">{feeLabel}</span>} />}
                  {insurances.length > 0 && (
                    <div>
                      <p className="text-[11px] font-extrabold uppercase text-[#676879] mb-1.5">Accepted Insurance</p>
                      <div className="flex flex-wrap gap-1.5">
                        {insurances.map(ins => (
                          <Badge key={ins} variant="outline" className="text-xs gap-1">
                            <Shield className="h-3 w-3 text-[#00c875]" /> {ins}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </Section>
              )}

              {/* Languages */}
              {langs.length > 0 && (
                <Section icon={Languages} title="Languages Spoken">
                  <div className="flex flex-wrap gap-1.5">
                    {langs.map(l => <Badge key={l} variant="secondary" className="text-xs">{l}</Badge>)}
                  </div>
                </Section>
              )}

              {/* Contact */}
              {(provider.phone || provider.email) && (
                <Section icon={Users} title="Contact">
                  {provider.phone && (
                    <a href={`tel:${provider.phone}`} className="flex items-center gap-2 text-xs text-[#0073ea] hover:underline">
                      <Phone className="h-4 w-4" /> {provider.phone}
                    </a>
                  )}
                  {provider.email && (
                    <a href={`mailto:${provider.email}`} className="flex items-center gap-2 text-xs text-[#0073ea] hover:underline">
                      <Mail className="h-4 w-4" /> {provider.email}
                    </a>
                  )}
                </Section>
              )}

              {/* Book CTA */}
              <div className="space-y-2">
                <button
                  onClick={() => setIsBookingOpen(true)}
                  className="w-full py-3 rounded-2xl bg-[#0073ea] hover:bg-[#0060c4] text-white font-extrabold text-sm transition-all"
                >
                  <CalendarPlus className="h-4 w-4 inline mr-2" />
                  Book Appointment
                </button>
                <button
                  onClick={() => setIsWaitlistOpen(true)}
                  className="w-full py-2.5 rounded-2xl border border-[#e6e9ef] hover:bg-[#f0f2f7] text-slate-700 font-bold text-xs transition-all"
                >
                  Join Waitlist
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Modals */}
        {provider && (
          <BookingModal
            provider={provider as Provider}
            isOpen={isBookingOpen}
            onClose={() => setIsBookingOpen(false)}
          />
        )}
        {provider && (
          <WaitlistSignup
            providerId={id!}
            providerName={providerName}
            isOpen={isWaitlistOpen}
            onClose={() => setIsWaitlistOpen(false)}
          />
        )}
      </div>
    </>
  );
};

export default ProviderDetail;
