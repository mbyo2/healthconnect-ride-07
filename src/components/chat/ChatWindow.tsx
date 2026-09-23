import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { MessageSquare } from "lucide-react";
import { toast } from "sonner";
import { Message } from "@/types/communication";
import { MessageList } from "./MessageList";
import { MessageInput } from "./MessageInput";

interface ChatWindowProps {
  providerId: string;
}

export const ChatWindow = ({ providerId }: ChatWindowProps) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let activeChannel: ReturnType<typeof supabase.channel> | null = null;

    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const userId = user.id;

      // Scope to this 1:1 conversation only — never the whole inbox.
      const { data, error } = await supabase
        .from('messages')
        .select(`
          *,
          attachments:chat_attachments(*)
        `)
        .or(`and(sender_id.eq.${userId},receiver_id.eq.${providerId}),and(sender_id.eq.${providerId},receiver_id.eq.${userId})`)
        .order('created_at', { ascending: true });

      if (error) {
        toast.error(error.message);
        return;
      }

      setMessages(data || []);

      activeChannel = supabase
        .channel(`messages-${providerId}`)
        .on('postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'messages' },
          (payload) => {
            setMessages(prev => {
              const incoming = payload.new as Message;
              // Ignore messages from other conversations on the shared channel.
              const mine = incoming.sender_id === userId && incoming.receiver_id === providerId;
              const theirs = incoming.sender_id === providerId && incoming.receiver_id === userId;
              if (!mine && !theirs) return prev;
              if (prev.some(m => m.id === incoming.id)) return prev;
              return [...prev, incoming];
            });
          }
        )
        .subscribe();
    };

    init();

    return () => {
      if (activeChannel) supabase.removeChannel(activeChannel);
    };
  }, [providerId]);

  const sendMessage = async (content: string) => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No user found");

      const { error } = await supabase
        .from('messages')
        .insert({
          content,
          sender_id: user.id,
          receiver_id: providerId,
        });

      if (error) throw error;
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

      <MessageList messages={messages} providerId={providerId} />

      <MessageInput
        onSendMessage={sendMessage}
        onUploadComplete={handleFileUpload}
        loading={loading}
        draftKey={providerId}
      />
    </div>
  );
};