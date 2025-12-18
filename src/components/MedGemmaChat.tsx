import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Send, Bot, User, X, Paperclip, Lightbulb } from 'lucide-react';
import { toast } from 'sonner';
import { ClinicalDecisionCard, ClinicalDecision, parseClinicalDecisions, ClinicalAction } from './ai/ClinicalDecisionCard';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  image?: string;
  decisions?: ClinicalDecision[];
}

export const MedGemmaChat = () => {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: 'Hello! I\'m Doc 0 Clock, your AI medical assistant. I can help you understand symptoms, discuss health concerns, and provide medical information. You can also upload medical images (lab results, X-rays, scans) for analysis. How can I assist you today?',
      timestamp: new Date()
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 120) + 'px';
    }
  }, [input]);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast.error('Image must be less than 10MB');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const base64 = e.target?.result as string;
      setSelectedImage(base64);
      toast.success('Image attached! Add a message and send.');
    };
    reader.readAsDataURL(file);
  };

  const sendMessage = async () => {
    if ((!input.trim() && !selectedImage) || isLoading) return;

    const userMessage: Message = {
      role: 'user',
      content: input.trim() || 'Please analyze this medical image',
      timestamp: new Date(),
      image: selectedImage || undefined
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    const imageToSend = selectedImage;
    setSelectedImage(null);
    setIsLoading(true);

    try {
      console.log('Attempting AI chat...');

      // Primary: doc-chat (Lovable AI - supports images)
      // Fallback: medgemma-chat (text-only)
      let data, error;
      let functionUsed = '';

      // Use doc-chat as primary (supports images and is more reliable)
      try {
        console.log('Calling doc-chat (primary)...');
        const response = await supabase.functions.invoke('doc-chat', {
          body: {
            message: userMessage.content,
            image: imageToSend || null,
            conversationHistory: messages.slice(-10).map(m => ({
              role: m.role,
              content: m.content
            }))
          }
        });
        data = response.data;
        error = response.error;
        functionUsed = 'doc-chat';

        if (error || !data?.reply) throw new Error('doc-chat failed');
      } catch (docChatError) {
        // Fallback to medgemma-chat (text-only, no image support)
        console.log('doc-chat failed, trying medgemma-chat fallback...');
        try {
          const medgemmaResponse = await supabase.functions.invoke('medgemma-chat', {
            body: {
              message: userMessage.content,
              conversationHistory: messages.slice(-10).map(m => ({
                role: m.role,
                content: m.content
              }))
            }
          });
          data = medgemmaResponse.data;
          error = medgemmaResponse.error;
          functionUsed = 'medgemma-chat';
        } catch (medgemmaError) {
          console.error('All AI functions failed');
          throw new Error('Unable to connect to AI assistant. Please try again.');
        }
      }

      console.log(`${functionUsed} response:`, { data, error });

      if (error) {
        console.error('All AI functions failed:', error);
        throw new Error(error.message || 'Failed to get response from AI');
      }

      if (!data || !data.reply) {
        throw new Error('Invalid response from AI - no reply received');
      }

      // Parse clinical decisions from AI response
      const decisions = parseClinicalDecisions(data.reply);

      const assistantMessage: Message = {
        role: 'assistant',
        content: data.reply,
        timestamp: new Date(),
        decisions: decisions.length > 0 ? decisions : undefined
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Error sending message:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to get response. Please try again.';
      toast.error(errorMessage);

      // Remove the user message if failed
      setMessages(prev => prev.slice(0, -1));
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <Card className="w-full h-[calc(100dvh-16rem)] sm:h-[600px] md:h-[700px] flex flex-col shadow-lg border-2">
      <CardHeader className="border-b py-2 sm:py-4 bg-gradient-to-r from-primary/5 to-primary/10">
        <CardTitle className="flex items-center gap-2 text-sm sm:text-lg">
          <div className="w-7 h-7 sm:w-10 sm:h-10 rounded-full bg-primary/20 flex items-center justify-center">
            <Bot className="h-3.5 w-3.5 sm:h-5 sm:w-5 text-primary" />
          </div>
          <div>
            <div className="font-bold">Doc 0 Clock Assistant</div>
            <div className="text-xs text-muted-foreground font-normal">Online • AI Medical Helper</div>
          </div>
        </CardTitle>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col p-0 min-h-0">
        {/* Messages Area - WhatsApp style */}
        <ScrollArea className="flex-1 p-3 sm:p-6 bg-gradient-to-b from-muted/30 to-background overflow-x-hidden" ref={scrollRef}>
          <div className="space-y-4 sm:space-y-5">
            {messages.map((message, index) => (
              <div
                key={index}
                className={`flex gap-2 sm:gap-3 ${message.role === 'user' ? 'justify-end' : 'justify-start'
                  }`}
              >
                {message.role === 'assistant' && (
                  <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-1">
                    <Bot className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                  </div>
                )}

                <div className="max-w-[80%] sm:max-w-[75%] space-y-2 min-w-0">
                  <div
                    className={`rounded-2xl p-3 sm:p-4 shadow-sm ${message.role === 'user'
                      ? 'bg-primary text-primary-foreground rounded-br-sm'
                      : 'bg-card border rounded-bl-sm'
                      }`}
                  >
                    {message.image && (
                      <div className="rounded-xl mb-3 overflow-hidden border-2 border-primary/20">
                        <img
                          src={message.image}
                          alt="Medical image"
                          className="w-full h-auto max-h-64 object-contain bg-muted/50"
                        />
                      </div>
                    )}
                    <p className="text-sm sm:text-base whitespace-pre-wrap leading-relaxed break-words overflow-hidden" style={{ wordBreak: 'break-word', overflowWrap: 'break-word' }}>{message.content}</p>
                    <span className="text-xs opacity-60 mt-2 block">
                      {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>

                  {/* Clinical Decision Cards */}
                  {message.decisions && message.decisions.length > 0 && (
                    <div className="space-y-2 mt-3">
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Lightbulb className="h-3 w-3" />
                        <span>AI-Triggered Recommendations</span>
                      </div>
                      {message.decisions.map((decision, idx) => (
                        <ClinicalDecisionCard
                          key={idx}
                          decision={decision}
                          compact={message.decisions && message.decisions.length > 1}
                        />
                      ))}
                    </div>
                  )}
                </div>

                {message.role === 'user' && (
                  <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-primary flex items-center justify-center flex-shrink-0 mt-1">
                    <User className="h-4 w-4 sm:h-5 sm:w-5 text-primary-foreground" />
                  </div>
                )}
              </div>
            ))}

            {isLoading && (
              <div className="flex gap-2 sm:gap-3 justify-start">
                <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-primary/10 flex items-center justify-center mt-1">
                  <Bot className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                </div>
                <div className="bg-card border rounded-2xl rounded-bl-sm p-3 sm:p-4 shadow-sm">
                  <div className="flex gap-2 items-center">
                    <div className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: '0ms' }} />
                    <div className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: '150ms' }} />
                    <div className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Input Area - WhatsApp style */}
        <div className="border-t p-3 sm:p-4 bg-card">
          {selectedImage && (
            <div className="mb-3 relative inline-block">
              <div className="rounded-xl overflow-hidden border-2 border-primary shadow-md">
                <img
                  src={selectedImage}
                  alt="Selected"
                  className="h-24 sm:h-32 object-cover"
                />
              </div>
              <Button
                size="icon"
                variant="destructive"
                className="absolute -top-2 -right-2 h-7 w-7 rounded-full shadow-lg"
                onClick={() => setSelectedImage(null)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          )}

          <div className="flex gap-2 items-end">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleImageSelect}
              accept="image/*"
              className="hidden"
            />

            {/* Image Upload Button with Label */}
            <Button
              onClick={() => fileInputRef.current?.click()}
              disabled={isLoading}
              size="icon"
              variant="outline"
              className="flex-shrink-0 h-12 w-12 rounded-full border-2 hover:bg-primary/10 hover:border-primary transition-all"
              title="Upload medical image (X-rays, lab results, scans)"
            >
              <div className="relative">
                <Paperclip className="h-5 w-5" />
                {selectedImage && (
                  <span className="absolute -top-1 -right-1 w-2 h-2 bg-primary rounded-full" />
                )}
              </div>
            </Button>

            <div className="flex-1 relative">
              <Textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyPress}
                placeholder={selectedImage ? "Describe what you want to know about this image..." : "Ask me about your health..."}
                disabled={isLoading}
                className="resize-none min-h-[48px] max-h-[120px] rounded-3xl px-4 py-3 pr-12 text-base bg-muted/50 border-2 focus-visible:ring-2 focus-visible:ring-primary"
                rows={1}
              />
              <Button
                onClick={sendMessage}
                disabled={isLoading || (!input.trim() && !selectedImage)}
                size="icon"
                className="absolute right-1 bottom-1 h-10 w-10 rounded-full bg-primary hover:bg-primary/90 disabled:opacity-50"
              >
                {isLoading ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <Send className="h-5 w-5" />
                )}
              </Button>
            </div>
          </div>

          <div className="mt-3 flex items-center gap-2">
            <div className="flex-1">
              <p className="text-xs text-muted-foreground leading-relaxed">
                💡 <strong>Upload medical images</strong> (lab results, X-rays, scans) for AI analysis
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
