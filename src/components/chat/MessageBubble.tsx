import { Message } from "@/types/communication";
import { FilePreview } from "./FilePreview";
import { cn } from "@/lib/utils";
import { Check, CheckCheck } from "lucide-react";
import { isSystemReminderNote, SYSTEM_REMINDER_MARKER } from "@/lib/chatSystemNote";

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

  // Platform-written reminder notes (group 3 convention, src/lib/chatSystemNote.ts).
  // They arrive in the provider's slot (sender = provider) so the existing
  // 1:1 fetch already includes them — no fetch change needed. Rendered here
  // as a centered system bubble, never as a message the provider typed.
  // The bracketed marker is a machine tag, not display text: strip it.
  if (isSystemReminderNote(message.content)) {
    const text = message.content.slice(SYSTEM_REMINDER_MARKER.length).trim();
    return (
      <div className="flex w-full justify-center px-1" role="note" aria-label="System reminder">
        <div className="max-w-[92%] rounded-xl border border-border bg-muted/60 px-3.5 py-2.5 text-center text-midnight dark:bg-zinc-800/60 dark:text-slate-100">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-graphite-500 dark:text-zinc-400">
            Doc&apos;O Clock reminder
          </p>
          <p className="mt-1 break-words text-sm leading-relaxed whitespace-pre-wrap">{text}</p>
          <time className="mt-1 block text-xs font-medium text-graphite-400">
            {formatTime(message.created_at)}
          </time>
        </div>
      </div>
    );
  }

  const mine = isMine;

  return (
    <div className={cn("flex w-full px-1", mine ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "max-w-[82%] sm:max-w-[75%] rounded-2xl px-3.5 py-2.5",
          mine
            ? "rounded-br-md bg-primary-500 text-white"
            : "rounded-bl-md bg-muted text-midnight dark:text-slate-100 border border-border"
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
            "mt-1 flex items-center justify-end gap-1 text-xs font-medium",
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
