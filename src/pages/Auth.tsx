import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Eye, EyeOff, ArrowLeft, Building2, User, Stethoscope, ChevronRight } from "lucide-react";
import { LoadingScreen } from "@/components/LoadingScreen";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
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

// ---------- Schemas ----------
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
}).refine(d => d.password === d.confirmPassword, { message: "Passwords don't match", path: ["confirmPassword"] });

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
}).refine(d => d.password === d.confirmPassword, { message: "Passwords don't match", path: ["confirmPassword"] });

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
}).refine(d => d.password === d.confirmPassword, { message: "Passwords don't match", path: ["confirmPassword"] });

// ---------- Constants ----------
const PROVIDER_TYPES = [
  { value: "doctor", label: "Doctor" },
  { value: "nurse", label: "Nurse" },
  { value: "pharmacist", label: "Pharmacist" },
  { value: "lab_technician", label: "Lab Technician" },
  { value: "radiologist", label: "Radiologist" },
  { value: "health_personnel", label: "Other Health Professional" },
];

const BUSINESS_TYPES = [
  { value: "pharmacy", label: "Pharmacy" },
  { value: "clinic", label: "Clinic / Small Practice" },
  { value: "specialized_clinic", label: "Specialized Clinic" },
  { value: "hospital", label: "Hospital" },
  { value: "large_hospital", label: "Large / Teaching Hospital" },
  { value: "laboratory", label: "Laboratory" },
  { value: "nursing_home", label: "Nursing / Care Home" },
  { value: "diagnostic_center", label: "Diagnostic / Imaging Center" },
];

type SignupPath = null | 'patient' | 'provider' | 'business';

