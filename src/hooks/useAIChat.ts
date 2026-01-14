import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { safeLocalGet, safeLocalSet, safeLocalRemove } from '@/utils/storage';

export interface ChatMessage {
    id?: string;
    role: 'user' | 'assistant';
    content: string;
    timestamp: Date;
    image?: string;
    decisions?: any[];
}

export interface ChatConversation {
    id: string;
    title: string;
    created_at: string;
    updated_at: string;
    is_archived: boolean;
}

const STORAGE_KEY = 'medgemma_chat_history';
const CURRENT_CONVERSATION_KEY = 'current_conversation_id';

export const useAIChat = () => {
    const { user } = useAuth();
    const [conversations, setConversations] = useState<ChatConversation[]>([]);
    const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isSyncing, setIsSyncing] = useState(false);

    // Load conversations from database
    const loadConversations = useCallback(async () => {
        if (!user) return;

        try {
            const { data, error } = await supabase
                .from('ai_chat_conversations')
                .select('*')
                .eq('user_id', user.id)
                .eq('is_archived', false)
                .order('updated_at', { ascending: false });

            if (error) throw error;
            setConversations(data || []);
        } catch (error) {
            console.error('Error loading conversations:', error);
        }
    }, [user]);

    // Load messages for a conversation
    const loadMessages = useCallback(async (conversationId: string) => {
        if (!user) return;

        setIsLoading(true);
        try {
            const { data, error } = await supabase
                .from('ai_chat_messages')
                .select('*')
                .eq('conversation_id', conversationId)
                .order('created_at', { ascending: true });

            if (error) throw error;

            const formattedMessages: ChatMessage[] = (data || []).map(msg => ({
                id: msg.id,
                role: msg.role as 'user' | 'assistant',
                content: msg.content,
                timestamp: new Date(msg.created_at || new Date()),
                image: msg.image_data || undefined,
                decisions: Array.isArray(msg.clinical_decisions) ? msg.clinical_decisions : undefined
            }));

            setMessages(formattedMessages);

            // Also save to localStorage as cache
            safeLocalSet(STORAGE_KEY, JSON.stringify(formattedMessages));
            safeLocalSet(CURRENT_CONVERSATION_KEY, conversationId);
        } catch (error) {
            console.error('Error loading messages:', error);
            // Fallback to localStorage
            loadFromLocalStorage();
        } finally {
            setIsLoading(false);
        }
    }, [user]);

    // Create new conversation
    const createConversation = useCallback(async (title?: string) => {
        if (!user) return null;

        try {
            const { data, error } = await supabase
                .from('ai_chat_conversations')
                .insert({
                    user_id: user.id,
                    title: title || 'New Conversation'
                })
                .select()
                .single();

            if (error) throw error;

            setCurrentConversationId(data.id);
            setMessages([]);
            await loadConversations();

            return data.id;
        } catch (error) {
            console.error('Error creating conversation:', error);
            return null;
        }
    }, [user, loadConversations]);

    // Save message to database
    const saveMessage = useCallback(async (message: ChatMessage) => {
        if (!user || !currentConversationId) return;

        setIsSyncing(true);
        try {
            const { error } = await supabase
                .from('ai_chat_messages')
                .insert({
                    conversation_id: currentConversationId,
                    role: message.role,
                    content: message.content,
                    image_data: message.image || null,
                    clinical_decisions: message.decisions || null
                });

            if (error) throw error;

            // Update local state
            setMessages(prev => [...prev, message]);

            // Save to localStorage as backup
            const updated = [...messages, message];
            safeLocalSet(STORAGE_KEY, JSON.stringify(updated));
        } catch (error) {
            console.error('Error saving message:', error);
            // Still update local state even if sync fails
            setMessages(prev => [...prev, message]);
        } finally {
            setIsSyncing(false);
        }
    }, [user, currentConversationId, messages]);

    // Delete conversation
    const deleteConversation = useCallback(async (conversationId: string) => {
        if (!user) return;

        try {
            const { error } = await supabase
                .from('ai_chat_conversations')
                .delete()
                .eq('id', conversationId);

            if (error) throw error;

            await loadConversations();

            if (currentConversationId === conversationId) {
                setCurrentConversationId(null);
                setMessages([]);
                safeLocalRemove(STORAGE_KEY);
                safeLocalRemove(CURRENT_CONVERSATION_KEY);
            }
        } catch (error) {
            console.error('Error deleting conversation:', error);
        }
    }, [user, currentConversationId, loadConversations]);

    // Archive conversation
    const archiveConversation = useCallback(async (conversationId: string) => {
        if (!user) return;

        try {
            const { error } = await supabase
                .from('ai_chat_conversations')
                .update({ is_archived: true })
                .eq('id', conversationId);

            if (error) throw error;
            await loadConversations();
        } catch (error) {
            console.error('Error archiving conversation:', error);
        }
    }, [user, loadConversations]);

    // Load from localStorage (fallback)
    const loadFromLocalStorage = useCallback(() => {
        try {
            const saved = safeLocalGet(STORAGE_KEY);
            const savedConvId = safeLocalGet(CURRENT_CONVERSATION_KEY);

            if (saved) {
                const parsed = JSON.parse(saved);
                setMessages(parsed.map((msg: any) => ({
                    ...msg,
                    timestamp: new Date(msg.timestamp)
                })));
            }

            if (savedConvId) {
                setCurrentConversationId(savedConvId);
            }
        } catch (error) {
            console.error('Error loading from localStorage:', error);
        }
    }, []);

    // Initialize
    useEffect(() => {
        if (user) {
            loadConversations();

            // Try to restore last conversation
            const savedConvId = safeLocalGet(CURRENT_CONVERSATION_KEY);
            if (savedConvId) {
                setCurrentConversationId(savedConvId);
                loadMessages(savedConvId);
            } else {
                // Load from localStorage as fallback
                loadFromLocalStorage();
            }
        }
    }, [user, loadConversations, loadMessages, loadFromLocalStorage]);

    return {
        conversations,
        currentConversationId,
        messages,
        isLoading,
        isSyncing,
        setCurrentConversationId,
        loadMessages,
        createConversation,
        saveMessage,
        deleteConversation,
        archiveConversation,
        loadConversations
    };
};
