import { Message } from "@/types/communication";
import { MessageBubble } from "./MessageBubble";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAuth } from "@/context/AuthContext";

interface MessageListProps {
  messages: Message[];
  providerId: string;
}

export const MessageList = ({ messages, providerId }: MessageListProps) => {
  const { user } = useAuth();

  return (
    <ScrollArea className="flex-1 p-4">
      <div className="space-y-2.5" role="log" aria-label="Chat messages" aria-live="polite">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <p className="text-sm font-medium text-muted-foreground">No messages yet</p>
            <p className="text-xs text-muted-foreground mt-1">
              Say hello — messages are private to this conversation.
            </p>
          </div>
        ) : (
          messages.map((message) => (
            <MessageBubble
              key={message.id}
              message={message}
              // Own messages align right; the other party aligns left,
              // regardless of who is patient or provider.
              isMine={!!user && message.sender_id === user.id}
            />
          ))
        )}
      </div>
    </ScrollArea>
  );
};
