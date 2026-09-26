import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ChatWindow } from "./ChatWindow";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "sonner";
import { useSearchParams } from "react-router-dom";
import { providerDisplayName } from "@/utils/providerDisplay";

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
  const [searchParams] = useSearchParams();
  const receiverParam = searchParams.get("receiver");

  // Deep link support: /chat?receiver=<id> preselects that conversation.
  // If the receiver has no prior messages/appointments (e.g. a patient
  // clicking "Chat" on a newly discovered provider), synthesize the contact
  // from their profile so the chat opens instead of silently doing nothing.
  useEffect(() => {
    if (!receiverParam || selectedContact) return;
    const match = contacts.find((c) => c.id === receiverParam);
    if (match) {
      setSelectedContact(match);
      return;
    }
    // Not in contacts yet — fetch the profile and open the conversation.
    // Guard: only once contacts finished loading (avoid racing fetchContacts).
    if (loading) return;
    supabase
      .from('profiles')
      .select('id, first_name, last_name, avatar_url, role')
      .eq('id', receiverParam)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          setContacts((prev) =>
            prev.some((c) => c.id === data.id) ? prev : [...prev, data as ChatContact]
          );
          setSelectedContact(data as ChatContact);
        } else {
          toast.error('Could not open this chat — the user was not found.');
        }
      });
  }, [receiverParam, contacts, selectedContact, loading]);

  useEffect(() => {
    const fetchContacts = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // Only people this user actually has care relationships with:
        // message counterparts + appointment counterparts. Never the
        // whole user directory.
        const counterpartIds = new Set<string>();
        const [msgsRes, apptsAsPatient, apptsAsProvider] = await Promise.all([
          supabase
            .from('messages')
            .select('sender_id, receiver_id')
            .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
            .limit(500),
          supabase
            .from('appointments')
            .select('provider_id')
            .eq('patient_id', user.id)
            .limit(200),
          supabase
            .from('appointments')
            .select('patient_id')
            .eq('provider_id', user.id)
            .limit(200),
        ]);
        (msgsRes.data || []).forEach((m: any) => {
          if (m.sender_id && m.sender_id !== user.id) counterpartIds.add(m.sender_id);
          if (m.receiver_id && m.receiver_id !== user.id) counterpartIds.add(m.receiver_id);
        });
        (apptsAsPatient.data || []).forEach((a: any) => { if (a.provider_id) counterpartIds.add(a.provider_id); });
        (apptsAsProvider.data || []).forEach((a: any) => { if (a.patient_id) counterpartIds.add(a.patient_id); });

        if (counterpartIds.size === 0) {
          setContacts([]);
          return;
        }
        const { data: profiles, error } = await supabase
          .from('profiles')
          .select('id, first_name, last_name, avatar_url, role')
          .in('id', Array.from(counterpartIds));

        if (error) throw error;
        setContacts(profiles || []);
      } catch (error: any) {
        toast.error("Error fetching contacts: " + error.message);
      } finally {
        setLoading(false);
      }
    };

    fetchContacts();

    // Real-time: any new message refreshes the contact list. This both
    // bubbles active conversations and discovers brand-new counterparts
    // (no user-id race, no missed first messages). messages table is in the
    // realtime publication (see 20260921 migration).
    const channel = supabase
      .channel('chat-list-realtime')
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages' },
        () => {
          fetchContacts();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  if (loading) {
    return (
      <div className="grid gap-2 p-4" role="status" aria-label="Loading contacts">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-16 rounded-xl bg-muted animate-pulse" aria-hidden />
        ))}
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-8rem)] gap-4">
      <div className="w-1/3 border rounded-lg">
        <ScrollArea className="h-full">
          <div className="p-4 space-y-2">
            {contacts.length === 0 && (
              <div className="text-center py-8 text-sm text-muted-foreground">
                No conversations yet — book an appointment to message your provider.
              </div>
            )}
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
                  <div>{providerDisplayName({ first_name: contact.first_name, last_name: contact.last_name, role: contact.role })}</div>
                  <div className="text-xs text-muted-foreground capitalize">
                    {(contact.role || 'member').replace('_', ' ')}
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