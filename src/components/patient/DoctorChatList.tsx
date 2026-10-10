import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { providerDisplayName } from "@/utils/providerDisplay";
import { format } from "date-fns";

interface ChatPreview {
  provider: {
    id: string;
    first_name?: string;
    last_name?: string;
    avatar_url?: string;
    specialty?: string;
  };
  lastMessage?: string;
  lastMessageAt?: string;
  unread?: number;
}

interface DoctorChatListProps {
  chats: ChatPreview[];
  onSelect?: (providerId: string) => void;
}

/**
 * Reference-style "Chat with your doctor" — blue header, doctor avatars row,
 * chat list with message previews. Doc'O Clock blue theme.
 */
export const DoctorChatList = ({ chats, onSelect }: DoctorChatListProps) => {
  return (
    <div className="bg-white rounded-3xl overflow-hidden">
      {/* Blue header like reference */}
      <div className="bg-blue-600 px-6 pt-6 pb-8 rounded-b-3xl">
        <h2 className="text-xl font-bold text-white">Chat with your doctor</h2>
        <div className="relative mt-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-blue-300" />
          <Input
            placeholder="Search doctors…"
            className="pl-10 bg-blue-500/50 border-blue-400/30 text-white placeholder:text-blue-200 rounded-full"
          />
        </div>
        {/* Doctor avatars row */}
        {chats.length > 0 && (
          <div className="flex gap-3 mt-4 overflow-x-auto pb-1">
            {chats.slice(0, 8).map((chat) => (
              <button
                key={chat.provider.id}
                onClick={() => onSelect?.(chat.provider.id)}
                className="shrink-0"
              >
                <Avatar className="h-12 w-12 border-2 border-white/30">
                  <AvatarImage src={chat.provider.avatar_url} />
                  <AvatarFallback className="bg-blue-400 text-white text-xs">
                    {providerDisplayName(chat.provider as any).slice(0, 2)}
                  </AvatarFallback>
                </Avatar>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Chat list */}
      <div className="px-4 py-4 space-y-1 -mt-4">
        {chats.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-8">
            No conversations yet. Book an appointment to chat with your doctor.
          </p>
        ) : (
          chats.map((chat) => (
            <button
              key={chat.provider.id}
              onClick={() => onSelect?.(chat.provider.id)}
              className="w-full flex items-center gap-3 p-3 rounded-2xl hover:bg-gray-50 transition-colors text-left"
            >
              <Avatar className="h-12 w-12 shrink-0">
                <AvatarImage src={chat.provider.avatar_url} />
                <AvatarFallback className="bg-blue-100 text-blue-700">
                  {providerDisplayName(chat.provider as any).slice(0, 2)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <p className="font-semibold text-gray-900 truncate text-sm">
                    {providerDisplayName(chat.provider as any)}
                  </p>
                  {chat.lastMessageAt && (
                    <span className="text-[10px] text-gray-400 shrink-0 ml-2">
                      {format(new Date(chat.lastMessageAt), "HH:mm")}
                    </span>
                  )}
                </div>
                <div className="flex items-center justify-between">
                  <p className="text-xs text-gray-500 truncate">
                    {chat.lastMessage || "Start a conversation"}
                  </p>
                  {chat.unread ? (
                    <span className="ml-2 h-5 w-5 rounded-full bg-blue-600 text-white text-[10px] flex items-center justify-center shrink-0">
                      {chat.unread}
                    </span>
                  ) : null}
                </div>
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  );
};
