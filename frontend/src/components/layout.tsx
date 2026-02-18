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
} from '@/components/ui/sidebar';
import { Separator } from '@/components/ui/separator';
import { BRAND } from '@/config/brand';

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
            <SidebarHeader>
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton size="lg" asChild>
                            <NavLink to="/">
                                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                                    <Server className="size-4" />
                                </div>
                                <div className="grid flex-1 text-left text-sm leading-tight">
                                    <span className="truncate font-semibold">{BRAND.name}</span>
                                    <span className="truncate text-xs text-muted-foreground">
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
                                        <SidebarMenuButton asChild tooltip={item.label}>
                                            <NavLink to={item.to} end={item.to === '/'}>
                                                <item.icon className="size-4" />
                                                <span>{item.label}</span>
                                            </NavLink>
                                        </SidebarMenuButton>
                                    </SidebarMenuItem>
                                );
                            })}
                        </SidebarMenu>
                    </SidebarGroupContent>
                </SidebarGroup>
            </SidebarContent>
            <SidebarFooter>
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton onClick={logout} tooltip="Logout">
                            <LogOut className="size-4" />
                            <span>Logout</span>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
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
            <AppSidebar />
            <SidebarInset>
                <header className="flex h-16 shrink-0 items-center justify-between px-6 border-b">
                    <div className="flex items-center gap-2">
                        {/* Title or Breadcrumbs could go here */}
                    </div>
                    <div className="flex items-center gap-4">
                        <ConnectionStatus />
                        <ModeToggle />
                        <NotificationCenter />
                    </div>
                </header>
                <main className="flex-1 p-6">{children}</main>
            </SidebarInset>
        </SidebarProvider>
    );
}
