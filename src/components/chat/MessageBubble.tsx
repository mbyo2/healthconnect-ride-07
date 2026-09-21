import { Message } from "@/types/communication";
import { FilePreview } from "./FilePreview";
import { cn } from "@/lib/utils";
import { Check, CheckCheck } from "lucide-react";

interface MessageBubbleProps {
  message: Message;
  /** True when the bubble is the viewer's own message. */
  isMine?: boolean;
}

function formatTime(iso: string): string {
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "";
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  } catch {
    return "";
  }
}

export const MessageBubble = ({ message, isMine = false }: MessageBubbleProps) => {
  if (!message || !message.content) {
    return null;
  }

  const mine = isMine;

  return (
    <div className={cn("flex w-full px-1", mine ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "max-w-[82%] sm:max-w-[75%] rounded-2xl px-3.5 py-2.5 shadow-xs",
          mine
            ? "rounded-br-md bg-primary-500 text-white"
            : "rounded-bl-md bg-canvas-bone dark:bg-slate-800 text-midnight dark:text-slate-100 border border-canvas-silk dark:border-slate-700"
        )}
      >
        <div className="break-words text-sm leading-relaxed whitespace-pre-wrap">
          {message.content}
        </div>
        {message.attachments?.map((attachment) => (
          <FilePreview key={attachment.id} attachment={attachment} />
        ))}
        <div
          className={cn(
            "mt-1 flex items-center justify-end gap-1 text-[10px] font-medium",
            mine ? "text-white/70" : "text-graphite-400"
          )}
        >
          <time>{formatTime(message.created_at)}</time>
          {mine &&
            (message.read ? (
              <CheckCheck className="h-3 w-3" aria-label="Read" />
            ) : (
              <Check className="h-3 w-3" aria-label="Sent" />
            ))}
        </div>
      </div>
    </div>
  );
};
