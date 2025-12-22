import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const DigitalSignature = () => {
  const [signature, setSignature] = useState("");
  const [documentType, setDocumentType] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSignatureSubmit = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        toast.error("You must be logged in to create a signature");
        return;
      }

      const { error } = await supabase.from("digital_signatures" as any).insert({
        provider_id: user.id,
        signature_data: signature,
        document_type: documentType
      });

      if (error) throw error;

      toast.success("Signature saved successfully");
      setSignature("");
      setDocumentType("");
    } catch (error) {
      console.error("Error saving signature:", error);
      toast.error("Failed to save signature");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="p-6 space-y-4">
      <h2 className="text-2xl font-semibold">Digital Signature</h2>

      <div className="space-y-4">
        <div>
          <Label htmlFor="documentType">Document Type</Label>
          <Input
            id="documentType"
            value={documentType}
            onChange={(e) => setDocumentType(e.target.value)}
            placeholder="e.g., Prescription, Medical Report"
          />
        </div>

        <div>
          <Label htmlFor="signature">Signature</Label>
          <Input
            id="signature"
            value={signature}
            onChange={(e) => setSignature(e.target.value)}
            placeholder="Enter your signature"
          />
        </div>

        <Button
          onClick={handleSignatureSubmit}
          disabled={loading || !signature || !documentType}
          className="w-full"
        >
          {loading ? "Saving..." : "Save Signature"}
        </Button>
      </div>
    </Card>
  );
};