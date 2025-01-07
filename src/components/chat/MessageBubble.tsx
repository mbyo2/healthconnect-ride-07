import { Message } from "@/types/communication";
import { FilePreview } from "./FilePreview";
import { cn } from "@/lib/utils";

interface MessageBubbleProps {
  message: Message;
  isProvider: boolean;
}

export const MessageBubble = ({ message, isProvider }: MessageBubbleProps) => {
  return (
    <div
      className={cn(
        "p-2 rounded-lg max-w-[80%]",
        isProvider ? "bg-gray-100 ml-auto" : "bg-blue-100"
      )}
    >
      <div>{message.content}</div>
      {message.attachments?.map((attachment) => (
        <FilePreview key={attachment.id} attachment={attachment} />
      ))}
    </div>
  );
};