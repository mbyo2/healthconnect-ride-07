import { useState, useRef, useEffect } from 'react';
import { safeLocalGet, safeLocalSet, safeLocalRemove } from '@/utils/storage';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Send, Bot, User, X, Paperclip, Lightbulb, Image as ImageIcon } from 'lucide-react';
import { toast } from 'sonner';
import { ClinicalDecisionCard, ClinicalDecision, parseClinicalDecisions, ClinicalAction } from './ai/ClinicalDecisionCard';
import { useUserRoles } from '@/context/UserRolesContext';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  images?: string[]; // Changed to support multiple images
  analysisType?: string;
  decisions?: ClinicalDecision[];
}

type AnalysisType = 'general' | 'longitudinal' | 'anatomical_localization' | 'document_understanding';

const LinkifiedText = ({ text }: { text: string }) => {
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const parts = text.split(urlRegex);

  return (
    <>
      {parts.map((part, i) => {
        if (part.match(urlRegex)) {
          return (
            <a
              key={i}
              href={part}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-500 underline break-all hover:text-blue-600 transition-colors"
            >
              {part}
            </a>
          );
        }
        return part;
      })}
    </>
  );
};

const AI_WELCOME_MESSAGE = "Hello! I'm Doc' O Clock AI powered by MedGemma 1.5 4B, your advanced multimodal medical assistant. I can:\n\n🖼️ Analyze single or multiple medical images\n📊 Compare scans over time (longitudinal analysis)\n📄 Extract data from lab reports and documents\n🎯 Identify anatomical features with localization\n💬 Answer medical questions\n\nHow can I assist you today?";

interface MedGemmaChatProps {
  onActionClick?: (action: ClinicalAction) => void;
  roleOverride?: string;
}

const STORAGE_KEY = 'doc_oclock_ai_chat_history';

