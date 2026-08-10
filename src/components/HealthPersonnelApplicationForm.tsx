import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2, Eye, EyeOff, Upload, X, CheckCircle, AlertCircle } from "lucide-react";
import { ProviderRegistrationService, type ProviderRegistrationData, type ValidationErrors } from "@/services/ProviderRegistrationService";
import { useAuth } from "@/context/AuthContext";
import { useNavigate } from "react-router-dom";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { REGULATORY_REQUIREMENTS, getCountryRequirements, validateDocumentUpload, type DocumentRequirement } from "@/config/regulatoryRequirements";

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
  const [selectedCountry, setSelectedCountry] = useState<string>("ZM");
  const [uploadedDocuments, setUploadedDocuments] = useState<Record<string, string>>({});
  const [documentValidation, setDocumentValidation] = useState<{ valid: boolean; missing: string[] }>({ valid: true, missing: [] });
  
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
    const hasFormErrors = ProviderRegistrationService.hasValidationErrors(currentErrors);
    const hasDocumentErrors = !documentValidation.valid;
    return !hasFormErrors && !hasDocumentErrors;
  };

  const handleDocumentUpload = async (requirement: DocumentRequirement, file: File) => {
    // Validate file type
    if (requirement.fileType && !requirement.fileType.includes(file.type)) {
      toast.error(`Invalid file type. Allowed: ${requirement.fileType.join(', ')}`);
      return;
    }

    // Validate file size
    if (requirement.maxSizeMB && file.size > requirement.maxSizeMB * 1024 * 1024) {
      toast.error(`File too large. Maximum size: ${requirement.maxSizeMB}MB`);
      return;
    }

    // In production, upload to Supabase Storage
    // For now, store as base64 for demo
    const reader = new FileReader();
    reader.onload = (e) => {
      const base64 = e.target?.result as string;
      setUploadedDocuments(prev => ({ ...prev, [requirement.id]: base64 }));
      toast.success(`${requirement.name} uploaded successfully`);
    };
    reader.readAsDataURL(file);
  };

  const removeDocument = (requirementId: string) => {
    setUploadedDocuments(prev => {
      const updated = { ...prev };
      delete updated[requirementId];
      return updated;
    });
  };

  const validateDocuments = () => {
    const requirements = getCountryRequirements(selectedCountry, 'healthcareProfessionals');
    const validation = validateDocumentUpload(uploadedDocuments, requirements);
    setDocumentValidation(validation);
    return validation.valid;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    if (!validateDocuments()) {
      toast.error("Please upload all required documents");
      return;
    }

    setIsSubmitting(true);
    setRegistrationStage("Creating account...");

    // Include uploaded documents in form data
    const formDataWithDocs = {
      ...formData,
      documents_url: Object.values(uploadedDocuments)
    };

    try {
      // Show loading indicator with stage information (Requirement 4.1)
      toast.loading("Creating your account...", { id: "registration" });

      // Use the complete registration workflow
      const result = await ProviderRegistrationService.registerProvider(formDataWithDocs);

      if (result.success) {
        setRegistrationStage("Registration successful!");
        
        // Show success message before redirection
        toast.success("Registration successful! Your application is pending admin review.", { id: "registration" });
        
        // Refresh the user profile to include new role data
        setRegistrationStage("Setting up your profile...");
        await refreshProfile();
        
        // Redirect to application status so the user can track review progress
        setTimeout(() => {
          navigate("/application-status");
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
            placeholder="your.email@example.online"
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
          <Label htmlFor="country">Country of Practice *</Label>
          <Select
            value={selectedCountry}
            onValueChange={(value) => {
              setSelectedCountry(value);
              setUploadedDocuments({}); // Clear documents when country changes
              validateDocuments();
            }}
            disabled={isSubmitting}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select country" />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(REGULATORY_REQUIREMENTS).map(([code, country]) => (
                <SelectItem key={code} value={code}>
                  {country.countryName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
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

      {/* Document Upload Section */}
      <div className="space-y-4 border-t pt-4 mt-4">
        <h3 className="text-lg font-semibold">Regulatory Documents</h3>
        <p className="text-sm text-muted-foreground">
          Upload required documents for {REGULATORY_REQUIREMENTS[selectedCountry]?.countryName}. 
          All required documents must be uploaded before submission.
        </p>

        {getCountryRequirements(selectedCountry, 'healthcareProfessionals').map((requirement) => (
          <div key={requirement.id} className="border rounded-lg p-4 space-y-2">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <Label className="flex items-center gap-2">
                  {requirement.name}
                  {requirement.required && <span className="text-destructive">*</span>}
                </Label>
                <p className="text-sm text-muted-foreground mt-1">{requirement.description}</p>
                {requirement.maxSizeMB && (
                  <p className="text-xs text-muted-foreground">Max size: {requirement.maxSizeMB}MB</p>
                )}
              </div>
              {uploadedDocuments[requirement.id] ? (
                <div className="flex items-center gap-2 text-green-600">
                  <CheckCircle className="h-5 w-5" />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeDocument(requirement.id)}
                    disabled={isSubmitting}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  {requirement.required && !uploadedDocuments[requirement.id] && (
                    <AlertCircle className="h-5 w-5 text-amber-500" />
                  )}
                </div>
              )}
            </div>

            {!uploadedDocuments[requirement.id] && (
              <div className="relative">
                <Input
                  type="file"
                  id={`doc-${requirement.id}`}
                  accept={requirement.fileType?.join(',')}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleDocumentUpload(requirement, file);
                  }}
                  disabled={isSubmitting}
                  className="hidden"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => document.getElementById(`doc-${requirement.id}`)?.click()}
                  disabled={isSubmitting}
                  className="w-full"
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Upload Document
                </Button>
              </div>
            )}
          </div>
        ))}

        {!documentValidation.valid && documentValidation.missing.length > 0 && (
          <div className="bg-destructive/10 border border-destructive rounded-lg p-4">
            <p className="text-sm font-semibold text-destructive mb-2">Missing Required Documents:</p>
            <ul className="text-sm text-destructive list-disc list-inside space-y-1">
              {documentValidation.missing.map((doc) => (
                <li key={doc}>{doc}</li>
              ))}
            </ul>
          </div>
        )}
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
