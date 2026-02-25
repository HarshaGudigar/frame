import React from 'react';
import { useLocation } from 'react-router-dom';
import { useSocket } from '@/components/providers/socket-provider';
import { BRAND } from '@/config/brand';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
    DropdownMenuSeparator,
    DropdownMenuShortcut,
} from '@/components/ui/dropdown-menu';
import { Monitor, RefreshCcw, Code, LogOut, HelpCircle, Info, ExternalLink } from 'lucide-react';

// Detect if we're inside an Electron shell
export const isElectron = (): boolean => {
    return (
        typeof window !== 'undefined' &&
        typeof (window as any).process === 'object' &&
        (window as any).process.type === 'renderer'
    );
};

const sendIPC = (channel: string, ...args: any[]) => {
    try {
        const { ipcRenderer } = (window as any).require?.('electron') ?? {};
        if (ipcRenderer) {
            ipcRenderer.send(channel, ...args);
        }
    } catch (err) {
        console.warn(`IPC failed for channel ${channel}:`, err);
    }
};

function AppMenu() {
    return (
        <div
            className="flex items-center gap-0.5 px-1"
            style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
        >
            <DropdownMenu>
                <DropdownMenuTrigger className="px-2 py-1 text-[11px] text-muted-foreground hover:text-foreground hover:bg-muted rounded focus:outline-none focus:bg-muted transition-colors">
                    File
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-48 text-[12px]">
                    <DropdownMenuItem onClick={() => window.print()}>
                        Print...
                        <DropdownMenuShortcut>Ctrl+P</DropdownMenuShortcut>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                        onClick={() => sendIPC('app-quit')}
                        className="text-destructive focus:text-destructive focus:bg-destructive/10"
                    >
                        <LogOut className="mr-2 h-3.5 w-3.5" />
                        Exit
                        <DropdownMenuShortcut>Alt+F4</DropdownMenuShortcut>
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>

            <DropdownMenu>
                <DropdownMenuTrigger className="px-2 py-1 text-[11px] text-muted-foreground hover:text-foreground hover:bg-muted rounded focus:outline-none focus:bg-muted transition-colors">
                    Edit
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-48 text-[12px]">
                    <DropdownMenuItem onClick={() => document.execCommand('undo')}>
                        Undo
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => document.execCommand('redo')}>
                        Redo
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => document.execCommand('cut')}>
                        Cut
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => document.execCommand('copy')}>
                        Copy
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => document.execCommand('paste')}>
                        Paste
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>

            <DropdownMenu>
                <DropdownMenuTrigger className="px-2 py-1 text-[11px] text-muted-foreground hover:text-foreground hover:bg-muted rounded focus:outline-none focus:bg-muted transition-colors">
                    View
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-48 text-[12px]">
                    <DropdownMenuItem onClick={() => sendIPC('app-reload')}>
                        <RefreshCcw className="mr-2 h-3.5 w-3.5" />
                        Reload
                        <DropdownMenuShortcut>Ctrl+R</DropdownMenuShortcut>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => sendIPC('app-toggle-devtools')}>
                        <Code className="mr-2 h-3.5 w-3.5" />
                        Developer Tools
                        <DropdownMenuShortcut>F12</DropdownMenuShortcut>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                        onClick={() => {
                            const el = document.documentElement;
                            if (document.fullscreenElement) {
                                document.exitFullscreen();
                            } else {
                                el.requestFullscreen();
                            }
                        }}
                    >
                        <Monitor className="mr-2 h-3.5 w-3.5" />
                        Fullscreen
                        <DropdownMenuShortcut>F11</DropdownMenuShortcut>
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>

            <DropdownMenu>
                <DropdownMenuTrigger className="px-2 py-1 text-[11px] text-muted-foreground hover:text-foreground hover:bg-muted rounded focus:outline-none focus:bg-muted transition-colors">
                    Help
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-48 text-[12px]">
                    <DropdownMenuItem
                        onClick={() =>
                            window.open('https://github.com/HarshaGudigar/frame', '_blank')
                        }
                    >
                        <HelpCircle className="mr-2 h-3.5 w-3.5" />
                        Documentation
                    </DropdownMenuItem>
                    <DropdownMenuItem
                        onClick={() =>
                            window.open('https://github.com/HarshaGudigar/frame/issues', '_blank')
                        }
                    >
                        <ExternalLink className="mr-2 h-3.5 w-3.5" />
                        Report Issue
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem>
                        <Info className="mr-2 h-3.5 w-3.5" />
                        About {BRAND.fullName}
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
        </div>
    );
}

// Map routes to human-readable page names
const routeNames: Record<string, string> = {
    '/': 'Dashboard',
    '/users': 'Users',
    '/roles': 'Roles',
    '/marketplace': 'Marketplace',
    '/settings': 'Settings',
    '/audit-logs': 'Audit Logs',
    '/hotel': 'Hotel Management',
    '/billing': 'Billing',
};

function getPageName(pathname: string): string {
    // Exact match first
    if (routeNames[pathname]) return routeNames[pathname];
    // Prefix match (e.g. /hotel/bookings)
    for (const [key, label] of Object.entries(routeNames)) {
        if (key !== '/' && pathname.startsWith(key)) return label;
    }
    return BRAND.fullName;
}

export function TitleBar() {
    const { isConnected } = useSocket();

    const { pathname } = useLocation();

    const pageName = getPageName(pathname);

    return (
        <div
            className="titlebar"
            style={
                {
                    WebkitAppRegion: 'drag',
                    height: '32px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    backgroundColor: 'var(--background)',
                    padding: '0 5px',
                    flexShrink: 0,
                    userSelect: 'none',
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    zIndex: 9999, // Must beat the fixed noise-overlay (z-99)
                } as React.CSSProperties
            }
        >
            {/* Left: App Menu */}
            <div className="flex items-center gap-1.5 flex-1">
                <AppMenu />
            </div>

            {/* Center: Current page name — Hidden on narrow windows */}
            <div
                className="absolute left-1/2 -translate-x-1/2 hidden md:flex items-center gap-2"
                style={{ pointerEvents: 'none' }}
            >
                <span
                    style={{
                        fontSize: '11px',
                        fontWeight: 500,
                        color: 'var(--muted-foreground)',
                        letterSpacing: '0.01em',
                    }}
                >
                    {pageName}
                </span>
            </div>

            {/* Right: Connection status (no-drag so tooltip works) */}
            <div
                className="flex items-center gap-4 px-3"
                style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
            >
                <TooltipProvider>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <div
                                className={`size-1.5 rounded-full transition-all duration-500 ${
                                    isConnected
                                        ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]'
                                        : 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.6)]'
                                }`}
                            />
                        </TooltipTrigger>
                        <TooltipContent side="bottom" className="text-[11px]">
                            {isConnected ? 'System Online' : 'System Offline'}
                        </TooltipContent>
                    </Tooltip>
                </TooltipProvider>
            </div>
        </div>
    );
}
