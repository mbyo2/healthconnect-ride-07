import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MessageSquare, Paperclip } from "lucide-react";
import { toast } from "sonner";
import { FileUploader } from "./FileUploader";
import { Message } from "@/types/communication";
import { ScrollArea } from "@/components/ui/scroll-area";

interface ChatWindowProps {
  providerId: string;
}

export const ChatWindow = ({ providerId }: ChatWindowProps) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchMessages = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('messages')
        .select(`
          *,
          attachments:chat_attachments(*)
        `)
        .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
        .order('created_at', { ascending: true });

      if (error) {
        toast.error(error.message);
        return;
      }

      setMessages(data || []);
    };

    fetchMessages();

    // Subscribe to new messages
    const channel = supabase
      .channel('messages')
      .on('postgres_changes', 
        { event: 'INSERT', schema: 'public', table: 'messages' },
        (payload) => {
          console.log('New message received:', payload);
          setMessages(prev => [...prev, payload.new as Message]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [providerId]);

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No user found");

      const { error } = await supabase
        .from('messages')
        .insert({
          content: newMessage,
          sender_id: user.id,
          receiver_id: providerId,
        });

      if (error) throw error;

      setNewMessage("");
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (fileUrl: string, fileName: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No user found");

      const { error } = await supabase
        .from('messages')
        .insert({
          content: `Shared file: ${fileName}`,
          sender_id: user.id,
          receiver_id: providerId,
          attachments: [{ file_url: fileUrl, file_name: fileName }]
        });

      if (error) throw error;
    } catch (error: any) {
      toast.error('Error sending file');
      console.error('Error sending file:', error);
    }
  };

  return (
    <div className="flex flex-col h-[500px] border rounded-lg">
      <div className="p-4 border-b flex items-center gap-2">
        <MessageSquare className="h-5 w-5" />
        <h2 className="font-semibold">Chat with Provider</h2>
      </div>

      <ScrollArea className="flex-1 p-4">
        <div className="space-y-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`p-2 rounded-lg max-w-[80%] ${
                message.sender_id === providerId
                  ? "bg-gray-100 ml-auto"
                  : "bg-blue-100"
              }`}
            >
              <div>{message.content}</div>
              {message.attachments?.map((attachment) => (
                <a
                  key={attachment.id}
                  href={attachment.file_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-blue-600 hover:underline flex items-center gap-1 mt-1"
                >
                  <Paperclip className="h-3 w-3" />
                  {attachment.file_name}
                </a>
              ))}
            </div>
          ))}
        </div>
      </ScrollArea>

      <form onSubmit={sendMessage} className="p-4 border-t flex gap-2">
        <Input
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder="Type your message..."
          disabled={loading}
        />
        <FileUploader onUploadComplete={handleFileUpload} />
        <Button type="submit" disabled={loading}>
          Send
        </Button>
      </form>
    </div>
  );
};