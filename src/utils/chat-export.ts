import { ChatMessage } from '@/hooks/useAIChat';

export const exportChatAsJSON = (messages: ChatMessage[], conversationTitle: string) => {
    const data = {
        exportDate: new Date().toISOString(),
        conversationTitle,
        messageCount: messages.length,
        messages: messages.map(msg => ({
            role: msg.role,
            content: msg.content,
            timestamp: msg.timestamp.toISOString(),
            hasImage: !!msg.image,
            hasDecisions: !!msg.decisions
        }))
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `chat-export-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
};

export const exportChatAsMarkdown = (messages: ChatMessage[], conversationTitle: string) => {
    let markdown = `# ${conversationTitle}\n\n`;
    markdown += `**Exported:** ${new Date().toLocaleString()}\n\n`;
    markdown += `**Total Messages:** ${messages.length}\n\n`;
    markdown += `---\n\n`;

    messages.forEach((msg, idx) => {
        const time = msg.timestamp.toLocaleString();
        const role = msg.role === 'user' ? '👤 You' : '🤖 Doc 0 Clock';

        markdown += `## Message ${idx + 1} - ${role}\n`;
        markdown += `*${time}*\n\n`;
        markdown += `${msg.content}\n\n`;

        if (msg.image) {
            markdown += `*[Image attached]*\n\n`;
        }

        if (msg.decisions && msg.decisions.length > 0) {
            markdown += `**Clinical Recommendations:**\n`;
            msg.decisions.forEach((decision: any) => {
                markdown += `- ${decision.title}\n`;
            });
            markdown += `\n`;
        }

        markdown += `---\n\n`;
    });

    const blob = new Blob([markdown], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `chat-export-${new Date().toISOString().split('T')[0]}.md`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
};

export const importChatFromJSON = async (file: File): Promise<ChatMessage[] | null> => {
    try {
        const text = await file.text();
        const data = JSON.parse(text);

        if (!data.messages || !Array.isArray(data.messages)) {
            throw new Error('Invalid chat export format');
        }

        const messages: ChatMessage[] = data.messages.map((msg: any) => ({
            role: msg.role,
            content: msg.content,
            timestamp: new Date(msg.timestamp),
            image: undefined, // Images not included in export for size reasons
            decisions: undefined
        }));

        return messages;
    } catch (error) {
        console.error('Error importing chat:', error);
        return null;
    }
};
