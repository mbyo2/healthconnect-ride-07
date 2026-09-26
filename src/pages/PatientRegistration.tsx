import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, ArrowRight, User, Phone, Mail, MapPin, Calendar, CreditCard, Heart, AlertTriangle, CheckCircle, Sparkles } from "lucide-react";
import { useFeedbackSystem } from "@/hooks/use-feedback-system";
import { flushPendingPatientProfile, type PendingPatientProfile } from "@/hooks/useFlushPendingPatientProfile";

// Schema for each step
const personalInfoSchema = z.object({
  firstName: z.string().min(2, "First name required"),
  lastName: z.string().min(2, "Last name required"),
  email: z.string().email("Valid email required"),
  phone: z.string().min(10, "Phone number required"),
  dateOfBirth: z.string().min(1, "Date of birth required"),
  gender: z.string().min(1, "Gender required"),
  bloodType: z.string().optional(),
});

const contactInfoSchema = z.object({
  address: z.string().min(5, "Address required"),
  city: z.string().min(2, "City required"),
  country: z.string().min(1, "Country required"),
  zipCode: z.string().optional(),
});

const emergencyContactSchema = z.object({
  emergencyName: z.string().min(2, "Emergency contact name required"),
  emergencyPhone: z.string().min(10, "Emergency contact phone required"),
  emergencyRelationship: z.string().min(1, "Relationship required"),
  emergencyEmail: z.string().email("Valid email").optional().or(z.literal("")),
});

const insuranceSchema = z.object({
  hasInsurance: z.boolean(),
  insuranceProvider: z.string().optional(),
  policyNumber: z.string().optional(),
  groupNumber: z.string().optional(),
  coverageStartDate: z.string().optional(),
}).refine(
  (data) => !data.hasInsurance || (data.insuranceProvider && data.policyNumber && data.coverageStartDate),
  { message: "Insurance provider, policy number, and coverage start date are required when insurance is selected", path: ["insuranceProvider"] }
);

const medicalHistorySchema = z.object({
  hasAllergies: z.boolean(),
  allergies: z.string().optional(),
  hasChronicConditions: z.boolean(),
  chronicConditions: z.string().optional(),
  hasSurgeries: z.boolean(),
  surgeries: z.string().optional(),
  medications: z.string().optional(),
});

