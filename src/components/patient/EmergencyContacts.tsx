import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Phone, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

interface EmergencyContact {
  id: string;
  name: string;
  relationship: string;
  phone: string;
  email?: string;
  address?: string;
  is_primary: boolean;
}

export const EmergencyContacts = () => {
  const [contacts, setContacts] = useState<EmergencyContact[]>([]);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    relationship: "",
    phone: "",
    email: "",
    address: "",
    is_primary: false,
  });

  useEffect(() => {
    fetchContacts();
  }, []);

  const fetchContacts = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('emergency_contacts')
        .select('*')
        .eq('patient_id', user.id);

      if (error) throw error;
      setContacts(data || []);
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No user found");

      const { error } = await supabase
        .from('emergency_contacts')
        .insert({
          ...formData,
          patient_id: user.id,
        });

      if (error) throw error;

      toast.success("Emergency contact added successfully!");
      setFormData({
        name: "",
        relationship: "",
        phone: "",
        email: "",
        address: "",
        is_primary: false,
      });
      fetchContacts();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const deleteContact = async (id: string) => {
    try {
      const { error } = await supabase
        .from('emergency_contacts')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast.success("Contact deleted successfully!");
      fetchContacts();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  return (
    <div className="p-4">
      <div className="flex items-center gap-2 mb-4">
        <Phone className="h-5 w-5" />
        <h2 className="text-xl font-semibold">Emergency Contacts</h2>
      </div>

      <div className="space-y-4">
        {contacts.map((contact) => (
          <div key={contact.id} className="border p-4 rounded-lg">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="font-semibold">{contact.name}</h3>
                <p className="text-sm text-gray-600">{contact.relationship}</p>
                <p className="text-sm">{contact.phone}</p>
                {contact.email && <p className="text-sm">{contact.email}</p>}
                {contact.address && <p className="text-sm">{contact.address}</p>}
                {contact.is_primary && (
                  <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded mt-2 inline-block">
                    Primary Contact
                  </span>
                )}
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => deleteContact(contact.id)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ))}

        <form onSubmit={handleSubmit} className="border-t pt-4 mt-4 space-y-4">
          <div>
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
          </div>

          <div>
            <Label htmlFor="relationship">Relationship</Label>
            <Input
              id="relationship"
              value={formData.relationship}
              onChange={(e) => setFormData({ ...formData, relationship: e.target.value })}
              required
            />
          </div>

          <div>
            <Label htmlFor="phone">Phone</Label>
            <Input
              id="phone"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              required
            />
          </div>

          <div>
            <Label htmlFor="email">Email (Optional)</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            />
          </div>

          <div>
            <Label htmlFor="address">Address (Optional)</Label>
            <Input
              id="address"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
            />
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="is_primary"
              checked={formData.is_primary}
              onChange={(e) => setFormData({ ...formData, is_primary: e.target.checked })}
            />
            <Label htmlFor="is_primary">Set as Primary Contact</Label>
          </div>

          <Button type="submit" disabled={loading}>
            <Plus className="h-4 w-4 mr-2" />
            {loading ? "Adding..." : "Add Contact"}
          </Button>
        </form>
      </div>
    </div>
  );
};