import { useState, useEffect } from "react";
import { Helmet } from "react-helmet-async";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Eye, EyeOff, ArrowLeft, Building2, User, Stethoscope, ChevronRight, ShieldCheck } from "lucide-react";
import { LoadingScreen } from "@/components/LoadingScreen";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { supabase } from "@/integrations/supabase/client";
import { AnimatedButton } from "@/components/ui/animated-button";
import { useFeedbackSystem } from "@/hooks/use-feedback-system";
import { ForgotPasswordDialog } from "@/components/auth/ForgotPasswordDialog";
import { safeRedirectTarget } from "@/utils/pendingAction";

const loginSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

const patientSchema = z.object({
  firstName: z.string().min(2, "Required"),
  lastName: z.string().min(2, "Required"),
  email: z.string().email("Valid email required"),
  phone: z.string().optional(),
  password: z.string().min(6, "Min 6 characters"),
  confirmPassword: z.string().min(6),
  termsAccepted: z.boolean().refine((value) => value, "You must accept the Terms and Conditions to continue"),
}).refine((d) => d.password === d.confirmPassword, { message: "Passwords don't match", path: ["confirmPassword"] });

const providerSchema = z.object({
  firstName: z.string().min(2, "Required"),
  lastName: z.string().min(2, "Required"),
  email: z.string().email("Valid email required"),
  phone: z.string().optional(),
  providerType: z.string().min(1, "Select your profession"),
  specialty: z.string().optional(),
  licenseNumber: z.string().min(2, "License number required"),
  yearsExperience: z.string().optional(),
  password: z.string().min(6, "Min 6 characters"),
  confirmPassword: z.string().min(6),
  termsAccepted: z.boolean().refine((value) => value, "You must accept the Terms and Conditions to continue"),
}).refine((d) => d.password === d.confirmPassword, { message: "Passwords don't match", path: ["confirmPassword"] });

const businessSchema = z.object({
  businessName: z.string().min(2, "Business name required"),
  businessType: z.string().min(1, "Select business type"),
  adminFirstName: z.string().min(2, "Required"),
  adminLastName: z.string().min(2, "Required"),
  email: z.string().email("Valid email required"),
  phone: z.string().optional(),
  city: z.string().min(2, "City required"),
  country: z.string().min(2, "Country required"),
  licenseNumber: z.string().optional(),
  password: z.string().min(6, "Min 6 characters"),
  confirmPassword: z.string().min(6),
  termsAccepted: z.boolean().refine((value) => value, "You must accept the Terms and Conditions to continue"),
}).refine((d) => d.password === d.confirmPassword, { message: "Passwords don't match", path: ["confirmPassword"] });

