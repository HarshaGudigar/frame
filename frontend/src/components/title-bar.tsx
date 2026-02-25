import React from 'react';
import { useLocation } from 'react-router-dom';
import { useSocket } from '@/components/providers/socket-provider';
import { useAuth } from '@/contexts/auth-context';
import { BRAND } from '@/config/brand';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

// Detect if we're inside an Electron shell
export const isElectron = (): boolean => {
    return (
        typeof window !== 'undefined' &&
        typeof (window as any).process === 'object' &&
        (window as any).process.type === 'renderer'
    );
};

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
            {/* Left: Empty drag zone */}
            <div className="flex items-center gap-1.5 w-[100px]"></div>

            {/* Center: Current page name */}
            <div
                className="absolute left-1/2 -translate-x-1/2 flex items-center gap-2"
                style={{ pointerEvents: 'none' }}
            >
                <span style={{ fontSize: '12px', color: 'var(--muted-foreground)' }}>
                    {pageName}
                </span>
            </div>

            {/* Right: Connection status (no-drag so tooltip works) */}
            <div
                className="flex items-center gap-2"
                style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
            >
                <TooltipProvider>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <div
                                className={`size-1.5 rounded-full ${
                                    isConnected
                                        ? 'bg-green-500 shadow-[0_0_5px] shadow-green-500/70'
                                        : 'bg-red-500 shadow-[0_0_5px] shadow-red-500/70'
                                }`}
                            />
                        </TooltipTrigger>
                        <TooltipContent side="bottom">
                            {isConnected ? 'Connected' : 'Disconnected'}
                        </TooltipContent>
                    </Tooltip>
                </TooltipProvider>
            </div>
        </div>
    );
}
