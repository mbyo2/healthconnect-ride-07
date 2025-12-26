-- AI Chat Conversations and Messages Tables
-- This migration creates tables for storing AI chat history with cross-device sync support

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Table: ai_chat_conversations
-- Stores conversation metadata and grouping
CREATE TABLE IF NOT EXISTS ai_chat_conversations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    is_archived BOOLEAN DEFAULT FALSE,
    CONSTRAINT fk_user FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Table: ai_chat_messages
-- Stores individual messages within conversations
CREATE TABLE IF NOT EXISTS ai_chat_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    conversation_id UUID NOT NULL REFERENCES ai_chat_conversations(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
    content TEXT NOT NULL,
    image_data TEXT, -- Base64 encoded image (optional)
    clinical_decisions JSONB, -- Parsed clinical decisions (optional)
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT fk_conversation FOREIGN KEY (conversation_id) REFERENCES ai_chat_conversations(id) ON DELETE CASCADE
);

-- Indexes for performance optimization
CREATE INDEX IF NOT EXISTS idx_conversations_user_updated 
    ON ai_chat_conversations(user_id, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_conversations_user_archived 
    ON ai_chat_conversations(user_id, is_archived);

CREATE INDEX IF NOT EXISTS idx_messages_conversation_created 
    ON ai_chat_messages(conversation_id, created_at);

CREATE INDEX IF NOT EXISTS idx_messages_content_search 
    ON ai_chat_messages USING gin(to_tsvector('english', content));

-- Row Level Security (RLS) Policies

-- Enable RLS on both tables
ALTER TABLE ai_chat_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_chat_messages ENABLE ROW LEVEL SECURITY;

-- Conversations: Users can only see their own conversations
CREATE POLICY "Users can view own conversations"
    ON ai_chat_conversations
    FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own conversations"
    ON ai_chat_conversations
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own conversations"
    ON ai_chat_conversations
    FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own conversations"
    ON ai_chat_conversations
    FOR DELETE
    USING (auth.uid() = user_id);

-- Messages: Users can only access messages from their own conversations
CREATE POLICY "Users can view own messages"
    ON ai_chat_messages
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM ai_chat_conversations
            WHERE ai_chat_conversations.id = ai_chat_messages.conversation_id
            AND ai_chat_conversations.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert own messages"
    ON ai_chat_messages
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM ai_chat_conversations
            WHERE ai_chat_conversations.id = ai_chat_messages.conversation_id
            AND ai_chat_conversations.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update own messages"
    ON ai_chat_messages
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM ai_chat_conversations
            WHERE ai_chat_conversations.id = ai_chat_messages.conversation_id
            AND ai_chat_conversations.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete own messages"
    ON ai_chat_messages
    FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM ai_chat_conversations
            WHERE ai_chat_conversations.id = ai_chat_messages.conversation_id
            AND ai_chat_conversations.user_id = auth.uid()
        )
    );

-- Function: Update conversation updated_at timestamp
CREATE OR REPLACE FUNCTION update_conversation_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE ai_chat_conversations
    SET updated_at = NOW()
    WHERE id = NEW.conversation_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger: Auto-update conversation timestamp when message is added
CREATE TRIGGER trigger_update_conversation_timestamp
    AFTER INSERT ON ai_chat_messages
    FOR EACH ROW
    EXECUTE FUNCTION update_conversation_timestamp();

-- Function: Auto-generate conversation title from first message
CREATE OR REPLACE FUNCTION auto_generate_conversation_title()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.title IS NULL THEN
        -- Get first user message content (up to 50 chars)
        SELECT SUBSTRING(content, 1, 50) INTO NEW.title
        FROM ai_chat_messages
        WHERE conversation_id = NEW.id
        AND role = 'user'
        ORDER BY created_at
        LIMIT 1;
        
        -- Fallback if no user message yet
        IF NEW.title IS NULL THEN
            NEW.title := 'New Conversation';
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger: Set title on conversation update if still null
CREATE TRIGGER trigger_auto_title
    BEFORE UPDATE ON ai_chat_conversations
    FOR EACH ROW
    WHEN (OLD.title IS NULL AND NEW.title IS NULL)
    EXECUTE FUNCTION auto_generate_conversation_title();

-- Grant permissions
GRANT ALL ON ai_chat_conversations TO authenticated;
GRANT ALL ON ai_chat_messages TO authenticated;

-- Comments for documentation
COMMENT ON TABLE ai_chat_conversations IS 'Stores AI chat conversation metadata for cross-device sync';
COMMENT ON TABLE ai_chat_messages IS 'Stores individual messages within AI chat conversations';
COMMENT ON COLUMN ai_chat_messages.clinical_decisions IS 'JSON array of parsed clinical decision cards';
COMMENT ON COLUMN ai_chat_messages.image_data IS 'Base64 encoded medical images uploaded by users';
