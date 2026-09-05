import { useState } from "react";
import { toast } from "sonner";
import { Loader2, Eye, EyeOff, Upload, X, CheckCircle, AlertCircle, UserCheck } from "lucide-react";
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

  const validateField = (field: keyof ProviderRegistrationData, value: any) => {
    const tempData = { ...formData, [field]: value };
    const fieldErrors = ProviderRegistrationService.validateRegistrationData(tempData);
    setErrors(prev => ({ ...prev, [field]: fieldErrors[field] }));
  };

  const handleInputChange = (field: keyof ProviderRegistrationData, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors(prev => ({ ...prev, [field]: undefined }));
    setTimeout(() => validateField(field, value), 100);
  };

  const isFormValid = () => {
    const currentErrors = ProviderRegistrationService.validateRegistrationData(formData);
    return !ProviderRegistrationService.hasValidationErrors(currentErrors) && documentValidation.valid;
  };

  const handleDocumentUpload = async (requirement: DocumentRequirement, file: File) => {
    if (requirement.fileType && !requirement.fileType.includes(file.type)) {
      toast.error(`Invalid file type. Allowed: ${requirement.fileType.join(", ")}`);
      return;
    }
    if (requirement.maxSizeMB && file.size > requirement.maxSizeMB * 1024 * 1024) {
      toast.error(`File too large. Max: ${requirement.maxSizeMB}MB`);
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      const base64 = e.target?.result as string;
      setUploadedDocuments(prev => ({ ...prev, [requirement.id]: base64 }));
      toast.success(`${requirement.name} uploaded`);
    };
    reader.readAsDataURL(file);
  };

  const removeDocument = (requirementId: string) => {
    setUploadedDocuments(prev => { const updated = { ...prev }; delete updated[requirementId]; return updated; });
  };

  const validateDocuments = () => {
    const requirements = getCountryRequirements(selectedCountry, "healthcareProfessionals");
    const validation = validateDocumentUpload(uploadedDocuments, requirements);
    setDocumentValidation(validation);
    return validation.valid;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors = ProviderRegistrationService.validateRegistrationData(formData);
    setErrors(newErrors);
    if (ProviderRegistrationService.hasValidationErrors(newErrors)) return;
    if (!validateDocuments()) { toast.error("Please upload all required documents"); return; }

    setIsSubmitting(true);
    setRegistrationStage("Creating account...");
    const formDataWithDocs = { ...formData, documents_url: Object.values(uploadedDocuments) };

    try {
      toast.loading("Creating your account...", { id: "registration" });
      const result = await ProviderRegistrationService.registerProvider(formDataWithDocs);
      if (result.success) {
        setRegistrationStage("Registration successful!");
        toast.success("Registration successful! Application is pending admin review.", { id: "registration" });
        setRegistrationStage("Setting up your profile...");
        await refreshProfile();
        setTimeout(() => navigate("/application-status"), 1500);
      } else {
        throw new Error(result.error || "Registration failed");
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to complete registration.", { id: "registration", duration: 6000 });
      setRegistrationStage("");
    } finally {
      setIsSubmitting(false);
    }
  };

  const inputCls = (hasError?: string) =>
    `w-full p-2.5 rounded-md border ${hasError ? "border-[#e2445c]" : "border-[#c3c6d4]"} text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#0073ea]`;

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-xl mx-auto p-6 space-y-6 font-sans text-slate-900 dark:text-slate-100">
      {/* Section 1: Account */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 border-b border-[#e6e9ef] pb-2">
          <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-[#0073ea] text-white text-xs font-black">1</span>
          <h3 className="font-extrabold text-sm uppercase tracking-wide text-[#676879]">Account Information</h3>
        </div>

        {[
          { id: "email", label: "Email Address", type: "email", placeholder: "your.email@example.online", field: "email" as keyof ProviderRegistrationData },
          { id: "full_name", label: "Full Name", type: "text", placeholder: "Dr. Jane Smith", field: "full_name" as keyof ProviderRegistrationData },
          { id: "phone_number", label: "Phone Number", type: "tel", placeholder: "+260 97 123 4567", field: "phone_number" as keyof ProviderRegistrationData },
        ].map(f => (
          <div key={f.id}>
            <label htmlFor={f.id} className="text-xs font-extrabold text-[#676879] uppercase">{f.label} {f.field !== "phone_number" && <span className="text-[#e2445c]">*</span>}</label>
            <input
              id={f.id} type={f.type} placeholder={f.placeholder}
              value={String(formData[f.field])}
              onChange={(e) => handleInputChange(f.field, e.target.value)}
              disabled={isSubmitting} required={f.field !== "phone_number"}
              className={`mt-1 ${inputCls(errors[f.field])}`}
            />
            {errors[f.field] && <p className="text-[10px] text-[#e2445c] font-bold mt-1">{errors[f.field]}</p>}
          </div>
        ))}

        {/* Password fields */}
        {[
          { id: "password", label: "Password", show: showPassword, toggle: () => setShowPassword(v => !v), field: "password" as keyof ProviderRegistrationData },
          { id: "confirmPassword", label: "Confirm Password", show: showConfirmPassword, toggle: () => setShowConfirmPassword(v => !v), field: "confirmPassword" as keyof ProviderRegistrationData },
        ].map(f => (
          <div key={f.id}>
            <label htmlFor={f.id} className="text-xs font-extrabold text-[#676879] uppercase">{f.label} <span className="text-[#e2445c]">*</span></label>
            <div className="relative mt-1">
              <input
                id={f.id} type={f.show ? "text" : "password"}
                placeholder="••••••••"
                value={String(formData[f.field])}
                onChange={(e) => handleInputChange(f.field, e.target.value)}
                disabled={isSubmitting} required
                className={`pr-10 ${inputCls(errors[f.field])}`}
              />
              <button type="button" onClick={f.toggle} disabled={isSubmitting} className="absolute right-2.5 top-2.5 text-[#676879]">
                {f.show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {errors[f.field] && <p className="text-[10px] text-[#e2445c] font-bold mt-1">{errors[f.field]}</p>}
          </div>
        ))}
      </div>

      {/* Section 2: Professional */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 border-b border-[#e6e9ef] pb-2">
          <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-[#a25ddc] text-white text-xs font-black">2</span>
          <h3 className="font-extrabold text-sm uppercase tracking-wide text-[#676879]">Professional Information</h3>
        </div>

        <div>
          <label className="text-xs font-extrabold text-[#676879] uppercase">Country of Practice <span className="text-[#e2445c]">*</span></label>
          <div className="mt-1">
            <Select value={selectedCountry} onValueChange={(v) => { setSelectedCountry(v); setUploadedDocuments({}); }} disabled={isSubmitting}>
              <SelectTrigger className="border border-[#c3c6d4] text-xs font-bold">
                <SelectValue placeholder="Select country" />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(REGULATORY_REQUIREMENTS).map(([code, country]) => (
                  <SelectItem key={code} value={code}>{country.countryName}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {[
          { id: "license_number", label: "License Number", placeholder: "e.g. MD123456", field: "license_number" as keyof ProviderRegistrationData },
          { id: "specialty", label: "Specialty", placeholder: "e.g. Cardiology, General Practice", field: "specialty" as keyof ProviderRegistrationData },
        ].map(f => (
          <div key={f.id}>
            <label htmlFor={f.id} className="text-xs font-extrabold text-[#676879] uppercase">{f.label} <span className="text-[#e2445c]">*</span></label>
            <input
              id={f.id} type="text" placeholder={f.placeholder}
              value={String(formData[f.field])}
              onChange={(e) => handleInputChange(f.field, e.target.value)}
              disabled={isSubmitting} required
              className={`mt-1 ${inputCls(errors[f.field])}`}
            />
            {errors[f.field] && <p className="text-[10px] text-[#e2445c] font-bold mt-1">{errors[f.field]}</p>}
          </div>
        ))}

        <div>
          <label htmlFor="years_of_experience" className="text-xs font-extrabold text-[#676879] uppercase">Years of Experience <span className="text-[#e2445c]">*</span></label>
          <input
            id="years_of_experience" type="number" placeholder="e.g. 5" min="0"
            value={formData.years_of_experience}
            onChange={(e) => handleInputChange("years_of_experience", parseInt(e.target.value) || 0)}
            disabled={isSubmitting} required
            className={`mt-1 ${inputCls(errors.years_of_experience)}`}
          />
          {errors.years_of_experience && <p className="text-[10px] text-[#e2445c] font-bold mt-1">{errors.years_of_experience}</p>}
        </div>
      </div>

      {/* Section 3: Documents */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 border-b border-[#e6e9ef] pb-2">
          <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-[#00c875] text-white text-xs font-black">3</span>
          <h3 className="font-extrabold text-sm uppercase tracking-wide text-[#676879]">Regulatory Documents</h3>
        </div>
        <p className="text-xs text-[#676879]">
          Upload required documents for <strong>{REGULATORY_REQUIREMENTS[selectedCountry]?.countryName}</strong>. All required docs must be uploaded before submission.
        </p>

        <div className="space-y-3">
          {getCountryRequirements(selectedCountry, "healthcareProfessionals").map((requirement) => (
            <div key={requirement.id} className="p-3 rounded-xl border border-[#e6e9ef] bg-[#f5f6f8]">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1">
                  <p className="font-extrabold text-xs flex items-center gap-1">
                    {requirement.name}
                    {requirement.required && <span className="text-[#e2445c]">*</span>}
                  </p>
                  <p className="text-[10px] text-[#676879] mt-0.5">{requirement.description}</p>
                  {requirement.maxSizeMB && <p className="text-[10px] text-[#676879]">Max: {requirement.maxSizeMB}MB</p>}
                </div>
                {uploadedDocuments[requirement.id] ? (
                  <div className="flex items-center gap-1">
                    <CheckCircle className="h-4 w-4 text-[#00c875]" />
                    <button type="button" onClick={() => removeDocument(requirement.id)} disabled={isSubmitting} className="text-[#e2445c]">
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ) : requirement.required ? (
                  <AlertCircle className="h-4 w-4 text-[#fdab3d]" />
                ) : null}
              </div>
              {!uploadedDocuments[requirement.id] && (
                <div className="mt-2">
                  <input
                    type="file" id={`doc-${requirement.id}`}
                    accept={requirement.fileType?.join(",")}
                    onChange={(e) => { const file = e.target.files?.[0]; if (file) handleDocumentUpload(requirement, file); }}
                    disabled={isSubmitting} className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => document.getElementById(`doc-${requirement.id}`)?.click()}
                    disabled={isSubmitting}
                    className="w-full py-1.5 rounded-md border border-[#c3c6d4] bg-white text-xs font-bold flex items-center justify-center gap-1 hover:bg-[#f0f2f7]"
                  >
                    <Upload className="h-3.5 w-3.5" /> Upload Document
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>

        {!documentValidation.valid && documentValidation.missing.length > 0 && (
          <div className="p-3 rounded-xl border border-[#e2445c]/30 bg-[#e2445c]/5">
            <p className="text-xs font-extrabold text-[#e2445c] mb-1">Missing Required Documents:</p>
            <ul className="text-xs text-[#e2445c] list-disc list-inside space-y-0.5">
              {documentValidation.missing.map((doc) => <li key={doc}>{doc}</li>)}
            </ul>
          </div>
        )}
      </div>

      {/* Section 4: Practice Details (optional but recommended) */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 border-b border-[#e6e9ef] pb-2">
          <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-[#fdab3d] text-white text-xs font-black">4</span>
          <h3 className="font-extrabold text-sm uppercase tracking-wide text-[#676879]">Practice Details <span className="text-[10px] normal-case font-medium">(optional — can be completed after approval)</span></h3>
        </div>

        {/* Medical School & Graduation */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-extrabold text-[#676879] uppercase">Medical School</label>
            <input
              type="text"
              placeholder="e.g. UNZA School of Medicine"
              value={(formData as any).medical_school || ""}
              onChange={e => setFormData(prev => ({ ...prev, medical_school: e.target.value }))}
              disabled={isSubmitting}
              className="mt-1 w-full px-3 py-2 rounded-xl border border-[#c3c6d4] text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#0073ea]"
            />
          </div>
          <div>
            <label className="text-xs font-extrabold text-[#676879] uppercase">Graduation Year</label>
            <input
              type="number"
              min="1960"
              max="2030"
              placeholder="e.g. 2015"
              value={(formData as any).graduation_year || ""}
              onChange={e => setFormData(prev => ({ ...prev, graduation_year: parseInt(e.target.value) || undefined }))}
              disabled={isSubmitting}
              className="mt-1 w-full px-3 py-2 rounded-xl border border-[#c3c6d4] text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#0073ea]"
            />
          </div>
        </div>

        {/* Practice Location */}
        <div>
          <label className="text-xs font-extrabold text-[#676879] uppercase">Primary Practice Location</label>
          <input
            type="text"
            placeholder="e.g. Woodlands Clinic, Lusaka"
            value={(formData as any).primary_practice_location || ""}
            onChange={e => setFormData(prev => ({ ...prev, primary_practice_location: e.target.value }))}
            disabled={isSubmitting}
            className="mt-1 w-full px-3 py-2 rounded-xl border border-[#c3c6d4] text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#0073ea]"
          />
        </div>

        {/* Consultation Fees */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-extrabold text-[#676879] uppercase">Min Consultation Fee (ZMW)</label>
            <input
              type="number"
              min="0"
              placeholder="e.g. 200"
              value={(formData as any).consultation_fee_min || ""}
              onChange={e => setFormData(prev => ({ ...prev, consultation_fee_min: parseFloat(e.target.value) || undefined }))}
              disabled={isSubmitting}
              className="mt-1 w-full px-3 py-2 rounded-xl border border-[#c3c6d4] text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#0073ea]"
            />
          </div>
          <div>
            <label className="text-xs font-extrabold text-[#676879] uppercase">Max Consultation Fee (ZMW)</label>
            <input
              type="number"
              min="0"
              placeholder="e.g. 500"
              value={(formData as any).consultation_fee_max || ""}
              onChange={e => setFormData(prev => ({ ...prev, consultation_fee_max: parseFloat(e.target.value) || undefined }))}
              disabled={isSubmitting}
              className="mt-1 w-full px-3 py-2 rounded-xl border border-[#c3c6d4] text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#0073ea]"
            />
          </div>
        </div>

        {/* Typical Wait Time */}
        <div>
          <label className="text-xs font-extrabold text-[#676879] uppercase">Typical Wait Time</label>
          <Select
            value={(formData as any).typical_wait_time || ""}
            onValueChange={v => setFormData(prev => ({ ...prev, typical_wait_time: v }))}
            disabled={isSubmitting}
          >
            <SelectTrigger className="mt-1 border-[#c3c6d4] text-xs font-bold">
              <SelectValue placeholder="Select typical wait time" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Same day">Same day</SelectItem>
              <SelectItem value="1–2 days">1–2 days</SelectItem>
              <SelectItem value="3–5 days">3–5 days</SelectItem>
              <SelectItem value="1–2 weeks">1–2 weeks</SelectItem>
              <SelectItem value="2+ weeks">2+ weeks</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Service toggles */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {([
            { key: "telemedicine_available", label: "Telemedicine Available" },
            { key: "home_visits_available", label: "Home Visits Available" },
            { key: "accepts_insurance", label: "Accepts Insurance" },
          ] as const).map(item => (
            <div key={item.key} className="flex items-center justify-between p-3 border border-[#e6e9ef] rounded-xl">
              <label className="text-xs font-bold text-slate-700">{item.label}</label>
              <div
                role="checkbox"
                aria-checked={(formData as any)[item.key] ?? false}
                tabIndex={0}
                onClick={() => !isSubmitting && setFormData(prev => ({ ...prev, [item.key]: !(prev as any)[item.key] }))}
                onKeyDown={e => e.key === " " && !isSubmitting && setFormData(prev => ({ ...prev, [item.key]: !(prev as any)[item.key] }))}
                className={`w-10 h-5 rounded-full transition-all cursor-pointer flex items-center px-0.5 ${(formData as any)[item.key] ? 'bg-[#0073ea] justify-end' : 'bg-slate-200 justify-start'}`}
              >
                <div className="w-4 h-4 rounded-full bg-white shadow-sm" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Submit */}
      <button
        type="submit"
        disabled={isSubmitting || !isFormValid()}
        className="w-full py-3 rounded-xl bg-[#0073ea] hover:bg-[#0060c4] disabled:opacity-40 text-white font-extrabold text-sm flex items-center justify-center gap-2 shadow-md transition-all"
      >
        {isSubmitting ? (
          <><Loader2 className="h-4 w-4 animate-spin" />{registrationStage || "Creating Account..."}</>
        ) : (
          <><UserCheck className="h-4 w-4" />Create Provider Account</>
        )}
      </button>
    </form>
  );
};
