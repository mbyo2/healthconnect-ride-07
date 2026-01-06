import React, { useState, useEffect, useMemo } from "react";
import { useNavigate, Link, useSearchParams } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Heart, Building2, User, MapPin } from "lucide-react";
import { LoadingScreen } from "@/components/LoadingScreen";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AnimatedButton } from "@/components/ui/animated-button";
import { useFeedbackSystem } from "@/hooks/use-feedback-system";

const loginSchema = z.object({
  email: z.string().email({ message: "Please enter a valid email address" }),
  password: z.string().min(6, { message: "Password must be at least 6 characters" }),
});

const patientSignupSchema = z.object({
  email: z.string().email({ message: "Please enter a valid email address" }),
  password: z.string().min(6, { message: "Password must be at least 6 characters" }),
  confirmPassword: z.string().min(6, { message: "Password must be at least 6 characters" }),
  firstName: z.string().min(2, { message: "First name is required" }),
  lastName: z.string().min(2, { message: "Last name is required" }),
}).refine(data => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

const providerSignupSchema = z.object({
  email: z.string().email({ message: "Please enter a valid email address" }),
  password: z.string().min(6, { message: "Password must be at least 6 characters" }),
  confirmPassword: z.string().min(6, { message: "Password must be at least 6 characters" }),
  firstName: z.string().min(2, { message: "First name is required" }),
  lastName: z.string().min(2, { message: "Last name is required" }),
  specialty: z.string().min(2, { message: "Specialty is required" }),
  licenseNumber: z.string().min(2, { message: "License number is required" }),
  address: z.string().min(5, { message: "Address is required" }),
  city: z.string().min(2, { message: "City is required" }),
  country: z.string().min(2, { message: "Country is required" }),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
}).refine(data => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

export const Auth = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const [localLoading, setLocalLoading] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userType, setUserType] = useState<'patient' | 'health_personnel'>('patient');
  const [activeTab, setActiveTab] = useState(searchParams.get("tab") || "signin");
  const { showSuccess, showError } = useFeedbackSystem();
  const [locationLoading, setLocationLoading] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      const { data } = await supabase.auth.getSession();
      if (data.session?.user) {
        setIsAuthenticated(true);
        navigate("/home");
      }
      setAuthLoading(false);
    };
    checkAuth();
  }, [navigate]);

  const loginForm = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  const patientSignupForm = useForm<z.infer<typeof patientSignupSchema>>({
    resolver: zodResolver(patientSignupSchema),
    mode: "onBlur", // Performance optimization: validate on blur instead of change
  });

  const providerSignupForm = useForm<z.infer<typeof providerSignupSchema>>({
    resolver: zodResolver(providerSignupSchema),
    mode: "onBlur",
  });

  const getCurrentLocation = async () => {
    setLocationLoading(true);
    try {
      if (!navigator.geolocation) throw new Error('Geolocation not supported');
      const pos = await new Promise<GeolocationPosition>((res, rej) => {
        navigator.geolocation.getCurrentPosition(res, rej, { timeout: 10000 });
      });
      const { latitude, longitude } = pos.coords;
      providerSignupForm.setValue('latitude', latitude);
      providerSignupForm.setValue('longitude', longitude);
      toast.success('Location detected');
    } catch (e: any) {
      toast.error('Failed to detect location. Enter manually.');
    } finally {
      setLocationLoading(false);
    }
  };

  const onLoginSubmit = async (data: z.infer<typeof loginSchema>) => {
    setLocalLoading(true);
    const { error } = await supabase.auth.signInWithPassword(data);
    if (error) {
      setError(error.message);
      showError(error.message);
    } else {
      navigate("/home");
    }
    setLocalLoading(false);
  };

  const onSignupSubmit = async (data: any) => {
    setLocalLoading(true);
    const { error } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
      options: {
        data: {
          first_name: data.firstName,
          last_name: data.lastName,
          role: userType,
          specialty: data.specialty,
          license_number: data.licenseNumber,
          address: data.address,
          city: data.city,
          country: data.country,
        },
      },
    });

    if (error) {
      setError(error.message);
      showError(error.message);
    } else {
      showSuccess("Success! Check your email to verify.");
      setActiveTab("signin");
    }
    setLocalLoading(false);
  };

  if (authLoading) return <LoadingScreen timeout={1000} />;

  return (
    <div className="min-h-[100dvh] bg-gradient-to-b from-background to-muted flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      <div className="w-full max-w-md space-y-4 py-8">
        <div className="text-center space-y-2">
          <img src="/d0c-icon.svg" className="h-16 w-16 mx-auto mb-2" alt="Logo" />
          <h1 className="text-2xl font-bold text-primary">Doc' O Clock</h1>
          <p className="text-xs text-muted-foreground">Healthcare for Everyone</p>
        </div>

        <Card className="p-4 shadow-xl border-t-4 border-t-primary">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="signin">Sign In</TabsTrigger>
              <TabsTrigger value="signup">Register</TabsTrigger>
            </TabsList>

            <TabsContent value="signin" className="animate-in fade-in duration-300">
              <Form {...loginForm}>
                <form onSubmit={loginForm.handleSubmit(onLoginSubmit)} className="space-y-4">
                  <FormField
                    control={loginForm.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl><Input placeholder="Email" {...field} type="email" /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={loginForm.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Password</FormLabel>
                        <FormControl><Input type="password" placeholder="Password" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <AnimatedButton type="submit" className="w-full h-12" loading={localLoading}>
                    Sign In
                  </AnimatedButton>
                </form>
              </Form>
            </TabsContent>

            <TabsContent value="signup" className="animate-in fade-in duration-300">
              <div className="flex gap-2 mb-6">
                <Button 
                  variant={userType === 'patient' ? 'default' : 'outline'} 
                  className="flex-1 text-xs h-10" 
                  onClick={() => setUserType('patient')}
                >Patient</Button>
                <Button 
                  variant={userType === 'health_personnel' ? 'default' : 'outline'} 
                  className="flex-1 text-xs h-10"
                  onClick={() => setUserType('health_personnel')}
                >Provider</Button>
              </div>

              {userType === 'patient' ? (
                <Form {...patientSignupForm}>
                  <form onSubmit={patientSignupForm.handleSubmit(onSignupSubmit)} className="space-y-4">
                    <div className="grid grid-cols-2 gap-2">
                      <FormField control={patientSignupForm.control} name="firstName" render={({field}) => (
                        <FormItem><FormLabel className="text-xs">First Name</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>
                      )} />
                      <FormField control={patientSignupForm.control} name="lastName" render={({field}) => (
                        <FormItem><FormLabel className="text-xs">Last Name</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>
                      )} />
                    </div>
                    <FormField control={patientSignupForm.control} name="email" render={({field}) => (
                      <FormItem><FormLabel className="text-xs">Email</FormLabel><FormControl><Input {...field} type="email" /></FormControl></FormItem>
                    )} />
                    <FormField control={patientSignupForm.control} name="password" render={({field}) => (
                      <FormItem><FormLabel className="text-xs">Password</FormLabel><FormControl><Input type="password" {...field} /></FormControl></FormItem>
                    )} />
                    <FormField control={patientSignupForm.control} name="confirmPassword" render={({field}) => (
                      <FormItem><FormLabel className="text-xs">Confirm</FormLabel><FormControl><Input type="password" {...field} /></FormControl></FormItem>
                    )} />
                    <AnimatedButton type="submit" className="w-full h-12" loading={localLoading}>Create Account</AnimatedButton>
                  </form>
                </Form>
              ) : (
                <Form {...providerSignupForm}>
                  <form onSubmit={providerSignupForm.handleSubmit(onSignupSubmit)} className="space-y-4">
                     <div className="grid grid-cols-2 gap-2">
                      <FormField control={providerSignupForm.control} name="firstName" render={({field}) => (
                        <FormItem><FormLabel className="text-xs">First Name</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>
                      )} />
                      <FormField control={providerSignupForm.control} name="lastName" render={({field}) => (
                        <FormItem><FormLabel className="text-xs">Last Name</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>
                      )} />
                    </div>
                    <FormField control={providerSignupForm.control} name="email" render={({field}) => (
                      <FormItem><FormLabel className="text-xs">Email</FormLabel><FormControl><Input {...field} type="email" /></FormControl></FormItem>
                    )} />
                    <div className="grid grid-cols-2 gap-2">
                      <FormField control={providerSignupForm.control} name="specialty" render={({field}) => (
                        <FormItem><FormLabel className="text-xs">Specialty</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>
                      )} />
                      <FormField control={providerSignupForm.control} name="licenseNumber" render={({field}) => (
                        <FormItem><FormLabel className="text-xs">License #</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>
                      )} />
                    </div>
                    
                    <div className="bg-muted/30 p-2 rounded-lg space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] font-bold uppercase">Practice Location</span>
                        <Button type="button" size="sm" variant="ghost" className="h-6 text-[10px]" onClick={getCurrentLocation}>
                          <MapPin className="w-3 h-3 mr-1" /> Auto-Detect
                        </Button>
                      </div>
                      <FormField control={providerSignupForm.control} name="address" render={({field}) => (
                        <FormControl><Input placeholder="Address" {...field} className="h-8 text-xs" /></FormControl>
                      )} />
                    </div>

                    <FormField control={providerSignupForm.control} name="password" render={({field}) => (
                      <FormItem><FormLabel className="text-xs">Password</FormLabel><FormControl><Input type="password" {...field} /></FormControl></FormItem>
                    )} />
                    <AnimatedButton type="submit" className="w-full h-12" loading={localLoading}>Create Provider Account</AnimatedButton>
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
