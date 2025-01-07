import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FileUploader } from "./FileUploader";
import { useState } from "react";

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

    await onSendMessage(newMessage);
    setNewMessage("");
  };

  return (
    <form onSubmit={handleSubmit} className="p-4 border-t flex gap-2">
      <Input
        value={newMessage}
        onChange={(e) => setNewMessage(e.target.value)}
        placeholder="Type your message..."
        disabled={loading}
      />
      <FileUploader onUploadComplete={onUploadComplete} />
      <Button type="submit" disabled={loading}>
        Send
      </Button>
    </form>
  );
};