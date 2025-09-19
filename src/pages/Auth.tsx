import React, { useState, useEffect } from "react";
import { useNavigate, Link, useSearchParams } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Heart, Building2, User } from "lucide-react";
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
}).refine(data => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

type LoginFormValues = z.infer<typeof loginSchema>;
type PatientSignupFormValues = z.infer<typeof patientSignupSchema>;
type ProviderSignupFormValues = z.infer<typeof providerSignupSchema>;

export const Auth = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const [localLoading, setLocalLoading] = useState(false);
  const [activeTab, setActiveTab] = useState(searchParams.get("tab") || "signin");
  const { triggerSuccess, triggerError } = useFeedbackSystem();

  // Simplified and more robust auth check
  useEffect(() => {
    let mounted = true;
    
    const checkAuth = async () => {
      try {
        setLocalLoading(true);
        const { data, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error("Auth check error:", error);
          if (mounted) setError(error.message);
          return;
        }
        
        if (data.session && mounted) {
          navigate("/symptoms");
        }
      } catch (err) {
        console.error("Unexpected error checking auth:", err);
      } finally {
        if (mounted) setLocalLoading(false);
      }
    };
    
    checkAuth();
    
    return () => {
      mounted = false;
    };
  }, [navigate]);

  const loginForm = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const patientSignupForm = useForm<PatientSignupFormValues>({
    resolver: zodResolver(patientSignupSchema),
    defaultValues: {
      email: "",
      password: "",
      confirmPassword: "",
      firstName: "",
      lastName: "",
    },
  });

  const providerSignupForm = useForm<ProviderSignupFormValues>({
    resolver: zodResolver(providerSignupSchema),
    defaultValues: {
      email: "",
      password: "",
      confirmPassword: "",
      firstName: "",
      lastName: "",
      specialty: "",
      licenseNumber: "",
    },
  });

  // Form submission handlers with improved error handling
  const onLoginSubmit = async (data: LoginFormValues) => {
    try {
      setError(null);
      setLocalLoading(true);
      const { error } = await supabase.auth.signInWithPassword({
        email: data.email,
        password: data.password,
      });
      
      if (error) throw error;
      
      triggerSuccess("Signed in successfully!");
      toast.success("Signed in successfully!");
      navigate("/symptoms");
    } catch (err: any) {
      const errorMessage = err.message || "Failed to sign in";
      setError(errorMessage);
      triggerError(errorMessage);
      console.error("Login error:", err);
      toast.error(errorMessage);
    } finally {
      setLocalLoading(false);
    }
  };

  // Updated patient signup with role
const onPatientSignupSubmit = async (data: PatientSignupFormValues) => {
  try {
    setError(null);
    setLocalLoading(true);
    const { error } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
      options: {
        data: {
          first_name: data.firstName,
          last_name: data.lastName,
          role: "patient",
        },
      },
    });
    
    if (error) throw error;
    
    triggerSuccess("Account created! Please verify your email address.");
    toast.success("Account created! Please verify your email address.");
    setActiveTab("signin");
  } catch (err: any) {
    const errorMessage = err.message || "Failed to create account";
    setError(errorMessage);
    triggerError(errorMessage);
    console.error("Patient signup error:", err);
    toast.error(errorMessage);
  } finally {
    setLocalLoading(false);
  }
};

