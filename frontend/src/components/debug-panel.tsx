import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { Terminal, X, Minimize2, Maximize2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export function DebugPanel() {
    const { user } = useAuth();
    const [debugContext, setDebugContext] = useState<any>(null);
    const [isOpen, setIsOpen] = useState(false);
    const [isMinimized, setIsMinimized] = useState(false);

    useEffect(() => {
        // Only admins/owners should see this panel logic
        if (!user || !['admin', 'owner'].includes(user.role)) return;

        const handleDebugContext = (e: any) => {
            setDebugContext(e.detail);
        };

        window.addEventListener('debug-context', handleDebugContext);
        return () => window.removeEventListener('debug-context', handleDebugContext);
    }, [user]);

    // Don't render anything for non-admins
    if (!user || !['admin', 'owner'].includes(user.role)) return null;

    if (!isOpen) {
        return (
            <div
                className="fixed bottom-4 left-4 z-50 bg-primary/90 text-primary-foreground p-3 rounded-full shadow-lg cursor-pointer hover:scale-105 transition-transform backdrop-blur-sm"
                onClick={() => setIsOpen(true)}
                title="Developer Debug Panel"
            >
                <Terminal className="size-5" />
            </div>
        );
    }

    return (
        <Card
            className={`fixed bottom-4 left-4 z-50 shadow-2xl border-secondary/20 transition-all duration-300 overflow-hidden backdrop-blur-md bg-background/95 ${isMinimized ? 'w-64 h-14' : 'w-96 h-[32rem]'}`}
        >
            <CardHeader className="flex flex-row items-center justify-between py-3 px-4 bg-muted/40 border-b">
                <CardTitle className="text-sm font-bold flex items-center gap-2 text-primary">
                    <Terminal className="size-4" />
                    Developer Debug
                </CardTitle>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setIsMinimized(!isMinimized)}
                        className="hover:text-primary transition-colors"
                    >
                        {isMinimized ? (
                            <Maximize2 className="size-4" />
                        ) : (
                            <Minimize2 className="size-4" />
                        )}
                    </button>
                    <button
                        onClick={() => setIsOpen(false)}
                        className="hover:text-primary transition-colors text-muted-foreground"
                    >
                        <X className="size-4" />
                    </button>
                </div>
            </CardHeader>
            {!isMinimized && (
                <CardContent className="p-0 h-[calc(100%-3rem)]">
                    <div className="h-full w-full p-4 overflow-y-auto">
                        {!debugContext ? (
                            <div className="text-sm text-muted-foreground text-center mt-20 flex flex-col items-center gap-2 animate-pulse">
                                <Terminal className="size-8 opacity-20" />
                                <span>Waiting for API intercept...</span>
                            </div>
                        ) : (
                            <div className="space-y-5 text-xs font-mono pb-4">
                                <div className="p-3 bg-muted/30 rounded-lg border border-border/50">
                                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-1">
                                        Route
                                    </div>
                                    <div className="flex items-center gap-2 text-sm">
                                        <Badge
                                            variant={
                                                debugContext.method === 'GET'
                                                    ? 'secondary'
                                                    : 'default'
                                            }
                                            className="text-[10px] uppercase font-bold"
                                        >
                                            {debugContext.method}
                                        </Badge>
                                        <span className="truncate">{debugContext.path}</span>
                                    </div>
                                </div>

                                <div>
                                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-1">
                                        Tenant Resolution
                                    </div>
                                    <div className="font-semibold text-sm">
                                        {debugContext.tenantName}{' '}
                                        <span className="text-muted-foreground font-normal text-xs">
                                            ({debugContext.tenant})
                                        </span>
                                    </div>
                                </div>

                                <div>
                                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-1">
                                        Active Modules
                                    </div>
                                    <div className="flex flex-wrap gap-1.5 mt-1.5">
                                        {debugContext.modules?.length ? (
                                            debugContext.modules.map((m: string) => (
                                                <Badge
                                                    key={m}
                                                    variant="outline"
                                                    className="bg-background"
                                                >
                                                    {m}
                                                </Badge>
                                            ))
                                        ) : (
                                            <span className="text-muted-foreground italic">
                                                None active
                                            </span>
                                        )}
                                    </div>
                                </div>

                                <div>
                                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-1">
                                        Feature Flags
                                    </div>
                                    <pre className="bg-muted p-2.5 rounded-md overflow-x-auto text-[10px] border border-border/50 max-h-32">
                                        {Object.keys(debugContext.featureFlags || {}).length > 0 ? (
                                            JSON.stringify(debugContext.featureFlags, null, 2)
                                        ) : (
                                            <span className="text-muted-foreground italic">
                                                Empty configuration object
                                            </span>
                                        )}
                                    </pre>
                                </div>

                                <div>
                                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-1">
                                        Emitted Events{' '}
                                        <Badge
                                            variant="secondary"
                                            className="ml-1 text-[9px] h-4 px-1"
                                        >
                                            {debugContext.emittedEvents?.length || 0}
                                        </Badge>
                                    </div>
                                    <div className="space-y-1 mt-1.5">
                                        {debugContext.emittedEvents?.length > 0 ? (
                                            debugContext.emittedEvents.map(
                                                (evt: any, idx: number) => (
                                                    <div
                                                        key={idx}
                                                        className="bg-primary/5 text-primary border border-primary/10 p-1.5 rounded-md text-[10px] truncate"
                                                    >
                                                        {evt.name}
                                                    </div>
                                                ),
                                            )
                                        ) : (
                                            <span className="text-muted-foreground italic">
                                                No events published in request lifecycle
                                            </span>
                                        )}
                                    </div>
                                </div>

                                <div className="pt-4 mt-2 border-t border-border/30 text-[9px] text-muted-foreground flex justify-between items-center opacity-70">
                                    <span className="flex items-center gap-1">
                                        <Terminal className="size-3" /> Control Plane Trace
                                    </span>
                                    <span>
                                        {new Date(debugContext.timestamp).toLocaleTimeString()}
                                    </span>
                                </div>
                            </div>
                        )}
                    </div>
                </CardContent>
            )}
        </Card>
    );
}
