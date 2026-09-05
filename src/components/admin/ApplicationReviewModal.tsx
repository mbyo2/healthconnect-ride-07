import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  User,
  Building2,
  GraduationCap,
  Briefcase,
  DollarSign,
  FileText,
  Shield,
  CheckCircle,
  AlertCircle,
  Clock,
  MapPin,
  Phone,
  Mail,
  ExternalLink,
  Loader2,
  Award,
  Stethoscope,
  Calendar,
} from "lucide-react";

interface ProviderApplication {
  id: string;
  user_id: string;
  license_number: string;
  specialty: string;
  years_of_experience: number;
  status: string;
  documents_url: string[] | null;
  created_at: string;
  review_notes: string | null;
  profile?: {
    first_name: string | null;
    last_name: string | null;
    email: string | null;
    phone: string | null;
    country: string | null;
    medical_school?: string | null;
    graduation_year?: number | null;
    board_certifications?: string[];
    subspecialties?: string[];
    languages_spoken?: string[];
    primary_practice_location?: string | null;
    affiliated_hospitals?: string[];
    consultation_fee_min?: number | null;
    consultation_fee_max?: number | null;
    accepts_insurance?: boolean;
    insurance_providers_accepted?: string[];
    telemedicine_available?: boolean;
    home_visits_available?: boolean;
  } | null;
}

interface InstitutionApplication {
  id: string;
  admin_id: string;
  name: string;
  type: string;
  license_number: string;
  address: string;
  city?: string;
  state?: string;
  country: string;
  phone: string;
  email: string;
  website?: string;
  status: string;
  created_at: string;
  list_in_marketplace?: boolean;
  operational_since?: string;
  number_of_beds?: number;
  number_of_staff?: number;
  emergency_services?: boolean;
  ambulance_services?: boolean;
  is_24_7?: boolean;
  accreditation_body?: string;
  accreditation_number?: string;
  tax_id?: string;
  business_registration_number?: string;
  bank_name?: string;
  bank_account_number?: string;
  services_offered?: string[];
  equipment_available?: string[];
  languages_spoken?: string[];
}

interface VerificationChecklistItem {
  id: string;
  label: string;
  checked: boolean;
  description?: string;
}

interface ApplicationReviewModalProps {
  application: ProviderApplication | InstitutionApplication | null;
  applicationType: "provider" | "institution";
  onClose: () => void;
  onDecision: (decision: "approved" | "rejected", notes: string) => Promise<void>;
}

