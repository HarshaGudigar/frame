import { NavLink } from 'react-router-dom';
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
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    SidebarProvider,
    SidebarInset,
    SidebarTrigger,
} from '@/components/ui/sidebar';
import { Separator } from '@/components/ui/separator';
import { BRAND } from '@/config/brand';
import { BackgroundDecoration } from './ui/background-decoration';

const navItems = [
    { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/tenants', icon: Building2, label: 'Tenants', role: 'owner' },
    { to: '/users', icon: UsersIcon, label: 'Users', role: 'admin' },
    { to: '/marketplace', icon: Store, label: 'Marketplace', role: 'admin' },
    { to: '/hotel', icon: Building2, label: 'Hotel', module: 'hotel' },
    { to: '/settings', icon: Settings, label: 'Settings' },
    { to: '/audit-logs', icon: ShieldCheck, label: 'Audit Logs', role: 'owner' },
];

function AppSidebar() {
    const { user, logout } = useAuth();
    const { hasRole } = usePermission();

    return (
        <Sidebar variant="inset" collapsible="icon">
            <SidebarHeader className="h-16 flex items-center justify-center overflow-hidden border-b glass-panel transition-all group-data-[collapsible=icon]:p-0 z-10">
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
                                <div className="flex aspect-square size-9 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-lg shadow-primary/20 shrink-0 transition-all">
                                    <Server className="size-5" />
                                </div>
                                <div className="grid flex-1 text-left text-sm leading-tight group-data-[collapsible=icon]:hidden">
                                    <span className="truncate font-bold tracking-tight text-base leading-none">
                                        {BRAND.name}
                                    </span>
                                    <span className="truncate text-[10px] text-muted-foreground/80 font-medium uppercase tracking-wider mt-0.5 leading-none">
                                        {BRAND.product}
                                    </span>
                                </div>
                            </NavLink>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarHeader>
            <Separator />
            <SidebarContent>
                <SidebarGroup>
                    <SidebarGroupContent>
                        <SidebarMenu>
                            {navItems.map((item) => {
                                if (item.role && !hasRole(item.role as any)) return null;

                                // Module access check
                                if ((item as any).module) {
                                    const moduleSlug = (item as any).module;
                                    const hasModuleAccess = user?.tenants?.some((t: any) =>
                                        t.tenant?.subscribedModules?.includes(moduleSlug),
                                    );
                                    // Also allow owner to see it for debugging/admin
                                    if (!hasModuleAccess && user?.role !== 'owner') return null;
                                }

                                return (
                                    <SidebarMenuItem key={item.to}>
                                        <SidebarMenuButton
                                            asChild
                                            tooltip={item.label}
                                            className="transition-all duration-300 hover:bg-primary/10 hover:text-primary group"
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

function ConnectionStatus() {
    const { isConnected } = useSocket();
    return (
        <TooltipProvider>
            <Tooltip>
                <TooltipTrigger asChild>
                    <div className="flex items-center gap-1.5 text-xs cursor-default">
                        <span
                            className={`size-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}
                        />
                        <span className="text-muted-foreground">
                            {isConnected ? 'Connected' : 'Disconnected'}
                        </span>
                    </div>
                </TooltipTrigger>
                <TooltipContent>
                    {isConnected
                        ? 'Real-time connection active'
                        : 'Connection lost — attempting to reconnect'}
                </TooltipContent>
            </Tooltip>
        </TooltipProvider>
    );
}

export function Layout({ children }: { children: React.ReactNode }) {
    return (
        <SidebarProvider>
            <BackgroundDecoration />
            <AppSidebar />
            <SidebarInset className="bg-background/20 dark:bg-background/40">
                <header className="flex h-16 shrink-0 items-center justify-between px-6 border-b glass-panel sticky top-0 z-10">
                    <div className="flex items-center gap-2">
                        {/* Title or Breadcrumbs could go here */}
                    </div>
                    <div className="flex items-center gap-4">
                        <ConnectionStatus />
                        <ModeToggle />
                        <NotificationCenter />
                    </div>
                </header>
                <main className="flex-1 p-6 page-transition relative">{children}</main>
            </SidebarInset>
        </SidebarProvider>
    );
}
