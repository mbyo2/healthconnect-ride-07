import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ChatWindow } from "./ChatWindow";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "sonner";

interface ChatContact {
  id: string;
  first_name: string | null;
  last_name: string | null;
  avatar_url: string | null;
  role: string;
}

export const ChatList = () => {
  const [contacts, setContacts] = useState<ChatContact[]>([]);
  const [selectedContact, setSelectedContact] = useState<ChatContact | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let userId: string | null = null;

    const fetchContacts = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        userId = user.id;

        const { data: profiles, error } = await supabase
          .from('profiles')
          .select('id, first_name, last_name, avatar_url, role')
          .neq('id', user.id)
          .order('role', { ascending: false });

        if (error) throw error;
        setContacts(profiles);
      } catch (error: any) {
        toast.error("Error fetching contacts: " + error.message);
      } finally {
        setLoading(false);
      }
    };

    fetchContacts();

    // Real-time: listen for new messages to re-sort / highlight contacts
    const channel = supabase
      .channel('chat-list-realtime')
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages' },
        (payload) => {
          const msg = payload.new as any;
          // Bubble the contact who sent/received the latest message to the top
          if (msg.sender_id === userId || msg.receiver_id === userId) {
            setContacts(prev => {
              const contactId = msg.sender_id === userId ? msg.receiver_id : msg.sender_id;
              const idx = prev.findIndex(c => c.id === contactId);
              if (idx <= 0) return prev;
              const updated = [...prev];
              const [contact] = updated.splice(idx, 1);
              return [contact, ...updated];
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  if (loading) {
    return <div>Loading contacts...</div>;
  }

  return (
    <div className="flex h-[calc(100vh-8rem)] gap-4">
      <div className="w-1/3 border rounded-lg">
        <ScrollArea className="h-full">
          <div className="p-4 space-y-2">
            {contacts.map((contact) => (
              <Button
                key={contact.id}
                variant={selectedContact?.id === contact.id ? "default" : "ghost"}
                className="w-full justify-start gap-2"
                onClick={() => setSelectedContact(contact)}
              >
                <Avatar className="h-8 w-8">
                  <AvatarImage src={contact.avatar_url || ''} />
                  <AvatarFallback>
                    {contact.first_name?.[0]}{contact.last_name?.[0]}
                  </AvatarFallback>
                </Avatar>
                <div className="text-left">
                  <div>{contact.first_name} {contact.last_name}</div>
                  <div className="text-xs text-muted-foreground capitalize">
                    {contact.role.replace('_', ' ')}
                  </div>
                </div>
              </Button>
            ))}
          </div>
        </ScrollArea>
      </div>
      
      <div className="flex-1">
        {selectedContact ? (
          <ChatWindow providerId={selectedContact.id} />
        ) : (
          <div className="h-full flex items-center justify-center text-muted-foreground">
            Select a contact to start chatting
          </div>
        )}
      </div>
    </div>
  );
};