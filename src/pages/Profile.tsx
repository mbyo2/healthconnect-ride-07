import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Camera, Edit, Save, MapPin, Phone, Mail, User, ShieldCheck,
  GraduationCap, Award, DollarSign, Shield, Video, Home,
  Plus, X, Building2, Languages,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import { useSuccessFeedback } from "@/hooks/use-success-feedback";
import { supabase } from "@/integrations/supabase/client";
import { ProfileStats } from "@/components/ProfileStats";

// ── helpers ──────────────────────────────────────────────────────────────────

const PROVIDER_ROLES = [
  "health_personnel", "doctor", "nurse", "specialist", "pharmacist",
  "radiologist", "pathologist", "lab_technician", "phlebotomist",
];

const SUBSPECIALTY_OPTIONS = [
  "Cardiology", "Neurology", "Oncology", "Pediatrics", "Orthopedics",
  "Dermatology", "Psychiatry", "Gastroenterology", "Endocrinology",
  "Nephrology", "Pulmonology", "Rheumatology", "Urology", "Ophthalmology",
];

const LANGUAGE_OPTIONS = [
  "English", "Bemba", "Nyanja", "Tonga", "Lozi", "Lunda", "Kaonde", "Luvale",
];

const CERT_OPTIONS = [
  "HPCZ Certificate", "ACLS", "BLS", "PALS", "ATLS", "Fellow RCPCH",
  "Fellow ACS", "Diplome de Médecine", "MCh", "MS Surgery", "MD",
];

const INSURANCE_OPTIONS = [
  "NHIMA", "Prudential", "Madison", "Proflight", "Zim Insurance",
  "MetLife", "Old Mutual", "AXA", "BlueCross",
];

// ── component ─────────────────────────────────────────────────────────────────

