import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ChatWindow } from "./ChatWindow";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "sonner";
import { Link, useSearchParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
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
  const [loadError, setLoadError] = useState(false);
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

  const loadContacts = useCallback(async () => {
    try {
      setLoading(true);
      setLoadError(false);
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
        setLoadError(true);
        toast.error("Error fetching contacts: " + error.message);
      } finally {
        setLoading(false);
      }
    }, []);

    useEffect(() => {
      loadContacts();

      // Real-time: any new message refreshes the contact list. This both
      // bubbles active conversations and discovers brand-new counterparts
      // (no user-id race, no missed first messages). messages table is in the
      // realtime publication (see 20260921 migration).
      const channel = supabase
        .channel('chat-list-realtime')
        .on('postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'messages' },
          () => {
            loadContacts();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }, [loadContacts]);

    if (loading) {
      return (
        <div className="grid gap-2 p-4" role="status" aria-label="Loading contacts">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-16 rounded-xl bg-muted animate-pulse" aria-hidden />
          ))}
        </div>
      );
    }

    if (loadError && contacts.length === 0) {
      return (
        <div className="text-center py-12 space-y-3">
          <p className="text-sm text-destructive font-medium">We couldn&apos;t load your conversations.</p>
          <p className="text-xs text-muted-foreground">Check your connection and try again.</p>
          <Button variant="outline" className="min-h-[44px]" onClick={loadContacts}>Try again</Button>
        </div>
      );
    }

  return (
    <div className="flex flex-col md:flex-row md:h-[calc(100vh-12rem)] gap-4">
      <div className={`md:w-1/3 md:border md:rounded-lg ${selectedContact ? 'hidden md:block' : 'block'}`}>
        <ScrollArea className="md:h-full">
          <div className="p-4 space-y-2">
            {contacts.length === 0 && (
              <div className="text-center py-8 space-y-3">
                <p className="text-sm text-muted-foreground">
                  No conversations yet — book an appointment to message your provider.
                </p>
                <Link to="/search">
                  <Button variant="outline" className="min-h-[44px]">Find a provider</Button>
                </Link>
              </div>
            )}
            {contacts.map((contact) => (
              <Button
                key={contact.id}
                variant={selectedContact?.id === contact.id ? "default" : "ghost"}
                className="w-full justify-start gap-2 min-h-[52px] py-2"
                onClick={() => setSelectedContact(contact)}
              >
                <Avatar className="h-9 w-9">
                  <AvatarImage src={contact.avatar_url || ''} />
                  <AvatarFallback>
                    {contact.first_name?.[0]}{contact.last_name?.[0]}
                  </AvatarFallback>
                </Avatar>
                <div className="text-left min-w-0">
                  <div className="truncate">{providerDisplayName({ first_name: contact.first_name, last_name: contact.last_name, role: contact.role })}</div>
                  <div className="text-xs text-muted-foreground capitalize">
                    {(contact.role || 'member').replace('_', ' ')}
                  </div>
                </div>
              </Button>
            ))}
          </div>
        </ScrollArea>
      </div>

      <div className={`flex-1 min-h-[60vh] md:min-h-0 ${selectedContact ? 'block' : 'hidden md:block'}`}>
        {selectedContact ? (
          <div className="flex flex-col h-full gap-2">
            <button
              onClick={() => setSelectedContact(null)}
              className="md:hidden self-start inline-flex items-center gap-1.5 min-h-[44px] px-3 rounded-lg text-sm font-semibold text-primary"
            >
              <ArrowLeft className="h-4 w-4" />
              All conversations
            </button>
            <div className="flex-1 min-h-0">
              <ChatWindow
                providerId={selectedContact.id}
                providerName={providerDisplayName({ first_name: selectedContact.first_name, last_name: selectedContact.last_name, role: selectedContact.role })}
              />
            </div>
          </div>
        ) : (
          <div className="h-full flex items-center justify-center text-muted-foreground">
            Select a contact to start chatting
          </div>
        )}
      </div>
    </div>
  );
};