export const MedGemmaChat = ({ onActionClick, roleOverride }: MedGemmaChatProps) => {
  const { currentRole, userRole } = useUserRoles();
  const activeRole = roleOverride || currentRole || userRole || 'patient';
  // Load messages from localStorage on mount
  const [messages, setMessages] = useState<Message[]>(() => {
    try {
      const saved = safeLocalGet(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        // Convert timestamp strings back to Date objects
        return parsed.map((msg: any) => ({
          ...msg,
          timestamp: new Date(msg.timestamp)
        }));
      }
    } catch (error) {
      console.error('Failed to load chat history:', error);
    }
    // Default welcome message
    return [
      {
        role: 'assistant',
        content: AI_WELCOME_MESSAGE,
        timestamp: new Date()
      }
    ];
  });

  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedImages, setSelectedImages] = useState<string[]>([]); // Changed to array
  const [analysisType, setAnalysisType] = useState<AnalysisType>('general');
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Save messages to localStorage whenever they change
  useEffect(() => {
    try {
      safeLocalSet(STORAGE_KEY, JSON.stringify(messages));
    } catch (error) {
      console.error('Failed to save chat history:', error);
    }
  }, [messages]);

  // Auto-scroll to bottom
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
    const files = e.target.files;
    if (!files || files.length === 0) return;

    // Check total images limit (10 max)
    if (selectedImages.length + files.length > 10) {
      toast.error('Maximum 10 images allowed');
      return;
    }

    // Process all selected files
    const fileArray = Array.from(files);
    
    fileArray.forEach((file) => {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        toast.error(`${file.name} is not an image file`);
        return;
      }

      // Validate file size (max 5MB per image)
      if (file.size > 5 * 1024 * 1024) {
        toast.error(`${file.name} is too large (max 5MB per image)`);
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        const base64 = e.target?.result as string;
        setSelectedImages(prev => [...prev, base64]);
      };
      reader.readAsDataURL(file);
    });

    toast.success(`${files.length} image(s) attached`);
    
    // Clear the input to allow re-selecting the same files
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removeImage = (index: number) => {
    setSelectedImages(prev => prev.filter((_, i) => i !== index));
    toast.success('Image removed');
  };

  const sendMessage = async () => {
    if ((!input.trim() && selectedImages.length === 0) || isLoading) return;

    const userMessage: Message = {
      role: 'user',
      content: input.trim() || 'Please analyze these medical images',
      timestamp: new Date(),
      images: selectedImages.length > 0 ? [...selectedImages] : undefined,
      analysisType: selectedImages.length > 0 ? analysisType : undefined
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    const imagesToSend = [...selectedImages];
    const currentAnalysisType = analysisType;
    setSelectedImages([]);
    setIsLoading(true);

    try {
      console.log('Attempting MedGemma 1.5 4B multimodal chat...');

      let data, error;
      let functionUsed = '';

      // Try medgemma-chat first (now supports multimodal with MedGemma 1.5 4B)
      try {
        console.log('Calling medgemma-chat (MedGemma 1.5 4B - multimodal)...');
        const response = await supabase.functions.invoke('medgemma-chat', {
          body: {
            message: userMessage.content,
            images: imagesToSend.length > 0 ? imagesToSend : undefined,
            analysisType: imagesToSend.length > 0 ? currentAnalysisType : 'general',
            userRole: activeRole,
            conversationHistory: messages.slice(-10).map(m => ({
              role: m.role,
              content: m.content
            }))
          }
        });
        data = response.data;
        error = response.error;
        functionUsed = 'medgemma-chat (MedGemma 1.5 4B)';

        if (error || !data?.reply) throw new Error('medgemma-chat failed');
      } catch (medgemmaError) {
        // Fallback to doc-chat (Gemini 2.5 Flash - supports images)
        console.log('MedGemma failed, trying doc-chat fallback...');
        try {
          const docChatResponse = await supabase.functions.invoke('doc-chat', {
            body: {
              message: userMessage.content,
              image: imagesToSend.length > 0 ? imagesToSend[0] : null, // doc-chat only supports single image
              userRole: activeRole,
              conversationHistory: messages.slice(-10).map(m => ({
                role: m.role,
                content: m.content
              }))
            }
          });
          data = docChatResponse.data;
          error = docChatResponse.error;
          functionUsed = 'doc-chat (Gemini 2.5 Flash fallback)';
          
          if (imagesToSend.length > 1) {
            toast.info('Note: Fallback AI analyzed only the first image');
          }
        } catch (docChatError) {
          // Final fallback to med-ai (text-only)
          console.log('doc-chat failed, trying med-ai fallback (text-only)...');
          try {
            const medAiResponse = await supabase.functions.invoke('med-ai', {
              body: {
                message: userMessage.content,
                userRole: activeRole,
                conversationHistory: messages.slice(-10).map(m => ({
                  role: m.role,
                  content: m.content
                }))
              }
            });
            data = medAiResponse.data;
            error = medAiResponse.error;
            functionUsed = 'med-ai (GPT-3.5 fallback - text only)';
            
            if (imagesToSend.length > 0) {
              toast.warning('Note: Final fallback AI cannot analyze images');
            }
          } catch (medAiError) {
            console.error('All AI functions failed');
            throw new Error('Unable to connect to any AI assistant. Please try again.');
          }
        }
      }

      console.log(`${functionUsed} response:`, { data, error });

      if (error) {
        console.error('AI function error:', error);
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
      
      // Show model info
      if (data.model) {
        console.log(`Response from: ${data.model}`);
      }
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

  const clearChatHistory = () => {
    setMessages([
      {
        role: 'assistant',
        content: AI_WELCOME_MESSAGE,
        timestamp: new Date()
      }
    ]);
    safeLocalRemove(STORAGE_KEY);
    toast.success('Chat history cleared');
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
        <CardTitle className="flex items-center justify-between text-sm sm:text-lg">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 sm:w-10 sm:h-10 rounded-full bg-primary/20 flex items-center justify-center">
              <Bot className="h-3.5 w-3.5 sm:h-5 sm:w-5 text-primary" />
            </div>
            <div>
              <div className="font-bold">Doc 0 Clock Assistant</div>
              <div className="text-xs text-muted-foreground font-normal">Online • AI Medical Helper</div>
            </div>
          </div>
          {messages.length > 1 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearChatHistory}
              className="text-xs"
            >
              Clear Chat
            </Button>
          )}
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
                    {message.images && message.images.length > 0 && (
                      <div className={`rounded-xl mb-3 overflow-hidden border-2 border-primary/20 ${
                        message.images.length > 1 ? 'grid grid-cols-2 gap-2' : ''
                      }`}>
                        {message.images.map((img, imgIdx) => (
                          <div key={imgIdx} className="relative">
                            <img
                              src={img}
                              alt={`Medical image ${imgIdx + 1}`}
                              className="w-full h-auto max-h-64 object-contain bg-muted/50"
                            />
                            {message.images && message.images.length > 1 && (
                              <span className="absolute top-2 left-2 bg-black/70 text-white text-xs px-2 py-1 rounded">
                                {imgIdx + 1}/{message.images.length}
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                    {message.analysisType && message.analysisType !== 'general' && (
                      <div className="mb-2 inline-block">
                        <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full">
                          {message.analysisType === 'longitudinal' && '📊 Longitudinal Analysis'}
                          {message.analysisType === 'anatomical_localization' && '🎯 Anatomical Localization'}
                          {message.analysisType === 'document_understanding' && '📄 Document Analysis'}
                        </span>
                      </div>
                    )}
                    <p className="text-sm sm:text-base whitespace-pre-wrap leading-relaxed break-words overflow-hidden" style={{ wordBreak: 'break-word', overflowWrap: 'break-word' }}>
                      <LinkifiedText text={message.content} />
                    </p>
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
                          onActionClick={onActionClick}
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
          {/* Image Preview Section */}
          {selectedImages.length > 0 && (
            <div className="mb-3">
              <div className="flex items-center gap-2 mb-2">
                <ImageIcon className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium">{selectedImages.length} image(s) attached</span>
                {selectedImages.length > 1 && (
                  <span className="text-xs text-muted-foreground">
                    ({analysisType === 'longitudinal' ? 'Longitudinal comparison' : 'Multiple images'})
                  </span>
                )}
              </div>
              <div className="grid grid-cols-5 gap-2">
                {selectedImages.map((img, idx) => (
                  <div key={idx} className="relative group">
                    <div className="rounded-lg overflow-hidden border-2 border-primary shadow-md aspect-square">
                      <img
                        src={img}
                        alt={`Selected ${idx + 1}`}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <Button
                      size="icon"
                      variant="destructive"
                      className="absolute -top-1 -right-1 h-6 w-6 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => removeImage(idx)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                    <span className="absolute bottom-1 left-1 bg-black/70 text-white text-xs px-1.5 py-0.5 rounded">
                      {idx + 1}
                    </span>
                  </div>
                ))}
              </div>
              
              {/* Analysis Type Selector - Only show when multiple images */}
              {selectedImages.length > 1 && (
                <div className="mt-3 space-y-1">
                  <label className="text-xs text-muted-foreground">Analysis Type:</label>
                  <Select value={analysisType} onValueChange={(value: AnalysisType) => setAnalysisType(value)}>
                    <SelectTrigger className="w-full h-9 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="general">General Analysis</SelectItem>
                      <SelectItem value="longitudinal">Longitudinal Comparison (Track Changes)</SelectItem>
                      <SelectItem value="anatomical_localization">Anatomical Localization</SelectItem>
                      <SelectItem value="document_understanding">Document Extraction</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          )}

          <div className="flex gap-2 items-end">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleImageSelect}
              accept="image/*"
              multiple
              className="hidden"
            />

            {/* Image Upload Button with Label */}
            <Button
              onClick={() => fileInputRef.current?.click()}
              disabled={isLoading}
              size="icon"
              variant="outline"
              className="flex-shrink-0 h-12 w-12 rounded-full border-2 hover:bg-primary/10 hover:border-primary transition-all"
              title="Upload medical images (max 10): X-rays, lab results, scans, etc."
            >
              <div className="relative">
                <Paperclip className="h-5 w-5" />
                {selectedImages.length > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-[16px] h-4 bg-primary text-primary-foreground text-xs rounded-full flex items-center justify-center px-1">
                    {selectedImages.length}
                  </span>
                )}
              </div>
            </Button>

            <div className="flex-1 relative">
              <Textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyPress}
                placeholder={selectedImages.length > 0 ? "Describe what you want to know about these images..." : "Ask me about your health..."}
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
