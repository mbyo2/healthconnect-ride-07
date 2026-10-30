import { useEffect, useState } from "react";
import { toast } from "sonner";
import { UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import {
  findOrCreatePatient,
  splitPatientName,
  type InstitutionPatient,
  type PatientSource,
} from "@/lib/patients";
import { friendlyErrorMessage } from "@/utils/friendly-error";

interface Props {
  institutionId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Prefill from the picker's current search text. */
  initialName?: string;
  source?: PatientSource;
  /** Called with the resolved patient so the parent workflow can continue. */
  onCreated: (patient: InstitutionPatient) => void;
}

/**
 * Create-on-missing for patients (CEO Odoo rule, 2026-10-29): opened in a
 * modal over the current workflow; on save the patient is created-or-matched
 * through find_or_create_patient and auto-selected by the caller — the user
 * never leaves the workflow they were in.
 */
export const PatientQuickCreateDialog = ({
  institutionId,
  open,
  onOpenChange,
  initialName = "",
  source = "registration",
  onCreated,
}: Props) => {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [gender, setGender] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      const tokens = initialName.trim().split(/\s+/).filter(Boolean);
      const { firstName: f, lastName: l } = splitPatientName(initialName);
      setFirstName(f);
      // A single typed word prefills the first name only (staff complete the rest).
      setLastName(tokens.length > 1 ? l : "");
      setPhone("");
      setEmail("");
      setDateOfBirth("");
      setGender("");
    }
  }, [open, initialName]);

  const handleSave = async () => {
    if (!firstName.trim() || !lastName.trim()) {
      toast.error("First name and last name are required");
      return;
    }
    setSaving(true);
    try {
      const result = await findOrCreatePatient(
        institutionId,
        {
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          phone: phone.trim() || null,
          email: email.trim() || null,
          dateOfBirth: dateOfBirth || null,
          gender: gender || null,
        },
        source,
      );
      const patient: InstitutionPatient = {
        id: result.patientId,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        name: `${firstName.trim()} ${lastName.trim()}`,
        email: email.trim() || null,
        phone: phone.trim() || null,
        dateOfBirth: dateOfBirth || null,
        onRoster: true,
        source,
      };
      toast.success(
        result.created
          ? `Patient ${patient.name} created and selected`
          : `Existing patient ${patient.name} matched and selected`,
      );
      onOpenChange(false);
      onCreated(patient);
    } catch (e: any) {
      toast.error(friendlyErrorMessage(e, "Failed to create patient"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" /> Create patient
          </DialogTitle>
          <p className="text-xs text-muted-foreground">
            If this person already has a record (same phone, email, or name + date of
            birth), it is matched instead of duplicated — and linked to this facility.
          </p>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-3 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="qc-first">First name *</Label>
            <Input id="qc-first" value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="First name" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="qc-last">Last name *</Label>
            <Input id="qc-last" value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="Last name" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="qc-phone">Phone</Label>
            <Input id="qc-phone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+260..." />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="qc-email">Email</Label>
            <Input id="qc-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="patient@example.com" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="qc-dob">Date of birth</Label>
            <Input id="qc-dob" type="date" value={dateOfBirth} onChange={(e) => setDateOfBirth(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="qc-gender">Gender</Label>
            <Select value={gender} onValueChange={setGender}>
              <SelectTrigger id="qc-gender">
                <SelectValue placeholder="Select" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="male">Male</SelectItem>
                <SelectItem value="female">Female</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            <UserPlus className="h-4 w-4 mr-1" />
            {saving ? "Creating…" : "Create & select"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