// Static fallbacks so public signup never renders empty dropdowns
// (e.g. when reference tables are empty or RLS blocks anon reads at launch).
// Full workforce taxonomy (HPCZ / NMCZ cadres) — mirrors the provider_types
// seed migration so signup works identically with or without DB rows.
const FALLBACK_PROVIDER_TYPES: Array<{ value: string; label: string }> = [
  { value: "doctor", label: "Doctor (Medical Officer / GP)" },
  { value: "specialist", label: "Specialist / Consultant" },
  { value: "medical_licentiate", label: "Medical Licentiate Practitioner" },
  { value: "clinical_officer", label: "Clinical Officer" },
  { value: "dentist", label: "Dentist (Dental Surgeon)" },
  { value: "dental_therapist", label: "Dental Therapist / Hygienist" },
  { value: "registered_nurse", label: "Registered Nurse (RN)" },
  { value: "enrolled_nurse", label: "Enrolled Nurse (EN)" },
  { value: "midwife", label: "Midwife (RM / EM)" },
  { value: "nurse", label: "Nurse (General)" },
  { value: "pharmacist", label: "Pharmacist" },
  { value: "pharmacy_technologist", label: "Pharmacy Technologist / Dispenser" },
  { value: "radiologist", label: "Radiologist" },
  { value: "radiographer", label: "Radiographer / Imaging Technologist" },
  { value: "pathologist", label: "Pathologist" },
  { value: "lab_technician", label: "Lab Technician / Technologist" },
  { value: "physiotherapist", label: "Physiotherapist" },
  { value: "occupational_therapist", label: "Occupational Therapist" },
  { value: "nutritionist", label: "Nutritionist / Dietician" },
  { value: "optometrist", label: "Optometrist / Optician" },
  { value: "psychologist", label: "Clinical Psychologist" },
  { value: "environmental_health_officer", label: "Environmental Health Officer" },
  { value: "community_health_worker", label: "Community Health Worker" },
  { value: "traditional_practitioner", label: "Traditional Health Practitioner" },
  { value: "health_personnel", label: "Other Health Professional" },
];
// Facility taxonomy (MOH Zambia pyramid + private + ZAMRA) — mirrors the
// institution_types seed migration.
const FALLBACK_BUSINESS_TYPES: Array<{ value: string; label: string }> = [
  { value: "health_post", label: "Health Post" },
  { value: "rural_health_centre", label: "Rural Health Centre" },
  { value: "urban_health_centre", label: "Urban Health Centre" },
  { value: "mini_hospital", label: "Mini Hospital" },
  { value: "district_hospital", label: "District Hospital (First-Level)" },
  { value: "provincial_hospital", label: "Provincial Hospital (Second-Level)" },
  { value: "tertiary_hospital", label: "Tertiary / Teaching Hospital" },
  { value: "maternity_hospital", label: "Maternity Hospital" },
  { value: "children_hospital", label: "Children's Hospital" },
  { value: "mental_hospital", label: "Mental Health Hospital" },
  { value: "cancer_hospital", label: "Cancer Hospital" },
  { value: "cardiac_hospital", label: "Cardiac Hospital" },
  { value: "eye_hospital", label: "Eye Hospital" },
  { value: "dialysis_centre", label: "Dialysis Centre" },
  { value: "clinic", label: "Clinic / Small Practice" },
  { value: "specialty_clinic", label: "Specialty Clinic" },
  { value: "dental_clinic", label: "Dental Clinic" },
  { value: "eye_clinic", label: "Eye Clinic" },
  { value: "physiotherapy_centre", label: "Physiotherapy Centre" },
  { value: "hospital", label: "Private Hospital" },
  { value: "retail_pharmacy", label: "Retail / Community Pharmacy" },
  { value: "hospital_pharmacy", label: "Hospital Pharmacy" },
  { value: "wholesale_pharmacy", label: "Wholesale Pharmacy / Distributor" },
  { value: "health_shop", label: "Health Shop" },
  { value: "laboratory", label: "Medical Laboratory" },
  { value: "imaging_centre", label: "Imaging / Radiology Centre" },
  { value: "diagnostic_centre", label: "Diagnostic Centre (Lab + Imaging)" },
  { value: "blood_bank", label: "Blood Bank" },
  { value: "nursing_home", label: "Nursing / Care Home" },
  { value: "hospice", label: "Hospice / Palliative Care" },
  { value: "home_care", label: "Home-Based Care Service" },
  { value: "rehabilitation_centre", label: "Rehabilitation Centre" },
];
const FALLBACK_COUNTRIES: Array<{ value: string; label: string; dialCode: string }> = [
  { value: "ZM", label: "Zambia", dialCode: "+260" },
];
// In the offline fallback every regulated cadre requires a licence number;
// traditional/other practitioners are registered, not licenced.
const FALLBACK_PROVIDER_TYPES_WITH_LICENCE = FALLBACK_PROVIDER_TYPES.map((t) => ({
  ...t,
  requiresLicense: t.value !== "traditional_practitioner" && t.value !== "health_personnel",
}));

// Specialty taxonomy — mirrors clinic_specialty_catalog so signup works
// identically with or without DB rows. The live list is DB-driven.
const FALLBACK_SPECIALTIES: Array<{ value: string; label: string }> = [
  "Allergy & Immunology", "Anesthesiology", "Cardiology", "Critical Care",
  "Dental Care", "Dermatology / Skin Care", "Emergency Medicine",
  "Endocrinology & Diabetes", "ENT (Ear Nose Throat)", "Family Medicine",
  "Fertility & Reproductive Medicine", "Gastroenterology", "General Practice",
  "General Surgery", "Geriatric Medicine", "Gynecology / Women Health",
  "Hematology", "Infectious Diseases", "Internal Medicine",
  "Laboratory Services", "Mental Health / Counseling", "Neonatology",
  "Nephrology", "Neurology", "Neurosurgery", "Nuclear Medicine", "Oncology",
  "Oral & Maxillofacial Surgery", "Optician / Eye Care", "Orthopedics",
  "Pediatric Surgery", "Pediatrics", "Physiotherapy", "Plastic & Reconstructive Surgery",
  "Podiatry", "Pulmonology", "Radiology / Imaging", "Rheumatology",
  "Sleep Medicine", "Sports Medicine", "Thoracic Surgery", "Urology",
  "Vascular Surgery", "Colorectal Surgery", "Wound Care", "Occupational Medicine",
].map((name) => ({ value: name, label: name }));

