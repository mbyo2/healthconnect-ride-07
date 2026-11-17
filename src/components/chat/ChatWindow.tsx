import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { MessageSquare } from "lucide-react";
import { toast } from "sonner";
import { Message } from "@/types/communication";
import { MessageList } from "./MessageList";
import { MessageInput } from "./MessageInput";
import { friendlyErrorMessage } from "@/utils/friendly-error";
import { createRealtimeChannel, removeRealtimeChannel } from "@/lib/realtimeChannel";
import { appendIncomingMessage, isThreadMessage } from "@/lib/chatThread";

interface ChatWindowProps {
  providerId: string;
  providerName?: string;
}

export const ChatWindow = ({ providerId, providerName }: ChatWindowProps) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let activeChannel: ReturnType<typeof createRealtimeChannel> | null = null;

    // Mark everything the other party sent us in this thread as read.
    // Best-effort on purpose: a failed mark must never toast or block
    // the chat (the bubbles simply keep a single check). Enabled by the
    // "Receivers can mark messages read" UPDATE policy (20261117
    // migration); a BEFORE UPDATE trigger keeps every other column
    // immutable, so only the read flag can change.
    const markThreadRead = (userId: string, otherId: string) => {
      void supabase
        .from('messages')
        .update({ read: true })
        .eq('receiver_id', userId)
        .eq('sender_id', otherId)
        .eq('read', false)
        .then(({ error }) => {
          if (error) console.error('Error marking messages read:', error);
        });
    };

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
        toast.error(friendlyErrorMessage(error));
        return;
      }

      setMessages(data || []);
      markThreadRead(userId, providerId);

      // Unique channel per mount (see src/lib/realtimeChannel.ts): the
      // old fixed name `messages-${providerId}` collided on fast
      // unmount → remount — realtime-js dedupes by topic and .on()
      // throws on a joining/joined channel. The old and new channels
      // may briefly both deliver the same row while the old one
      // drains; appendIncomingMessage dedupes by id.
      activeChannel = createRealtimeChannel('messages')
        .on('postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'messages' },
          (payload) => {
            const incoming = payload.new as Message;
            setMessages(prev => appendIncomingMessage(prev, incoming, userId, providerId));
            // A live incoming message from the other party is read the
            // moment it lands in the open thread.
            if (isThreadMessage(incoming, userId, providerId) && incoming.sender_id === providerId) {
              markThreadRead(userId, providerId);
            }
          }
        )
        .subscribe();
    };

    init();

    return () => {
      if (activeChannel) removeRealtimeChannel(activeChannel);
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
      toast.error(friendlyErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (filePath: string, fileName: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No user found");

      // messages has no attachments column — the file row goes first, then
      // the metadata lands in chat_attachments keyed by message_id.
      // file_url stores the storage PATH inside the private
      // chat-attachments bucket (legacy rows hold full URLs; FilePreview
      // renders both).
      const { data: msg, error: msgError } = await supabase
        .from('messages')
        .insert({
          content: `Shared file: ${fileName}`,
          sender_id: user.id,
          receiver_id: providerId,
        })
        .select('id')
        .single();

      if (msgError) throw msgError;

      const { error: attError } = await supabase
        .from('chat_attachments')
        .insert({
          message_id: msg.id,
          file_url: filePath,
          file_name: fileName,
        });

      if (attError) throw attError;
      toast.success('File sent');
    } catch (error: any) {
      toast.error('Error sending file');
      console.error('Error sending file:', error);
    }
  };

  return (
    <div className="flex flex-col h-full min-h-[55vh] md:min-h-0 border rounded-lg">
      <div className="p-4 border-b flex items-center gap-2 min-w-0">
        <MessageSquare className="h-5 w-5 flex-shrink-0" />
        <h2 className="font-semibold truncate">{providerName || 'Chat'}</h2>
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
