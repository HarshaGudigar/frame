import React, { useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/auth-context';
import { usePermission } from '@/hooks/use-permission';
import { useSocket } from '@/components/providers/socket-provider';
import {
    LayoutDashboard,
    Users as UsersIcon,
    Store,
    Settings,
    LogOut,
    Server,
    Building2,
    Shield,
    ShieldCheck,
    Brush,
} from 'lucide-react';
import { NotificationCenter } from '@/components/notifications/notification-center';
import { ModeToggle } from '@/components/mode-toggle';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarGroup,
    SidebarGroupContent,
    SidebarGroupLabel,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    SidebarProvider,
    SidebarInset,
    SidebarTrigger,
} from '@/components/ui/sidebar';
import { Separator } from '@/components/ui/separator';
import { BackgroundDecoration } from './ui/background-decoration';
import { CopilotSidebar } from '@/components/ai/copilot-sidebar';
import { TitleBar, isElectron } from '@/components/title-bar';

const navCore = [
    { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/users', icon: UsersIcon, label: 'Users', role: 'admin' },
];

const navPlatform = [
    { to: '/marketplace', icon: Store, label: 'Marketplace', role: 'admin' },
    { to: '/audit-logs', icon: ShieldCheck, label: 'Audit Logs', role: 'superuser' },
];

const navModules = [
    {
        to: '/hotel',
        icon: Building2,
        label: 'Hotel Mgmt',
        module: 'hotel',
        roles: ['admin', 'agent'],
    },
    { to: '/billing', icon: Store, label: 'Billing', module: 'billing' },
];

const navConfig = [{ to: '/settings', icon: Settings, label: 'Settings' }];

function AppSidebar() {
    const { user, logout, systemInfo } = useAuth();
    const { hasRole } = usePermission();
    const location = useLocation();

    const checkActive = (to: string) => {
        if (to === '/') return location.pathname === '/';
        return location.pathname.startsWith(to);
    };

    const visibleNavCore = navCore;

    // No Platform items are filtered — Marketplace and Audit Logs are needed in all modes.
    const visibleNavPlatform = navPlatform;

    return (
        <Sidebar variant="inset" collapsible="icon">
            <SidebarHeader className="flex flex-col overflow-hidden border-b glass-panel transition-all group-data-[collapsible=icon]:p-0 group-data-[collapsible=icon]:h-16 group-data-[collapsible=icon]:justify-center z-10 py-4 gap-4">
                <SidebarMenu className="group-data-[collapsible=icon]:items-center">
                    <SidebarMenuItem>
                        <SidebarMenuButton
                            size="lg"
                            asChild
                            className="group-data-[collapsible=icon]:size-9 group-data-[collapsible=icon]:p-0 transition-all duration-300 h-10"
                        >
                            <NavLink
                                to="/"
                                className="flex items-center gap-3 group-data-[collapsible=icon]:justify-center"
                            >
                                <div className="flex aspect-square size-9 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-lg shadow-primary/20 shrink-0 transition-all overflow-hidden">
                                    {systemInfo?.branding?.logo ? (
                                        <img
                                            src={systemInfo.branding.logo}
                                            className="size-6 object-contain"
                                            alt="Logo"
                                        />
                                    ) : (
                                        <Server className="size-5" />
                                    )}
                                </div>
                                <div className="grid flex-1 text-left text-sm leading-tight group-data-[collapsible=icon]:hidden">
                                    <span className="truncate font-bold tracking-tight text-base leading-none">
                                        {systemInfo?.instanceName || 'Alyxnet Framework'}
                                    </span>
                                    <span className="text-[10px] text-muted-foreground/80 font-medium uppercase tracking-wider mt-0.5 leading-none">
                                        v2.1.0 · {systemInfo?.mode || 'LOCAL'}
                                    </span>
                                </div>
                            </NavLink>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarHeader>
            <Separator />
            <SidebarContent className="gap-0">
                {/* Core Overview */}
                <SidebarGroup>
                    <SidebarGroupLabel className="text-[10px] font-mono tracking-wider uppercase text-muted-foreground group-data-[collapsible=icon]:hidden">
                        Overview
                    </SidebarGroupLabel>
                    <SidebarGroupContent>
                        <SidebarMenu>
                            {visibleNavCore.map((item) => {
                                if (item.role && !hasRole(item.role as any)) return null;
                                return (
                                    <SidebarMenuItem key={item.to}>
                                        <SidebarMenuButton
                                            asChild
                                            tooltip={item.label}
                                            isActive={checkActive(item.to)}
                                            className="transition-all duration-300 hover:bg-primary/10 hover:text-primary group data-[active=true]:bg-primary/10 data-[active=true]:text-primary border border-transparent data-[active=true]:border-primary/20"
                                        >
                                            <NavLink to={item.to} end={item.to === '/'}>
                                                <item.icon className="size-4 transition-transform duration-300 group-hover:scale-110" />
                                                <span className="font-medium">{item.label}</span>
                                            </NavLink>
                                        </SidebarMenuButton>
                                    </SidebarMenuItem>
                                );
                            })}
                        </SidebarMenu>
                    </SidebarGroupContent>
                </SidebarGroup>

                {/* Platform */}
                <SidebarGroup>
                    <SidebarGroupLabel className="text-[10px] font-mono tracking-wider uppercase text-muted-foreground group-data-[collapsible=icon]:hidden">
                        Platform
                    </SidebarGroupLabel>
                    <SidebarGroupContent>
                        <SidebarMenu>
                            {visibleNavPlatform.map((item) => {
                                if (item.role && !hasRole(item.role as any)) return null;
                                return (
                                    <SidebarMenuItem key={item.to}>
                                        <SidebarMenuButton
                                            asChild
                                            tooltip={item.label}
                                            isActive={checkActive(item.to)}
                                            className="transition-all duration-300 hover:bg-primary/10 hover:text-primary group data-[active=true]:bg-primary/10 data-[active=true]:text-primary border border-transparent data-[active=true]:border-primary/20"
                                        >
                                            <NavLink to={item.to} end={false}>
                                                <item.icon className="size-4 transition-transform duration-300 group-hover:scale-110" />
                                                <span className="font-medium">{item.label}</span>
                                            </NavLink>
                                        </SidebarMenuButton>
                                    </SidebarMenuItem>
                                );
                            })}
                        </SidebarMenu>
                    </SidebarGroupContent>
                </SidebarGroup>

                {/* Modules */}
                <SidebarGroup>
                    <SidebarGroupLabel className="text-[10px] font-mono tracking-wider uppercase text-muted-foreground group-data-[collapsible=icon]:hidden">
                        Modules
                    </SidebarGroupLabel>
                    <SidebarGroupContent>
                        <SidebarMenu>
                            {navModules.map((item) => {
                                const moduleSlug = (item as any).module;
                                const hasModuleAccess = systemInfo?.enabledModules?.some(
                                    (m: any) => m === moduleSlug || m.slug === moduleSlug,
                                );
                                if (!hasModuleAccess && user?.role !== 'superuser') return null;

                                // Check role restrictions for module navigation items
                                if (item.roles && user?.role !== 'superuser') {
                                    if (!item.roles.includes(user?.role as string)) {
                                        return null;
                                    }
                                }

                                return (
                                    <SidebarMenuItem key={item.to}>
                                        <SidebarMenuButton
                                            asChild
                                            tooltip={item.label}
                                            isActive={checkActive(item.to)}
                                            className="transition-all duration-300 hover:bg-primary/10 hover:text-primary group data-[active=true]:bg-primary/10 data-[active=true]:text-primary border border-transparent data-[active=true]:border-primary/20"
                                        >
                                            <NavLink to={item.to} end={false}>
                                                <item.icon className="size-4 transition-transform duration-300 group-hover:scale-110" />
                                                <span className="font-medium">{item.label}</span>
                                                {/* Subscription indicator for active modules */}
                                                <div
                                                    className={`ml-auto size-2 rounded-full transition-all group-data-[collapsible=icon]:hidden ${
                                                        systemInfo?.enabledModules?.some(
                                                            (m: any) =>
                                                                (m.slug || m) === moduleSlug,
                                                        )
                                                            ? 'bg-emerald-500 shadow-[0_0_8px] shadow-emerald-500/50 animate-pulse-slow'
                                                            : 'bg-primary/50 group-hover:bg-primary'
                                                    }`}
                                                />
                                            </NavLink>
                                        </SidebarMenuButton>
                                    </SidebarMenuItem>
                                );
                            })}
                        </SidebarMenu>
                    </SidebarGroupContent>
                </SidebarGroup>

                {/* Config */}
                <SidebarGroup className="mt-auto">
                    <SidebarGroupLabel className="text-[10px] font-mono tracking-wider uppercase text-muted-foreground group-data-[collapsible=icon]:hidden">
                        Config
                    </SidebarGroupLabel>
                    <SidebarGroupContent>
                        <SidebarMenu>
                            {navConfig.map((item) => (
                                <SidebarMenuItem key={item.to}>
                                    <SidebarMenuButton
                                        asChild
                                        tooltip={item.label}
                                        isActive={checkActive(item.to)}
                                        className="transition-all duration-300 hover:bg-primary/10 hover:text-primary group data-[active=true]:bg-primary/10 data-[active=true]:text-primary border border-transparent data-[active=true]:border-primary/20"
                                    >
                                        <NavLink to={item.to} end={false}>
                                            <item.icon className="size-4 transition-transform duration-300 group-hover:scale-110" />
                                            <span className="font-medium">{item.label}</span>
                                        </NavLink>
                                    </SidebarMenuButton>
                                </SidebarMenuItem>
                            ))}
                        </SidebarMenu>
                    </SidebarGroupContent>
                </SidebarGroup>
            </SidebarContent>
            <SidebarFooter className="p-3">
                <div className="flex items-center justify-between gap-2 group-data-[collapsible=icon]:flex-col group-data-[collapsible=icon]:items-center">
                    <SidebarMenu className="flex-1">
                        <SidebarMenuItem>
                            <SidebarMenuButton
                                onClick={logout}
                                tooltip="Logout"
                                className="h-9 transition-all hover:bg-destructive/10 hover:text-destructive group/logout"
                            >
                                <LogOut className="size-4 shrink-0 group-data-[collapsible=icon]:mx-auto transition-colors" />
                                <span className="group-data-[collapsible=icon]:hidden font-medium">
                                    Logout
                                </span>
                            </SidebarMenuButton>
                        </SidebarMenuItem>
                    </SidebarMenu>
                    <SidebarTrigger className="size-8 rounded-md bg-accent/30 hover:bg-accent border border-border/40 transition-all opacity-40 hover:opacity-100 shrink-0 group-data-[collapsible=icon]:mt-2" />
                </div>
            </SidebarFooter>
        </Sidebar>
    );
}

export function Layout({ children }: { children: React.ReactNode }) {
    const { user, systemInfo } = useAuth();
    const { isConnected } = useSocket();

    const activeTenantSlug = systemInfo?.instanceName || 'Local Instance';

    useEffect(() => {
        if (isElectron()) {
            document.body.setAttribute('data-electron', 'true');
        } else {
            document.body.removeAttribute('data-electron');
        }
    }, []);

    const activeTenantRole = user?.role === 'superuser' ? 'Superuser' : user?.role || 'User';

    return (
        <div className="flex flex-col min-h-svh">
            {isElectron() && <TitleBar />}
            <SidebarProvider className="flex-1">
                <BackgroundDecoration />
                <AppSidebar />
                <SidebarInset className="bg-background/20 dark:bg-background/40">
                    <header
                        className="flex h-16 shrink-0 items-center justify-between px-6 border-b glass-panel sticky top-0 z-10 transition-all"
                        style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
                    >
                        <div className="flex items-center gap-2">
                            {/* Title or Breadcrumbs could go here */}
                        </div>
                        <div
                            className="flex items-center gap-4"
                            style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
                        >
                            <div className="bg-primary/5 hover:bg-primary/10 transition-colors border border-primary/20 rounded-lg flex items-center justify-between px-3 py-1.5 cursor-default gap-3 h-9">
                                <div className="flex flex-col items-end">
                                    <span className="text-[10px] text-muted-foreground capitalize leading-none">
                                        {activeTenantRole}
                                    </span>
                                </div>
                                <TooltipProvider>
                                    <Tooltip>
                                        <TooltipTrigger>
                                            <div
                                                className={`size-2 rounded-full shadow-[0_0_8px] ${isConnected ? 'bg-green-500 shadow-green-500/50 animate-pulse-slow' : 'bg-red-500 shadow-red-500/50'}`}
                                            />
                                        </TooltipTrigger>
                                        <TooltipContent>
                                            {isConnected
                                                ? 'Real-time WebSocket connected'
                                                : 'WebSocket disconnected'}
                                        </TooltipContent>
                                    </Tooltip>
                                </TooltipProvider>
                            </div>
                            <CopilotSidebar />
                            <ModeToggle />
                            <NotificationCenter />
                        </div>
                    </header>
                    <main className="flex-1 p-6 page-transition relative">{children}</main>
                </SidebarInset>
            </SidebarProvider>
        </div>
    );
}
