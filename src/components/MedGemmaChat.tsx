import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Send, Bot, User, Image as ImageIcon, X } from 'lucide-react';
import { toast } from 'sonner';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  image?: string; // base64 image data
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

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

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
      console.log('Attempting AI chat with fallback system...');

      // Three-tier fallback: medgemma-chat → doc-chat → med-ai
      let data, error;
      let functionUsed = '';

      // Try 1: medgemma-chat (Hugging Face MedGemma)
      try {
        console.log('Trying medgemma-chat...');
        const response = await supabase.functions.invoke('medgemma-chat', {
          body: {
            message: userMessage.content,
            conversationHistory: messages.slice(-10).map(m => ({
              role: m.role,
              content: m.content
            }))
          }
        });
        data = response.data;
        error = response.error;
        functionUsed = 'medgemma-chat';

        if (error) throw new Error('medgemma-chat failed');
      } catch (medgemmaError) {
        // Try 2: doc-chat (Lovable AI)
        console.log('medgemma-chat failed, trying doc-chat...');
        try {
          const docChatResponse = await supabase.functions.invoke('doc-chat', {
            body: {
              message: userMessage.content,
              image: imageToSend,
              conversationHistory: messages.slice(-10).map(m => ({
                role: m.role,
                content: m.content
              }))
            }
          });
          data = docChatResponse.data;
          error = docChatResponse.error;
          functionUsed = 'doc-chat';

          if (error) throw new Error('doc-chat failed');
        } catch (docChatError) {
          // Try 3: med-ai (final fallback)
          console.log('doc-chat failed, trying med-ai...');
          const medAiResponse = await supabase.functions.invoke('med-ai', {
            body: {
              message: userMessage.content,
              conversationHistory: messages.slice(-10).map(m => ({
                role: m.role,
                content: m.content
              }))
            }
          });
          data = medAiResponse.data;
          error = medAiResponse.error;
          functionUsed = 'med-ai';
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

      const assistantMessage: Message = {
        role: 'assistant',
        content: data.reply,
        timestamp: new Date()
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
    <Card className="w-full h-[500px] sm:h-[600px] md:h-[650px] flex flex-col">
      <CardHeader className="border-b py-3 sm:py-4">
        <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
          <Bot className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
          Doc 0 Clock Assistant
        </CardTitle>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col p-0 min-h-0">
        <ScrollArea className="flex-1 p-3 sm:p-4" ref={scrollRef}>
          <div className="space-y-3 sm:space-y-4">
            {messages.map((message, index) => (
              <div
                key={index}
                className={`flex gap-2 sm:gap-3 ${message.role === 'user' ? 'justify-end' : 'justify-start'
                  }`}
              >
                {message.role === 'assistant' && (
                  <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Bot className="h-3 w-3 sm:h-4 sm:w-4 text-primary" />
                  </div>
                )}

                <div
                  className={`max-w-[85%] sm:max-w-[80%] rounded-lg p-2.5 sm:p-3 ${message.role === 'user'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted'
                    }`}
                >
                  {message.image && (
                    <img
                      src={message.image}
                      alt="Medical image"
                      className="rounded-lg mb-2 max-w-full h-auto max-h-48 object-contain"
                    />
                  )}
                  <p className="text-xs sm:text-sm whitespace-pre-wrap leading-relaxed">{message.content}</p>
                  <span className="text-[10px] sm:text-xs opacity-70 mt-1 block">
                    {message.timestamp.toLocaleTimeString()}
                  </span>
                </div>

                {message.role === 'user' && (
                  <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
                    <User className="h-3 w-3 sm:h-4 sm:w-4 text-primary-foreground" />
                  </div>
                )}
              </div>
            ))}

            {isLoading && (
              <div className="flex gap-2 sm:gap-3 justify-start">
                <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <Bot className="h-3 w-3 sm:h-4 sm:w-4 text-primary" />
                </div>
                <div className="bg-muted rounded-lg p-2.5 sm:p-3">
                  <Loader2 className="h-3 w-3 sm:h-4 sm:w-4 animate-spin" />
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        <div className="border-t p-3 sm:p-4">
          {selectedImage && (
            <div className="mb-2 relative inline-block">
              <img
                src={selectedImage}
                alt="Selected"
                className="rounded-lg max-h-20 object-contain border border-border"
              />
              <Button
                size="icon"
                variant="destructive"
                className="absolute -top-2 -right-2 h-6 w-6 rounded-full"
                onClick={() => setSelectedImage(null)}
              >
                <X className="h-3 w-3" />
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
            <Button
              onClick={() => fileInputRef.current?.click()}
              disabled={isLoading}
              size="icon"
              variant="outline"
              className="flex-shrink-0 h-10 w-10"
            >
              <ImageIcon className="h-5 w-5" />
            </Button>
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  sendMessage();
                }
              }}
              placeholder={selectedImage ? "Describe what you want to know about this image..." : "Type a message..."}
              disabled={isLoading}
              className="flex-1 text-sm resize-none min-h-[40px] max-h-[120px] rounded-3xl px-4 py-2.5 bg-muted/50 border-muted focus-visible:ring-1"
              rows={1}
              style={{
                height: 'auto',
                overflowY: input.split('\n').length > 3 ? 'auto' : 'hidden'
              }}
            />
            <Button
              onClick={sendMessage}
              disabled={isLoading || (!input.trim() && !selectedImage)}
              size="icon"
              className="flex-shrink-0 h-10 w-10 rounded-full bg-primary hover:bg-primary/90"
            >
              {isLoading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <Send className="h-5 w-5" />
              )}
            </Button>
          </div>
          <p className="text-[10px] sm:text-xs text-muted-foreground mt-2 leading-relaxed">
            💡 Powered by Doc 0 Clock AI - For informational purposes only. Always consult a healthcare professional.
          </p>
        </div>
      </CardContent>
    </Card>
  );
};