const passwordSchema = z.object({
  password: z.string().min(8, "Password must be at least 8 characters"),
  confirmPassword: z.string().min(8),
  termsAccepted: z.boolean().refine((val) => val === true, "You must accept the terms"),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

export const PatientRegistration = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { showSuccess, showError } = useFeedbackSystem();
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [countries, setCountries] = useState<any[]>([]);
  const [genders, setGenders] = useState<any[]>([]);
  const [bloodTypes, setBloodTypes] = useState<any[]>([]);
  const [relationships, setRelationships] = useState<any[]>([]);
  const [insuranceProviders, setInsuranceProviders] = useState<any[]>([]);

  const totalSteps = 6;

  const personalInfoForm = useForm<z.infer<typeof personalInfoSchema>>({
    resolver: zodResolver(personalInfoSchema),
    defaultValues: { bloodType: "" },
  });

  const contactInfoForm = useForm<z.infer<typeof contactInfoSchema>>({
    resolver: zodResolver(contactInfoSchema),
  });

  const emergencyContactForm = useForm<z.infer<typeof emergencyContactSchema>>({
    resolver: zodResolver(emergencyContactSchema),
  });

  const insuranceForm = useForm<z.infer<typeof insuranceSchema>>({
    resolver: zodResolver(insuranceSchema),
    defaultValues: { hasInsurance: false },
  });

  const medicalHistoryForm = useForm<z.infer<typeof medicalHistorySchema>>({
    resolver: zodResolver(medicalHistorySchema),
    defaultValues: {
      hasAllergies: false,
      hasChronicConditions: false,
      hasSurgeries: false,
    },
  });

  const passwordForm = useForm<z.infer<typeof passwordSchema>>({
    resolver: zodResolver(passwordSchema),
    defaultValues: { termsAccepted: false },
  });

  useEffect(() => {
    fetchDynamicData();
  }, []);

  // This page creates a brand-new account. A signed-in visitor filling the
  // form for a different email would otherwise get detail rows written under
  // the wrong patient_id (or a confusing double-account state).
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) navigate("/dashboard", { replace: true });
    });
  }, [navigate]);

  const fetchDynamicData = async () => {
    try {
      const [countriesRes, gendersRes, bloodTypesRes, relationshipsRes, insuranceRes] = await Promise.all([
        supabase.from("countries").select("*").eq("is_active", true).order("name"),
        supabase.from("gender_options").select("*").eq("is_active", true).order("display_order"),
        supabase.from("blood_types").select("*").eq("is_active", true).order("display_order"),
        supabase.from("relationship_types").select("*").eq("is_active", true).order("display_order"),
        supabase.from("insurance_providers").select("*").eq("is_active", true).order("name"),
      ]);

      if (countriesRes.data) setCountries(countriesRes.data);
      if (gendersRes.data) setGenders(gendersRes.data);
      if (bloodTypesRes.data) setBloodTypes(bloodTypesRes.data);
      if (relationshipsRes.data) setRelationships(relationshipsRes.data);
      if (insuranceRes.data) setInsuranceProviders(insuranceRes.data);
    } catch (error) {
      console.error("Error fetching dynamic data:", error);
    }
  };

  const handleNext = async () => {
    let isValid = false;

    switch (currentStep) {
      case 1:
        isValid = await personalInfoForm.trigger();
        break;
      case 2:
        isValid = await contactInfoForm.trigger();
        break;
      case 3:
        isValid = await emergencyContactForm.trigger();
        break;
      case 4:
        isValid = await insuranceForm.trigger();
        break;
      case 5:
        isValid = await medicalHistoryForm.trigger();
        break;
      case 6:
        isValid = await passwordForm.trigger();
        break;
    }

    if (isValid && currentStep < totalSteps) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = async () => {
    if (!(await passwordForm.trigger())) return;

    setLoading(true);

    try {
      const personalData = personalInfoForm.getValues();
      const contactData = contactInfoForm.getValues();
      const emergencyData = emergencyContactForm.getValues();
      const insuranceData = insuranceForm.getValues();
      const medicalData = medicalHistoryForm.getValues();
      const passwordData = passwordForm.getValues();

      const { data: signUpData, error: authError } = await supabase.auth.signUp({
        email: personalData.email,
        password: passwordData.password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth?redirect=${encodeURIComponent("/onboarding")}`,
          data: {
            first_name: personalData.firstName,
            last_name: personalData.lastName,
            phone: personalData.phone,
            date_of_birth: personalData.dateOfBirth,
            gender: personalData.gender,
            blood_type: personalData.bloodType,
            address: contactData.address,
            city: contactData.city,
            country: contactData.country,
            zip_code: contactData.zipCode,
            role: "patient",
            // When email confirmation is enabled there is no session yet, so
            // the detail rows below cannot be written (RLS). Stash the values
            // in signup metadata instead; Onboarding flushes them into the
            // real tables after the first verified sign-in.
            pending_patient_profile: {
              emergency: emergencyData.emergencyName ? {
                name: emergencyData.emergencyName,
                phone: emergencyData.emergencyPhone,
                email: emergencyData.emergencyEmail,
                relationship: emergencyData.emergencyRelationship,
              } : null,
              insurance: insuranceData.hasInsurance && insuranceData.insuranceProvider ? {
                provider_name: insuranceData.insuranceProvider,
                policy_number: insuranceData.policyNumber,
                group_number: insuranceData.groupNumber,
                coverage_start_date: insuranceData.coverageStartDate,
              } : null,
              allergies: medicalData.hasAllergies && medicalData.allergies ? medicalData.allergies : null,
              chronic_conditions: medicalData.hasChronicConditions && medicalData.chronicConditions ? medicalData.chronicConditions : null,
            },
          },
        },
      });

      if (authError) throw authError;

      // The signUp response carries the new user even when email confirmation
      // is enabled (no session yet). Use it directly — a separate getUser()
      // call returns null without a session and must never gate completion.
      const newUser = signUpData?.user ?? null;
      const { data: { session } } = await supabase.auth.getSession();
      // Only write detail rows when the session belongs to the new account;
      // otherwise the inserts would be misattributed (or blocked by RLS).
      const activeUser = session?.user && newUser && session.user.id === newUser.id
        ? session.user
        : null;

      if (activeUser) {
        const user = activeUser;
        // Write the same payload the Onboarding flush uses; it returns any
        // sections that failed so they stay in metadata for a later retry
        // instead of being silently dropped.
        const pendingPayload: PendingPatientProfile = {
          emergency: emergencyData.emergencyName ? {
            name: emergencyData.emergencyName,
            phone: emergencyData.emergencyPhone,
            email: emergencyData.emergencyEmail,
            relationship: emergencyData.emergencyRelationship,
          } : null,
          insurance: insuranceData.hasInsurance && insuranceData.insuranceProvider ? {
            provider_name: insuranceData.insuranceProvider,
            policy_number: insuranceData.policyNumber,
            group_number: insuranceData.groupNumber,
            coverage_start_date: insuranceData.coverageStartDate,
          } : null,
          allergies: medicalData.hasAllergies && medicalData.allergies ? medicalData.allergies : null,
          chronic_conditions: medicalData.hasChronicConditions && medicalData.chronicConditions ? medicalData.chronicConditions : null,
        };
        const remaining = await flushPendingPatientProfile(user.id, pendingPayload);
        // Rows were written immediately, so clear the stash only when every
        // section landed — otherwise keep the failed sections for the
        // Onboarding flush to retry.
        await supabase.auth.updateUser({
          data: {
            pending_patient_profile:
              Object.keys(remaining).length === 0 ? null : remaining,
          },
        });
      }

      // Account creation itself always succeeds at this point (authError would
      // have thrown). The detail rows above are best-effort: without an active
      // session (email confirmation pending) they cannot satisfy RLS, so they
      // are skipped here and the patient completes them after first sign-in.
      // Never leave the user without feedback or navigation.
      showSuccess("Account created successfully! Please check your email to verify your account.");
      navigate("/auth?tab=signin");
    } catch (error: any) {
      showError(error.message || "Failed to create account");
    } finally {
      setLoading(false);
    }
  };

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-4">
              <User className="h-5 w-5 text-primary-500" />
              <h3 className="text-sm font-extrabold">Personal Information</h3>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={personalInfoForm.control}
                name="firstName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-extrabold">First Name</FormLabel>
                    <FormControl><Input {...field} className="h-9 text-xs" /></FormControl>
                    <FormMessage className="text-[10px]" />
                  </FormItem>
                )}
              />
              <FormField
                control={personalInfoForm.control}
                name="lastName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-extrabold">Last Name</FormLabel>
                    <FormControl><Input {...field} className="h-9 text-xs" /></FormControl>
                    <FormMessage className="text-[10px]" />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={personalInfoForm.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs font-extrabold">Email Address</FormLabel>
                  <FormControl><Input {...field} type="email" className="h-9 text-xs" /></FormControl>
                  <FormMessage className="text-[10px]" />
                </FormItem>
              )}
            />
            <FormField
              control={personalInfoForm.control}
              name="phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs font-extrabold">Phone Number</FormLabel>
                  <FormControl><Input {...field} type="tel" placeholder="+260..." className="h-9 text-xs" /></FormControl>
                  <FormMessage className="text-[10px]" />
                </FormItem>
              )}
            />
            <FormField
              control={personalInfoForm.control}
              name="dateOfBirth"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs font-extrabold">Date of Birth</FormLabel>
                  <FormControl><Input {...field} type="date" className="h-9 text-xs" /></FormControl>
                  <FormMessage className="text-[10px]" />
                </FormItem>
              )}
            />
            <FormField
              control={personalInfoForm.control}
              name="gender"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs font-extrabold">Gender</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl><SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Select gender" /></SelectTrigger></FormControl>
                    <SelectContent>
                      {genders.map((g) => <SelectItem key={g.id} value={g.code}>{g.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <FormMessage className="text-[10px]" />
                </FormItem>
              )}
            />
            <FormField
              control={personalInfoForm.control}
              name="bloodType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs font-extrabold">Blood Type (Optional)</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl><SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Select blood type" /></SelectTrigger></FormControl>
                    <SelectContent>
                      <SelectItem value="unknown">Unknown</SelectItem>
                      {bloodTypes.map((b) => <SelectItem key={b.id} value={b.code}>{b.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <FormMessage className="text-[10px]" />
                </FormItem>
              )}
            />
          </div>
        );

      case 2:
        return (
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-4">
              <MapPin className="h-5 w-5 text-primary-500" />
              <h3 className="text-sm font-extrabold">Contact Information</h3>
            </div>
            <FormField
              control={contactInfoForm.control}
              name="address"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs font-extrabold">Street Address</FormLabel>
                  <FormControl><Input {...field} placeholder="123 Main Street" className="h-9 text-xs" /></FormControl>
                  <FormMessage className="text-[10px]" />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={contactInfoForm.control}
                name="city"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-extrabold">City</FormLabel>
                    <FormControl><Input {...field} className="h-9 text-xs" /></FormControl>
                    <FormMessage className="text-[10px]" />
                  </FormItem>
                )}
              />
              <FormField
                control={contactInfoForm.control}
                name="zipCode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-extrabold">Postal Code</FormLabel>
                    <FormControl><Input {...field} className="h-9 text-xs" /></FormControl>
                    <FormMessage className="text-[10px]" />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={contactInfoForm.control}
              name="country"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs font-extrabold">Country</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl><SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Select country" /></SelectTrigger></FormControl>
                    <SelectContent>
                      {countries.map((c) => (
                        <SelectItem key={c.id} value={c.code}>
                          {c.flag_emoji} {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage className="text-[10px]" />
                </FormItem>
              )}
            />
          </div>
        );

      case 3:
        return (
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-4">
              <Phone className="h-5 w-5 text-primary-500" />
              <h3 className="text-sm font-extrabold">Emergency Contact</h3>
            </div>
            <p className="text-xs text-graphite-500 dark:text-slate-400">In case of emergency, who should we contact?</p>
            <FormField
              control={emergencyContactForm.control}
              name="emergencyName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs font-extrabold">Contact Name</FormLabel>
                  <FormControl><Input {...field} placeholder="Full name" className="h-9 text-xs" /></FormControl>
                  <FormMessage className="text-[10px]" />
                </FormItem>
              )}
            />
            <FormField
              control={emergencyContactForm.control}
              name="emergencyPhone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs font-extrabold">Phone Number</FormLabel>
                  <FormControl><Input {...field} type="tel" placeholder="+260..." className="h-9 text-xs" /></FormControl>
                  <FormMessage className="text-[10px]" />
                </FormItem>
              )}
            />
            <FormField
              control={emergencyContactForm.control}
              name="emergencyRelationship"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs font-extrabold">Relationship</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl><SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Select relationship" /></SelectTrigger></FormControl>
                    <SelectContent>
                      {relationships.map((r) => <SelectItem key={r.id} value={r.code}>{r.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <FormMessage className="text-[10px]" />
                </FormItem>
              )}
            />
            <FormField
              control={emergencyContactForm.control}
              name="emergencyEmail"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs font-extrabold">Email (Optional)</FormLabel>
                  <FormControl><Input {...field} type="email" className="h-9 text-xs" /></FormControl>
                  <FormMessage className="text-[10px]" />
                </FormItem>
              )}
            />
          </div>
        );

      case 4:
        return (
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-4">
              <CreditCard className="h-5 w-5 text-primary-500" />
              <h3 className="text-sm font-extrabold">Insurance Information</h3>
            </div>
            <FormField
              control={insuranceForm.control}
              name="hasInsurance"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel className="text-xs font-bold">I have health insurance</FormLabel>
                  </div>
                </FormItem>
              )}
            />
            {insuranceForm.watch("hasInsurance") && (
              <>
                <FormField
                  control={insuranceForm.control}
                  name="insuranceProvider"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-extrabold">Insurance Provider</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl><SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Select provider" /></SelectTrigger></FormControl>
                        <SelectContent>
                          {insuranceProviders.map((i) => <SelectItem key={i.id} value={i.name}>{i.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                      <FormMessage className="text-[10px]" />
                    </FormItem>
                  )}
                />
                <FormField
                  control={insuranceForm.control}
                  name="policyNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-extrabold">Policy Number</FormLabel>
                      <FormControl><Input {...field} className="h-9 text-xs" /></FormControl>
                      <FormMessage className="text-[10px]" />
                    </FormItem>
                  )}
                />
                <FormField
                  control={insuranceForm.control}
                  name="groupNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-extrabold">Group Number (Optional)</FormLabel>
                      <FormControl><Input {...field} className="h-9 text-xs" /></FormControl>
                      <FormMessage className="text-[10px]" />
                    </FormItem>
                  )}
                />
                <FormField
                  control={insuranceForm.control}
                  name="coverageStartDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-extrabold">Coverage Start Date</FormLabel>
                      <FormControl><Input {...field} type="date" className="h-9 text-xs" /></FormControl>
                      <FormMessage className="text-[10px]" />
                    </FormItem>
                  )}
                />
              </>
            )}
          </div>
        );

      case 5:
        return (
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-4">
              <Heart className="h-5 w-5 text-primary-500" />
              <h3 className="text-sm font-extrabold">Medical History</h3>
            </div>
            <p className="text-xs text-graphite-500 dark:text-slate-400">This information helps your healthcare provider give you better care.</p>

            <FormField
              control={medicalHistoryForm.control}
              name="hasAllergies"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                  <FormControl>
                    <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel className="text-xs font-bold">I have allergies</FormLabel>
                  </div>
                </FormItem>
              )}
            />
            {medicalHistoryForm.watch("hasAllergies") && (
              <FormField
                control={medicalHistoryForm.control}
                name="allergies"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-extrabold">Please describe your allergies</FormLabel>
                    <FormControl><Textarea {...field} placeholder="e.g., Penicillin, peanuts, latex..." className="text-xs min-h-[80px]" /></FormControl>
                    <FormMessage className="text-[10px]" />
                  </FormItem>
                )}
              />
            )}

            <FormField
              control={medicalHistoryForm.control}
              name="hasChronicConditions"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                  <FormControl>
                    <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel className="text-xs font-bold">I have chronic conditions</FormLabel>
                  </div>
                </FormItem>
              )}
            />
            {medicalHistoryForm.watch("hasChronicConditions") && (
              <FormField
                control={medicalHistoryForm.control}
                name="chronicConditions"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-extrabold">Please describe your conditions</FormLabel>
                    <FormControl><Textarea {...field} placeholder="e.g., Diabetes, hypertension, asthma..." className="text-xs min-h-[80px]" /></FormControl>
                    <FormMessage className="text-[10px]" />
                  </FormItem>
                )}
              />
            )}

            <FormField
              control={medicalHistoryForm.control}
              name="hasSurgeries"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                  <FormControl>
                    <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel className="text-xs font-bold">I have had surgeries</FormLabel>
                  </div>
                </FormItem>
              )}
            />
            {medicalHistoryForm.watch("hasSurgeries") && (
              <FormField
                control={medicalHistoryForm.control}
                name="surgeries"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-extrabold">Please describe your surgeries</FormLabel>
                    <FormControl><Textarea {...field} placeholder="e.g., Appendectomy 2015, knee surgery 2020..." className="text-xs min-h-[80px]" /></FormControl>
                    <FormMessage className="text-[10px]" />
                  </FormItem>
                )}
              />
            )}

            <FormField
              control={medicalHistoryForm.control}
              name="medications"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs font-extrabold">Current Medications (Optional)</FormLabel>
                  <FormControl><Textarea {...field} placeholder="List any medications you're currently taking..." className="text-xs min-h-[80px]" /></FormControl>
                  <FormMessage className="text-[10px]" />
                </FormItem>
              )}
            />
          </div>
        );

      case 6:
        return (
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-4">
              <Sparkles className="h-5 w-5 text-primary-500" />
              <h3 className="text-sm font-extrabold">Create Your Account</h3>
            </div>
            <FormField
              control={passwordForm.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs font-extrabold">Password</FormLabel>
                  <FormControl><Input {...field} type="password" className="h-9 text-xs" /></FormControl>
                  <FormMessage className="text-[10px]" />
                </FormItem>
              )}
            />
            <FormField
              control={passwordForm.control}
              name="confirmPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs font-extrabold">Confirm Password</FormLabel>
                  <FormControl><Input {...field} type="password" className="h-9 text-xs" /></FormControl>
                  <FormMessage className="text-[10px]" />
                </FormItem>
              )}
            />
            <FormField
              control={passwordForm.control}
              name="termsAccepted"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                  <FormControl>
                    <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel className="text-xs font-bold">
                      I agree to the Terms of Service and Privacy Policy
                    </FormLabel>
                  </div>
                </FormItem>
              )}
            />
            <FormMessage>{passwordForm.formState.errors.termsAccepted?.message}</FormMessage>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-canvas dark:bg-slate-950 flex items-center justify-center p-4 font-sans">
      <Card className="w-full max-w-2xl shadow-md">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between mb-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/auth?tab=signup")}
              className="text-xs"
            >
              <ArrowLeft className="h-3.5 w-3.5 mr-1" /> Back
            </Button>
            <div className="text-xs font-bold text-graphite-500 dark:text-slate-400">
              Step {currentStep} of {totalSteps}
            </div>
          </div>
          <CardTitle className="text-lg font-extrabold">Patient Registration</CardTitle>
          <Progress value={(currentStep / totalSteps) * 100} className="h-2" />
        </CardHeader>
        <CardContent className="pt-4">
          <div>{renderStep()}</div>

          <div className="flex justify-between mt-6">
            <Button
              variant="outline"
              onClick={handleBack}
              disabled={currentStep === 1}
              className="text-xs"
            >
              <ArrowLeft className="h-3.5 w-3.5 mr-1" /> Back
            </Button>
            {currentStep === totalSteps ? (
              <Button
                onClick={handleSubmit}
                disabled={loading}
                className="bg-primary-500 hover:bg-primary-600 text-xs"
              >
                {loading ? "Creating Account..." : "Complete Registration"} <CheckCircle className="h-3.5 w-3.5 ml-1" />
              </Button>
            ) : (
              <Button
                onClick={handleNext}
                className="bg-primary-500 hover:bg-primary-600 text-xs"
              >
                Next <ArrowRight className="h-3.5 w-3.5 ml-1" />
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PatientRegistration;
