import { useState } from 'react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Settings, Download, Upload } from 'lucide-react';
import { ChatMessage } from '@/hooks/useAIChat';
import { exportChatAsJSON, exportChatAsMarkdown, importChatFromJSON } from '@/utils/chat-export';
import { toast } from 'sonner';

interface ChatSettingsProps {
    messages: ChatMessage[];
    conversationTitle: string;
    onImport: (messages: ChatMessage[]) => void;
}

export const ChatSettings = ({ messages, conversationTitle, onImport }: ChatSettingsProps) => {
    const [syncEnabled, setSyncEnabled] = useState(true);
    const [autoClearDays, setAutoClearDays] = useState('30');

    const handleExportJSON = () => {
        exportChatAsJSON(messages, conversationTitle);
        toast.success('Chat exported as JSON');
    };

    const handleExportMarkdown = () => {
        exportChatAsMarkdown(messages, conversationTitle);
        toast.success('Chat exported as Markdown');
    };

    const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const imported = await importChatFromJSON(file);
        if (imported) {
            onImport(imported);
            toast.success(`Imported ${imported.length} messages`);
        } else {
            toast.error('Failed to import chat');
        }
    };

    return (
        <Dialog>
            <DialogTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                    <Settings className="h-4 w-4" />
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Chat Settings</DialogTitle>
                    <DialogDescription>
                        Manage your AI chat preferences and data
                    </DialogDescription>
                </DialogHeader>
                <div className="space-y-6 py-4">
                    {/* Sync Settings */}
                    <div className="space-y-4">
                        <h3 className="text-sm font-semibold">Synchronization</h3>
                        <div className="flex items-center justify-between">
                            <Label htmlFor="sync-toggle" className="text-sm">
                                Sync across devices
                            </Label>
                            <Switch
                                id="sync-toggle"
                                checked={syncEnabled}
                                onCheckedChange={setSyncEnabled}
                            />
                        </div>
                        <p className="text-xs text-muted-foreground">
                            Save conversations to database for access on all your devices
                        </p>
                    </div>

                    {/* Auto-Clear Settings */}
                    <div className="space-y-4">
                        <h3 className="text-sm font-semibold">Auto-Clear</h3>
                        <div className="space-y-2">
                            <Label htmlFor="auto-clear" className="text-sm">
                                Auto-clear after
                            </Label>
                            <Select value={autoClearDays} onValueChange={setAutoClearDays}>
                                <SelectTrigger id="auto-clear">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="7">7 days</SelectItem>
                                    <SelectItem value="14">14 days</SelectItem>
                                    <SelectItem value="30">30 days</SelectItem>
                                    <SelectItem value="90">90 days</SelectItem>
                                    <SelectItem value="never">Never</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    {/* Export/Import */}
                    <div className="space-y-4">
                        <h3 className="text-sm font-semibold">Export & Import</h3>
                        <div className="flex flex-col gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={handleExportJSON}
                                className="justify-start"
                                disabled={messages.length === 0}
                            >
                                <Download className="h-4 w-4 mr-2" />
                                Export as JSON
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={handleExportMarkdown}
                                className="justify-start"
                                disabled={messages.length === 0}
                            >
                                <Download className="h-4 w-4 mr-2" />
                                Export as Markdown
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                className="justify-start"
                                onClick={() => document.getElementById('import-file')?.click()}
                            >
                                <Upload className="h-4 w-4 mr-2" />
                                Import from JSON
                            </Button>
                            <input
                                id="import-file"
                                type="file"
                                accept=".json"
                                className="hidden"
                                onChange={handleImport}
                            />
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
};
