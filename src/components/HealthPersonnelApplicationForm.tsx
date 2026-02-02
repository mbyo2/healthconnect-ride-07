import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2, Eye, EyeOff } from "lucide-react";
import { ProviderRegistrationService, type ProviderRegistrationData, type ValidationErrors } from "@/services/ProviderRegistrationService";
import { useAuth } from "@/context/AuthContext";
import { useNavigate } from "react-router-dom";

export const HealthPersonnelApplicationForm = () => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [registrationStage, setRegistrationStage] = useState<string>("");
  const { refreshProfile } = useAuth();
  const navigate = useNavigate();
  
  const [formData, setFormData] = useState<ProviderRegistrationData>({
    email: "",
    password: "",
    confirmPassword: "",
    full_name: "",
    phone_number: "",
    license_number: "",
    specialty: "",
    years_of_experience: 0,
    documents_url: [],
  });
  
  const [errors, setErrors] = useState<ValidationErrors>({});

  // Real-time validation
  const validateField = (field: keyof ProviderRegistrationData, value: any) => {
    const tempData = { ...formData, [field]: value };
    const fieldErrors = ProviderRegistrationService.validateRegistrationData(tempData);
    
    setErrors(prev => ({
      ...prev,
      [field]: fieldErrors[field]
    }));
  };

  const handleInputChange = (field: keyof ProviderRegistrationData, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear error for this field if it exists
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
    
    // Perform real-time validation
    setTimeout(() => validateField(field, value), 100);
  };

  const validateForm = () => {
    const newErrors = ProviderRegistrationService.validateRegistrationData(formData);
    setErrors(newErrors);
    return !ProviderRegistrationService.hasValidationErrors(newErrors);
  };

  const isFormValid = () => {
    const currentErrors = ProviderRegistrationService.validateRegistrationData(formData);
    return !ProviderRegistrationService.hasValidationErrors(currentErrors);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsSubmitting(true);
    setRegistrationStage("Creating account...");

    try {
      // Show loading indicator with stage information (Requirement 4.1)
      toast.loading("Creating your account...", { id: "registration" });

      // Use the complete registration workflow
      const result = await ProviderRegistrationService.registerProvider(formData);

      if (result.success) {
        setRegistrationStage("Registration successful!");
        
        // Show success message before redirection (Requirement 4.2)
        toast.success("Registration successful! Redirecting to your dashboard...", { id: "registration" });
        
        // Refresh the user profile to include new role data
        setRegistrationStage("Setting up your profile...");
        await refreshProfile();
        
        // Redirect to provider dashboard
        setTimeout(() => {
          navigate("/provider-dashboard");
        }, 1500);
      } else {
        // Comprehensive error messaging system (Requirement 4.3)
        const errorMessage = result.error || "Registration failed";
        
        // Provide specific error messages based on transaction state
        let detailedError = errorMessage;
        if (result.transaction) {
          const { profileCreated, roleAssigned, applicationCreated, authenticationComplete } = result.transaction;
          
          if (!profileCreated && !roleAssigned && !applicationCreated && !authenticationComplete) {
            detailedError = "Account creation failed. Please check your email and try again.";
          } else if (profileCreated && !roleAssigned) {
            detailedError = "Account created but role assignment failed. Please contact support.";
          } else if (profileCreated && roleAssigned && !applicationCreated) {
            detailedError = "Account created but application submission failed. Please try again.";
          } else if (profileCreated && roleAssigned && applicationCreated && !authenticationComplete) {
            detailedError = "Registration completed but automatic login failed. Please try logging in manually.";
          }
        }
        
        throw new Error(detailedError);
      }
    } catch (error: any) {
      console.error("Error during registration:", error);
      
      // Comprehensive error messaging (Requirement 4.3, 4.4)
      const userFriendlyMessage = error.message || "Failed to complete registration. Please try again.";
      toast.error(userFriendlyMessage, { 
        id: "registration",
        duration: 6000 // Longer duration for error messages
      });
      
      setRegistrationStage("");
      
      // Form data is automatically preserved in state (Requirement 4.5)
      // No need to clear form data on error - it remains in formData state
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 w-full max-w-lg mx-auto p-4">
      {/* User Account Fields */}
      <div className="space-y-4 border-b pb-4 mb-4">
        <h3 className="text-lg font-semibold">Account Information</h3>
        
        <div>
          <Label htmlFor="email">Email Address *</Label>
          <Input
            id="email"
            type="email"
            placeholder="your.email@example.com"
            value={formData.email}
            onChange={(e) => handleInputChange('email', e.target.value)}
            className={errors.email ? "border-destructive" : ""}
            disabled={isSubmitting}
            required
          />
          {errors.email && (
            <p className="text-sm text-destructive mt-1">{errors.email}</p>
          )}
        </div>

        <div>
          <Label htmlFor="full_name">Full Name *</Label>
          <Input
            id="full_name"
            placeholder="Dr. John Smith"
            value={formData.full_name}
            onChange={(e) => handleInputChange('full_name', e.target.value)}
            className={errors.full_name ? "border-destructive" : ""}
            disabled={isSubmitting}
            required
          />
          {errors.full_name && (
            <p className="text-sm text-destructive mt-1">{errors.full_name}</p>
          )}
        </div>

        <div>
          <Label htmlFor="password">Password *</Label>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              placeholder="Enter a secure password"
              value={formData.password}
              onChange={(e) => handleInputChange('password', e.target.value)}
              className={errors.password ? "border-destructive pr-10" : "pr-10"}
              disabled={isSubmitting}
              required
            />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
              onClick={() => setShowPassword(!showPassword)}
              disabled={isSubmitting}
            >
              {showPassword ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </Button>
          </div>
          {errors.password && (
            <p className="text-sm text-destructive mt-1">{errors.password}</p>
          )}
        </div>

        <div>
          <Label htmlFor="confirmPassword">Confirm Password *</Label>
          <div className="relative">
            <Input
              id="confirmPassword"
              type={showConfirmPassword ? "text" : "password"}
              placeholder="Confirm your password"
              value={formData.confirmPassword}
              onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
              className={errors.confirmPassword ? "border-destructive pr-10" : "pr-10"}
              disabled={isSubmitting}
              required
            />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              disabled={isSubmitting}
            >
              {showConfirmPassword ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </Button>
          </div>
          {errors.confirmPassword && (
            <p className="text-sm text-destructive mt-1">{errors.confirmPassword}</p>
          )}
        </div>

        <div>
          <Label htmlFor="phone_number">Phone Number</Label>
          <Input
            id="phone_number"
            type="tel"
            placeholder="+1 (555) 123-4567"
            value={formData.phone_number}
            onChange={(e) => handleInputChange('phone_number', e.target.value)}
            className={errors.phone_number ? "border-destructive" : ""}
            disabled={isSubmitting}
          />
          {errors.phone_number && (
            <p className="text-sm text-destructive mt-1">{errors.phone_number}</p>
          )}
        </div>
      </div>

      {/* Professional Information */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Professional Information</h3>
        
        <div>
          <Label htmlFor="license_number">License Number *</Label>
          <Input
            id="license_number"
            placeholder="e.g., MD123456 or RN789012"
            value={formData.license_number}
            onChange={(e) => handleInputChange('license_number', e.target.value)}
            className={errors.license_number ? "border-destructive" : ""}
            disabled={isSubmitting}
            required
          />
          {errors.license_number && (
            <p className="text-sm text-destructive mt-1">{errors.license_number}</p>
          )}
        </div>

        <div>
          <Label htmlFor="specialty">Specialty *</Label>
          <Input
            id="specialty"
            placeholder="e.g., Cardiology, Pediatrics, General Practice"
            value={formData.specialty}
            onChange={(e) => handleInputChange('specialty', e.target.value)}
            className={errors.specialty ? "border-destructive" : ""}
            disabled={isSubmitting}
            required
          />
          {errors.specialty && (
            <p className="text-sm text-destructive mt-1">{errors.specialty}</p>
          )}
        </div>

        <div>
          <Label htmlFor="years_of_experience">Years of Experience *</Label>
          <Input
            id="years_of_experience"
            type="number"
            placeholder="e.g., 5"
            value={formData.years_of_experience}
            onChange={(e) => handleInputChange('years_of_experience', parseInt(e.target.value) || 0)}
            className={errors.years_of_experience ? "border-destructive" : ""}
            disabled={isSubmitting}
            required
            min="0"
          />
          {errors.years_of_experience && (
            <p className="text-sm text-destructive mt-1">{errors.years_of_experience}</p>
          )}
        </div>
      </div>

      <Button
        type="submit"
        className="w-full sm:w-auto"
        disabled={isSubmitting || !isFormValid()}
      >
        {isSubmitting ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            {registrationStage || "Creating Account..."}
          </>
        ) : (
          "Create Provider Account"
        )}
      </Button>
    </form>
  );
};