import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { MessageSquare, Plus, MoreVertical, Archive, Trash2, Search } from 'lucide-react';
import { ChatConversation } from '@/hooks/useAIChat';
import { formatDistanceToNow } from 'date-fns';

interface ConversationListProps {
    conversations: ChatConversation[];
    currentConversationId: string | null;
    onSelectConversation: (id: string) => void;
    onNewConversation: () => void;
    onArchiveConversation: (id: string) => void;
    onDeleteConversation: (id: string) => void;
}

export const ConversationList = ({
    conversations,
    currentConversationId,
    onSelectConversation,
    onNewConversation,
    onArchiveConversation,
    onDeleteConversation
}: ConversationListProps) => {
    const [searchQuery, setSearchQuery] = useState('');

    const filteredConversations = conversations.filter(conv =>
        conv.title.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <Card className="h-full flex flex-col">
            <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">Conversations</CardTitle>
                    <Button size="sm" onClick={onNewConversation} className="gap-2">
                        <Plus className="h-4 w-4" />
                        New
                    </Button>
                </div>
                <div className="relative mt-2">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search conversations..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-8"
                    />
                </div>
            </CardHeader>
            <CardContent className="flex-1 p-0">
                <ScrollArea className="h-full">
                    <div className="space-y-1 p-2">
                        {filteredConversations.length === 0 ? (
                            <div className="text-center py-8 text-muted-foreground text-sm">
                                {searchQuery ? 'No conversations found' : 'No conversations yet'}
                            </div>
                        ) : (
                            filteredConversations.map((conv) => (
                                <div
                                    key={conv.id}
                                    className={`group flex items-center gap-2 p-3 rounded-lg cursor-pointer transition-colors ${currentConversationId === conv.id
                                            ? 'bg-primary/10 border border-primary/20'
                                            : 'hover:bg-accent'
                                        }`}
                                    onClick={() => onSelectConversation(conv.id)}
                                >
                                    <MessageSquare className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium truncate">{conv.title}</p>
                                        <p className="text-xs text-muted-foreground">
                                            {formatDistanceToNow(new Date(conv.updated_at), { addSuffix: true })}
                                        </p>
                                    </div>
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-8 w-8 opacity-0 group-hover:opacity-100"
                                            >
                                                <MoreVertical className="h-4 w-4" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                            <DropdownMenuItem
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    onArchiveConversation(conv.id);
                                                }}
                                            >
                                                <Archive className="h-4 w-4 mr-2" />
                                                Archive
                                            </DropdownMenuItem>
                                            <DropdownMenuItem
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    if (confirm('Delete this conversation? This cannot be undone.')) {
                                                        onDeleteConversation(conv.id);
                                                    }
                                                }}
                                                className="text-destructive"
                                            >
                                                <Trash2 className="h-4 w-4 mr-2" />
                                                Delete
                                            </DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </div>
                            ))
                        )}
                    </div>
                </ScrollArea>
            </CardContent>
        </Card>
    );
};