export const Auth = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [localLoading, setLocalLoading] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(searchParams.get("tab") || "signin");
  const [signupPath, setSignupPath] = useState<SignupPath>(null);
  const [showPassword, setShowPassword] = useState(false);
  const { showSuccess, showError } = useFeedbackSystem();

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session?.user) navigate("/dashboard");
      setAuthLoading(false);
    });
  }, [navigate]);

  const loginForm = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });
  const patientForm = useForm<z.infer<typeof patientSchema>>({ resolver: zodResolver(patientSchema), mode: "onBlur" });
  const providerForm = useForm<z.infer<typeof providerSchema>>({ resolver: zodResolver(providerSchema), mode: "onBlur" });
  const businessForm = useForm<z.infer<typeof businessSchema>>({ resolver: zodResolver(businessSchema), mode: "onBlur" });

  // ---------- Handlers ----------
  const onLogin = async (data: z.infer<typeof loginSchema>) => {
    setLocalLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email: data.email, password: data.password });
    if (error) showError(error.message);
    else navigate("/home");
    setLocalLoading(false);
  };

  const onPatientSignup = async (data: z.infer<typeof patientSchema>) => {
    setLocalLoading(true);
    const { error } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
      options: {
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
    const { error } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
      options: {
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
    else { showSuccess("Account created! Your application is under review. Check your email to verify."); setActiveTab("signin"); }
    setLocalLoading(false);
  };

  const onBusinessSignup = async (data: z.infer<typeof businessSchema>) => {
    setLocalLoading(true);
    const role = data.businessType === 'pharmacy' ? 'pharmacy'
      : data.businessType === 'laboratory' ? 'lab'
      : 'institution_admin';
    const { error } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
      options: {
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
    else { showSuccess("Business registered! Your account is under review. Check your email to verify."); setActiveTab("signin"); }
    setLocalLoading(false);
  };

  if (authLoading) return <LoadingScreen timeout={1000} />;

  // ---------- Signup Path Selector ----------
  const SignupPathSelector = () => (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground text-center mb-4">What best describes you?</p>
      {[
        { path: 'patient' as SignupPath, icon: <User className="h-5 w-5" />, title: "Patient", desc: "Book appointments, track health, access records" },
        { path: 'provider' as SignupPath, icon: <Stethoscope className="h-5 w-5" />, title: "Healthcare Professional", desc: "Doctor, nurse, pharmacist, lab tech, etc." },
        { path: 'business' as SignupPath, icon: <Building2 className="h-5 w-5" />, title: "Healthcare Business", desc: "Pharmacy, clinic, hospital, lab, etc." },
      ].map(item => (
        <button
          key={item.path}
          onClick={() => setSignupPath(item.path)}
          className="w-full flex items-center gap-3 p-4 rounded-lg border border-border hover:border-primary/50 hover:bg-primary/5 transition-all text-left group"
        >
          <div className="p-2 rounded-lg bg-primary/10 text-primary group-hover:bg-primary/20 transition-colors">
            {item.icon}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-sm">{item.title}</p>
            <p className="text-xs text-muted-foreground">{item.desc}</p>
          </div>
          <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
        </button>
      ))}
    </div>
  );

  // ---------- Render ----------
  return (
    <div className="min-h-[100dvh] bg-gradient-to-b from-background to-muted flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      <div className="w-full max-w-md space-y-4 py-8">
        <div className="text-center space-y-2">
          <img src="/d0c-icon.svg" className="h-16 w-16 mx-auto mb-2" alt="Logo" />
          <h1 className="text-2xl font-bold text-primary">Doc' O Clock</h1>
          <p className="text-xs text-muted-foreground">Healthcare for Everyone</p>
        </div>

        <Card className="p-4 shadow-xl border-t-4 border-t-primary">
          <Tabs value={activeTab} onValueChange={(v) => { setActiveTab(v); setSignupPath(null); }}>
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="signin">Sign In</TabsTrigger>
              <TabsTrigger value="signup">Register</TabsTrigger>
            </TabsList>

            {/* ---- SIGN IN ---- */}
            <TabsContent value="signin" className="animate-in fade-in duration-300">
              <Form {...loginForm}>
                <form onSubmit={loginForm.handleSubmit(onLogin)} className="space-y-4">
                  <FormField control={loginForm.control} name="email" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl><Input placeholder="Email" {...field} type="email" /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={loginForm.control} name="password" render={({ field }) => (
                    <FormItem>
                      <div className="flex items-center justify-between">
                        <FormLabel>Password</FormLabel>
                        <ForgotPasswordDialog />
                      </div>
                      <FormControl>
                        <div className="relative">
                          <Input type={showPassword ? "text" : "password"} placeholder="Password" {...field} />
                          <button type="button" onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <AnimatedButton type="submit" className="w-full h-12" loading={localLoading}>Sign In</AnimatedButton>
                </form>
              </Form>
            </TabsContent>

            {/* ---- SIGN UP ---- */}
            <TabsContent value="signup" className="animate-in fade-in duration-300">
              {!signupPath && <SignupPathSelector />}

              {signupPath && (
                <button onClick={() => setSignupPath(null)}
                  className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground mb-4 transition-colors">
                  <ArrowLeft className="h-3 w-3" /> Back to options
                </button>
              )}

              {/* Patient Form */}
              {signupPath === 'patient' && (
                <Form {...patientForm}>
                  <form onSubmit={patientForm.handleSubmit(onPatientSignup)} className="space-y-3">
                    <p className="text-xs font-semibold text-primary uppercase tracking-wide">Patient Registration</p>
                    <div className="grid grid-cols-2 gap-2">
                      <FormField control={patientForm.control} name="firstName" render={({ field }) => (
                        <FormItem><FormLabel className="text-xs">First Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                      )} />
                      <FormField control={patientForm.control} name="lastName" render={({ field }) => (
                        <FormItem><FormLabel className="text-xs">Last Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                      )} />
                    </div>
                    <FormField control={patientForm.control} name="email" render={({ field }) => (
                      <FormItem><FormLabel className="text-xs">Email</FormLabel><FormControl><Input {...field} type="email" /></FormControl><FormMessage /></FormItem>
                    )} />
                    <FormField control={patientForm.control} name="phone" render={({ field }) => (
                      <FormItem><FormLabel className="text-xs">Phone (optional)</FormLabel><FormControl><Input {...field} type="tel" placeholder="+260..." /></FormControl></FormItem>
                    )} />
                    <FormField control={patientForm.control} name="password" render={({ field }) => (
                      <FormItem><FormLabel className="text-xs">Password</FormLabel><FormControl><Input type="password" {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                    <FormField control={patientForm.control} name="confirmPassword" render={({ field }) => (
                      <FormItem><FormLabel className="text-xs">Confirm Password</FormLabel><FormControl><Input type="password" {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                    <p className="text-[10px] text-muted-foreground">✨ Free forever — you only pay for consultations</p>
                    <AnimatedButton type="submit" className="w-full h-12" loading={localLoading}>Create Patient Account</AnimatedButton>
                  </form>
                </Form>
              )}

              {/* Provider Form */}
              {signupPath === 'provider' && (
                <Form {...providerForm}>
                  <form onSubmit={providerForm.handleSubmit(onProviderSignup)} className="space-y-3">
                    <p className="text-xs font-semibold text-primary uppercase tracking-wide">Professional Registration</p>
                    <div className="grid grid-cols-2 gap-2">
                      <FormField control={providerForm.control} name="firstName" render={({ field }) => (
                        <FormItem><FormLabel className="text-xs">First Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                      )} />
                      <FormField control={providerForm.control} name="lastName" render={({ field }) => (
                        <FormItem><FormLabel className="text-xs">Last Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                      )} />
                    </div>
                    <FormField control={providerForm.control} name="providerType" render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs">I am a...</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl><SelectTrigger><SelectValue placeholder="Select your profession" /></SelectTrigger></FormControl>
                          <SelectContent>
                            {PROVIDER_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={providerForm.control} name="specialty" render={({ field }) => (
                      <FormItem><FormLabel className="text-xs">Specialty (optional)</FormLabel><FormControl><Input {...field} placeholder="e.g. Cardiology, Pediatrics" /></FormControl></FormItem>
                    )} />
                    <div className="grid grid-cols-2 gap-2">
                      <FormField control={providerForm.control} name="licenseNumber" render={({ field }) => (
                        <FormItem><FormLabel className="text-xs">License / Reg. Number</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                      )} />
                      <FormField control={providerForm.control} name="yearsExperience" render={({ field }) => (
                        <FormItem><FormLabel className="text-xs">Years Experience</FormLabel><FormControl><Input {...field} type="number" min="0" placeholder="e.g. 5" /></FormControl></FormItem>
                      )} />
                    </div>
                    <FormField control={providerForm.control} name="email" render={({ field }) => (
                      <FormItem><FormLabel className="text-xs">Email</FormLabel><FormControl><Input {...field} type="email" /></FormControl><FormMessage /></FormItem>
                    )} />
                    <FormField control={providerForm.control} name="phone" render={({ field }) => (
                      <FormItem><FormLabel className="text-xs">Phone (optional)</FormLabel><FormControl><Input {...field} type="tel" placeholder="+260..." /></FormControl></FormItem>
                    )} />
                    <FormField control={providerForm.control} name="password" render={({ field }) => (
                      <FormItem><FormLabel className="text-xs">Password</FormLabel><FormControl><Input type="password" {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                    <FormField control={providerForm.control} name="confirmPassword" render={({ field }) => (
                      <FormItem><FormLabel className="text-xs">Confirm Password</FormLabel><FormControl><Input type="password" {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                    <p className="text-[10px] text-muted-foreground">💼 Free listing — pay only per new patient booking</p>
                    <AnimatedButton type="submit" className="w-full h-12" loading={localLoading}>Create Professional Account</AnimatedButton>
                  </form>
                </Form>
              )}

              {/* Business Form */}
              {signupPath === 'business' && (
                <Form {...businessForm}>
                  <form onSubmit={businessForm.handleSubmit(onBusinessSignup)} className="space-y-3">
                    <p className="text-xs font-semibold text-primary uppercase tracking-wide">Business Registration</p>
                    <FormField control={businessForm.control} name="businessType" render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs">Business Type</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl><SelectTrigger><SelectValue placeholder="What type of facility?" /></SelectTrigger></FormControl>
                          <SelectContent>
                            {BUSINESS_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={businessForm.control} name="businessName" render={({ field }) => (
                      <FormItem><FormLabel className="text-xs">Business Name</FormLabel><FormControl><Input {...field} placeholder="e.g. MedPharm Pharmacy" /></FormControl><FormMessage /></FormItem>
                    )} />
                    <div className="grid grid-cols-2 gap-2">
                      <FormField control={businessForm.control} name="adminFirstName" render={({ field }) => (
                        <FormItem><FormLabel className="text-xs">Admin First Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                      )} />
                      <FormField control={businessForm.control} name="adminLastName" render={({ field }) => (
                        <FormItem><FormLabel className="text-xs">Admin Last Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                      )} />
                    </div>
                    <FormField control={businessForm.control} name="email" render={({ field }) => (
                      <FormItem><FormLabel className="text-xs">Business Email</FormLabel><FormControl><Input {...field} type="email" /></FormControl><FormMessage /></FormItem>
                    )} />
                    <FormField control={businessForm.control} name="phone" render={({ field }) => (
                      <FormItem><FormLabel className="text-xs">Phone (optional)</FormLabel><FormControl><Input {...field} type="tel" placeholder="+260..." /></FormControl></FormItem>
                    )} />
                    <div className="grid grid-cols-2 gap-2">
                      <FormField control={businessForm.control} name="city" render={({ field }) => (
                        <FormItem><FormLabel className="text-xs">City</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                      )} />
                      <FormField control={businessForm.control} name="country" render={({ field }) => (
                        <FormItem><FormLabel className="text-xs">Country</FormLabel><FormControl><Input {...field} defaultValue="Zambia" /></FormControl><FormMessage /></FormItem>
                      )} />
                    </div>
                    <FormField control={businessForm.control} name="licenseNumber" render={({ field }) => (
                      <FormItem><FormLabel className="text-xs">License Number (optional)</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>
                    )} />
                    <FormField control={businessForm.control} name="password" render={({ field }) => (
                      <FormItem><FormLabel className="text-xs">Password</FormLabel><FormControl><Input type="password" {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                    <FormField control={businessForm.control} name="confirmPassword" render={({ field }) => (
                      <FormItem><FormLabel className="text-xs">Confirm Password</FormLabel><FormControl><Input type="password" {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                    <p className="text-[10px] text-muted-foreground">🏥 Set up your facility after registration — HMS, POS & more included</p>
                    <AnimatedButton type="submit" className="w-full h-12" loading={localLoading}>Register Business</AnimatedButton>
                  </form>
                </Form>
              )}
            </TabsContent>
          </Tabs>
        </Card>
      </div>
    </div>
  );
};

export default Auth;
