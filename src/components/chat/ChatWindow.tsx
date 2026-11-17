import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { MessageSquare, Phone } from "lucide-react";
import { toast } from "sonner";
import { Message } from "@/types/communication";
import { MessageList } from "./MessageList";
import { MessageInput } from "./MessageInput";
import { friendlyErrorMessage } from "@/utils/friendly-error";
import { Button } from "@/components/ui/button";
import { useVoiceCall } from "@/hooks/useVoiceCall";
import { VoiceCallOverlay } from "@/components/calls/VoiceCallOverlay";

interface ChatWindowProps {
  providerId: string;
  providerName?: string;
}

export const ChatWindow = ({ providerId, providerName }: ChatWindowProps) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);

  // In-app voice calls (group 2): free WebRTC audio over Supabase Realtime
  // signalling. The overlay + hook own the call; this file only hosts the
  // entry point so group 1's chat work is untouched.
  const voiceCall = useVoiceCall({ peerId: providerId, peerName: providerName || "Chat" });

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
        toast.error(friendlyErrorMessage(error));
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
        <Button
          variant="outline"
          size="sm"
          className="ml-auto shrink-0"
          onClick={voiceCall.startCall}
          disabled={voiceCall.phase !== "idle"}
          aria-label="Start voice call"
        >
          <Phone className="h-4 w-4 sm:mr-1.5" />
          <span className="hidden sm:inline">Voice call</span>
        </Button>
      </div>

      <VoiceCallOverlay
        phase={voiceCall.phase}
        peerName={providerName || "Chat"}
        durationSeconds={voiceCall.durationSeconds}
        muted={voiceCall.muted}
        iceState={voiceCall.iceState}
        error={voiceCall.error}
        endReason={voiceCall.endReason}
        remoteAudioRef={voiceCall.remoteAudioRef}
        onAccept={voiceCall.acceptCall}
        onDecline={voiceCall.declineCall}
        onEnd={voiceCall.endCall}
        onToggleMute={voiceCall.toggleMute}
      />

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