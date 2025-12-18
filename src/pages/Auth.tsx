import React, { useState, useEffect } from "react";
import { useNavigate, Link, useSearchParams } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Heart, Building2, User, MapPin, Search } from "lucide-react";
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

type LoginFormValues = z.infer<typeof loginSchema>;
type PatientSignupFormValues = z.infer<typeof patientSignupSchema>;
type ProviderSignupFormValues = z.infer<typeof providerSignupSchema>;

export const Auth = () => {
  const { user } = useAuth();
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
  const [currentLocation, setCurrentLocation] = useState<{ lat: number, lng: number } | null>(null);

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

        if (data.session?.user) {
          setIsAuthenticated(true);
          navigate("/home");
        }
      } catch (err) {
        console.error("Unexpected error checking auth:", err);
      } finally {
        if (mounted) {
          setLocalLoading(false);
          setAuthLoading(false);
        }
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
      address: "",
      city: "",
      country: "",
      latitude: undefined,
      longitude: undefined,
    },
  });

  // Location detection function
  const getCurrentLocation = async () => {
    setLocationLoading(true);
    try {
      if (!navigator.geolocation) {
        throw new Error('Geolocation is not supported by this browser');
      }

      if (!window.isSecureContext) {
        throw new Error('Geolocation requires a secure context (HTTPS)');
      }

      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 300000
        });
      });

      const { latitude, longitude } = position.coords;
      setCurrentLocation({ lat: latitude, lng: longitude });

      // Update form with coordinates
      providerSignupForm.setValue('latitude', latitude);
      providerSignupForm.setValue('longitude', longitude);

      // Reverse geocoding to get address
      try {
        // Use OpenStreetMap Nominatim API (free, no key required for low volume)
        // instead of OpenCage which requires a key
        const response = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&addressdetails=1`
        );
        const data = await response.json();

        if (data && data.display_name) {
          providerSignupForm.setValue('address', data.display_name || '');
          providerSignupForm.setValue('city', data.address?.city || data.address?.town || data.address?.village || '');
          providerSignupForm.setValue('country', data.address?.country || '');
          toast.success('Location detected successfully');
        } else {
          throw new Error('Could not get address details');
        }
      } catch (geocodeError) {
        console.warn('Reverse geocoding failed:', geocodeError);
        toast.info('Location detected, please fill in address details manually');
      }
    } catch (error: any) {
      console.error('Location detection failed:', error);
      toast.error(error.message || 'Failed to detect location. Please enter address manually.');
    } finally {
      setLocationLoading(false);
    }
  };

  // Form submission handlers with improved error handling and logging
  const onLoginSubmit = async (data: LoginFormValues) => {
    try {
      setError(null);
      setLocalLoading(true);

      console.log('Attempting to sign in with:', data.email);

      const { data: authData, error } = await supabase.auth.signInWithPassword({
        email: data.email,
        password: data.password,
      });

      if (error) {
        console.error('Authentication error details:', {
          status: error.status,
          name: error.name,
          code: error.code,
          message: error.message,
        });
        throw error;
      }

      console.log('Auth response:', {
        session: !!authData.session,
        user: authData.user?.id ? 'User ID: ' + authData.user.id : 'No user',
        expiresAt: authData.session?.expires_at,
      });

      showSuccess("Signed in successfully!");
      toast.success("Signed in successfully!");

      // Small delay to ensure session is properly set
      setTimeout(() => {
        navigate("/home");
      }, 500);

    } catch (err: any) {
      let errorMessage = 'Failed to sign in';

      if (err.status === 400) {
        errorMessage = 'Invalid email or password';
      } else if (err.message?.includes('network')) {
        errorMessage = 'Network error. Please check your connection.';
      } else if (err.message) {
        errorMessage = err.message;
      }

      console.error('Login error details:', {
        error: err,
        timestamp: new Date().toISOString(),
        url: window.location.href,
      });

      setError(errorMessage);
      showError(errorMessage);
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
      const response = await supabase.auth.signUp({
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

      // eslint-disable-next-line no-console
      console.debug('patient signUp response:', response);

      if (response.error) throw response.error;

      showSuccess("Account created! Please verify your email address.");
      toast.success("Account created! Please verify your email address.");
      setActiveTab("signin");
    } catch (err: any) {
      const errorMessage = err?.message || "Failed to create account";
      setError(errorMessage);
      showError(errorMessage);
      // eslint-disable-next-line no-console
      console.error("Patient signup error:", err);
      toast.error(errorMessage);
    } finally {
      setLocalLoading(false);
    }
  };

  // Updated provider signup with role, professional details, and location
  const onProviderSignupSubmit = async (data: ProviderSignupFormValues) => {
    try {
      setError(null);
      setLocalLoading(true);
      const response = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          data: {
            first_name: data.firstName,
            last_name: data.lastName,
            role: "health_personnel",
            specialty: data.specialty,
            license_number: data.licenseNumber,
            address: data.address,
            city: data.city,
            country: data.country,
            latitude: data.latitude,
            longitude: data.longitude,
          },
        },
      });

      // eslint-disable-next-line no-console
      console.debug('provider signUp response:', response);

      if (response.error) throw response.error;

      showSuccess("Account created! Please verify your email address.");
      toast.success("Account created! Please verify your email address.");
      setActiveTab("signin");
    } catch (err: any) {
      const errorMessage = err?.message || "Failed to create account";
      setError(errorMessage);
      showError(errorMessage);
      // eslint-disable-next-line no-console
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
    navigate("/home");
    return <LoadingScreen message="Redirecting..." />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted flex items-center justify-center p-2 sm:p-4">
      <div className="w-full max-w-md space-y-4 sm:space-y-8">
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

        <Card className="p-4 sm:p-6 shadow-lg">
          <Tabs defaultValue={activeTab} value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-2 mb-4 h-auto">
              <TabsTrigger value="signin" className="text-sm py-2">Sign In</TabsTrigger>
              <TabsTrigger value="signup" className="text-sm py-2">Register</TabsTrigger>
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
                <FormLabel className="text-sm font-medium">I am a</FormLabel>
                <div className="grid grid-cols-2 gap-2 sm:gap-4 mt-2">
                  <Button
                    type="button"
                    variant={userType === "patient" ? "default" : "outline"}
                    className="flex flex-col h-auto py-3 px-2 text-xs sm:text-sm"
                    onClick={() => setUserType("patient")}
                  >
                    <User className="h-4 w-4 sm:h-5 sm:w-5 mb-1 sm:mb-2" />
                    <span>Patient</span>
                  </Button>

                  <Button
                    type="button"
                    variant={userType === "health_personnel" ? "default" : "outline"}
                    className="flex flex-col h-auto py-3 px-2 text-xs sm:text-sm"
                    onClick={() => setUserType("health_personnel")}
                  >
                    <Building2 className="h-4 w-4 sm:h-5 sm:w-5 mb-1 sm:mb-2" />
                    <span className="text-center leading-tight">Healthcare Provider</span>
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
                            <FormLabel>First Name <span className="text-red-500">*</span></FormLabel>
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
                            <FormLabel>Last Name <span className="text-red-500">*</span></FormLabel>
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
                          <FormLabel>Email <span className="text-red-500">*</span></FormLabel>
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
                          <FormLabel>Password <span className="text-red-500">*</span></FormLabel>
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
                          <FormLabel>Confirm Password <span className="text-red-500">*</span></FormLabel>
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
                            <FormLabel>First Name <span className="text-red-500">*</span></FormLabel>
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
                            <FormLabel>Last Name <span className="text-red-500">*</span></FormLabel>
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
                          <FormLabel>Email <span className="text-red-500">*</span></FormLabel>
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
                          <FormLabel>Specialty <span className="text-red-500">*</span></FormLabel>
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
                          <FormLabel>License Number <span className="text-red-500">*</span></FormLabel>
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

                    {/* Location Section */}
                    <div className="space-y-4 border-t pt-4">
                      <div className="flex items-center justify-between">
                        <FormLabel className="text-base font-medium">Practice Location</FormLabel>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={getCurrentLocation}
                          disabled={locationLoading}
                          className="flex items-center gap-2"
                        >
                          {locationLoading ? (
                            <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                          ) : (
                            <MapPin className="w-4 h-4" />
                          )}
                          {locationLoading ? 'Detecting...' : 'Use Current Location'}
                        </Button>
                      </div>

                      <FormField
                        control={providerSignupForm.control}
                        name="address"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Address <span className="text-red-500">*</span></FormLabel>
                            <FormControl>
                              <Input
                                placeholder="Enter practice address"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={providerSignupForm.control}
                          name="city"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>City <span className="text-red-500">*</span></FormLabel>
                              <FormControl>
                                <Input
                                  placeholder="City"
                                  {...field}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={providerSignupForm.control}
                          name="country"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Country <span className="text-red-500">*</span></FormLabel>
                              <FormControl>
                                <Input
                                  placeholder="Country"
                                  {...field}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      {currentLocation && (
                        <div className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg">
                          <div className="flex items-center gap-2 mb-1">
                            <MapPin className="w-4 h-4" />
                            <span className="font-medium">Location Detected</span>
                          </div>
                          <p>Lat: {currentLocation.lat.toFixed(6)}, Lng: {currentLocation.lng.toFixed(6)}</p>
                        </div>
                      )}
                    </div>

                    <FormField
                      control={providerSignupForm.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Password <span className="text-red-500">*</span></FormLabel>
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
                          <FormLabel>Confirm Password <span className="text-red-500">*</span></FormLabel>
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
