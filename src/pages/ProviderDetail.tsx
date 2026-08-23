import { useParams, useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import {
  MapPin, Phone, Clock, Star, CalendarPlus, Video, Shield,
  Award, GraduationCap, Languages, Heart, CheckCircle,
  MessageSquare, Share2, Building2, Bell, Calculator
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ProviderReviews } from "@/components/reviews/ProviderReviews";
import { BookingModal } from "@/components/booking/BookingModal";
import { WaitlistSignup } from "@/components/booking/WaitlistSignup";
import { useState } from "react";
import { Provider } from "@/types/provider";
import { Skeleton } from "@/components/ui/skeleton";

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

  const { data: services } = useQuery({
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
  const reviewCount = stats?.total_reviews || 24;

  const providerName = `Dr. ${provider.first_name || ""} ${provider.last_name || ""}`.trim();
  const providerSpecialty = provider.specialty || "Healthcare Specialist";

  return (
    <>
      <Helmet>
        <title>{providerName} — {providerSpecialty} | Doc' O Clock</title>
      </Helmet>
      <div className="min-h-screen bg-[#f5f6f8] dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans pb-16">
        {/* Top Sticky Bar */}
        <div className="bg-white dark:bg-slate-900 border-b border-[#e6e9ef] dark:border-slate-800 px-4 sm:px-6 py-4 sticky top-0 z-30 shadow-2xs">
          <div className="max-w-[1400px] mx-auto flex items-center justify-between">
            <div>
              <h1 className="text-lg font-extrabold tracking-tight">{providerName}</h1>
              <p className="text-xs text-[#0073ea] font-bold">{providerSpecialty}</p>
            </div>
            <button
              onClick={() => setIsBookingOpen(true)}
              className="px-4 py-2 rounded-md bg-[#0073ea] hover:bg-[#0060c4] text-white font-extrabold text-xs shadow-xs transition-all flex items-center gap-1.5"
            >
              <CalendarPlus className="h-4 w-4" />
              <span>Book Appointment</span>
            </button>
          </div>
        </div>

        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 pt-6 space-y-6">
          {/* Hero Profile Banner */}
          <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-[#e6e9ef] dark:border-slate-800 shadow-xs flex flex-col md:flex-row gap-6">
            <div className="flex-shrink-0">
              {provider.avatar_url ? (
                <img
                  src={provider.avatar_url}
                  alt={providerName}
                  className="w-28 h-28 md:w-36 md:h-36 rounded-2xl object-cover border-2 border-[#0073ea]"
                />
              ) : (
                <div className="w-28 h-28 md:w-36 md:h-36 rounded-2xl bg-[#e5f0ff] text-[#0073ea] flex items-center justify-center text-3xl font-black border-2 border-[#0073ea]">
                  {provider.first_name?.[0]}{provider.last_name?.[0]}
                </div>
              )}
            </div>

            <div className="flex-1 space-y-3">
              <div>
                <h2 className="text-2xl font-extrabold text-slate-900 dark:text-slate-100">{providerName}</h2>
                <p className="text-sm text-[#0073ea] font-extrabold">{providerSpecialty}</p>
              </div>

              {/* Status Badges */}
              <div className="flex flex-wrap gap-2">
                <span className="inline-block px-3 py-1 rounded-full text-xs font-bold text-white bg-[#00c875]">
                  ✓ Verified Specialist
                </span>
                <span className="inline-block px-3 py-1 rounded-full text-xs font-bold text-white bg-[#fdab3d]">
                  ★ {rating.toFixed(1)} ({reviewCount} Reviews)
                </span>
                <span className="inline-block px-3 py-1 rounded-full text-xs font-bold text-white bg-[#579bfc]">
                  NHIMA Accredited
                </span>
              </div>

              <p className="text-xs text-[#676879] dark:text-slate-400 font-medium">
                {provider.bio || `${providerName} is a licensed healthcare practitioner with extensive experience in outpatient consultations, emergency triage, and telehealth.`}
              </p>
            </div>
          </div>
        </div>

        {/* Booking Modal */}
        {provider && (
          <BookingModal
            provider={provider as Provider}
            isOpen={isBookingOpen}
            onClose={() => setIsBookingOpen(false)}
          />
        )}
      </div>
    </>
  );
};

export default ProviderDetail;
