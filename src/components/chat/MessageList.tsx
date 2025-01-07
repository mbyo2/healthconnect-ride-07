import { Message } from "@/types/communication";
import { MessageBubble } from "./MessageBubble";
import { ScrollArea } from "@/components/ui/scroll-area";

interface MessageListProps {
  messages: Message[];
  providerId: string;
}

export const MessageList = ({ messages, providerId }: MessageListProps) => {
  return (
    <ScrollArea className="flex-1 p-4">
      <div className="space-y-4">
        {messages.map((message) => (
          <MessageBubble
            key={message.id}
            message={message}
            isProvider={message.sender_id === providerId}
          />
        ))}
      </div>
    </ScrollArea>
  );
};