const Profile = () => {
  const { user, profile } = useAuth();
  const { showSuccess } = useSuccessFeedback();

  const isProvider = PROVIDER_ROLES.includes(profile?.role || "");

  // — basic form —
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    firstName: profile?.first_name || "",
    lastName: profile?.last_name || "",
    email: user?.email || "",
    phone: profile?.phone || "",
    bio: profile?.bio || "",
    location: profile?.location || profile?.address || "",
  });

  // — provider professional form —
  const [provEditing, setProvEditing] = useState(false);
  const [provSaving, setProvSaving] = useState(false);
  const [provData, setProvData] = useState({
    medical_school: "",
    graduation_year: "",
    primary_practice_location: "",
    consultation_fee_min: "",
    consultation_fee_max: "",
    typical_wait_time: "",
    accepts_insurance: false,
    telemedicine_available: false,
    home_visits_available: false,
    subspecialties: [] as string[],
    board_certifications: [] as string[],
    languages_spoken: [] as string[],
    insurance_providers_accepted: [] as string[],
    affiliated_hospitals: [] as string[],
    newHospital: "",
  });

  // Load provider data once
  useEffect(() => {
    if (!user || !isProvider) return;
    supabase
      .from("profiles")
      .select(
        "medical_school, graduation_year, primary_practice_location, " +
        "consultation_fee_min, consultation_fee_max, typical_wait_time, " +
        "accepts_insurance, telemedicine_available, home_visits_available, " +
        "subspecialties, board_certifications, languages_spoken, " +
        "insurance_providers_accepted, affiliated_hospitals"
      )
      .eq("id", user.id)
      .single()
      .then(({ data }) => {
        if (!data) return;
        const d = data as any;
        setProvData(prev => ({
          ...prev,
          medical_school: d.medical_school || "",
          graduation_year: d.graduation_year ? String(d.graduation_year) : "",
          primary_practice_location: d.primary_practice_location || "",
          consultation_fee_min: d.consultation_fee_min ? String(d.consultation_fee_min) : "",
          consultation_fee_max: d.consultation_fee_max ? String(d.consultation_fee_max) : "",
          typical_wait_time: d.typical_wait_time || "",
          accepts_insurance: d.accepts_insurance ?? false,
          telemedicine_available: d.telemedicine_available ?? false,
          home_visits_available: d.home_visits_available ?? false,
          subspecialties: d.subspecialties || [],
          board_certifications: d.board_certifications || [],
          languages_spoken: d.languages_spoken || [],
          insurance_providers_accepted: d.insurance_providers_accepted || [],
          affiliated_hospitals: d.affiliated_hospitals || [],
        }));
      });
  }, [user, isProvider]);

  // — basic save —
  const handleSave = async () => {
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          first_name: formData.firstName,
          last_name: formData.lastName,
          phone: formData.phone,
          bio: formData.bio,
          address: formData.location,
        })
        .eq("id", user?.id);
      if (error) throw error;
      showSuccess({ message: "Profile updated successfully!" });
      setIsEditing(false);
    } catch (error) {
      console.error(error);
      toast.error("Failed to update profile");
    }
  };

  // — provider save —
  const handleProvSave = async () => {
    if (!user) return;
    setProvSaving(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          medical_school: provData.medical_school || null,
          graduation_year: provData.graduation_year ? parseInt(provData.graduation_year) : null,
          primary_practice_location: provData.primary_practice_location || null,
          consultation_fee_min: provData.consultation_fee_min ? parseFloat(provData.consultation_fee_min) : null,
          consultation_fee_max: provData.consultation_fee_max ? parseFloat(provData.consultation_fee_max) : null,
          typical_wait_time: provData.typical_wait_time || null,
          accepts_insurance: provData.accepts_insurance,
          telemedicine_available: provData.telemedicine_available,
          home_visits_available: provData.home_visits_available,
          subspecialties: provData.subspecialties,
          board_certifications: provData.board_certifications,
          languages_spoken: provData.languages_spoken,
          insurance_providers_accepted: provData.insurance_providers_accepted,
          affiliated_hospitals: provData.affiliated_hospitals,
        } as any)
        .eq("id", user.id);
      if (error) throw error;
      showSuccess({ message: "Practice details saved!" });
      setProvEditing(false);
    } catch (err) {
      console.error(err);
      toast.error("Failed to save practice details");
    } finally {
      setProvSaving(false);
    }
  };

  // — array toggle helpers —
  const toggleArr = (
    key: "subspecialties" | "board_certifications" | "languages_spoken" | "insurance_providers_accepted",
    value: string
  ) => {
    setProvData(prev => ({
      ...prev,
      [key]: prev[key].includes(value)
        ? prev[key].filter(v => v !== value)
        : [...prev[key], value],
    }));
  };

  const addHospital = () => {
    const h = provData.newHospital.trim();
    if (!h || provData.affiliated_hospitals.includes(h)) return;
    setProvData(prev => ({ ...prev, affiliated_hospitals: [...prev.affiliated_hospitals, h], newHospital: "" }));
  };

  const removeHospital = (h: string) =>
    setProvData(prev => ({ ...prev, affiliated_hospitals: prev.affiliated_hospitals.filter(x => x !== h) }));

  const handleInputChange = (field: string, value: string) =>
    setFormData(prev => ({ ...prev, [field]: value }));

  // ── render ──────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-canvas py-8 px-4 sm:px-6 font-sans">
      <div className="max-w-4xl mx-auto space-y-6">

        {/* ── Profile Header Card ── */}
        <div className="vf-card !p-8">
          <div className="flex flex-col sm:flex-row items-center gap-6 sm:gap-8">
            <div className="relative">
              <Avatar className="h-28 w-28 ring-4 ring-primary-500/20 shadow-card">
                <AvatarImage src={profile?.avatar_url || ""} />
                <AvatarFallback className="bg-primary-50 text-primary-500 text-2xl font-display font-medium">
                  {formData.firstName?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || "U"}
                </AvatarFallback>
              </Avatar>
              <button
                type="button"
                className="absolute -bottom-1 -right-1 h-9 w-9 rounded-full bg-primary-500 text-white flex items-center justify-center shadow-button hover:bg-primary-600 transition-transform active:scale-95"
                title="Change Photo"
              >
                <Camera className="h-4 w-4" />
              </button>
            </div>

            <div className="flex-1 text-center sm:text-left space-y-2">
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2.5">
                <h1 className="font-display text-3xl font-medium text-midnight tracking-tight">
                  {formData.firstName} {formData.lastName || "Account"}
                </h1>
                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-pill text-xs font-medium bg-success-50 text-success-500 border border-success-100">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  {isProvider ? "Verified Practitioner" : "Verified Patient"}
                </span>
              </div>
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-4 text-sm text-graphite-500">
                <span className="flex items-center gap-1.5">
                  <Mail className="h-4 w-4 text-primary-500" />
                  {formData.email}
                </span>
                {formData.phone && (
                  <span className="flex items-center gap-1.5">
                    <Phone className="h-4 w-4 text-primary-500" />
                    {formData.phone}
                  </span>
                )}
                {formData.location && (
                  <span className="flex items-center gap-1.5">
                    <MapPin className="h-4 w-4 text-primary-500" />
                    {formData.location}
                  </span>
                )}
              </div>
            </div>

            <Button
              onClick={() => isEditing ? handleSave() : setIsEditing(true)}
              className={`rounded-full px-6 h-11 text-xs font-extrabold shadow-sm transition-all ${
                isEditing
                  ? "bg-slate-900 hover:bg-black text-white"
                  : "bg-[#0073ea] hover:bg-[#0060c7] text-white"
              }`}
            >
              {isEditing ? <Save className="h-4 w-4 mr-2" /> : <Edit className="h-4 w-4 mr-2" />}
              {isEditing ? "Save Profile" : "Edit Details"}
            </Button>
          </div>
        </div>

        {/* ── Personal Info Form ── */}
        <div className="rounded-3xl border border-[#e6e9ef] dark:border-slate-800 bg-white dark:bg-slate-900 p-6 sm:p-8 shadow-sm space-y-6">
          <div className="border-b border-[#e6e9ef] dark:border-slate-800 pb-4">
            <h2 className="text-lg font-black text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <User className="h-5 w-5 text-[#0073ea]" />
              Personal &amp; Clinical Information
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Manage your personal information, emergency contact details, and clinical identity.
            </p>
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[
                { id: "firstName", label: "First Name" },
                { id: "lastName", label: "Last Name" },
              ].map(f => (
                <div key={f.id} className="space-y-1.5">
                  <Label htmlFor={f.id} className="text-xs font-extrabold text-slate-600 dark:text-slate-400 uppercase">{f.label}</Label>
                  <Input
                    id={f.id}
                    value={(formData as any)[f.id]}
                    onChange={e => handleInputChange(f.id, e.target.value)}
                    disabled={!isEditing}
                    className="h-11 rounded-2xl border-2 border-[#e6e9ef] dark:border-slate-800 bg-[#f5f7fa] dark:bg-slate-950 font-medium text-xs"
                  />
                </div>
              ))}
              <div className="space-y-1.5">
                <Label className="text-xs font-extrabold text-slate-600 dark:text-slate-400 uppercase">Email Address</Label>
                <Input value={formData.email} disabled className="h-11 rounded-2xl border-2 border-[#e6e9ef] dark:border-slate-800 bg-[#f5f7fa] dark:bg-slate-950 font-medium text-xs opacity-75" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="phone" className="text-xs font-extrabold text-slate-600 dark:text-slate-400 uppercase">Phone Number</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={e => handleInputChange("phone", e.target.value)}
                  disabled={!isEditing}
                  className="h-11 rounded-2xl border-2 border-[#e6e9ef] dark:border-slate-800 bg-[#f5f7fa] dark:bg-slate-950 font-medium text-xs"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="location" className="text-xs font-extrabold text-slate-600 dark:text-slate-400 uppercase">Address / Location</Label>
              <Input
                id="location"
                value={formData.location}
                onChange={e => handleInputChange("location", e.target.value)}
                disabled={!isEditing}
                className="h-11 rounded-2xl border-2 border-[#e6e9ef] dark:border-slate-800 bg-[#f5f7fa] dark:bg-slate-950 font-medium text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="bio" className="text-xs font-extrabold text-slate-600 dark:text-slate-400 uppercase">Bio / Clinical Background</Label>
              <Textarea
                id="bio"
                value={formData.bio}
                onChange={e => handleInputChange("bio", e.target.value)}
                disabled={!isEditing}
                rows={3}
                className="rounded-2xl border-2 border-[#e6e9ef] dark:border-slate-800 bg-[#f5f7fa] dark:bg-slate-950 font-medium text-xs resize-none"
              />
            </div>

            {isEditing && (
              <div className="flex gap-3 pt-4">
                <Button onClick={handleSave} className="flex-1 rounded-full h-11 bg-[#0073ea] hover:bg-[#0060c7] text-white font-extrabold text-xs">
                  <Save className="h-4 w-4 mr-2" /> Save Changes
                </Button>
                <Button variant="outline" onClick={() => setIsEditing(false)} className="flex-1 rounded-full h-11 border-2 font-extrabold text-xs">
                  Cancel
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* ── Provider Professional Details (health_personnel only) ── */}
        {isProvider && (
          <div className="rounded-3xl border border-[#e6e9ef] dark:border-slate-800 bg-white dark:bg-slate-900 p-6 sm:p-8 shadow-sm space-y-6">
            <div className="flex items-start justify-between border-b border-[#e6e9ef] dark:border-slate-800 pb-4">
              <div>
                <h2 className="text-lg font-black text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <GraduationCap className="h-5 w-5 text-[#0073ea]" />
                  My Practice &amp; Professional Details
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">Visible to patients on your public provider profile.</p>
              </div>
              <Button
                size="sm"
                onClick={() => provEditing ? handleProvSave() : setProvEditing(true)}
                disabled={provSaving}
                className={`rounded-full px-5 text-xs font-extrabold ${
                  provEditing ? "bg-slate-900 hover:bg-black text-white" : "bg-[#0073ea] hover:bg-[#0060c7] text-white"
                }`}
              >
                {provEditing
                  ? <><Save className="h-3.5 w-3.5 mr-1.5" />{provSaving ? "Saving…" : "Save"}</>
                  : <><Edit className="h-3.5 w-3.5 mr-1.5" />Edit</>
                }
              </Button>
            </div>

            <div className="space-y-6">

              {/* Education */}
              <section>
                <h3 className="text-xs font-extrabold uppercase text-[#676879] mb-3 flex items-center gap-1.5">
                  <GraduationCap className="h-4 w-4" /> Education
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-slate-500 uppercase">Medical School</Label>
                    <Input
                      value={provData.medical_school}
                      onChange={e => setProvData(p => ({ ...p, medical_school: e.target.value }))}
                      disabled={!provEditing}
                      placeholder="e.g. UNZA School of Medicine"
                      className="h-10 rounded-xl border border-[#e6e9ef] text-xs font-medium"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-slate-500 uppercase">Graduation Year</Label>
                    <Input
                      type="number"
                      min="1960"
                      max="2030"
                      value={provData.graduation_year}
                      onChange={e => setProvData(p => ({ ...p, graduation_year: e.target.value }))}
                      disabled={!provEditing}
                      placeholder="e.g. 2015"
                      className="h-10 rounded-xl border border-[#e6e9ef] text-xs font-medium"
                    />
                  </div>
                </div>
              </section>

              {/* Board Certifications */}
              <section>
                <h3 className="text-xs font-extrabold uppercase text-[#676879] mb-3 flex items-center gap-1.5">
                  <Award className="h-4 w-4" /> Board Certifications
                </h3>
                <div className="flex flex-wrap gap-2">
                  {CERT_OPTIONS.map(cert => (
                    <button
                      key={cert}
                      type="button"
                      disabled={!provEditing}
                      onClick={() => toggleArr("board_certifications", cert)}
                      className={`px-3 py-1 rounded-full text-xs font-bold border transition-all ${
                        provData.board_certifications.includes(cert)
                          ? "bg-[#0073ea] text-white border-[#0073ea]"
                          : "bg-white dark:bg-slate-800 border-[#e6e9ef] text-[#676879] hover:border-[#0073ea] hover:text-[#0073ea]"
                      } disabled:opacity-60 disabled:cursor-not-allowed`}
                    >
                      {cert}
                    </button>
                  ))}
                </div>
              </section>

              {/* Subspecialties */}
              <section>
                <h3 className="text-xs font-extrabold uppercase text-[#676879] mb-3 flex items-center gap-1.5">
                  <Shield className="h-4 w-4" /> Subspecialties
                </h3>
                <div className="flex flex-wrap gap-2">
                  {SUBSPECIALTY_OPTIONS.map(sub => (
                    <button
                      key={sub}
                      type="button"
                      disabled={!provEditing}
                      onClick={() => toggleArr("subspecialties", sub)}
                      className={`px-3 py-1 rounded-full text-xs font-bold border transition-all ${
                        provData.subspecialties.includes(sub)
                          ? "bg-[#a25ddc] text-white border-[#a25ddc]"
                          : "bg-white dark:bg-slate-800 border-[#e6e9ef] text-[#676879] hover:border-[#a25ddc] hover:text-[#a25ddc]"
                      } disabled:opacity-60 disabled:cursor-not-allowed`}
                    >
                      {sub}
                    </button>
                  ))}
                </div>
              </section>

              {/* Practice */}
              <section>
                <h3 className="text-xs font-extrabold uppercase text-[#676879] mb-3 flex items-center gap-1.5">
                  <MapPin className="h-4 w-4" /> Practice Details
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="sm:col-span-2 space-y-1.5">
                    <Label className="text-xs font-bold text-slate-500 uppercase">Primary Practice Location</Label>
                    <Input
                      value={provData.primary_practice_location}
                      onChange={e => setProvData(p => ({ ...p, primary_practice_location: e.target.value }))}
                      disabled={!provEditing}
                      placeholder="e.g. Woodlands Clinic, Lusaka"
                      className="h-10 rounded-xl border border-[#e6e9ef] text-xs font-medium"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-slate-500 uppercase">Avg. Wait Time</Label>
                    <Input
                      value={provData.typical_wait_time}
                      onChange={e => setProvData(p => ({ ...p, typical_wait_time: e.target.value }))}
                      disabled={!provEditing}
                      placeholder="e.g. 15 mins"
                      className="h-10 rounded-xl border border-[#e6e9ef] text-xs font-medium"
                    />
                  </div>
                </div>
              </section>

              {/* Affiliated Hospitals */}
              <section>
                <h3 className="text-xs font-extrabold uppercase text-[#676879] mb-3 flex items-center gap-1.5">
                  <Building2 className="h-4 w-4" /> Affiliated Hospitals
                </h3>
                <div className="flex flex-wrap gap-2 mb-3">
                  {provData.affiliated_hospitals.map(h => (
                    <Badge key={h} variant="secondary" className="gap-1 pr-1">
                      {h}
                      {provEditing && (
                        <button onClick={() => removeHospital(h)} className="ml-0.5 hover:text-destructive">
                          <X className="h-3 w-3" />
                        </button>
                      )}
                    </Badge>
                  ))}
                  {provData.affiliated_hospitals.length === 0 && (
                    <span className="text-xs text-[#676879]">None added yet</span>
                  )}
                </div>
                {provEditing && (
                  <div className="flex gap-2 max-w-sm">
                    <Input
                      value={provData.newHospital}
                      onChange={e => setProvData(p => ({ ...p, newHospital: e.target.value }))}
                      onKeyDown={e => e.key === "Enter" && (e.preventDefault(), addHospital())}
                      placeholder="Hospital name…"
                      className="h-9 rounded-xl border border-[#e6e9ef] text-xs"
                    />
                    <Button type="button" size="sm" onClick={addHospital} className="rounded-xl h-9 px-3">
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </section>

              {/* Fees */}
              <section>
                <h3 className="text-xs font-extrabold uppercase text-[#676879] mb-3 flex items-center gap-1.5">
                  <DollarSign className="h-4 w-4" /> Consultation Fees (ZMW)
                </h3>
                <div className="grid grid-cols-2 gap-4 max-w-xs">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-slate-500 uppercase">Min</Label>
                    <Input
                      type="number"
                      min="0"
                      value={provData.consultation_fee_min}
                      onChange={e => setProvData(p => ({ ...p, consultation_fee_min: e.target.value }))}
                      disabled={!provEditing}
                      placeholder="e.g. 200"
                      className="h-10 rounded-xl border border-[#e6e9ef] text-xs font-medium"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-slate-500 uppercase">Max</Label>
                    <Input
                      type="number"
                      min="0"
                      value={provData.consultation_fee_max}
                      onChange={e => setProvData(p => ({ ...p, consultation_fee_max: e.target.value }))}
                      disabled={!provEditing}
                      placeholder="e.g. 500"
                      className="h-10 rounded-xl border border-[#e6e9ef] text-xs font-medium"
                    />
                  </div>
                </div>
              </section>

              {/* Service toggles */}
              <section>
                <h3 className="text-xs font-extrabold uppercase text-[#676879] mb-3">Service Delivery</h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {([
                    { key: "telemedicine_available", icon: Video, label: "Telemedicine Available" },
                    { key: "home_visits_available", icon: Home, label: "Home Visits Available" },
                    { key: "accepts_insurance", icon: Shield, label: "Accepts Insurance" },
                  ] as const).map(item => (
                    <div key={item.key} className="flex items-center justify-between p-3 border border-[#e6e9ef] rounded-xl">
                      <div className="flex items-center gap-2 text-xs font-semibold">
                        <item.icon className="h-4 w-4 text-[#0073ea]" />
                        {item.label}
                      </div>
                      <Switch
                        checked={provData[item.key]}
                        disabled={!provEditing}
                        onCheckedChange={v => setProvData(p => ({ ...p, [item.key]: v }))}
                      />
                    </div>
                  ))}
                </div>
              </section>

              {/* Insurance */}
              {provData.accepts_insurance && (
                <section>
                  <h3 className="text-xs font-extrabold uppercase text-[#676879] mb-3 flex items-center gap-1.5">
                    <Shield className="h-4 w-4" /> Accepted Insurance Providers
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {INSURANCE_OPTIONS.map(ins => (
                      <button
                        key={ins}
                        type="button"
                        disabled={!provEditing}
                        onClick={() => toggleArr("insurance_providers_accepted", ins)}
                        className={`px-3 py-1 rounded-full text-xs font-bold border transition-all ${
                          provData.insurance_providers_accepted.includes(ins)
                            ? "bg-[#00c875] text-white border-[#00c875]"
                            : "bg-white dark:bg-slate-800 border-[#e6e9ef] text-[#676879] hover:border-[#00c875] hover:text-[#00c875]"
                        } disabled:opacity-60 disabled:cursor-not-allowed`}
                      >
                        {ins}
                      </button>
                    ))}
                  </div>
                </section>
              )}

              {/* Languages */}
              <section>
                <h3 className="text-xs font-extrabold uppercase text-[#676879] mb-3 flex items-center gap-1.5">
                  <Languages className="h-4 w-4" /> Languages Spoken
                </h3>
                <div className="flex flex-wrap gap-2">
                  {LANGUAGE_OPTIONS.map(lang => (
                    <button
                      key={lang}
                      type="button"
                      disabled={!provEditing}
                      onClick={() => toggleArr("languages_spoken", lang)}
                      className={`px-3 py-1 rounded-full text-xs font-bold border transition-all ${
                        provData.languages_spoken.includes(lang)
                          ? "bg-[#fdab3d] text-white border-[#fdab3d]"
                          : "bg-white dark:bg-slate-800 border-[#e6e9ef] text-[#676879] hover:border-[#fdab3d] hover:text-[#fdab3d]"
                      } disabled:opacity-60 disabled:cursor-not-allowed`}
                    >
                      {lang}
                    </button>
                  ))}
                </div>
              </section>

              {provEditing && (
                <div className="flex gap-3 pt-2">
                  <Button onClick={handleProvSave} disabled={provSaving} className="rounded-full h-11 px-8 bg-[#0073ea] hover:bg-[#0060c7] text-white font-extrabold text-xs">
                    <Save className="h-4 w-4 mr-2" />{provSaving ? "Saving…" : "Save Practice Details"}
                  </Button>
                  <Button variant="outline" onClick={() => setProvEditing(false)} className="rounded-full h-11 px-6 font-extrabold text-xs">
                    Cancel
                  </Button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Stats Widget ── */}
        <div className="rounded-3xl border border-[#e6e9ef] dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm">
          <ProfileStats userId={user?.id} />
        </div>
      </div>
    </div>
  );
};

export default Profile;