type SignupPath = null | "patient" | "provider" | "business";

interface TermsAcceptanceProps {
  checked: boolean;
  error?: string;
  onChange: (checked: boolean) => void;
}

const TermsAcceptance = ({ checked, error, onChange }: TermsAcceptanceProps) => (
  <div>
    <label className="flex cursor-pointer items-start gap-2 rounded-xl border border-canvas-silk bg-canvas-bone p-3 text-sm leading-relaxed text-graphite-600">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="mt-0.5 h-4 w-4 shrink-0 rounded border-canvas-silk accent-primary-500"
      />
      <span>
        I agree to the <Link to="/terms" className="font-medium text-primary-500 hover:underline">Terms of Service</Link> and <Link to="/privacy" className="font-medium text-primary-500 hover:underline">Privacy Policy</Link>.
      </span>
    </label>
    {error && <p className="mt-1 text-xs font-medium text-error-500">{error}</p>}
  </div>
);

export const Auth = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [localLoading, setLocalLoading] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(searchParams.get("tab") || "signin");
  const pathParam = searchParams.get("path") as SignupPath;
  const [signupPath, setSignupPath] = useState<SignupPath>(pathParam || null);
  const [showPassword, setShowPassword] = useState(false);
  const { showSuccess, showError } = useFeedbackSystem();
  const [providerTypes, setProviderTypes] = useState<Array<{ value: string; label: string; requiresLicense?: boolean }>>([]);
  const [businessTypes, setBusinessTypes] = useState<Array<{ value: string; label: string }>>([]);
  const [specialties, setSpecialties] = useState<Array<{ value: string; label: string }>>([]);
  const [countries, setCountries] = useState<Array<{ value: string; label: string; dialCode: string }>>([]);

  const redirectParam = searchParams.get("redirect");
  // safeRedirectTarget rejects protocol-relative (//evil) and scheme URLs.
  const redirectTo = safeRedirectTarget(redirectParam);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      // replace: so the back button never lands back on the login screen
      if (data.session?.user) navigate(redirectTo, { replace: true });
      setAuthLoading(false);
    });
  }, [navigate, redirectTo]);

  useEffect(() => {
    const fetchDynamicData = async () => {
      try {
        const [providerTypesRes, businessTypesRes, countriesRes, specialtiesRes] = await Promise.all([
          supabase.from("provider_types").select("code, name, requires_license").eq("is_active", true).order("display_order"),
          supabase.from("institution_types").select("code, name").eq("is_active", true).order("display_order"),
          supabase.from("countries").select("code, name, dial_code").eq("is_active", true).order("name"),
          supabase.from("clinic_specialty_catalog").select("name").eq("is_active", true).order("name"),
        ]);

        if (providerTypesRes.data && providerTypesRes.data.length > 0) {
          setProviderTypes(providerTypesRes.data.map((t) => ({ value: t.code, label: t.name, requiresLicense: !!(t as any).requires_license })));
        } else {
          setProviderTypes(FALLBACK_PROVIDER_TYPES_WITH_LICENCE);
        }
        if (businessTypesRes.data && businessTypesRes.data.length > 0) {
          setBusinessTypes(businessTypesRes.data.map((t) => ({ value: t.code, label: t.name })));
        } else {
          setBusinessTypes(FALLBACK_BUSINESS_TYPES);
        }
        if (countriesRes.data && countriesRes.data.length > 0) {
          setCountries(countriesRes.data.map((c) => ({ value: c.code, label: `${(c as any).flag_emoji ?? ''} ${c.name}`.trim(), dialCode: c.dial_code })));
        } else {
          setCountries(FALLBACK_COUNTRIES);
        }
        if (specialtiesRes.data && specialtiesRes.data.length > 0) {
          setSpecialties(specialtiesRes.data.map((s) => ({ value: s.name, label: s.name })));
        } else {
          setSpecialties(FALLBACK_SPECIALTIES);
        }
      } catch (error) {
        console.error("Error fetching dynamic data:", error);
        setProviderTypes((prev) => (prev.length > 0 ? prev : FALLBACK_PROVIDER_TYPES_WITH_LICENCE));
        setBusinessTypes((prev) => (prev.length > 0 ? prev : FALLBACK_BUSINESS_TYPES));
        setCountries((prev) => (prev.length > 0 ? prev : FALLBACK_COUNTRIES));
        setSpecialties((prev) => (prev.length > 0 ? prev : FALLBACK_SPECIALTIES));
      }
    };

    fetchDynamicData();
  }, []);

  const loginForm = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: searchParams.get("email") || "", password: "" },
  });
  const patientForm = useForm<z.infer<typeof patientSchema>>({ resolver: zodResolver(patientSchema), mode: "onBlur", defaultValues: { termsAccepted: false } });
  const providerForm = useForm<z.infer<typeof providerSchema>>({ resolver: zodResolver(providerSchema), mode: "onBlur", defaultValues: { termsAccepted: false } });
  const businessForm = useForm<z.infer<typeof businessSchema>>({ resolver: zodResolver(businessSchema), mode: "onBlur", defaultValues: { termsAccepted: false } });

  const onLogin = async (data: z.infer<typeof loginSchema>) => {
    setLocalLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email: data.email, password: data.password });
    if (error) showError(error.message);
    else navigate(redirectTo, { replace: true });
    setLocalLoading(false);
  };

  // Email verification must land back on /auth WITH the redirect param,
  // otherwise a brand-new user loses the flow they came from.
  const verifyRedirect = `${window.location.origin}/auth?redirect=${encodeURIComponent(redirectTo)}`;

  const onPatientSignup = async (data: z.infer<typeof patientSchema>) => {
    setLocalLoading(true);
    const { error } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
      options: {
        emailRedirectTo: verifyRedirect,
        data: {
          first_name: data.firstName,
          last_name: data.lastName,
          phone: data.phone,
          role: "patient",
        },
      },
    });
    if (error) showError(error.message);
    else { showSuccess("Account created! Check your email to verify."); setActiveTab("signin"); }
    setLocalLoading(false);
  };

  const onProviderSignup = async (data: z.infer<typeof providerSchema>) => {
    setLocalLoading(true);
    // The profession choice is enforced: regulated cadres must supply a
    // licence/registration number (requires_license in provider_types).
    const chosenProfession = providerTypes.find((t) => t.value === data.providerType);
    if (chosenProfession?.requiresLicense && !data.licenseNumber?.trim()) {
      showError(`A licence / registration number is required for ${chosenProfession.label}.`);
      setLocalLoading(false);
      return;
    }
    const { error } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
      options: {
        emailRedirectTo: verifyRedirect,
        data: {
          first_name: data.firstName,
          last_name: data.lastName,
          phone: data.phone,
          role: data.providerType,
          specialty: data.specialty || data.providerType,
          license_number: data.licenseNumber,
          years_experience: data.yearsExperience ? parseInt(data.yearsExperience) : 0,
        },
      },
    });
    if (error) showError(error.message);
    else { showSuccess("Account created! Your application is under review."); setActiveTab("signin"); }
    setLocalLoading(false);
  };

  const onBusinessSignup = async (data: z.infer<typeof businessSchema>) => {
    setLocalLoading(true);
    // Map the facility type to its account role (mirrors
    // institutionTypeToRole in facilityProfiles.ts).
    const bt = data.businessType.toLowerCase();
    const role = bt.includes('wholesale') ? 'wholesale_pharmacy'
      : bt.includes('pharm') || bt.includes('drug') || bt.includes('dispensary') || bt === 'health_shop' ? 'pharmacy'
      : bt.includes('lab') || bt.includes('blood_bank') ? 'lab'
      : bt.includes('imaging') || bt.includes('radiolog') || bt.includes('diagnostic') ? 'lab'
      : 'institution_admin';
    const { error } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
      options: {
        emailRedirectTo: verifyRedirect,
        data: {
          first_name: data.adminFirstName,
          last_name: data.adminLastName,
          phone: data.phone,
          role,
          business_name: data.businessName,
          business_type: data.businessType,
          city: data.city,
          country: data.country,
          license_number: data.licenseNumber,
        },
      },
    });
    if (error) showError(error.message);
    else { showSuccess("Business registered! Account under review."); setActiveTab("signin"); }
    setLocalLoading(false);
  };

  if (authLoading) return <LoadingScreen timeout={1000} />;

  const SignupPathSelector = () => (
    <div className="space-y-3 font-sans">
      <p className="text-sm font-medium text-graphite-500 text-center mb-4">Select Account Type</p>
      {[
        { path: "patient" as SignupPath, icon: <User className="h-5 w-5 text-primary-500" />, title: "Patient Account", desc: "Book appointments, view medical records, and consult AI" },
        { path: "provider" as SignupPath, icon: <Stethoscope className="h-5 w-5 text-success-500" />, title: "Healthcare Professional", desc: "Doctors, Nurses, Pharmacists, Lab Techs & Specialists" },
        { path: "business" as SignupPath, icon: <Building2 className="h-5 w-5 text-accent-500" />, title: "Healthcare Institution", desc: "Pharmacies, Clinics, Hospitals, Laboratories & Care Homes" },
      ].map((item) => (
        <button
          key={item.path}
          onClick={() => setSignupPath(item.path)}
          className="w-full flex items-center gap-3 p-4 rounded-xl border border-canvas-silk bg-canvas-bone hover:bg-primary-50 hover:border-primary-200 transition-all text-left group"
        >
          <div className="p-2.5 rounded-xl bg-white border border-canvas-silk shadow-sm">
            {item.icon}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-sm text-midnight">{item.title}</p>
            <p className="text-xs text-graphite-500 font-medium">{item.desc}</p>
          </div>
          <ChevronRight className="h-4 w-4 text-graphite-400 group-hover:text-primary-500 transition-colors" />
        </button>
      ))}
    </div>
  );

  return (
    <>
      <Helmet>
        <title>Sign In or Register | Doc' O Clock Zambia</title>
        <meta
          name="description"
          content="Sign in or create your Doc' O Clock account to book doctors, join video consultations, and manage prescriptions across Zambia."
        />
        <meta name="robots" content="noindex, nofollow" />
        <link rel="canonical" href="https://doc0clock.online/auth" />
      </Helmet>
    <div className="min-h-screen bg-canvas flex items-center justify-center p-4 font-sans text-midnight">
      <div className="w-full max-w-md space-y-6 py-8">
        <div className="text-center space-y-2">
          <Link to="/" className="mx-auto inline-flex flex-col items-center">
            <img src="/d0c-icon.svg" className="h-14 w-14 mb-1" alt="Doc' O Clock" />
            <h1 className="font-display text-3xl font-medium text-midnight tracking-tight">Doc' O Clock</h1>
          </Link>
          <p className="text-sm text-graphite-500 font-medium tracking-wide">Enterprise Healthcare Platform</p>
        </div>

        <div className="vf-card !p-6 shadow-card">
          <Tabs value={activeTab} onValueChange={(v) => { setActiveTab(v); setSignupPath(null); }}>
            <TabsList className="grid w-full grid-cols-2 mb-6 p-1 bg-canvas-bone rounded-xl border border-canvas-silk">
              <TabsTrigger value="signin" className="text-sm font-medium py-2 rounded-lg data-[state=active]:bg-primary-500 data-[state=active]:text-white transition-all">
                Sign In
              </TabsTrigger>
              <TabsTrigger value="signup" className="text-sm font-medium py-2 rounded-lg data-[state=active]:bg-primary-500 data-[state=active]:text-white transition-all">
                Register
              </TabsTrigger>
            </TabsList>

            {/* ---- SIGN IN ---- */}
            <TabsContent value="signin">
              <Form {...loginForm}>
                <form onSubmit={loginForm.handleSubmit(onLogin)} className="space-y-4">
                  <FormField control={loginForm.control} name="email" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium text-graphite-600">Email Address</FormLabel>
                      <FormControl><Input placeholder="you@example.online" {...field} type="email" autoComplete="email" className="h-11 text-sm font-medium border-canvas-silk focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20" /></FormControl>
                      <FormMessage className="text-xs font-medium text-error-500" />
                    </FormItem>
                  )} />
                  <FormField control={loginForm.control} name="password" render={({ field }) => (
                    <FormItem>
                      <div className="flex items-center justify-between">
                        <FormLabel className="text-sm font-medium text-graphite-600">Password</FormLabel>
                        <ForgotPasswordDialog />
                      </div>
                      <FormControl>
                        <div className="relative">
                          <Input type={showPassword ? "text" : "password"} placeholder="••••••••" autoComplete="current-password" {...field} className="h-11 text-sm font-medium border-canvas-silk focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 pr-10" />
                          <button type="button" onClick={() => setShowPassword(!showPassword)}
                            aria-label={showPassword ? "Hide password" : "Show password"}
                            aria-pressed={showPassword}
                            className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-md text-graphite-400 hover:text-midnight">
                            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                      </FormControl>
                      <FormMessage className="text-xs font-medium text-error-500" />
                    </FormItem>
                  )} />
                  <button type="submit" disabled={localLoading} className="vf-btn-primary w-full h-12 text-sm">
                    {localLoading ? "Signing In..." : "Sign In"}
                  </button>
                </form>
              </Form>
            </TabsContent>

            {/* ---- SIGN UP ---- */}
            <TabsContent value="signup">
              {!signupPath && <SignupPathSelector />}

              {signupPath && (
                <button onClick={() => setSignupPath(null)}
                  className="flex items-center gap-1 text-xs font-bold text-primary-500 hover:underline mb-4">
                  <ArrowLeft className="h-3.5 w-3.5" /> Back to account options
                </button>
              )}

              {/* Patient Form */}
              {signupPath === "patient" && (
                <div className="space-y-4">
                  <p className="text-xs font-extrabold text-primary-500 uppercase tracking-wide">Patient Account Options</p>
                  <Link to="/patient-registration" className="block w-full py-3 rounded-xl bg-primary-500 hover:bg-primary-600 text-white font-extrabold text-sm shadow-md transition-all text-center">
                    Full Registration with Onboarding
                  </Link>
                  <div className="text-center text-xs text-graphite-500 dark:text-slate-400 font-medium">or quick signup</div>
                  <Form {...patientForm}>
                    <form onSubmit={patientForm.handleSubmit(onPatientSignup)} className="space-y-3">
                      <div className="grid grid-cols-2 gap-2">
                        <FormField control={patientForm.control} name="firstName" render={({ field }) => (
                          <FormItem><FormLabel className="text-xs font-extrabold text-graphite-500 dark:text-slate-400 uppercase">First Name</FormLabel><FormControl><Input {...field} className="h-9 text-xs border-graphite-300 dark:border-slate-700" /></FormControl><FormMessage /></FormItem>
                        )} />
                        <FormField control={patientForm.control} name="lastName" render={({ field }) => (
                          <FormItem><FormLabel className="text-xs font-extrabold text-graphite-500 dark:text-slate-400 uppercase">Last Name</FormLabel><FormControl><Input {...field} className="h-9 text-xs border-graphite-300 dark:border-slate-700" /></FormControl><FormMessage /></FormItem>
                        )} />
                      </div>
                      <FormField control={patientForm.control} name="email" render={({ field }) => (
                        <FormItem><FormLabel className="text-xs font-extrabold text-graphite-500 dark:text-slate-400 uppercase">Email</FormLabel><FormControl><Input {...field} type="email" className="h-9 text-xs border-graphite-300 dark:border-slate-700" /></FormControl><FormMessage /></FormItem>
                      )} />
                      <FormField control={patientForm.control} name="phone" render={({ field }) => (
                        <FormItem><FormLabel className="text-xs font-extrabold text-graphite-500 dark:text-slate-400 uppercase">Phone</FormLabel><FormControl><Input {...field} type="tel" placeholder="+260..." className="h-9 text-xs border-graphite-300 dark:border-slate-700" /></FormControl></FormItem>
                      )} />
                      <FormField control={patientForm.control} name="password" render={({ field }) => (
                        <FormItem><FormLabel className="text-xs font-extrabold text-graphite-500 dark:text-slate-400 uppercase">Password</FormLabel><FormControl><Input type="password" autoComplete="new-password" {...field} className="h-9 text-xs border-graphite-300 dark:border-slate-700" /></FormControl><FormMessage /></FormItem>
                      )} />
                      <FormField control={patientForm.control} name="confirmPassword" render={({ field }) => (
                        <FormItem><FormLabel className="text-xs font-extrabold text-graphite-500 dark:text-slate-400 uppercase">Confirm Password</FormLabel><FormControl><Input type="password" autoComplete="new-password" {...field} className="h-9 text-xs border-graphite-300 dark:border-slate-700" /></FormControl><FormMessage /></FormItem>
                      )} />
                      <TermsAcceptance checked={patientForm.watch("termsAccepted")} onChange={(checked) => patientForm.setValue("termsAccepted", checked, { shouldValidate: true })} error={patientForm.formState.errors.termsAccepted?.message} />
                      <button type="submit" disabled={localLoading} className="w-full py-3 rounded-xl bg-primary-500 hover:bg-primary-600 text-white font-extrabold text-sm shadow-md transition-all">
                        Quick Sign Up
                      </button>
                    </form>
                  </Form>
                </div>
              )}

              {/* Provider Form */}
              {signupPath === "provider" && (
                <Form {...providerForm}>
                  <form onSubmit={providerForm.handleSubmit(onProviderSignup)} className="space-y-3">
                    <p className="text-xs font-extrabold text-success-500 uppercase tracking-wide">Healthcare Professional Registration</p>
                    <div className="grid grid-cols-2 gap-2">
                      <FormField control={providerForm.control} name="firstName" render={({ field }) => (
                        <FormItem><FormLabel className="text-xs font-extrabold text-graphite-500 dark:text-slate-400 uppercase">First Name</FormLabel><FormControl><Input {...field} className="h-9 text-xs border-graphite-300 dark:border-slate-700" /></FormControl><FormMessage /></FormItem>
                      )} />
                      <FormField control={providerForm.control} name="lastName" render={({ field }) => (
                        <FormItem><FormLabel className="text-xs font-extrabold text-graphite-500 dark:text-slate-400 uppercase">Last Name</FormLabel><FormControl><Input {...field} className="h-9 text-xs border-graphite-300 dark:border-slate-700" /></FormControl><FormMessage /></FormItem>
                      )} />
                    </div>
                    <FormField control={providerForm.control} name="providerType" render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs font-extrabold text-graphite-500 dark:text-slate-400 uppercase">Profession</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl><SelectTrigger className="h-9 border-graphite-300 dark:border-slate-700 text-xs font-bold"><SelectValue placeholder="Select profession" /></SelectTrigger></FormControl>
                          <SelectContent>
                            {providerTypes.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={providerForm.control} name="specialty" render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs font-extrabold text-graphite-500 dark:text-slate-400 uppercase">Specialty</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl><SelectTrigger className="h-9 border-graphite-300 dark:border-slate-700 text-xs font-bold"><SelectValue placeholder="Select specialty (optional)" /></SelectTrigger></FormControl>
                          <SelectContent>
                            {specialties.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={providerForm.control} name="licenseNumber" render={({ field }) => {
                      const prof = providerTypes.find((t) => t.value === providerForm.watch("providerType"));
                      return (
                        <FormItem>
                          <FormLabel className="text-xs font-extrabold text-graphite-500 dark:text-slate-400 uppercase">
                            License / Reg. Number{prof?.requiresLicense ? " *" : ""}
                          </FormLabel>
                          <FormControl><Input {...field} className="h-9 text-xs border-graphite-300 dark:border-slate-700" /></FormControl>
                          {prof?.requiresLicense && (
                            <p className="text-[10px] text-graphite-400">Required for {prof.label} — verified during application review.</p>
                          )}
                          <FormMessage />
                        </FormItem>
                      );
                    }} />
                    <FormField control={providerForm.control} name="email" render={({ field }) => (
                      <FormItem><FormLabel className="text-xs font-extrabold text-graphite-500 dark:text-slate-400 uppercase">Email</FormLabel><FormControl><Input {...field} type="email" className="h-9 text-xs border-graphite-300 dark:border-slate-700" /></FormControl><FormMessage /></FormItem>
                    )} />
                    <FormField control={providerForm.control} name="password" render={({ field }) => (
                      <FormItem><FormLabel className="text-xs font-extrabold text-graphite-500 dark:text-slate-400 uppercase">Password</FormLabel><FormControl><Input type="password" autoComplete="new-password" {...field} className="h-9 text-xs border-graphite-300 dark:border-slate-700" /></FormControl><FormMessage /></FormItem>
                    )} />
                    <FormField control={providerForm.control} name="confirmPassword" render={({ field }) => (
                      <FormItem><FormLabel className="text-xs font-extrabold text-graphite-500 dark:text-slate-400 uppercase">Confirm Password</FormLabel><FormControl><Input type="password" autoComplete="new-password" {...field} className="h-9 text-xs border-graphite-300 dark:border-slate-700" /></FormControl><FormMessage /></FormItem>
                    )} />
                    <TermsAcceptance checked={providerForm.watch("termsAccepted")} onChange={(checked) => providerForm.setValue("termsAccepted", checked, { shouldValidate: true })} error={providerForm.formState.errors.termsAccepted?.message} />
                    <button type="submit" disabled={localLoading} className="w-full py-3 rounded-xl bg-success-500 hover:bg-success-500 text-white font-extrabold text-sm shadow-md transition-all">
                      Create Professional Account
                    </button>
                  </form>
                </Form>
              )}

              {/* Business Form */}
              {signupPath === "business" && (
                <Form {...businessForm}>
                  <form onSubmit={businessForm.handleSubmit(onBusinessSignup)} className="space-y-3">
                    <p className="text-xs font-extrabold text-purple-500 uppercase tracking-wide">Healthcare Facility Registration</p>
                    <FormField control={businessForm.control} name="businessType" render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs font-extrabold text-graphite-500 dark:text-slate-400 uppercase">Facility Type</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl><SelectTrigger className="h-9 border-graphite-300 dark:border-slate-700 text-xs font-bold"><SelectValue placeholder="Facility type" /></SelectTrigger></FormControl>
                          <SelectContent>
                            {businessTypes.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={businessForm.control} name="businessName" render={({ field }) => (
                      <FormItem><FormLabel className="text-xs font-extrabold text-graphite-500 dark:text-slate-400 uppercase">Facility Name</FormLabel><FormControl><Input {...field} placeholder="e.g. MedPharm Healthcare" className="h-9 text-xs border-graphite-300 dark:border-slate-700" /></FormControl><FormMessage /></FormItem>
                    )} />
                    <div className="grid grid-cols-2 gap-2">
                      <FormField control={businessForm.control} name="adminFirstName" render={({ field }) => (
                        <FormItem><FormLabel className="text-xs font-extrabold text-graphite-500 dark:text-slate-400 uppercase">Admin First Name</FormLabel><FormControl><Input {...field} className="h-9 text-xs border-graphite-300 dark:border-slate-700" /></FormControl><FormMessage /></FormItem>
                      )} />
                      <FormField control={businessForm.control} name="adminLastName" render={({ field }) => (
                        <FormItem><FormLabel className="text-xs font-extrabold text-graphite-500 dark:text-slate-400 uppercase">Admin Last Name</FormLabel><FormControl><Input {...field} className="h-9 text-xs border-graphite-300 dark:border-slate-700" /></FormControl><FormMessage /></FormItem>
                      )} />
                    </div>
                    <FormField control={businessForm.control} name="email" render={({ field }) => (
                      <FormItem><FormLabel className="text-xs font-extrabold text-graphite-500 dark:text-slate-400 uppercase">Facility Email</FormLabel><FormControl><Input {...field} type="email" className="h-9 text-xs border-graphite-300 dark:border-slate-700" /></FormControl><FormMessage /></FormItem>
                    )} />
                    <div className="grid grid-cols-2 gap-2">
                      <FormField control={businessForm.control} name="city" render={({ field }) => (
                        <FormItem><FormLabel className="text-xs font-extrabold text-graphite-500 dark:text-slate-400 uppercase">City</FormLabel><FormControl><Input {...field} className="h-9 text-xs border-graphite-300 dark:border-slate-700" /></FormControl><FormMessage /></FormItem>
                      )} />
                      <FormField control={businessForm.control} name="country" render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs font-extrabold text-graphite-500 dark:text-slate-400 uppercase">Country</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl><SelectTrigger className="h-9 border-graphite-300 dark:border-slate-700 text-xs"><SelectValue placeholder="Select country" /></SelectTrigger></FormControl>
                            <SelectContent>
                              {countries.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )} />
                    </div>
                    <FormField control={businessForm.control} name="password" render={({ field }) => (
                      <FormItem><FormLabel className="text-xs font-extrabold text-graphite-500 dark:text-slate-400 uppercase">Password</FormLabel><FormControl><Input type="password" autoComplete="new-password" {...field} className="h-9 text-xs border-graphite-300 dark:border-slate-700" /></FormControl><FormMessage /></FormItem>
                    )} />
                    <FormField control={businessForm.control} name="confirmPassword" render={({ field }) => (
                      <FormItem><FormLabel className="text-xs font-extrabold text-graphite-500 dark:text-slate-400 uppercase">Confirm Password</FormLabel><FormControl><Input type="password" autoComplete="new-password" {...field} className="h-9 text-xs border-graphite-300 dark:border-slate-700" /></FormControl><FormMessage /></FormItem>
                    )} />
                    <TermsAcceptance checked={businessForm.watch("termsAccepted")} onChange={(checked) => businessForm.setValue("termsAccepted", checked, { shouldValidate: true })} error={businessForm.formState.errors.termsAccepted?.message} />
                    <button type="submit" disabled={localLoading} className="w-full py-3 rounded-xl bg-purple-500 hover:bg-purple-600 text-white font-extrabold text-sm shadow-md transition-all">
                      Register Business
                    </button>
                  </form>
                </Form>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
    </>
  );
};

export default Auth;
