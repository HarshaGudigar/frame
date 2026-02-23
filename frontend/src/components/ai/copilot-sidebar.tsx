import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { useToast } from '@/hooks/use-toast';
import { MessageSquare, X, Send, Bot, User as UserIcon, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

interface Message {
    role: 'user' | 'assistant' | 'system';
    content: string;
}

export function CopilotSidebar() {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const { api } = useAuth();
    const { toast } = useToast();
    const scrollRef = useRef<HTMLDivElement>(null);

    // Fetch initial history when opened
    useEffect(() => {
        if (isOpen && messages.length === 0) {
            fetchHistory();
        }
    }, [isOpen]);

    // Auto-scroll to bottom
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages, isTyping]);

    const fetchHistory = async () => {
        try {
            const res = await api.get('/ai/chat/history');
            if (res.data.success && res.data.data.length > 0) {
                // The API returns oldest to newest for render efficiency
                setMessages(res.data.data.map((m: any) => ({ role: m.role, content: m.content })));
            } else {
                // Default greeting if no history
                setMessages([
                    {
                        role: 'assistant',
                        content:
                            'Hello! I am your AI Platform Copilot. I can help analyze data, manage settings, and automate tasks. How can I help you today?',
                    },
                ]);
            }
        } catch (err) {
            console.error('Failed to fetch chat history', err);
        }
    };

    const handleSend = async (e?: React.FormEvent) => {
        e?.preventDefault();
        if (!input.trim() || isTyping) return;

        const userMsg = input.trim();
        setInput('');
        setMessages((prev) => [...prev, { role: 'user', content: userMsg }]);
        setIsTyping(true);

        try {
            const res = await api.post('/ai/chat', { message: userMsg });
            if (res.data.success) {
                setMessages((prev) => [
                    ...prev,
                    { role: 'assistant', content: res.data.data.reply },
                ]);
            }
        } catch (err: any) {
            setMessages((prev) => [
                ...prev,
                {
                    role: 'system',
                    content: `Error: ${err.response?.data?.message || 'Failed to reach AI Gateway.'}`,
                },
            ]);
            toast({
                title: 'AI Unavailable',
                description: 'Failed to process message.',
                variant: 'destructive',
            });
        } finally {
            setIsTyping(false);
        }
    };

    return (
        <>
            {/* Header Action Button */}
            <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsOpen(true)}
                className="relative shrink-0"
            >
                <Bot className="h-[1.2rem] w-[1.2rem] transition-all" />
                <span className="sr-only">Toggle Copilot</span>
            </Button>

            {/* Slide-out Panel */}
            <div
                className={cn(
                    'fixed top-0 right-0 h-screen w-[400px] max-w-[100vw] bg-background/95 backdrop-blur-xl border-l shadow-2xl z-50 transform transition-transform duration-300 ease-in-out flex flex-col',
                    isOpen ? 'translate-x-0' : 'translate-x-full',
                )}
            >
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b bg-muted/30">
                    <div className="flex items-center gap-3">
                        <div className="flex items-center justify-center size-8 rounded-full bg-primary/20 text-primary">
                            <Bot className="size-5" />
                        </div>
                        <div>
                            <h3 className="font-semibold leading-none mb-1">Platform Copilot</h3>
                            <div className="flex items-center gap-2">
                                <span className="flex size-2 rounded-full bg-green-500 animate-pulse-slow"></span>
                                <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">
                                    Online
                                </span>
                                <Badge
                                    variant="secondary"
                                    className="px-1.5 py-0 h-4 text-[9px] ml-1"
                                >
                                    Beta
                                </Badge>
                            </div>
                        </div>
                    </div>
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setIsOpen(false)}
                        className="rounded-full hover:bg-muted"
                    >
                        <X className="h-5 w-5" />
                    </Button>
                </div>

                {/* Chat Area */}
                <ScrollArea className="flex-1 p-4" ref={scrollRef}>
                    <div className="flex flex-col gap-4 pb-4">
                        {messages.map((msg, idx) => (
                            <div
                                key={idx}
                                className={cn(
                                    'flex gap-3 max-w-[85%]',
                                    msg.role === 'user'
                                        ? 'self-end flex-row-reverse'
                                        : 'self-start',
                                )}
                            >
                                <div
                                    className={cn(
                                        'flex items-center justify-center size-8 rounded-full shrink-0',
                                        msg.role === 'user'
                                            ? 'bg-primary text-primary-foreground'
                                            : 'bg-muted text-muted-foreground',
                                        msg.role === 'system' &&
                                            'bg-destructive/20 text-destructive',
                                    )}
                                >
                                    {msg.role === 'user' ? (
                                        <UserIcon className="size-4" />
                                    ) : (
                                        <Bot className="size-4" />
                                    )}
                                </div>
                                <div
                                    className={cn(
                                        'rounded-2xl px-4 py-2.5 text-sm whitespace-pre-wrap leading-relaxed shadow-sm break-words overflow-hidden',
                                        msg.role === 'user'
                                            ? 'bg-primary text-primary-foreground rounded-tr-sm'
                                            : 'bg-muted rounded-tl-sm border border-border/50 text-foreground',
                                        msg.role === 'system' &&
                                            'bg-destructive/10 border-destructive/20 text-destructive text-xs font-mono font-medium',
                                    )}
                                >
                                    {msg.content}
                                </div>
                            </div>
                        ))}

                        {isTyping && (
                            <div className="flex gap-3 max-w-[85%] self-start animate-in fade-in slide-in-from-bottom-2">
                                <div className="flex items-center justify-center size-8 rounded-full shrink-0 bg-muted text-muted-foreground">
                                    <Bot className="size-4" />
                                </div>
                                <div className="rounded-2xl px-4 py-3 bg-muted rounded-tl-sm border border-border/50 flex items-center gap-1 shadow-sm">
                                    <div className="w-1.5 h-1.5 bg-primary/40 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                                    <div className="w-1.5 h-1.5 bg-primary/60 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                                    <div className="w-1.5 h-1.5 bg-primary/80 rounded-full animate-bounce"></div>
                                </div>
                            </div>
                        )}
                    </div>
                </ScrollArea>

                {/* Input Area */}
                <div className="p-4 bg-background border-t">
                    <form onSubmit={handleSend} className="relative flex items-center">
                        <Input
                            placeholder="Ask Copilot anything..."
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            disabled={isTyping}
                            className="pr-12 rounded-full bg-muted/50 border-transparent focus-visible:ring-1 focus-visible:ring-primary focus-visible:border-primary focus-visible:bg-transparent shadow-inner h-12"
                        />
                        <Button
                            type="submit"
                            size="icon"
                            disabled={!input.trim() || isTyping}
                            className="absolute right-1.5 h-9 w-9 rounded-full transition-transform hover:scale-105 active:scale-95"
                        >
                            {isTyping ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                                <Send className="h-4 w-4 -ml-0.5 mt-0.5" />
                            )}
                        </Button>
                    </form>
                    <div className="text-center mt-3">
                        <span className="text-[10px] text-muted-foreground/60 font-medium">
                            AI can make mistakes. Verify important information.
                        </span>
                    </div>
                </div>
            </div>

            {/* Overlay */}
            {isOpen && (
                <div
                    className="fixed inset-0 bg-background/20 backdrop-blur-[2px] z-40 lg:hidden"
                    onClick={() => setIsOpen(false)}
                />
            )}
        </>
    );
}