// Updated provider signup with role and professional details
const onProviderSignupSubmit = async (data: ProviderSignupFormValues) => {
  try {
    setError(null);
    setLocalLoading(true);
    const { error } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
      options: {
        data: {
          first_name: data.firstName,
          last_name: data.lastName,
          role: "health_personnel",
          specialty: data.specialty,
          license_number: data.licenseNumber,
        },
      },
    });
    
    if (error) throw error;
    
    triggerSuccess("Account created! Please verify your email address.");
    toast.success("Account created! Please verify your email address.");
    setActiveTab("signin");
  } catch (err: any) {
    const errorMessage = err.message || "Failed to create account";
    setError(errorMessage);
    triggerError(errorMessage);
    console.error("Provider signup error:", err);
    toast.error(errorMessage);
  } finally {
    setLocalLoading(false);
  }
};

  if (authLoading || localLoading) {
    return <LoadingScreen timeout={2000} />;
  }

  // If already authenticated, redirect
  if (isAuthenticated) {
    navigate("/symptoms");
    return <LoadingScreen message="Redirecting..." />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center space-y-2">
          <div className="flex justify-center">
            <div className="bg-primary/10 p-3 rounded-full">
              <Heart className="h-8 w-8 text-primary" />
            </div>
          </div>
          <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
            Welcome to Doc&apos; O Clock
          </h1>
          <p className="text-muted-foreground">
            Access your healthcare services securely
          </p>
        </div>

        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <Card className="p-6 shadow-lg">
          <Tabs defaultValue={activeTab} value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-2 mb-4">
              <TabsTrigger value="signin">Sign In</TabsTrigger>
              <TabsTrigger value="signup">Register</TabsTrigger>
            </TabsList>
            
            <TabsContent value="signin">
              <Form {...loginForm}>
                <form onSubmit={loginForm.handleSubmit(onLoginSubmit)} className="space-y-4">
                  <FormField
                    control={loginForm.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Enter your email"
                            {...field}
                          />
                        </FormControl>
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
                        <FormControl>
                          <Input
                            type="password"
                            placeholder="Enter your password"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <div className="text-sm text-right">
                    <Link to="/reset-password" className="text-primary hover:underline">
                      Forgot password?
                    </Link>
                  </div>
                  
                  <AnimatedButton 
                    type="submit" 
                    className="w-full" 
                    loading={loginForm.formState.isSubmitting}
                    loadingText="Signing in..."
                  >
                    Sign In
                  </AnimatedButton>
                </form>
              </Form>
            </TabsContent>
            
            <TabsContent value="signup">
              <div className="mb-4">
                <FormLabel>I am a</FormLabel>
                <div className="grid grid-cols-2 gap-4 mt-1">
                  <Button
                    type="button"
                    variant={userType === "patient" ? "default" : "outline"}
                    className="flex flex-col h-auto py-4"
                    onClick={() => setUserType("patient")}
                  >
                    <User className="h-5 w-5 mb-2" />
                    <span>Patient</span>
                  </Button>
                  
                  <Button
                    type="button"
                    variant={userType === "health_personnel" ? "default" : "outline"}
                    className="flex flex-col h-auto py-4"
                    onClick={() => setUserType("health_personnel")}
                  >
                    <Building2 className="h-5 w-5 mb-2" />
                    <span>Healthcare Provider</span>
                  </Button>
                </div>
              </div>

              {userType === "patient" ? (
                <Form {...patientSignupForm}>
                  <form onSubmit={patientSignupForm.handleSubmit(onPatientSignupSubmit)} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={patientSignupForm.control}
                        name="firstName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>First Name</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="First name"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={patientSignupForm.control}
                        name="lastName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Last Name</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="Last name"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    
                    <FormField
                      control={patientSignupForm.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="Enter your email"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={patientSignupForm.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Password</FormLabel>
                          <FormControl>
                            <Input
                              type="password"
                              placeholder="Create a password"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={patientSignupForm.control}
                      name="confirmPassword"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Confirm Password</FormLabel>
                          <FormControl>
                            <Input
                              type="password"
                              placeholder="Confirm your password"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <AnimatedButton 
                      type="submit" 
                      className="w-full" 
                      loading={patientSignupForm.formState.isSubmitting}
                      loadingText="Creating Account..."
                    >
                      Create Patient Account
                    </AnimatedButton>
                  </form>
                </Form>
              ) : (
                <Form {...providerSignupForm}>
                  <form onSubmit={providerSignupForm.handleSubmit(onProviderSignupSubmit)} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={providerSignupForm.control}
                        name="firstName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>First Name</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="First name"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={providerSignupForm.control}
                        name="lastName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Last Name</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="Last name"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    
                    <FormField
                      control={providerSignupForm.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="Enter your email"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={providerSignupForm.control}
                      name="specialty"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Specialty</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="Enter your specialty"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={providerSignupForm.control}
                      name="licenseNumber"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>License Number</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="Enter your license number"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={providerSignupForm.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Password</FormLabel>
                          <FormControl>
                            <Input
                              type="password"
                              placeholder="Create a password"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={providerSignupForm.control}
                      name="confirmPassword"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Confirm Password</FormLabel>
                          <FormControl>
                            <Input
                              type="password"
                              placeholder="Confirm your password"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <AnimatedButton 
                      type="submit" 
                      className="w-full" 
                      loading={providerSignupForm.formState.isSubmitting}
                      loadingText="Creating Account..."
                    >
                      Create Provider Account
                    </AnimatedButton>
                  </form>
                </Form>
              )}
            </TabsContent>
          </Tabs>
        </Card>

        <div className="text-center space-y-4">
          <p className="text-sm text-muted-foreground">
            Your health information is protected by industry-standard encryption
          </p>
          <div className="text-xs text-muted-foreground">
            By signing in, you agree to our{" "}
            <Link to="/terms" className="text-primary hover:underline">Terms of Service</Link>
            {" "}and{" "}
            <Link to="/privacy" className="text-primary hover:underline">Privacy Policy</Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Auth;
