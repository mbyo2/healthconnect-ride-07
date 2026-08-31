import { useNavigate } from "react-router-dom";
import { useState } from "react";
import {
  Search,
  Calendar,
  Sparkles,
  Star,
  CheckCircle2,
  ArrowRight,
  ChevronRight,
  HeartPulse,
  Clock,
  ShieldCheck,
  Video,
  MapPin,
  Pill,
  Bell,
  MoreVertical,
  ChevronLeft,
  Home,
  MessageSquare,
  User,
  Activity,
  Smile,
  Stethoscope
} from "lucide-react";
import { usePlatformStats, formatStat } from "@/hooks/usePlatformStats";

export const LandingHero = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCareMode, setActiveCareMode] = useState<"online" | "in-clinic">("online");
  const [selectedSpecialty, setSelectedSpecialty] = useState("Dentistry");
  const [selectedTimeSlot, setSelectedTimeSlot] = useState("9:00 a.m.");
  const [activeMobileScreen, setActiveMobileScreen] = useState<1 | 2 | 3>(2);

  const stats = usePlatformStats();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    navigate(searchQuery.trim() ? `/search?q=${encodeURIComponent(searchQuery.trim())}` : "/search");
  };

  return (
    <section className="bg-gradient-to-b from-[#0b101d] via-[#0f172a] to-[#090d18] text-white pt-28 pb-20 transition-colors overflow-hidden relative">
      {/* Background Soft Glow Blobs */}
      <div className="absolute top-16 left-1/2 -translate-x-1/2 w-[700px] h-[500px] bg-blue-600/15 blur-[140px] rounded-full pointer-events-none" />
      <div className="absolute top-96 -left-32 w-80 h-80 bg-sky-500/10 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute top-96 -right-32 w-80 h-80 bg-indigo-500/10 blur-[120px] rounded-full pointer-events-none" />

      <div className="mx-auto max-w-[1550px] px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Top Hero Headline Banner */}
        <div className="max-w-4xl mx-auto text-center mb-14">
          {/* Trust Pill Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-slate-900/90 border border-slate-700/80 text-xs font-bold text-sky-400 mb-6 shadow-xl backdrop-blur-md animate-in fade-in zoom-in-95">
            <Sparkles className="h-4 w-4 text-amber-400" />
            <span>✨ Zambia's #1 Rated Healthcare & Doctor Booking App</span>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
          </div>

          {/* Main Headline */}
          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-black tracking-tight leading-[1.1] font-sans">
            Connect with Your Doctor <br />
            <span className="bg-gradient-to-r from-sky-400 via-blue-400 to-indigo-300 bg-clip-text text-transparent">
              Anytime, Anywhere.
            </span>
          </h1>

          <p className="mt-5 text-base sm:text-lg text-slate-300 max-w-2xl mx-auto font-medium leading-relaxed">
            Get expert medical advice and care without leaving your home. Schedule virtual consultations, book clinic visits, receive digital prescriptions, and order medications — all in one app.
          </p>

          {/* Primary Action Buttons */}
          <div className="mt-8 flex flex-wrap justify-center items-center gap-4">
            <button
              onClick={() => navigate("/search")}
              className="px-8 py-4 rounded-full bg-blue-600 hover:bg-blue-500 text-white font-black text-sm sm:text-base shadow-xl shadow-blue-600/30 hover:scale-105 active:scale-95 transition-all flex items-center gap-2"
            >
              <Calendar className="h-5 w-5" />
              <span>Book an Appointment</span>
              <ArrowRight className="h-5 w-5" />
            </button>

            <button
              onClick={() => navigate("/video-dashboard")}
              className="px-7 py-4 rounded-full bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 font-extrabold text-sm sm:text-base shadow-lg transition-all hover:scale-105 flex items-center gap-2"
            >
              <Video className="h-5 w-5 text-sky-400" />
              <span>Start Video Consult ⚡</span>
            </button>
          </div>

          {/* Instant Search Bar */}
          <form
            onSubmit={handleSearch}
            className="mt-8 max-w-2xl mx-auto flex items-center gap-2 p-2 rounded-full bg-slate-900/90 border border-slate-700 shadow-2xl backdrop-blur-xl"
          >
            <div className="relative flex-1">
              <Search className="absolute left-4 top-3.5 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search doctors, specialties, clinics, conditions..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-11 pr-3 py-2 text-xs sm:text-sm font-medium bg-transparent text-white placeholder:text-slate-500 focus:outline-none"
              />
            </div>
            <button
              type="submit"
              className="px-6 py-2.5 rounded-full bg-blue-600 hover:bg-blue-500 text-white font-extrabold text-xs sm:text-sm shadow-md transition-all active:scale-95"
            >
              Find Care
            </button>
          </form>

          {/* Quick Specialty Filter Chips */}
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            {["General Practice", "Cardiology", "Dentistry", "Pediatrics", "Gynecology", "Dermatology", "Emergency"].map((spec) => (
              <button
                key={spec}
                onClick={() => navigate(`/search?specialty=${encodeURIComponent(spec)}`)}
                className="px-3.5 py-1.5 rounded-full bg-slate-900/80 border border-slate-800 text-xs font-semibold text-slate-300 hover:border-blue-500 hover:text-white transition-all shadow-xs"
              >
                {spec}
              </button>
            ))}
          </div>
        </div>

        {/* Mobile View Switcher (For Small Screens) */}
        <div className="lg:hidden flex justify-center items-center gap-2 mb-6">
          <button
            onClick={() => setActiveMobileScreen(1)}
            className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
              activeMobileScreen === 1
                ? "bg-blue-600 text-white shadow-md"
                : "bg-slate-900 text-slate-400 border border-slate-800"
            }`}
          >
            1. Welcome
          </button>
          <button
            onClick={() => setActiveMobileScreen(2)}
            className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
              activeMobileScreen === 2
                ? "bg-blue-600 text-white shadow-md"
                : "bg-slate-900 text-slate-400 border border-slate-800"
            }`}
          >
            2. Doctor Hub (Live)
          </button>
          <button
            onClick={() => setActiveMobileScreen(3)}
            className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
              activeMobileScreen === 3
                ? "bg-blue-600 text-white shadow-md"
                : "bg-slate-900 text-slate-400 border border-slate-800"
            }`}
          >
            3. Appointments
          </button>
        </div>

        {/* ─── 3-PHONE MOCKUP SHOWCASE (MATCHING ATTACHED PHOTO) ─── */}
        <div className="flex flex-col lg:flex-row items-center justify-center gap-6 lg:gap-8 max-w-6xl mx-auto">

          {/* ════════════ PHONE 1: ONBOARDING & WELCOME SCREEN ════════════ */}
          <div
            className={`w-full max-w-[340px] bg-[#f8fafc] text-slate-900 rounded-[44px] p-4 border-[6px] border-slate-800 shadow-2xl shadow-slate-950 flex flex-col justify-between h-[680px] transition-all duration-300 ${
              activeMobileScreen === 1 ? "block" : "hidden lg:flex"
            }`}
          >
            {/* Phone Top Notch & Status */}
            <div>
              <div className="flex items-center justify-between text-xs font-semibold px-4 pt-1 mb-3 text-slate-800">
                <span>9:41</span>
                <div className="w-20 h-4 bg-slate-900 rounded-full mx-auto" />
                <div className="flex items-center gap-1 text-[10px]">
                  <span>5G</span>
                  <span>100%</span>
                </div>
              </div>

              {/* Progress Bar & Skip */}
              <div className="flex items-center justify-between px-2 mb-4">
                <div className="flex gap-1 w-20">
                  <span className="h-1 w-8 bg-slate-900 rounded-full" />
                  <span className="h-1 w-4 bg-slate-300 rounded-full" />
                  <span className="h-1 w-4 bg-slate-300 rounded-full" />
                </div>
                <button onClick={() => navigate("/search")} className="text-xs text-slate-500 font-medium hover:text-slate-800">
                  Skip
                </button>
              </div>

              {/* Doctor Photo Card (Matching Image) */}
              <div className="rounded-3xl overflow-hidden bg-slate-200 mb-6 shadow-inner relative h-64">
                <img
                  src="https://images.unsplash.com/photo-1594824813566-88855ce78905?auto=format&fit=crop&w=600&q=85"
                  alt="Doctor smiling"
                  className="w-full h-full object-cover object-top"
                />
                <div className="absolute top-3 right-3 px-2.5 py-1 rounded-full bg-white/90 text-slate-900 text-[10px] font-bold shadow-sm backdrop-blur-sm flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span>Verified MD</span>
                </div>
              </div>

              {/* Onboarding Headline & Body */}
              <div className="px-2 space-y-2">
                <h3 className="text-xl font-black text-slate-900 leading-snug">
                  Connect with Your Doctor Anytime, Anywhere
                </h3>
                <p className="text-xs text-slate-500 leading-relaxed font-medium">
                  Get expert medical advice and care without leaving your home. Schedule virtual consultations, receive prescriptions, and track your health — all in one app.
                </p>
              </div>
            </div>

            {/* Bottom Continue Button */}
            <div className="px-2 pb-2">
              <button
                onClick={() => navigate("/search")}
                className="w-full py-3.5 rounded-2xl bg-[#0f172a] hover:bg-slate-800 text-white font-bold text-sm shadow-md transition-all active:scale-[0.98] flex items-center justify-center gap-2"
              >
                <span>Continue</span>
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* ════════════ PHONE 2: MAIN HOME & DOCTOR CARE HUB (CENTERPIECE) ════════════ */}
          <div
            className={`w-full max-w-[350px] bg-[#f8fafc] text-slate-900 rounded-[44px] p-4 border-[6px] border-slate-700 shadow-2xl shadow-blue-900/30 flex flex-col justify-between h-[700px] ring-4 ring-blue-500/20 transition-all duration-300 relative ${
              activeMobileScreen === 2 ? "block" : "hidden lg:flex"
            }`}
          >
            <div>
              {/* Phone Status & Header */}
              <div className="flex items-center justify-between text-xs font-semibold px-4 pt-1 mb-2 text-slate-800">
                <span>9:41</span>
                <div className="w-20 h-4 bg-slate-900 rounded-full mx-auto" />
                <div className="flex items-center gap-1 text-[10px]">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                </div>
              </div>

              {/* Date & Notification Bell */}
              <div className="flex items-center justify-between px-2 mb-3">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-xl bg-white shadow-xs border border-slate-200">
                    <Calendar className="h-3.5 w-3.5 text-slate-600" />
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 font-medium block">Today</span>
                    <span className="text-xs font-black text-slate-900">October 18, 2025</span>
                  </div>
                </div>
                <div className="p-2 rounded-full bg-white shadow-xs border border-slate-200 relative cursor-pointer">
                  <Bell className="h-3.5 w-3.5 text-slate-600" />
                  <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-rose-500" />
                </div>
              </div>

              {/* Online / In-Clinic Mode Switcher Pill */}
              <div className="p-1 rounded-2xl bg-slate-200/80 flex items-center mb-3">
                <button
                  onClick={() => setActiveCareMode("online")}
                  className={`w-1/2 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    activeCareMode === "online"
                      ? "bg-white text-blue-600 shadow-sm"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  Online
                </button>
                <button
                  onClick={() => setActiveCareMode("in-clinic")}
                  className={`w-1/2 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    activeCareMode === "in-clinic"
                      ? "bg-white text-blue-600 shadow-sm"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  Offline / Clinic
                </button>
              </div>

              {/* Next Appointment Alert Banner (Navy Card) */}
              <div
                onClick={() => navigate("/appointments")}
                className="p-3.5 rounded-2xl bg-[#0f172a] text-white flex items-center justify-between mb-4 shadow-lg cursor-pointer hover:bg-slate-800 transition-colors"
              >
                <div>
                  <span className="text-[10px] text-slate-400 block font-medium">Your next appointment</span>
                  <div className="text-xs font-black text-white flex items-center gap-1.5 mt-0.5">
                    <span>October 22, 10:00 AM</span>
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  </div>
                </div>
                <div className="h-7 w-7 rounded-full bg-white/10 flex items-center justify-center text-white">
                  <ChevronRight className="h-4 w-4" />
                </div>
              </div>

              {/* Specialties Section with Minimalist Icons */}
              <div className="mb-3">
                <div className="flex items-center justify-between mb-2 px-1">
                  <span className="text-xs font-black text-slate-900">Specialties</span>
                  <button onClick={() => navigate("/search")} className="text-[11px] text-slate-500 font-medium hover:text-blue-600">
                    View all &gt;
                  </button>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  {[
                    { label: "Dentistry", icon: "🦷", active: true },
                    { label: "Cardiology", icon: "🫀", active: false },
                    { label: "Pediatrics", icon: "👶", active: false },
                  ].map((s) => (
                    <button
                      key={s.label}
                      onClick={() => setSelectedSpecialty(s.label)}
                      className={`p-2.5 rounded-2xl border text-center transition-all ${
                        selectedSpecialty === s.label
                          ? "bg-white border-blue-500 shadow-md ring-2 ring-blue-500/20"
                          : "bg-white border-slate-200 hover:border-slate-300 shadow-xs"
                      }`}
                    >
                      <span className="text-lg block mb-1">{s.icon}</span>
                      <span className="text-[10px] font-bold text-slate-800 block truncate">{s.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Doctors Card with Time Slot Selector */}
              <div>
                <div className="flex items-center justify-between mb-2 px-1">
                  <span className="text-xs font-black text-slate-900">Doctors</span>
                  <button onClick={() => navigate("/search")} className="text-[11px] text-slate-500 font-medium hover:text-blue-600">
                    View all &gt;
                  </button>
                </div>

                <div className="p-3 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-2.5">
                  <div className="flex items-center gap-3">
                    <img
                      src="https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&w=150&q=80"
                      alt="Dr Aysha Hayes"
                      className="h-11 w-11 rounded-2xl object-cover"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-black text-slate-900 truncate">Dr. Aysha Hayes</span>
                        <span className="text-[10px] font-bold text-amber-500 flex items-center gap-0.5">
                          ★ 4.8
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-500 truncate">Dentist • 5 years exp • Online</p>
                    </div>
                  </div>

                  {/* Interactive Time Slot Pills */}
                  <div className="flex items-center gap-1.5 pt-1">
                    {["8:00 a.m.", "9:00 a.m.", "10:00 a.m."].map((time) => (
                      <button
                        key={time}
                        onClick={() => setSelectedTimeSlot(time)}
                        className={`flex-1 py-1 rounded-xl text-[10px] font-bold transition-all ${
                          selectedTimeSlot === time
                            ? "bg-[#0f172a] text-white shadow-xs"
                            : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                        }`}
                      >
                        {time}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Floating Navigation Pill */}
            <div className="p-2 rounded-2xl bg-white border border-slate-200 shadow-md flex items-center justify-around">
              <button className="p-1.5 text-blue-600"><Home className="h-4 w-4" /></button>
              <button onClick={() => navigate("/appointments")} className="p-1.5 text-slate-400 hover:text-slate-800"><Calendar className="h-4 w-4" /></button>
              <button onClick={() => navigate("/chat")} className="p-1.5 text-slate-400 hover:text-slate-800"><MessageSquare className="h-4 w-4" /></button>
              <button onClick={() => navigate("/profile")} className="p-1.5 text-slate-400 hover:text-slate-800"><User className="h-4 w-4" /></button>
            </div>
          </div>

          {/* ════════════ PHONE 3: MY APPOINTMENTS & PRESCRIPTIONS SCREEN ════════════ */}
          <div
            className={`w-full max-w-[340px] bg-[#f8fafc] text-slate-900 rounded-[44px] p-4 border-[6px] border-slate-800 shadow-2xl shadow-slate-950 flex flex-col justify-between h-[680px] transition-all duration-300 ${
              activeMobileScreen === 3 ? "block" : "hidden lg:flex"
            }`}
          >
            <div>
              {/* Phone Status */}
              <div className="flex items-center justify-between text-xs font-semibold px-4 pt-1 mb-2 text-slate-800">
                <span>9:41</span>
                <div className="w-20 h-4 bg-slate-900 rounded-full mx-auto" />
                <div className="flex items-center gap-1 text-[10px]">
                  <span>100%</span>
                </div>
              </div>

              {/* Title Header with Back and Menu */}
              <div className="flex items-center justify-between px-2 mb-3">
                <button className="p-1.5 rounded-full bg-white border border-slate-200 text-slate-700">
                  <ChevronLeft className="h-3.5 w-3.5" />
                </button>
                <h4 className="text-xs font-black text-slate-900">My appointments</h4>
                <button className="p-1.5 rounded-full bg-white border border-slate-200 text-slate-700">
                  <MoreVertical className="h-3.5 w-3.5" />
                </button>
              </div>

              {/* New Prescription Alert Banner */}
              <div className="p-3 rounded-2xl bg-[#0f172a] text-white flex items-center justify-between mb-3 shadow-md">
                <div>
                  <span className="text-[10px] text-slate-400 font-medium">You've received</span>
                  <div className="text-xs font-black text-white">1 new prescription</div>
                </div>
                <button
                  onClick={() => navigate("/prescriptions")}
                  className="px-3 py-1 rounded-xl bg-white/20 hover:bg-white/30 text-white text-[10px] font-bold"
                >
                  View
                </button>
              </div>

              {/* Upcoming Appointments List */}
              <div className="space-y-2 mb-3">
                <div className="flex items-center justify-between px-1">
                  <span className="text-xs font-black text-slate-900 flex items-center gap-1">
                    <span>Upcoming</span>
                    <span className="px-1.5 py-0.2 rounded-full bg-slate-200 text-slate-700 text-[10px] font-bold">2</span>
                  </span>
                </div>

                {/* Appointment Card 1 */}
                <div className="p-3 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-2">
                  <div className="text-[10px] text-slate-400 font-medium">Lusaka Clinic • October 22, 10:00 a.m.</div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <img
                        src="https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&w=100&q=80"
                        alt="Aysha Hayes"
                        className="h-8 w-8 rounded-xl object-cover"
                      />
                      <div>
                        <div className="text-xs font-black text-slate-900">Dr. Aysha Hayes</div>
                        <div className="text-[10px] text-slate-500">Dentist</div>
                      </div>
                    </div>
                    <button
                      onClick={() => navigate("/appointments")}
                      className="px-2.5 py-1 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] font-bold"
                    >
                      Change
                    </button>
                  </div>
                </div>

                {/* Appointment Card 2 */}
                <div className="p-3 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-2">
                  <div className="text-[10px] text-slate-400 font-medium">Video Consult • October 24, 02:00 p.m.</div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <img
                        src="https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&w=100&q=80"
                        alt="Hari Monroe"
                        className="h-8 w-8 rounded-xl object-cover"
                      />
                      <div>
                        <div className="text-xs font-black text-slate-900">Dr. Hari Monroe</div>
                        <div className="text-[10px] text-slate-500">Ophthalmologist</div>
                      </div>
                    </div>
                    <button
                      onClick={() => navigate("/video-dashboard")}
                      className="px-2.5 py-1 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-[10px] font-bold"
                    >
                      Join
                    </button>
                  </div>
                </div>
              </div>

              {/* Past Consultations */}
              <div>
                <div className="flex items-center justify-between px-1 mb-1.5">
                  <span className="text-xs font-black text-slate-900 flex items-center gap-1">
                    <span>Past</span>
                    <span className="px-1.5 py-0.2 rounded-full bg-slate-200 text-slate-700 text-[10px] font-bold">12</span>
                  </span>
                  <button onClick={() => navigate("/appointments")} className="text-[10px] text-slate-500">View all &gt;</button>
                </div>
                <div className="p-2.5 rounded-2xl bg-white border border-slate-200 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <img
                      src="https://images.unsplash.com/photo-1594824813566-88855ce78905?auto=format&fit=crop&w=100&q=80"
                      alt="Dr. Sarah"
                      className="h-7 w-7 rounded-lg object-cover"
                    />
                    <div>
                      <div className="text-[11px] font-bold text-slate-900">Dr. Sarah Jenkins</div>
                      <div className="text-[9px] text-slate-400">October 10 • Completed</div>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 rounded-full bg-slate-900 text-white text-[10px] font-bold">
                    ZMW K350
                  </span>
                </div>
              </div>
            </div>

            {/* Bottom Floating Navigation Pill */}
            <div className="p-2 rounded-2xl bg-white border border-slate-200 shadow-md flex items-center justify-around">
              <button onClick={() => navigate("/")} className="p-1.5 text-slate-400 hover:text-slate-800"><Home className="h-4 w-4" /></button>
              <button className="p-1.5 text-blue-600"><Calendar className="h-4 w-4" /></button>
              <button onClick={() => navigate("/chat")} className="p-1.5 text-slate-400 hover:text-slate-800"><MessageSquare className="h-4 w-4" /></button>
              <button onClick={() => navigate("/profile")} className="p-1.5 text-slate-400 hover:text-slate-800"><User className="h-4 w-4" /></button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