export const ApplicationReviewModal = ({
  application,
  applicationType,
  onClose,
  onDecision,
}: ApplicationReviewModalProps) => {
  const [currentTab, setCurrentTab] = useState("basic");
  const [reviewNotes, setReviewNotes] = useState("");
  const [processing, setProcessing] = useState(false);
  const [verificationChecklist, setVerificationChecklist] = useState<VerificationChecklistItem[]>([]);

  useEffect(() => {
    if (application) {
      setReviewNotes(('review_notes' in application && application.review_notes) || "");
      
      // Initialize verification checklist based on application type
      if (applicationType === "provider") {
        setVerificationChecklist([
          { id: 'license', label: 'License verified with regulatory body', checked: false, description: 'Confirm license is valid and active' },
          { id: 'credentials', label: 'Educational credentials verified', checked: false, description: 'Medical school and graduation confirmed' },
          { id: 'certifications', label: 'Board certifications validated', checked: false, description: 'All claimed certifications are genuine' },
          { id: 'references', label: 'Professional references contacted', checked: false, description: 'At least 2 references verified' },
          { id: 'background', label: 'Background check completed', checked: false, description: 'No concerning findings' },
          { id: 'insurance', label: 'Professional indemnity insurance verified', checked: false, description: 'Valid insurance coverage confirmed' },
        ]);
      } else {
        setVerificationChecklist([
          { id: 'license', label: 'Business/operating license verified', checked: false, description: 'Valid license from regulatory authority' },
          { id: 'address', label: 'Physical address confirmed', checked: false, description: 'Location verified via Google Maps or site visit' },
          { id: 'accreditation', label: 'Accreditation status verified', checked: false, description: 'Accreditation body contacted and confirmed' },
          { id: 'tax', label: 'Tax clearance current', checked: false, description: 'Tax compliance verified' },
          { id: 'insurance', label: 'Institution insurance verified', checked: false, description: 'Professional liability insurance confirmed' },
          { id: 'facilities', label: 'Facilities inspection completed', checked: false, description: 'On-site or photo verification' },
          { id: 'financial', label: 'Banking details verified', checked: false, description: 'Account ownership confirmed' },
          { id: 'staff', label: 'Staff credentials reviewed', checked: false, description: 'Key staff qualifications verified' },
        ]);
      }
    }
  }, [application, applicationType]);

  if (!application) return null;

  const toggleChecklistItem = (id: string) => {
    setVerificationChecklist((prev) =>
      prev.map((item) => (item.id === id ? { ...item, checked: !item.checked } : item))
    );
  };

  const allRequiredChecksComplete = verificationChecklist.every((item) => item.checked);

  const handleDecision = async (decision: "approved" | "rejected") => {
    if (decision === "approved" && !allRequiredChecksComplete) {
      toast.error("Please complete all verification checklist items before approving");
      return;
    }

    if (decision === "rejected" && !reviewNotes.trim()) {
      toast.error("Please provide a reason for rejection");
      return;
    }

    setProcessing(true);
    try {
      // Save verification checklist to extended data
      await supabase.from('application_extended_data').upsert({
        application_id: application.id,
        application_type: applicationType,
        verification_checklist: verificationChecklist,
        admin_notes: [{
          note: reviewNotes,
          timestamp: new Date().toISOString(),
          decision,
        }],
      });

      await onDecision(decision, reviewNotes);
      onClose();
    } catch (error: any) {
      console.error("Error processing decision:", error);
      toast.error(error.message || "Failed to process decision");
    } finally {
      setProcessing(false);
    }
  };

  const renderProviderBasicInfo = (app: ProviderApplication) => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <User className="h-5 w-5" />
          Provider Information
        </CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-2 gap-4">
        <div>
          <Label className="text-muted-foreground">Full Name</Label>
          <p className="font-semibold">{app.profile?.first_name} {app.profile?.last_name}</p>
        </div>
        <div>
          <Label className="text-muted-foreground">Email</Label>
          <p className="font-semibold flex items-center gap-2">
            <Mail className="h-4 w-4" />
            {app.profile?.email}
          </p>
        </div>
        <div>
          <Label className="text-muted-foreground">Phone</Label>
          <p className="font-semibold flex items-center gap-2">
            <Phone className="h-4 w-4" />
            {app.profile?.phone || "Not provided"}
          </p>
        </div>
        <div>
          <Label className="text-muted-foreground">Country</Label>
          <p className="font-semibold flex items-center gap-2">
            <MapPin className="h-4 w-4" />
            {app.profile?.country || "Not specified"}
          </p>
        </div>
        <div>
          <Label className="text-muted-foreground">License Number</Label>
          <p className="font-semibold font-mono">{app.license_number}</p>
        </div>
        <div>
          <Label className="text-muted-foreground">Specialty</Label>
          <p className="font-semibold">{app.specialty}</p>
        </div>
        <div>
          <Label className="text-muted-foreground">Years of Experience</Label>
          <p className="font-semibold">{app.years_of_experience} years</p>
        </div>
        <div>
          <Label className="text-muted-foreground">Application Date</Label>
          <p className="font-semibold flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            {new Date(app.created_at).toLocaleDateString()}
          </p>
        </div>
      </CardContent>
    </Card>
  );

  const renderProviderProfessionalInfo = (app: ProviderApplication) => (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <GraduationCap className="h-5 w-5" />
            Education & Qualifications
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {app.profile?.medical_school && (
            <div>
              <Label className="text-muted-foreground">Medical School</Label>
              <p className="font-semibold">{app.profile.medical_school}</p>
            </div>
          )}
          {app.profile?.graduation_year && (
            <div>
              <Label className="text-muted-foreground">Graduation Year</Label>
              <p className="font-semibold">{app.profile.graduation_year}</p>
            </div>
          )}
          {app.profile?.board_certifications && app.profile.board_certifications.length > 0 && (
            <div>
              <Label className="text-muted-foreground">Board Certifications</Label>
              <div className="flex flex-wrap gap-2 mt-2">
                {app.profile.board_certifications.map((cert) => (
                  <Badge key={cert} variant="secondary">{cert}</Badge>
                ))}
              </div>
            </div>
          )}
          {app.profile?.subspecialties && app.profile.subspecialties.length > 0 && (
            <div>
              <Label className="text-muted-foreground">Subspecialties</Label>
              <div className="flex flex-wrap gap-2 mt-2">
                {app.profile.subspecialties.map((sub) => (
                  <Badge key={sub} variant="outline">{sub}</Badge>
                ))}
              </div>
            </div>
          )}
          {app.profile?.languages_spoken && app.profile.languages_spoken.length > 0 && (
            <div>
              <Label className="text-muted-foreground">Languages Spoken</Label>
              <div className="flex flex-wrap gap-2 mt-2">
                {app.profile.languages_spoken.map((lang) => (
                  <Badge key={lang}>{lang}</Badge>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Briefcase className="h-5 w-5" />
            Practice Details
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {app.profile?.primary_practice_location && (
            <div>
              <Label className="text-muted-foreground">Primary Practice Location</Label>
              <p className="font-semibold">{app.profile.primary_practice_location}</p>
            </div>
          )}
          {app.profile?.affiliated_hospitals && app.profile.affiliated_hospitals.length > 0 && (
            <div>
              <Label className="text-muted-foreground">Affiliated Hospitals</Label>
              <div className="flex flex-wrap gap-2 mt-2">
                {app.profile.affiliated_hospitals.map((hospital) => (
                  <Badge key={hospital} variant="secondary">{hospital}</Badge>
                ))}
              </div>
            </div>
          )}
          {(app.profile?.consultation_fee_min || app.profile?.consultation_fee_max) && (
            <div>
              <Label className="text-muted-foreground">Consultation Fee Range</Label>
              <p className="font-semibold">
                ZMW {app.profile.consultation_fee_min || 0} - {app.profile.consultation_fee_max || 0}
              </p>
            </div>
          )}
          <div className="flex gap-4">
            {app.profile?.accepts_insurance && (
              <Badge variant="default">Accepts Insurance</Badge>
            )}
            {app.profile?.telemedicine_available && (
              <Badge variant="default">Telemedicine Available</Badge>
            )}
            {app.profile?.home_visits_available && (
              <Badge variant="default">Home Visits Available</Badge>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const renderInstitutionBasicInfo = (app: InstitutionApplication) => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Building2 className="h-5 w-5" />
          Institution Information
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label className="text-muted-foreground">Institution Name</Label>
            <p className="font-semibold">{app.name}</p>
          </div>
          <div>
            <Label className="text-muted-foreground">Type</Label>
            <p className="font-semibold capitalize">{app.type.replace(/_/g, ' ')}</p>
          </div>
          <div>
            <Label className="text-muted-foreground">License Number</Label>
            <p className="font-semibold font-mono">{app.license_number}</p>
          </div>
          <div>
            <Label className="text-muted-foreground">Application Date</Label>
            <p className="font-semibold flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              {new Date(app.created_at).toLocaleDateString()}
            </p>
          </div>
        </div>

        <div>
          <Label className="text-muted-foreground">Address</Label>
          <p className="font-semibold">
            {app.address}
            {app.city && `, ${app.city}`}
            {app.state && `, ${app.state}`}
            {app.country && ` - ${app.country}`}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label className="text-muted-foreground">Email</Label>
            <p className="font-semibold flex items-center gap-2">
              <Mail className="h-4 w-4" />
              {app.email}
            </p>
          </div>
          <div>
            <Label className="text-muted-foreground">Phone</Label>
            <p className="font-semibold flex items-center gap-2">
              <Phone className="h-4 w-4" />
              {app.phone}
            </p>
          </div>
        </div>

        {app.website && (
          <div>
            <Label className="text-muted-foreground">Website</Label>
            <a
              href={app.website}
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-primary hover:underline flex items-center gap-2"
            >
              {app.website}
              <ExternalLink className="h-4 w-4" />
            </a>
          </div>
        )}

        <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
          {app.list_in_marketplace ? (
            <>
              <CheckCircle className="h-5 w-5 text-green-600" />
              <div>
                <p className="font-semibold">Public Marketplace Listing</p>
                <p className="text-sm text-muted-foreground">Will be searchable by patients</p>
              </div>
            </>
          ) : (
            <>
              <AlertCircle className="h-5 w-5 text-amber-600" />
              <div>
                <p className="font-semibold">HMS-Only Access</p>
                <p className="text-sm text-muted-foreground">Not publicly listed</p>
              </div>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );

  const renderInstitutionOperationalInfo = (app: InstitutionApplication) => (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Stethoscope className="h-5 w-5" />
            Operational Details
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            {app.operational_since && (
              <div>
                <Label className="text-muted-foreground">Operational Since</Label>
                <p className="font-semibold">{new Date(app.operational_since).toLocaleDateString()}</p>
              </div>
            )}
            {app.number_of_beds !== undefined && (
              <div>
                <Label className="text-muted-foreground">Number of Beds</Label>
                <p className="font-semibold">{app.number_of_beds}</p>
              </div>
            )}
            {app.number_of_staff !== undefined && (
              <div>
                <Label className="text-muted-foreground">Staff Count</Label>
                <p className="font-semibold">{app.number_of_staff}</p>
              </div>
            )}
          </div>

          <div className="flex gap-2">
            {app.emergency_services && <Badge variant="default">Emergency Services</Badge>}
            {app.ambulance_services && <Badge variant="default">Ambulance Services</Badge>}
            {app.is_24_7 && <Badge variant="default">Open 24/7</Badge>}
          </div>

          {app.services_offered && app.services_offered.length > 0 && (
            <div>
              <Label className="text-muted-foreground">Services Offered</Label>
              <div className="flex flex-wrap gap-2 mt-2">
                {app.services_offered.map((service) => (
                  <Badge key={service} variant="secondary">{service}</Badge>
                ))}
              </div>
            </div>
          )}

          {app.equipment_available && app.equipment_available.length > 0 && (
            <div>
              <Label className="text-muted-foreground">Equipment Available</Label>
              <div className="flex flex-wrap gap-2 mt-2">
                {app.equipment_available.map((equipment) => (
                  <Badge key={equipment} variant="outline">{equipment}</Badge>
                ))}
              </div>
            </div>
          )}

          {app.languages_spoken && app.languages_spoken.length > 0 && (
            <div>
              <Label className="text-muted-foreground">Languages Spoken</Label>
              <div className="flex flex-wrap gap-2 mt-2">
                {app.languages_spoken.map((lang) => (
                  <Badge key={lang}>{lang}</Badge>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Compliance & Financial
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            {app.accreditation_body && (
              <div>
                <Label className="text-muted-foreground">Accreditation Body</Label>
                <p className="font-semibold">{app.accreditation_body}</p>
              </div>
            )}
            {app.accreditation_number && (
              <div>
                <Label className="text-muted-foreground">Accreditation Number</Label>
                <p className="font-semibold font-mono">{app.accreditation_number}</p>
              </div>
            )}
            {app.tax_id && (
              <div>
                <Label className="text-muted-foreground">Tax ID</Label>
                <p className="font-semibold font-mono">{app.tax_id}</p>
              </div>
            )}
            {app.business_registration_number && (
              <div>
                <Label className="text-muted-foreground">Business Registration</Label>
                <p className="font-semibold font-mono">{app.business_registration_number}</p>
              </div>
            )}
          </div>

          {app.bank_name && (
            <div className="border-t pt-4">
              <Label className="text-muted-foreground">Banking Information</Label>
              <div className="grid grid-cols-2 gap-4 mt-2">
                <div>
                  <p className="text-sm text-muted-foreground">Bank Name</p>
                  <p className="font-semibold">{app.bank_name}</p>
                </div>
                {app.bank_account_number && (
                  <div>
                    <p className="text-sm text-muted-foreground">Account Number</p>
                    <p className="font-semibold font-mono">****{app.bank_account_number.slice(-4)}</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );

  const renderVerificationTab = () => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5" />
          Verification Checklist
        </CardTitle>
        <CardDescription>
          Complete all items before approving the application
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {verificationChecklist.map((item) => (
          <div key={item.id} className="flex items-start gap-3 p-3 border rounded-lg">
            <Checkbox
              id={`check-${item.id}`}
              checked={item.checked}
              onCheckedChange={() => toggleChecklistItem(item.id)}
              disabled={processing}
            />
            <div className="flex-1">
              <label htmlFor={`check-${item.id}`} className="font-semibold text-sm cursor-pointer flex items-center gap-2">
                {item.label}
                {item.checked && <CheckCircle className="h-4 w-4 text-green-600" />}
              </label>
              {item.description && (
                <p className="text-sm text-muted-foreground mt-1">{item.description}</p>
              )}
            </div>
          </div>
        ))}

        <div className="mt-6">
          <Label htmlFor="review_notes">Admin Review Notes</Label>
          <Textarea
            id="review_notes"
            value={reviewNotes}
            onChange={(e) => setReviewNotes(e.target.value)}
            placeholder="Add notes about the application review..."
            rows={4}
            disabled={processing}
            className="mt-2"
          />
        </div>

        {!allRequiredChecksComplete && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-start gap-2">
            <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-amber-900">Checklist Incomplete</p>
              <p className="text-sm text-amber-700 mt-1">
                All verification items must be completed before approving this application.
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );

  return (
    <Dialog open={!!application} onOpenChange={() => !processing && onClose()}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-2xl">
            {applicationType === "provider" ? "Provider" : "Institution"} Application Review
          </DialogTitle>
        </DialogHeader>

        <Tabs value={currentTab} onValueChange={setCurrentTab} className="flex-1 overflow-hidden flex flex-col">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="basic">
              {applicationType === "provider" ? <User className="h-4 w-4 mr-2" /> : <Building2 className="h-4 w-4 mr-2" />}
              Basic Info
            </TabsTrigger>
            <TabsTrigger value="details">
              {applicationType === "provider" ? <GraduationCap className="h-4 w-4 mr-2" /> : <Stethoscope className="h-4 w-4 mr-2" />}
              {applicationType === "provider" ? "Professional" : "Operational"}
            </TabsTrigger>
            <TabsTrigger value="verification">
              <Shield className="h-4 w-4 mr-2" />
              Verification
            </TabsTrigger>
          </TabsList>

          <div className="flex-1 overflow-y-auto mt-6">
            <TabsContent value="basic" className="mt-0">
              {applicationType === "provider"
                ? renderProviderBasicInfo(application as ProviderApplication)
                : renderInstitutionBasicInfo(application as InstitutionApplication)}
            </TabsContent>

            <TabsContent value="details" className="mt-0">
              {applicationType === "provider"
                ? renderProviderProfessionalInfo(application as ProviderApplication)
                : renderInstitutionOperationalInfo(application as InstitutionApplication)}
            </TabsContent>

            <TabsContent value="verification" className="mt-0">
              {renderVerificationTab()}
            </TabsContent>
          </div>
        </Tabs>

        <DialogFooter className="border-t pt-4">
          <Button variant="outline" onClick={onClose} disabled={processing}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={() => handleDecision("rejected")}
            disabled={processing || !reviewNotes.trim()}
          >
            {processing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : (
              "Reject"
            )}
          </Button>
          <Button
            onClick={() => handleDecision("approved")}
            disabled={processing || !allRequiredChecksComplete}
          >
            {processing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <CheckCircle className="mr-2 h-4 w-4" />
                Approve
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ApplicationReviewModal;
