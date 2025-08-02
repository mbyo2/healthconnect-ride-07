import { Button } from "@/components/ui/button";
import { SecureInput } from "@/components/ui/secure-input";
import { FileUploader } from "./FileUploader";
import { useState } from "react";
import { messageSchema } from "@/utils/input-validation";
import { logSecurityEvent, SecurityEvents, messageRateLimiter } from "@/utils/security-service";
import { toast } from "sonner";

interface MessageInputProps {
  onSendMessage: (content: string) => Promise<void>;
  onUploadComplete: (fileUrl: string, fileName: string) => void;
  loading: boolean;
}

export const MessageInput = ({ onSendMessage, onUploadComplete, loading }: MessageInputProps) => {
  const [newMessage, setNewMessage] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    // Rate limiting check
    if (!messageRateLimiter('user')) {
      toast.error('You are sending messages too quickly. Please slow down.');
      return;
    }

    // Validate message content
    try {
      messageSchema.parse({ content: newMessage });
    } catch (error) {
      toast.error('Message content is invalid or too long.');
      return;
    }

    // Log message for security monitoring
    await logSecurityEvent(SecurityEvents.MESSAGE_SENT, {
      messageLength: newMessage.length,
      timestamp: new Date().toISOString(),
    });

    await onSendMessage(newMessage);
    setNewMessage("");
  };

  const handleSecurityViolation = (violation: string) => {
    toast.warning(`Security warning: ${violation}`);
  };

  return (
    <form onSubmit={handleSubmit} className="p-4 border-t flex gap-2">
      <SecureInput
        value={newMessage}
        onChange={(e) => setNewMessage(e.target.value)}
        placeholder="Type your message..."
        disabled={loading}
        maxLength={2000}
        onSecurityViolation={handleSecurityViolation}
        enableXSSProtection={true}
        enableSQLProtection={true}
      />
      <FileUploader onUploadComplete={onUploadComplete} />
      <Button type="submit" disabled={loading}>
        Send
      </Button>
    </form>
  );
};