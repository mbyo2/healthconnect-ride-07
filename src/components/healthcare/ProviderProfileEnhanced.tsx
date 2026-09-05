import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, GraduationCap, Briefcase, Clock, DollarSign, FileText, Plus, X, Info, Award, MapPin } from "lucide-react";

interface ProfessionalReference {
  name: string;
  title: string;
  institution: string;
  phone: string;
  email: string;
}

const COMMON_APPOINTMENT_TYPES = ['In-person', 'Telemedicine', 'Home Visit', 'Emergency Consultation'];
const COMMON_LANGUAGES = ['English', 'Bemba', 'Nyanja', 'Tonga', 'Lozi', 'Lunda', 'Kaonde', 'Luvale'];
const WAIT_TIME_OPTIONS = ['Less than 15 min', '15-30 min', '30-60 min', '1-2 hours', '2+ hours'];

export const ProviderProfileEnhanced = () => {
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentTab, setCurrentTab] = useState("education");
  
  const [formData, setFormData] = useState({
    // Educational Background
    medical_school: "",
    graduation_year: "",
    board_certifications: [] as string[],
    subspecialties: [] as string[],
    languages_spoken: [] as string[],
    research_publications: [] as string[],
    awards_recognition: [] as string[],
    
    // Practice Information
    primary_practice_location: "",
    affiliated_hospitals: [] as string[],
    consultation_fee_min: "",
    consultation_fee_max: "",
    accepts_insurance: false,
    insurance_providers_accepted: [] as string[],
    telemedicine_available: false,
    home_visits_available: false,
    typical_wait_time: "",
    appointment_types: [] as string[],
    
    // Availability Schedule
    availability_schedule: {
      monday: { available: true, hours: ["09:00-12:00", "14:00-17:00"] },
      tuesday: { available: true, hours: ["09:00-12:00", "14:00-17:00"] },
      wednesday: { available: true, hours: ["09:00-12:00", "14:00-17:00"] },
      thursday: { available: true, hours: ["09:00-12:00", "14:00-17:00"] },
      friday: { available: true, hours: ["09:00-12:00", "14:00-17:00"] },
      saturday: { available: false, hours: [] },
      sunday: { available: false, hours: [] },
    },
    
    // Professional References
    professional_references: [] as ProfessionalReference[],
  });

  // Multi-value input helpers
  const [certificationInput, setCertificationInput] = useState("");
  const [subspecialtyInput, setSubspecialtyInput] = useState("");
  const [publicationInput, setPublicationInput] = useState("");
  const [awardInput, setAwardInput] = useState("");
  const [hospitalInput, setHospitalInput] = useState("");
  const [insuranceInput, setInsuranceInput] = useState("");
  const [customLanguage, setCustomLanguage] = useState("");
  
  // Reference form
  const [showReferenceForm, setShowReferenceForm] = useState(false);
  const [referenceForm, setReferenceForm] = useState<ProfessionalReference>({
    name: "",
    title: "",
    institution: "",
    phone: "",
    email: "",
  });

  const toggleArrayItem = (array: string[], item: string, setter: (value: string[]) => void) => {
    if (array.includes(item)) {
      setter(array.filter(i => i !== item));
    } else {
      setter([...array, item]);
    }
  };

  const addToArray = (value: string, array: string[], setter: (value: string[]) => void, clearInput: () => void) => {
    if (value.trim() && !array.includes(value.trim())) {
      setter([...array, value.trim()]);
      clearInput();
    }
  };

  const removeFromArray = (value: string, array: string[], setter: (value: string[]) => void) => {
    setter(array.filter(item => item !== value));
  };

  const addReference = () => {
    if (referenceForm.name && referenceForm.email) {
      setFormData({
        ...formData,
        professional_references: [...formData.professional_references, referenceForm],
      });
      setReferenceForm({ name: "", title: "", institution: "", phone: "", email: "" });
      setShowReferenceForm(false);
      toast.success("Reference added");
    } else {
      toast.error("Name and email are required for references");
    }
  };

  const removeReference = (index: number) => {
    setFormData({
      ...formData,
      professional_references: formData.professional_references.filter((_, i) => i !== index),
    });
  };

  const addTimeSlot = (day: string) => {
    const daySchedule = formData.availability_schedule[day as keyof typeof formData.availability_schedule];
    const newSlot = "09:00-17:00";
    setFormData({
      ...formData,
      availability_schedule: {
        ...formData.availability_schedule,
        [day]: { ...daySchedule, hours: [...daySchedule.hours, newSlot] },
      },
    });
  };

  const updateTimeSlot = (day: string, index: number, value: string) => {
    const daySchedule = formData.availability_schedule[day as keyof typeof formData.availability_schedule];
    const newHours = [...daySchedule.hours];
    newHours[index] = value;
    setFormData({
      ...formData,
      availability_schedule: {
        ...formData.availability_schedule,
        [day]: { ...daySchedule, hours: newHours },
      },
    });
  };

  const removeTimeSlot = (day: string, index: number) => {
    const daySchedule = formData.availability_schedule[day as keyof typeof formData.availability_schedule];
    setFormData({
      ...formData,
      availability_schedule: {
        ...formData.availability_schedule,
        [day]: { ...daySchedule, hours: daySchedule.hours.filter((_, i) => i !== index) },
      },
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        toast.error("You must be logged in");
        return;
      }

      // Update the provider's profile with enhanced data
      const { error: profileError } = await supabase
        .from("profiles")
        .update({
          medical_school: formData.medical_school || null,
          graduation_year: formData.graduation_year ? parseInt(formData.graduation_year) : null,
          board_certifications: formData.board_certifications,
          subspecialties: formData.subspecialties,
          languages_spoken: formData.languages_spoken,
          research_publications: formData.research_publications,
          awards_recognition: formData.awards_recognition,
          primary_practice_location: formData.primary_practice_location || null,
          affiliated_hospitals: formData.affiliated_hospitals,
          consultation_fee_min: formData.consultation_fee_min ? parseFloat(formData.consultation_fee_min) : null,
          consultation_fee_max: formData.consultation_fee_max ? parseFloat(formData.consultation_fee_max) : null,
          accepts_insurance: formData.accepts_insurance,
          insurance_providers_accepted: formData.insurance_providers_accepted,
          telemedicine_available: formData.telemedicine_available,
          home_visits_available: formData.home_visits_available,
          typical_wait_time: formData.typical_wait_time || null,
          appointment_types: formData.appointment_types,
          availability_schedule: formData.availability_schedule,
          professional_references: formData.professional_references,
        })
        .eq("id", user.id);

      if (profileError) throw profileError;

      // Create or update application_extended_data
      const { error: extendedError } = await supabase
        .from('application_extended_data')
        .upsert({
          application_id: user.id,
          application_type: 'provider',
          extended_data: {
            profile_completed: true,
            completion_date: new Date().toISOString(),
          },
          verification_checklist: [],
          admin_notes: [],
        });

      if (extendedError) console.error("Error saving extended data:", extendedError);

      toast.success("Professional profile updated successfully!");
      navigate("/provider-dashboard");
    } catch (error: any) {
      console.error("Error updating profile:", error);
      toast.error(error.message || "Failed to update profile");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 w-full max-w-5xl mx-auto p-6">
      <div className="space-y-2">
        <h2 className="text-3xl font-bold">Complete Your Professional Profile</h2>
        <p className="text-muted-foreground">
          Provide comprehensive professional information to enhance your listing and help patients find you.
        </p>
      </div>

      <Tabs value={currentTab} onValueChange={setCurrentTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="education">
            <GraduationCap className="h-4 w-4 mr-2" />
            Education
          </TabsTrigger>
          <TabsTrigger value="practice">
            <Briefcase className="h-4 w-4 mr-2" />
            Practice
          </TabsTrigger>
          <TabsTrigger value="availability">
            <Clock className="h-4 w-4 mr-2" />
            Availability
          </TabsTrigger>
          <TabsTrigger value="references">
            <Award className="h-4 w-4 mr-2" />
            References
          </TabsTrigger>
        </TabsList>

        {/* EDUCATION TAB */}
        <TabsContent value="education" className="space-y-6 mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Educational Background</CardTitle>
              <CardDescription>Your medical education and qualifications</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="medical_school">Medical School</Label>
                  <Input
                    id="medical_school"
                    value={formData.medical_school}
                    onChange={(e) => setFormData({ ...formData, medical_school: e.target.value })}
                    disabled={isSubmitting}
                    placeholder="e.g., University of Zambia School of Medicine"
                  />
                </div>

                <div>
                  <Label htmlFor="graduation_year">Graduation Year</Label>
                  <Input
                    id="graduation_year"
                    type="number"
                    min="1950"
                    max={new Date().getFullYear()}
                    value={formData.graduation_year}
                    onChange={(e) => setFormData({ ...formData, graduation_year: e.target.value })}
                    disabled={isSubmitting}
                    placeholder="e.g., 2015"
                  />
                </div>
              </div>

              <div>
                <Label>Board Certifications</Label>
                <p className="text-sm text-muted-foreground mb-2">Add your professional certifications</p>
                <div className="flex flex-wrap gap-2 mb-3">
                  {formData.board_certifications.map((cert) => (
                    <Badge key={cert} variant="secondary" className="gap-1">
                      {cert}
                      <X
                        className="h-3 w-3 cursor-pointer"
                        onClick={() =>
                          removeFromArray(
                            cert,
                            formData.board_certifications,
                            (certs) => setFormData({ ...formData, board_certifications: certs })
                          )
                        }
                      />
                    </Badge>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Input
                    placeholder="e.g., Board Certified in Internal Medicine"
                    value={certificationInput}
                    onChange={(e) => setCertificationInput(e.target.value)}
                    disabled={isSubmitting}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        addToArray(
                          certificationInput,
                          formData.board_certifications,
                          (certs) => setFormData({ ...formData, board_certifications: certs }),
                          () => setCertificationInput("")
                        );
                      }
                    }}
                  />
                  <Button
                    type="button"
                    size="sm"
                    onClick={() =>
                      addToArray(
                        certificationInput,
                        formData.board_certifications,
                        (certs) => setFormData({ ...formData, board_certifications: certs }),
                        () => setCertificationInput("")
                      )
                    }
                    disabled={isSubmitting}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div>
                <Label>Subspecialties</Label>
                <p className="text-sm text-muted-foreground mb-2">Additional areas of expertise</p>
                <div className="flex flex-wrap gap-2 mb-3">
                  {formData.subspecialties.map((sub) => (
                    <Badge key={sub} variant="secondary" className="gap-1">
                      {sub}
                      <X
                        className="h-3 w-3 cursor-pointer"
                        onClick={() =>
                          removeFromArray(
                            sub,
                            formData.subspecialties,
                            (subs) => setFormData({ ...formData, subspecialties: subs })
                          )
                        }
                      />
                    </Badge>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Input
                    placeholder="e.g., Interventional Cardiology"
                    value={subspecialtyInput}
                    onChange={(e) => setSubspecialtyInput(e.target.value)}
                    disabled={isSubmitting}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        addToArray(
                          subspecialtyInput,
                          formData.subspecialties,
                          (subs) => setFormData({ ...formData, subspecialties: subs }),
                          () => setSubspecialtyInput("")
                        );
                      }
                    }}
                  />
                  <Button
                    type="button"
                    size="sm"
                    onClick={() =>
                      addToArray(
                        subspecialtyInput,
                        formData.subspecialties,
                        (subs) => setFormData({ ...formData, subspecialties: subs }),
                        () => setSubspecialtyInput("")
                      )
                    }
                    disabled={isSubmitting}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div>
                <Label>Languages Spoken</Label>
                <p className="text-sm text-muted-foreground mb-2">Select or add languages</p>
                <div className="flex flex-wrap gap-2 mb-3">
                  {COMMON_LANGUAGES.map((lang) => (
                    <Badge
                      key={lang}
                      variant={formData.languages_spoken.includes(lang) ? "default" : "outline"}
                      className="cursor-pointer"
                      onClick={() =>
                        toggleArrayItem(
                          formData.languages_spoken,
                          lang,
                          (langs) => setFormData({ ...formData, languages_spoken: langs })
                        )
                      }
                    >
                      {lang}
                    </Badge>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Input
                    placeholder="Add another language"
                    value={customLanguage}
                    onChange={(e) => setCustomLanguage(e.target.value)}
                    disabled={isSubmitting}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        addToArray(
                          customLanguage,
                          formData.languages_spoken,
                          (langs) => setFormData({ ...formData, languages_spoken: langs }),
                          () => setCustomLanguage("")
                        );
                      }
                    }}
                  />
                  <Button
                    type="button"
                    size="sm"
                    onClick={() =>
                      addToArray(
                        customLanguage,
                        formData.languages_spoken,
                        (langs) => setFormData({ ...formData, languages_spoken: langs }),
                        () => setCustomLanguage("")
                      )
                    }
                    disabled={isSubmitting}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div>
                <Label>Research Publications (Optional)</Label>
                <div className="flex flex-wrap gap-2 mb-3">
                  {formData.research_publications.map((pub) => (
                    <Badge key={pub} variant="secondary" className="gap-1">
                      {pub.length > 50 ? pub.substring(0, 50) + "..." : pub}
                      <X
                        className="h-3 w-3 cursor-pointer"
                        onClick={() =>
                          removeFromArray(
                            pub,
                            formData.research_publications,
                            (pubs) => setFormData({ ...formData, research_publications: pubs })
                          )
                        }
                      />
                    </Badge>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Input
                    placeholder="Publication title or citation"
                    value={publicationInput}
                    onChange={(e) => setPublicationInput(e.target.value)}
                    disabled={isSubmitting}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        addToArray(
                          publicationInput,
                          formData.research_publications,
                          (pubs) => setFormData({ ...formData, research_publications: pubs }),
                          () => setPublicationInput("")
                        );
                      }
                    }}
                  />
                  <Button
                    type="button"
                    size="sm"
                    onClick={() =>
                      addToArray(
                        publicationInput,
                        formData.research_publications,
                        (pubs) => setFormData({ ...formData, research_publications: pubs }),
                        () => setPublicationInput("")
                      )
                    }
                    disabled={isSubmitting}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div>
                <Label>Awards & Recognition (Optional)</Label>
                <div className="flex flex-wrap gap-2 mb-3">
                  {formData.awards_recognition.map((award) => (
                    <Badge key={award} variant="secondary" className="gap-1">
                      {award}
                      <X
                        className="h-3 w-3 cursor-pointer"
                        onClick={() =>
                          removeFromArray(
                            award,
                            formData.awards_recognition,
                            (awards) => setFormData({ ...formData, awards_recognition: awards })
                          )
                        }
                      />
                    </Badge>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Input
                    placeholder="Award or recognition"
                    value={awardInput}
                    onChange={(e) => setAwardInput(e.target.value)}
                    disabled={isSubmitting}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        addToArray(
                          awardInput,
                          formData.awards_recognition,
                          (awards) => setFormData({ ...formData, awards_recognition: awards }),
                          () => setAwardInput("")
                        );
                      }
                    }}
                  />
                  <Button
                    type="button"
                    size="sm"
                    onClick={() =>
                      addToArray(
                        awardInput,
                        formData.awards_recognition,
                        (awards) => setFormData({ ...formData, awards_recognition: awards }),
                        () => setAwardInput("")
                      )
                    }
                    disabled={isSubmitting}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* PRACTICE TAB */}
        <TabsContent value="practice" className="space-y-6 mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Practice Information</CardTitle>
              <CardDescription>Details about your medical practice</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="primary_practice_location">Primary Practice Location</Label>
                <Input
                  id="primary_practice_location"
                  value={formData.primary_practice_location}
                  onChange={(e) => setFormData({ ...formData, primary_practice_location: e.target.value })}
                  disabled={isSubmitting}
                  placeholder="e.g., Central Medical Clinic, Lusaka"
                />
              </div>

              <div>
                <Label>Affiliated Hospitals/Institutions</Label>
                <div className="flex flex-wrap gap-2 mb-3">
                  {formData.affiliated_hospitals.map((hospital) => (
                    <Badge key={hospital} variant="secondary" className="gap-1">
                      {hospital}
                      <X
                        className="h-3 w-3 cursor-pointer"
                        onClick={() =>
                          removeFromArray(
                            hospital,
                            formData.affiliated_hospitals,
                            (hospitals) => setFormData({ ...formData, affiliated_hospitals: hospitals })
                          )
                        }
                      />
                    </Badge>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Input
                    placeholder="Hospital or clinic name"
                    value={hospitalInput}
                    onChange={(e) => setHospitalInput(e.target.value)}
                    disabled={isSubmitting}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        addToArray(
                          hospitalInput,
                          formData.affiliated_hospitals,
                          (hospitals) => setFormData({ ...formData, affiliated_hospitals: hospitals }),
                          () => setHospitalInput("")
                        );
                      }
                    }}
                  />
                  <Button
                    type="button"
                    size="sm"
                    onClick={() =>
                      addToArray(
                        hospitalInput,
                        formData.affiliated_hospitals,
                        (hospitals) => setFormData({ ...formData, affiliated_hospitals: hospitals }),
                        () => setHospitalInput("")
                      )
                    }
                    disabled={isSubmitting}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div>
                <Label className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4" />
                  Consultation Fee Range
                </Label>
                <div className="grid grid-cols-2 gap-4 mt-2">
                  <div>
                    <Label htmlFor="consultation_fee_min" className="text-sm">Minimum (ZMW)</Label>
                    <Input
                      id="consultation_fee_min"
                      type="number"
                      min="0"
                      step="0.01"
                      value={formData.consultation_fee_min}
                      onChange={(e) => setFormData({ ...formData, consultation_fee_min: e.target.value })}
                      disabled={isSubmitting}
                      placeholder="e.g., 100"
                    />
                  </div>
                  <div>
                    <Label htmlFor="consultation_fee_max" className="text-sm">Maximum (ZMW)</Label>
                    <Input
                      id="consultation_fee_max"
                      type="number"
                      min="0"
                      step="0.01"
                      value={formData.consultation_fee_max}
                      onChange={(e) => setFormData({ ...formData, consultation_fee_max: e.target.value })}
                      disabled={isSubmitting}
                      placeholder="e.g., 250"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="accepts_insurance"
                    checked={formData.accepts_insurance}
                    onCheckedChange={(checked) =>
                      setFormData({ ...formData, accepts_insurance: checked as boolean })
                    }
                    disabled={isSubmitting}
                  />
                  <label htmlFor="accepts_insurance" className="text-sm font-medium cursor-pointer">
                    Accepts Insurance
                  </label>
                </div>

                {formData.accepts_insurance && (
                  <div>
                    <Label>Insurance Providers Accepted</Label>
                    <div className="flex flex-wrap gap-2 mb-3">
                      {formData.insurance_providers_accepted.map((provider) => (
                        <Badge key={provider} variant="secondary" className="gap-1">
                          {provider}
                          <X
                            className="h-3 w-3 cursor-pointer"
                            onClick={() =>
                              removeFromArray(
                                provider,
                                formData.insurance_providers_accepted,
                                (providers) => setFormData({ ...formData, insurance_providers_accepted: providers })
                              )
                            }
                          />
                        </Badge>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <Input
                        placeholder="Insurance provider name"
                        value={insuranceInput}
                        onChange={(e) => setInsuranceInput(e.target.value)}
                        disabled={isSubmitting}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            addToArray(
                              insuranceInput,
                              formData.insurance_providers_accepted,
                              (providers) => setFormData({ ...formData, insurance_providers_accepted: providers }),
                              () => setInsuranceInput("")
                            );
                          }
                        }}
                      />
                      <Button
                        type="button"
                        size="sm"
                        onClick={() =>
                          addToArray(
                            insuranceInput,
                            formData.insurance_providers_accepted,
                            (providers) => setFormData({ ...formData, insurance_providers_accepted: providers }),
                            () => setInsuranceInput("")
                          )
                        }
                        disabled={isSubmitting}
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="telemedicine_available"
                    checked={formData.telemedicine_available}
                    onCheckedChange={(checked) =>
                      setFormData({ ...formData, telemedicine_available: checked as boolean })
                    }
                    disabled={isSubmitting}
                  />
                  <label htmlFor="telemedicine_available" className="text-sm font-medium cursor-pointer">
                    Telemedicine Available
                  </label>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="home_visits_available"
                    checked={formData.home_visits_available}
                    onCheckedChange={(checked) =>
                      setFormData({ ...formData, home_visits_available: checked as boolean })
                    }
                    disabled={isSubmitting}
                  />
                  <label htmlFor="home_visits_available" className="text-sm font-medium cursor-pointer">
                    Home Visits Available
                  </label>
                </div>
              </div>

              <div>
                <Label>Appointment Types Offered</Label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {COMMON_APPOINTMENT_TYPES.map((type) => (
                    <Badge
                      key={type}
                      variant={formData.appointment_types.includes(type) ? "default" : "outline"}
                      className="cursor-pointer"
                      onClick={() =>
                        toggleArrayItem(
                          formData.appointment_types,
                          type,
                          (types) => setFormData({ ...formData, appointment_types: types })
                        )
                      }
                    >
                      {type}
                    </Badge>
                  ))}
                </div>
              </div>

              <div>
                <Label htmlFor="typical_wait_time">Typical Wait Time</Label>
                <Select
                  value={formData.typical_wait_time}
                  onValueChange={(value) => setFormData({ ...formData, typical_wait_time: value })}
                  disabled={isSubmitting}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select wait time" />
                  </SelectTrigger>
                  <SelectContent>
                    {WAIT_TIME_OPTIONS.map((time) => (
                      <SelectItem key={time} value={time}>
                        {time}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* AVAILABILITY TAB */}
        <TabsContent value="availability" className="space-y-6 mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Availability Schedule
              </CardTitle>
              <CardDescription>Set your weekly availability for appointments</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {Object.entries(formData.availability_schedule).map(([day, schedule]) => (
                <div key={day} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <Checkbox
                        checked={schedule.available}
                        onCheckedChange={(checked) =>
                          setFormData({
                            ...formData,
                            availability_schedule: {
                              ...formData.availability_schedule,
                              [day]: { ...schedule, available: checked as boolean },
                            },
                          })
                        }
                        disabled={isSubmitting}
                      />
                      <Label className="capitalize font-semibold">{day}</Label>
                    </div>
                    {schedule.available && (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => addTimeSlot(day)}
                        disabled={isSubmitting}
                      >
                        <Plus className="h-4 w-4 mr-1" />
                        Add Slot
                      </Button>
                    )}
                  </div>

                  {schedule.available && (
                    <div className="space-y-2 ml-8">
                      {schedule.hours.map((slot, index) => (
                        <div key={index} className="flex items-center gap-2">
                          <Input
                            value={slot}
                            onChange={(e) => updateTimeSlot(day, index, e.target.value)}
                            disabled={isSubmitting}
                            placeholder="09:00-17:00"
                            className="flex-1"
                          />
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            onClick={() => removeTimeSlot(day, index)}
                            disabled={isSubmitting}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                      {schedule.hours.length === 0 && (
                        <p className="text-sm text-muted-foreground">No time slots added yet</p>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        {/* REFERENCES TAB */}
        <TabsContent value="references" className="space-y-6 mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Professional References</CardTitle>
              <CardDescription>Add 2-3 professional references who can vouch for your work</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {formData.professional_references.map((ref, index) => (
                <div key={index} className="border rounded-lg p-4 space-y-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-semibold">{ref.name}</p>
                      <p className="text-sm text-muted-foreground">{ref.title}</p>
                      <p className="text-sm text-muted-foreground">{ref.institution}</p>
                      <p className="text-sm">{ref.email}</p>
                      {ref.phone && <p className="text-sm">{ref.phone}</p>}
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => removeReference(index)}
                      disabled={isSubmitting}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}

              {!showReferenceForm ? (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowReferenceForm(true)}
                  disabled={isSubmitting}
                  className="w-full"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Reference
                </Button>
              ) : (
                <div className="border rounded-lg p-4 space-y-3 bg-muted/50">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <Label htmlFor="ref_name">Name <span className="text-destructive">*</span></Label>
                      <Input
                        id="ref_name"
                        value={referenceForm.name}
                        onChange={(e) => setReferenceForm({ ...referenceForm, name: e.target.value })}
                        disabled={isSubmitting}
                        placeholder="Dr. John Doe"
                      />
                    </div>
                    <div>
                      <Label htmlFor="ref_title">Title/Position</Label>
                      <Input
                        id="ref_title"
                        value={referenceForm.title}
                        onChange={(e) => setReferenceForm({ ...referenceForm, title: e.target.value })}
                        disabled={isSubmitting}
                        placeholder="Chief of Surgery"
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="ref_institution">Institution</Label>
                    <Input
                      id="ref_institution"
                      value={referenceForm.institution}
                      onChange={(e) => setReferenceForm({ ...referenceForm, institution: e.target.value })}
                      disabled={isSubmitting}
                      placeholder="University Teaching Hospital"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <Label htmlFor="ref_email">Email <span className="text-destructive">*</span></Label>
                      <Input
                        id="ref_email"
                        type="email"
                        value={referenceForm.email}
                        onChange={(e) => setReferenceForm({ ...referenceForm, email: e.target.value })}
                        disabled={isSubmitting}
                        placeholder="reference@example.com"
                      />
                    </div>
                    <div>
                      <Label htmlFor="ref_phone">Phone</Label>
                      <Input
                        id="ref_phone"
                        type="tel"
                        value={referenceForm.phone}
                        onChange={(e) => setReferenceForm({ ...referenceForm, phone: e.target.value })}
                        disabled={isSubmitting}
                        placeholder="+260 XXX XXXXXX"
                      />
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      type="button"
                      onClick={addReference}
                      disabled={isSubmitting}
                      className="flex-1"
                    >
                      Save Reference
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setShowReferenceForm(false);
                        setReferenceForm({ name: "", title: "", institution: "", phone: "", email: "" });
                      }}
                      disabled={isSubmitting}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <div className="flex items-center justify-between pt-6 border-t">
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            const tabs = ["education", "practice", "availability", "references"];
            const currentIndex = tabs.indexOf(currentTab);
            if (currentIndex > 0) setCurrentTab(tabs[currentIndex - 1]);
          }}
          disabled={isSubmitting || currentTab === "education"}
        >
          Previous
        </Button>

        {currentTab !== "references" ? (
          <Button
            type="button"
            onClick={() => {
              const tabs = ["education", "practice", "availability", "references"];
              const currentIndex = tabs.indexOf(currentTab);
              if (currentIndex < tabs.length - 1) setCurrentTab(tabs[currentIndex + 1]);
            }}
            disabled={isSubmitting}
          >
            Next
          </Button>
        ) : (
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              "Save Profile"
            )}
          </Button>
        )}
      </div>
    </form>
  );
};

export default ProviderProfileEnhanced;
