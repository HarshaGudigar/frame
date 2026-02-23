import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from '@/contexts/auth-context';
import { useToast } from '@/hooks/use-toast';
import { MessageSquare, X, Send, Bot, User as UserIcon, Loader2, Trash2 } from 'lucide-react';
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
    const { api, user } = useAuth();
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
            const viewport = scrollRef.current.querySelector(
                '[data-radix-scroll-area-viewport]',
            ) as HTMLElement;
            if (viewport) {
                viewport.scrollTop = viewport.scrollHeight;
            } else {
                scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
            }
        }
    }, [messages, isTyping, input]);

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

    const handleClear = async () => {
        try {
            await api.delete('/ai/chat/history');
        } catch (err) {
            console.error('Failed to clear history', err);
        }
        setMessages([
            {
                role: 'assistant',
                content: 'Chat history cleared. How can I help you?',
            },
        ]);
    };

    const handleSend = async (e?: React.FormEvent) => {
        e?.preventDefault();
        if (!input.trim() || isTyping) return;

        const userMsg = input.trim();
        setInput('');
        setMessages((prev) => [...prev, { role: 'user', content: userMsg }]);
        setIsTyping(true);

        try {
            // Attempt to derive the hotel tenant context from the user's logged-in permissions
            const hotelTenant = user?.tenants?.find((t: any) =>
                t.tenant?.subscribedModules?.includes('hotel'),
            )?.tenant?.slug;

            const headers = hotelTenant ? { 'x-tenant-id': hotelTenant } : {};

            const res = await api.post('/ai/chat', { message: userMsg }, { headers });
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

            {/* Slide-out Panel & Overlay Portaled to Body */}
            {typeof document !== 'undefined' &&
                createPortal(
                    <>
                        {/* Slide-out Panel */}
                        <div
                            className={cn(
                                'fixed inset-y-0 right-0 w-[400px] max-w-[100vw] bg-background/95 backdrop-blur-xl border-l shadow-2xl z-50 transform transition-transform duration-300 ease-in-out flex flex-col',
                                isOpen ? 'translate-x-0' : 'translate-x-full',
                            )}
                        >
                            {/* Header */}
                            <div className="shrink-0 flex items-center justify-between p-4 border-b bg-background/50 backdrop-blur-md relative overflow-hidden">
                                {/* Subtle grid pattern background for header */}
                                <div className="absolute inset-0 bg-grid-pattern opacity-10 pointer-events-none" />

                                <div className="flex items-center gap-3 relative z-10">
                                    <div className="flex items-center justify-center size-9 rounded-full ring-1 ring-primary/30 bg-primary/10 text-primary glow-primary shadow-sm">
                                        <Bot className="size-5 drop-shadow-md" />
                                    </div>
                                    <div>
                                        <h3 className="font-semibold leading-none mb-1 text-[15px] tracking-tight">
                                            Platform Copilot
                                        </h3>
                                        <div className="flex items-center gap-2">
                                            <span className="flex size-2 rounded-full bg-green-500 animate-pulse-slow shadow-[0_0_8px_rgba(34,197,94,0.6)]"></span>
                                            <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-widest">
                                                Online
                                            </span>
                                            <Badge
                                                variant="outline"
                                                className="px-1.5 py-0 h-[18px] text-[9px] ml-1 bg-primary/5 text-primary border-primary/20 backdrop-blur-sm"
                                            >
                                                Beta
                                            </Badge>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-1 relative z-10">
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={handleClear}
                                        title="Clear chat history"
                                        className="rounded-full hover:bg-destructive/10 hover:text-destructive text-muted-foreground transition-colors size-8"
                                    >
                                        <Trash2 className="size-3.5" />
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => setIsOpen(false)}
                                        className="rounded-full hover:bg-muted/50 hover:text-foreground text-muted-foreground transition-colors size-8"
                                    >
                                        <X className="size-4" />
                                    </Button>
                                </div>
                            </div>

                            {/* Chat Area */}
                            <ScrollArea className="flex-1 min-h-0 p-4" ref={scrollRef}>
                                <div className="flex flex-col gap-4 pb-4">
                                    {messages.map((msg, idx) => (
                                        <div
                                            key={idx}
                                            className={cn(
                                                'flex gap-3 max-w-[85%] animate-in fade-in slide-in-from-bottom-2 duration-300',
                                                msg.role === 'user'
                                                    ? 'self-end flex-row-reverse'
                                                    : 'self-start',
                                            )}
                                            style={{ animationFillMode: 'both' }}
                                        >
                                            <div
                                                className={cn(
                                                    'flex items-center justify-center size-8 rounded-full shrink-0 shadow-sm transition-all',
                                                    msg.role === 'user'
                                                        ? 'bg-muted border border-border/50 text-foreground'
                                                        : 'ring-1 ring-primary/20 bg-primary/10 text-primary shadow-[0_0_10px_rgba(var(--primary),0.2)]',
                                                    msg.role === 'system' &&
                                                        'bg-destructive/10 text-destructive ring-1 ring-destructive/30',
                                                )}
                                            >
                                                {msg.role === 'user' ? (
                                                    <UserIcon className="size-4 opacity-70" />
                                                ) : (
                                                    <Bot className="size-4 drop-shadow-sm" />
                                                )}
                                            </div>
                                            <div
                                                className={cn(
                                                    'rounded-2xl px-4 py-2.5 text-[13px] whitespace-pre-wrap leading-[1.6] break-words overflow-hidden transition-all shadow-sm',
                                                    msg.role === 'user'
                                                        ? 'bg-gradient-to-br from-primary to-primary/80 text-primary-foreground rounded-tr-sm shadow-[0_4px_14px_0_rgba(var(--primary),0.2)] border border-primary/20'
                                                        : 'glass-card rounded-tl-sm text-foreground/90 font-medium',
                                                    msg.role === 'system' &&
                                                        'bg-destructive/10 border-destructive/20 text-destructive text-[11px] font-mono font-semibold shadow-none',
                                                )}
                                            >
                                                {msg.content}
                                            </div>
                                        </div>
                                    ))}

                                    {isTyping && (
                                        <div className="flex gap-3 max-w-[85%] self-start animate-in fade-in slide-in-from-bottom-2 duration-300">
                                            <div className="flex items-center justify-center size-8 rounded-full shrink-0 ring-1 ring-primary/20 bg-primary/10 text-primary glow-primary">
                                                <Bot className="size-4 drop-shadow-sm" />
                                            </div>
                                            <div className="rounded-2xl px-4 py-3 glass-card rounded-tl-sm flex items-center gap-1.5 shadow-sm h-[42px]">
                                                <div className="w-1.5 h-1.5 bg-foreground/30 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                                                <div className="w-1.5 h-1.5 bg-foreground/50 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                                                <div className="w-1.5 h-1.5 bg-foreground/70 rounded-full animate-bounce"></div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </ScrollArea>

                            {/* Input Area */}
                            <div className="shrink-0 p-4 bg-background/80 backdrop-blur-xl border-t shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.1)] dark:shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.5)] z-20">
                                <form onSubmit={handleSend} className="relative flex items-center">
                                    <Input
                                        placeholder="Ask Copilot anything..."
                                        value={input}
                                        onChange={(e) => setInput(e.target.value)}
                                        disabled={isTyping}
                                        className="pr-12 rounded-full bg-muted/30 border-border/50 focus-visible:ring-1 focus-visible:ring-primary focus-visible:border-primary focus-visible:bg-background shadow-inner h-[50px] text-[13px] transition-all"
                                    />
                                    <Button
                                        type="submit"
                                        size="icon"
                                        disabled={!input.trim() || isTyping}
                                        className={cn(
                                            'absolute right-1.5 h-9 w-9 rounded-full transition-all duration-300',
                                            input.trim() && !isTyping
                                                ? 'bg-primary text-primary-foreground shadow-[0_0_15px_rgba(var(--primary),0.4)] hover:scale-105 active:scale-95'
                                                : 'bg-muted text-muted-foreground hover:bg-muted',
                                        )}
                                    >
                                        {isTyping ? (
                                            <Loader2 className="size-4 animate-spin text-primary" />
                                        ) : (
                                            <Send
                                                className={cn(
                                                    'size-4 transition-transform',
                                                    input.trim() && !isTyping
                                                        ? '-ml-0.5 mt-0.5'
                                                        : 'm-0',
                                                )}
                                            />
                                        )}
                                    </Button>
                                </form>
                                <div className="text-center mt-3">
                                    <span className="text-[9px] text-muted-foreground/50 font-medium uppercase tracking-wider">
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
                    </>,
                    document.body,
                )}
        </>
    );
}
