import React, { useState } from "react";
import { toast } from "sonner";
import { UserPlus, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

interface StaffPatientRegistrationDialogProps {
  institutionId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRegistered?: () => void;
}

/**
 * Staff-facing patient registration for institutions.
 * Registers walk-in/phone patients without requiring them to sign up first.
 * The patient can later claim the record by signing up with the same phone/email.
 */
export const StaffPatientRegistrationDialog: React.FC<StaffPatientRegistrationDialogProps> = ({
  institutionId,
  open,
  onOpenChange,
  onRegistered,
}) => {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [gender, setGender] = useState("");
  const [address, setAddress] = useState("");
  const [emergencyName, setEmergencyName] = useState("");
  const [emergencyPhone, setEmergencyPhone] = useState("");
  const [bloodType, setBloodType] = useState("");
  const [allergies, setAllergies] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const reset = () => {
    setFirstName("");
    setLastName("");
    setPhone("");
    setEmail("");
    setDateOfBirth("");
    setGender("");
    setAddress("");
    setEmergencyName("");
    setEmergencyPhone("");
    setBloodType("");
    setAllergies("");
  };

  const handleSubmit = async () => {
    if (!firstName.trim() || !lastName.trim()) {
      toast.error("First name and last name are required");
      return;
    }
    if (!phone.trim() && !email.trim()) {
      toast.error("Phone or email is required to identify the patient");
      return;
    }

    setSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();

      const { error } = await supabase
        .from("institution_patient_registry" as any)
        .insert({
          institution_id: institutionId,
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          phone: phone.trim() || null,
          email: email.trim() || null,
          date_of_birth: dateOfBirth || null,
          gender: gender || null,
          address: address.trim() || null,
          emergency_contact_name: emergencyName.trim() || null,
          emergency_contact_phone: emergencyPhone.trim() || null,
          blood_type: bloodType || null,
          allergies: allergies.trim() || null,
          registered_by: user?.id || null,
        });

      if (error) throw error;

      toast.success(`Patient ${firstName} ${lastName} registered`);
      reset();
      onOpenChange(false);
      onRegistered?.();
    } catch (error: any) {
      console.error("Staff patient registration failed:", error);
      toast.error(error.message || "Failed to register patient");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Register New Patient
          </DialogTitle>
          <p className="text-xs text-muted-foreground">
            Register a walk-in or phone patient. They can claim this record later by signing up with the same phone or email.
          </p>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="srp-first">First Name *</Label>
            <Input
              id="srp-first"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              placeholder="John"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="srp-last">Last Name *</Label>
            <Input
              id="srp-last"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              placeholder="Doe"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="srp-phone">Phone *</Label>
            <Input
              id="srp-phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+260..."
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="srp-email">Email</Label>
            <Input
              id="srp-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="patient@example.com"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="srp-dob">Date of Birth</Label>
            <Input
              id="srp-dob"
              type="date"
              value={dateOfBirth}
              onChange={(e) => setDateOfBirth(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="srp-gender">Gender</Label>
            <Select value={gender} onValueChange={setGender}>
              <SelectTrigger id="srp-gender">
                <SelectValue placeholder="Select" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="male">Male</SelectItem>
                <SelectItem value="female">Female</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2 col-span-2">
            <Label htmlFor="srp-address">Address</Label>
            <Input
              id="srp-address"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Street, City"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="srp-ename">Emergency Contact Name</Label>
            <Input
              id="srp-ename"
              value={emergencyName}
              onChange={(e) => setEmergencyName(e.target.value)}
              placeholder="Jane Doe"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="srp-ephone">Emergency Contact Phone</Label>
            <Input
              id="srp-ephone"
              value={emergencyPhone}
              onChange={(e) => setEmergencyPhone(e.target.value)}
              placeholder="+260..."
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="srp-blood">Blood Type</Label>
            <Select value={bloodType} onValueChange={setBloodType}>
              <SelectTrigger id="srp-blood">
                <SelectValue placeholder="Select" />
              </SelectTrigger>
              <SelectContent>
                {["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"].map((t) => (
                  <SelectItem key={t} value={t}>{t}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="srp-allergies">Allergies</Label>
            <Input
              id="srp-allergies"
              value={allergies}
              onChange={(e) => setAllergies(e.target.value)}
              placeholder="Penicillin, peanuts..."
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => {
              reset();
              onOpenChange(false);
            }}
            disabled={submitting}
          >
            <X className="h-4 w-4 mr-1" /> Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={submitting}>
            <UserPlus className="h-4 w-4 mr-1" />
            {submitting ? "Registering..." : "Register Patient"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
