import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ChatWindow } from "./ChatWindow";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "sonner";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, MessageSquare } from "lucide-react";
import { EmptyState } from "@/components/shared/EmptyState";
import { providerDisplayName } from "@/utils/providerDisplay";
import { SkeletonListRow } from "@/components/ui/skeleton-kit";
import { friendlyErrorMessage } from "@/utils/friendly-error";
import { createRealtimeChannel, removeRealtimeChannel } from "@/lib/realtimeChannel";

interface ChatContact {
  id: string;
  first_name: string | null;
  last_name: string | null;
  avatar_url: string | null;
  role: string;
}

export const ChatList = () => {
  const navigate = useNavigate();
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
      // message counterparts + appointment counterparts + delivery
      // counterparts (the courier on my deliveries / the patient on my
      // assigned deliveries). Never the whole user directory — a
      // patient must never be able to enumerate or open threads with
      // other patients.
      const counterpartIds = new Set<string>();
        const [msgsRes, apptsAsPatient, apptsAsProvider, myDeliveries, myCourierRows] = await Promise.all([
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
          // My deliveries as the patient — the courier on each one is a
          // contact (courier rows readable via "Patients view assigned
          // courier"; resolved to auth user ids below).
          supabase
            .from('delivery_orders')
            .select('courier_id')
            .eq('patient_id', user.id)
            .limit(200),
          // My courier record (empty unless this user is a courier).
          supabase
            .from('couriers')
            .select('id')
            .eq('user_id', user.id)
            .limit(5),
        ]);
        (msgsRes.data || []).forEach((m: any) => {
          if (m.sender_id && m.sender_id !== user.id) counterpartIds.add(m.sender_id);
          if (m.receiver_id && m.receiver_id !== user.id) counterpartIds.add(m.receiver_id);
        });
        (apptsAsPatient.data || []).forEach((a: any) => { if (a.provider_id) counterpartIds.add(a.provider_id); });
        (apptsAsProvider.data || []).forEach((a: any) => { if (a.patient_id) counterpartIds.add(a.patient_id); });

        // Patient → courier user ids for my deliveries.
        const myCourierIds = [...new Set((myDeliveries.data || []).map((d: any) => d.courier_id).filter(Boolean))];
        if (myCourierIds.length > 0) {
          const { data: courierRows } = await supabase
            .from('couriers')
            .select('user_id')
            .in('id', myCourierIds);
          (courierRows || []).forEach((c: any) => { if (c.user_id && c.user_id !== user.id) counterpartIds.add(c.user_id); });
        }
        // Courier → patient ids for my assigned deliveries.
        const myCourierRowIds = (myCourierRows.data || []).map((c: any) => c.id).filter(Boolean);
        if (myCourierRowIds.length > 0) {
          const { data: assigned } = await supabase
            .from('delivery_orders')
            .select('patient_id')
            .in('courier_id', myCourierRowIds)
            .limit(200);
          (assigned || []).forEach((d: any) => { if (d.patient_id && d.patient_id !== user.id) counterpartIds.add(d.patient_id); });
        }

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
        toast.error(friendlyErrorMessage(error, "Error fetching contacts. Please try again."));
      } finally {
        setLoading(false);
      }
    }, []);

    useEffect(() => {
      loadContacts();

      // Real-time: any new message refreshes the contact list. This both
      // bubbles active conversations and discovers brand-new counterparts
      // (no user-id race, no missed first messages). messages table is in the
      // realtime publication (see 20260921 migration). Unique channel per
      // mount (see src/lib/realtimeChannel.ts) — the old fixed name
      // 'chat-list-realtime' collided on fast unmount → remount.
      const channel = createRealtimeChannel('chat-list-realtime')
        .on('postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'messages' },
          () => {
            loadContacts();
          }
        )
        .subscribe();

      return () => {
        removeRealtimeChannel(channel);
      };
    }, [loadContacts]);

    if (loading) {
      return (
        <div className="grid gap-2 p-4" role="status" aria-label="Loading contacts">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="rounded-xl px-3" aria-hidden>
              <SkeletonListRow />
            </div>
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
              <EmptyState
                icon={MessageSquare}
                title="No conversations yet"
                description="Book an appointment to message your provider."
                actionLabel="Find a provider"
                onAction={() => navigate('/search')}
              />
            )}
            {contacts.map((contact) => (
              <button
                key={contact.id}
                onClick={() => setSelectedContact(contact)}
                className={`w-full flex items-center gap-3 p-3 rounded-2xl text-left transition-colors ${
                  selectedContact?.id === contact.id
                    ? "bg-primary/10 border border-primary/30"
                    : "hover:bg-muted border border-transparent"
                }`}
              >
                <Avatar className="h-12 w-12 shrink-0">
                  <AvatarImage src={contact.avatar_url || ''} />
                  <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                    {contact.first_name?.[0]}{contact.last_name?.[0]}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm text-foreground truncate">
                    {providerDisplayName({ first_name: contact.first_name, last_name: contact.last_name, role: contact.role })}
                  </p>
                  <p className="text-xs text-muted-foreground capitalize truncate">
                    {(contact.role || 'member').replace('_', ' ')}
                  </p>
                </div>
              </button>
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
          <div className="h-full flex items-center justify-center">
            <EmptyState
              icon={MessageSquare}
              title="Select a contact to start chatting"
              description="Choose a conversation from the list and your messages will appear here."
            />
          </div>
        )}
      </div>
    </div>
  );
};