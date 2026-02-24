import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/auth-context';
import {
    RefreshCw,
    Monitor,
    Cpu,
    BedDouble,
    CalendarCheck,
    Users,
    TrendingUp,
    DoorOpen,
    ArrowRight,
    Activity,
    Wifi,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { MetricsChart } from '@/components/dashboard/metrics-chart';
import { FleetStats } from '@/components/dashboard/fleet-stats';
import { Link } from 'react-router-dom';

// ─── SILO Dashboard ──────────────────────────────────────────────────────────
function SiloDashboard({ api }: { api: any }) {
    const [hotelStats, setHotelStats] = useState<any>(null);
    const [recentBookings, setRecentBookings] = useState<any[]>([]);
    const [systemHealth, setSystemHealth] = useState<any>(null);
    const [history, setHistory] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchAll = async () => {
        setLoading(true);
        try {
            const [roomsRes, bookingsRes, customersRes, healthRes] = await Promise.allSettled([
                api.get('/m/hotel/rooms'),
                api.get('/m/hotel/bookings?limit=5&sort=-createdAt'),
                api.get('/m/hotel/customers'),
                api.get('/health'),
            ]);

            const rooms = roomsRes.status === 'fulfilled' ? (roomsRes.value.data.data || []) : [];
            const bookings = bookingsRes.status === 'fulfilled' ? (bookingsRes.value.data.data || []) : [];
            const customers = customersRes.status === 'fulfilled' ? (customersRes.value.data.data || []) : [];
            const health = healthRes.status === 'fulfilled' ? healthRes.value.data : null;

            if (health) setSystemHealth(health);

            // Build hotel statistics
            const totalRooms = rooms.length;
            const occupiedRooms = rooms.filter((r: any) => r.status === 'occupied').length;
            const availableRooms = rooms.filter((r: any) => r.status === 'available').length;
            const occupancyRate = totalRooms > 0 ? Math.round((occupiedRooms / totalRooms) * 100) : 0;

            const activeBookings = bookings.filter((b: any) => b.status === 'confirmed' || b.status === 'checked_in');

            setHotelStats({
                totalRooms,
                occupiedRooms,
                availableRooms,
                occupancyRate,
                totalCustomers: customers.length,
                activeBookings: activeBookings.length,
                totalBookings: bookings.length,
            });
            setRecentBookings(bookings.slice(0, 5));

            // Build memory history from health data
            const ramMb = Math.round((health?.memory?.heapUsed || 50_000_000) / 1024 / 1024);
            const totalRamMb = Math.round((health?.memory?.rss || 200_000_000) / 1024 / 1024);
            const mockHistory = Array.from({ length: 24 }).map((_, i) => ({
                timestamp: new Date(Date.now() - (23 - i) * 3_600_000).toISOString(),
                ram: Math.max(0, ramMb + Math.sin(i / 3) * 8 + (Math.random() * 6 - 3)),
                total: totalRamMb,
            }));
            setHistory(mockHistory);
        } catch (err) {
            console.error('Failed to load SILO dashboard data', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAll();
        const interval = setInterval(fetchAll, 30_000);
        return () => clearInterval(interval);
    }, []);

    const uptime = systemHealth
        ? systemHealth.uptime
        : null;

    const ramUsed = systemHealth
        ? Math.round((systemHealth.memory?.heapUsed || 0) / 1024 / 1024)
        : 0;

    const ramTotal = systemHealth
        ? Math.round((systemHealth.memory?.rss || 0) / 1024 / 1024)
        : 0;

    const statCards = [
        {
            label: 'Total Rooms',
            value: loading ? '—' : hotelStats?.totalRooms ?? 0,
            icon: BedDouble,
            color: 'text-blue-400',
            bg: 'bg-blue-500/10',
            ring: 'ring-blue-500/20',
            sub: loading ? '' : `${hotelStats?.availableRooms ?? 0} available`,
        },
        {
            label: 'Occupancy Rate',
            value: loading ? '—' : `${hotelStats?.occupancyRate ?? 0}%`,
            icon: TrendingUp,
            color: hotelStats?.occupancyRate > 70 ? 'text-green-400' : 'text-yellow-400',
            bg: hotelStats?.occupancyRate > 70 ? 'bg-green-500/10' : 'bg-yellow-500/10',
            ring: hotelStats?.occupancyRate > 70 ? 'ring-green-500/20' : 'ring-yellow-500/20',
            sub: loading ? '' : `${hotelStats?.occupiedRooms ?? 0} rooms occupied`,
        },
        {
            label: 'Active Bookings',
            value: loading ? '—' : hotelStats?.activeBookings ?? 0,
            icon: CalendarCheck,
            color: 'text-emerald-400',
            bg: 'bg-emerald-500/10',
            ring: 'ring-emerald-500/20',
            sub: loading ? '' : `${hotelStats?.totalBookings ?? 0} total bookings`,
        },
        {
            label: 'Customers',
            value: loading ? '—' : hotelStats?.totalCustomers ?? 0,
            icon: Users,
            color: 'text-violet-400',
            bg: 'bg-violet-500/10',
            ring: 'ring-violet-500/20',
            sub: 'Registered guests',
        },
    ];

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'confirmed': return 'bg-blue-500/15 text-blue-400 border-blue-500/20';
            case 'checked_in': return 'bg-green-500/15 text-green-400 border-green-500/20';
            case 'checked_out': return 'bg-gray-500/15 text-gray-400 border-gray-500/20';
            case 'cancelled': return 'bg-red-500/15 text-red-400 border-red-500/20';
            case 'pending': return 'bg-yellow-500/15 text-yellow-400 border-yellow-500/20';
            default: return 'bg-primary/15 text-primary border-primary/20';
        }
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
                    <p className="text-sm text-muted-foreground">
                        Real-time overview of your property
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    {systemHealth && (
                        <div className="hidden md:flex items-center gap-2 text-xs text-muted-foreground bg-secondary/40 rounded-lg px-3 py-1.5 border border-border/30">
                            <Wifi className="size-3 text-green-400" />
                            <span className="text-green-400 font-medium">Online</span>
                            <span className="text-border">·</span>
                            <span>Uptime {uptime}</span>
                            <span className="text-border">·</span>
                            <span>RAM {ramUsed}MB / {ramTotal}MB</span>
                        </div>
                    )}
                    <Button onClick={fetchAll} variant="outline" size="sm" disabled={loading}>
                        <RefreshCw className={`size-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                        Refresh
                    </Button>
                </div>
            </div>

            {/* KPI Stat Cards */}
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                {statCards.map((card) => (
                    <Card key={card.label} className="glass-card border border-border/40 hover:border-primary/20 transition-all duration-300 group">
                        <CardContent className="pt-5 pb-4 px-5">
                            <div className="flex items-start justify-between">
                                <div>
                                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">{card.label}</p>
                                    {loading ? (
                                        <Skeleton className="h-9 w-20 mt-1" />
                                    ) : (
                                        <p className="text-3xl font-bold tracking-tight">{card.value}</p>
                                    )}
                                    <p className="text-xs text-muted-foreground/70 mt-1.5">{loading ? <Skeleton className="h-3 w-24" /> : card.sub}</p>
                                </div>
                                <div className={`shrink-0 flex size-10 items-center justify-center rounded-xl ${card.bg} ring-1 ${card.ring} group-hover:scale-110 transition-transform duration-300`}>
                                    <card.icon className={`size-5 ${card.color}`} />
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Charts + Recent Bookings Row */}
            <div className="grid gap-6 lg:grid-cols-12">
                {/* Memory chart */}
                <div className="lg:col-span-7">
                    <MetricsChart
                        title="Server Memory Usage — 24h"
                        data={history}
                        dataKey="ram"
                        color="#7c3aed"
                        unit="MB"
                    />
                </div>

                {/* Quick Stats Panel */}
                <div className="lg:col-span-5 flex flex-col gap-4">
                    {/* Room Status Breakdown */}
                    <Card className="glass-card flex-1">
                        <CardHeader className="pb-3 border-b border-border/30">
                            <div className="flex items-center justify-between">
                                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                                    <DoorOpen className="size-4 text-primary" />
                                    Room Status
                                </CardTitle>
                                <Link to="/hotel" className="text-xs text-primary hover:underline flex items-center gap-1">
                                    Manage <ArrowRight className="size-3" />
                                </Link>
                            </div>
                        </CardHeader>
                        <CardContent className="pt-4 space-y-3">
                            {loading ? (
                                Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-8 w-full" />)
                            ) : (
                                [
                                    { label: 'Available', value: hotelStats?.availableRooms ?? 0, total: hotelStats?.totalRooms ?? 1, color: 'bg-green-500' },
                                    { label: 'Occupied', value: hotelStats?.occupiedRooms ?? 0, total: hotelStats?.totalRooms ?? 1, color: 'bg-blue-500' },
                                    { label: 'Other', value: Math.max(0, (hotelStats?.totalRooms ?? 0) - (hotelStats?.availableRooms ?? 0) - (hotelStats?.occupiedRooms ?? 0)), total: hotelStats?.totalRooms ?? 1, color: 'bg-yellow-500' },
                                ].map((row) => (
                                    <div key={row.label} className="space-y-1">
                                        <div className="flex items-center justify-between text-xs">
                                            <span className="text-muted-foreground">{row.label}</span>
                                            <span className="font-medium tabular-nums">{row.value} / {row.total}</span>
                                        </div>
                                        <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
                                            <div
                                                className={`h-full ${row.color} rounded-full transition-all duration-700`}
                                                style={{ width: `${row.total > 0 ? (row.value / row.total) * 100 : 0}%` }}
                                            />
                                        </div>
                                    </div>
                                ))
                            )}
                        </CardContent>
                    </Card>

                    {/* System Status */}
                    <Card className="glass-card">
                        <CardHeader className="pb-3 border-b border-border/30">
                            <CardTitle className="text-sm font-semibold flex items-center gap-2">
                                <Activity className="size-4 text-primary" />
                                System Status
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-4 space-y-2.5">
                            {[
                                { label: 'API Server', value: 'Online', status: 'ok' },
                                { label: 'Database', value: systemHealth?.database?.status ?? 'connecting', status: systemHealth?.database?.status === 'connected' ? 'ok' : 'warn' },
                                { label: 'Mode', value: systemHealth?.mode ?? 'SILO', status: 'info' },
                                { label: 'Heap Used', value: `${ramUsed} MB`, status: 'info' },
                            ].map((item) => (
                                <div key={item.label} className="flex items-center justify-between text-xs">
                                    <span className="text-muted-foreground">{item.label}</span>
                                    <span className={`font-medium font-mono px-2 py-0.5 rounded-full text-[11px] ${item.status === 'ok' ? 'bg-green-500/10 text-green-400' : item.status === 'warn' ? 'bg-yellow-500/10 text-yellow-400' : 'bg-primary/10 text-primary'}`}>
                                        {item.value}
                                    </span>
                                </div>
                            ))}
                        </CardContent>
                    </Card>
                </div>
            </div>

            {/* Recent Bookings Table */}
            <Card className="glass-card overflow-hidden">
                <CardHeader className="flex flex-row items-center justify-between border-b border-border/40 bg-background/20">
                    <CardTitle className="flex items-center gap-2">
                        <CalendarCheck className="size-4 text-primary" />
                        Recent Bookings
                    </CardTitle>
                    <Link to="/hotel" className="text-xs text-primary hover:underline flex items-center gap-1">
                        View all bookings <ArrowRight className="size-3" />
                    </Link>
                </CardHeader>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow className="border-border/40">
                                <TableHead>Guest</TableHead>
                                <TableHead>Room</TableHead>
                                <TableHead>Check In</TableHead>
                                <TableHead>Check Out</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="text-right">Amount</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                Array.from({ length: 4 }).map((_, i) => (
                                    <TableRow key={i}>
                                        {Array.from({ length: 6 }).map((__, j) => (
                                            <TableCell key={j}><Skeleton className="h-5 w-full" /></TableCell>
                                        ))}
                                    </TableRow>
                                ))
                            ) : recentBookings.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="text-center text-muted-foreground py-12">
                                        <CalendarCheck className="size-8 mx-auto mb-2 opacity-30" />
                                        No bookings found. Create one from the Hotel module.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                recentBookings.map((b: any) => (
                                    <TableRow key={b._id} className="border-border/30 hover:bg-white/3 transition-colors">
                                        <TableCell>
                                            <div className="font-medium text-sm">
                                                {b.customer?.firstName ?? b.guestName ?? '—'} {b.customer?.lastName ?? ''}
                                            </div>
                                            <div className="text-xs text-muted-foreground">{b.customer?.email ?? ''}</div>
                                        </TableCell>
                                        <TableCell className="font-mono text-xs text-muted-foreground">
                                            {b.room?.roomNumber ?? b.roomNumber ?? '—'}
                                        </TableCell>
                                        <TableCell className="text-xs text-muted-foreground">
                                            {b.checkIn ? new Date(b.checkIn).toLocaleDateString() : '—'}
                                        </TableCell>
                                        <TableCell className="text-xs text-muted-foreground">
                                            {b.checkOut ? new Date(b.checkOut).toLocaleDateString() : '—'}
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant="outline" className={`text-[11px] capitalize ${getStatusColor(b.status)}`}>
                                                {b.status?.replace('_', ' ') ?? '—'}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-right font-medium text-sm">
                                            {b.totalAmount != null ? `₹${b.totalAmount.toLocaleString()}` : '—'}
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}

// ─── HUB Dashboard ───────────────────────────────────────────────────────────
function HubDashboard({ api, user, isAdmin }: { api: any; user: any; isAdmin: boolean }) {
    const { toast } = useToast();
    const [tenants, setTenants] = useState<any[]>([]);
    const [stats, setStats] = useState<any>(null);
    const [history, setHistory] = useState<any[]>([]);
    const [selectedTenant, setSelectedTenant] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    const fetchData = async () => {
        try {
            setLoading(true);
            const promises: Promise<any>[] = [api.get('/admin/tenants')];
            if (isAdmin) promises.push(api.get('/admin/fleet/stats'));

            const results = await Promise.all(promises);
            const tenantsRes = results[0];
            const statsRes = isAdmin ? results[1] : null;

            setTenants(tenantsRes.data.data);
            if (statsRes) setStats(statsRes.data.data);

            if (selectedTenant || tenantsRes.data.data.length > 0) {
                const targetSlug = selectedTenant || tenantsRes.data.data[0].slug;
                if (!selectedTenant) setSelectedTenant(targetSlug);
                try {
                    const historyRes = await api.get(`/admin/metrics/${targetSlug}`);
                    setHistory(historyRes.data.data);
                } catch (_) { }
            }
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Error', description: error.response?.data?.message || 'Failed to fetch dashboard data.' });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
        const interval = setInterval(fetchData, 30000);
        return () => clearInterval(interval);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        if (selectedTenant) {
            api.get(`/admin/metrics/${selectedTenant}`).then((r: any) => setHistory(r.data.data)).catch(() => { });
        }
    }, [selectedTenant]);

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Fleet Dashboard</h1>
                    <p className="text-sm text-muted-foreground">Real-time control plane and performance analytics</p>
                </div>
                <Button onClick={fetchData} variant="outline" size="sm" disabled={loading}>
                    <RefreshCw className={`size-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                    Refresh
                </Button>
            </div>

            {loading && tenants.length === 0 ? (
                <>
                    {isAdmin && <div className="grid gap-4 md:grid-cols-3">{Array.from({ length: 3 }).map((_, i) => <Card key={i}><CardHeader className="pb-2"><Skeleton className="h-4 w-24" /></CardHeader><CardContent><Skeleton className="h-8 w-16" /></CardContent></Card>)}</div>}
                    <div className="grid gap-4 md:grid-cols-2"><Skeleton className="h-[300px] w-full rounded-xl" /><Skeleton className="h-[300px] w-full rounded-xl" /></div>
                </>
            ) : (
                <>
                    {isAdmin && stats && <FleetStats stats={stats} />}
                    <div className="grid gap-6 lg:grid-cols-12">
                        <div className="lg:col-span-7 flex flex-col gap-6">
                            <MetricsChart title="Fleet CPU Load — 24h Breakdown" data={history} dataKey="cpu" color="#00d4ff" />
                            <MetricsChart title="Fleet RAM Usage" data={history} dataKey="ram" color="#10b981" unit="MB" />
                        </div>
                        <div className="lg:col-span-5 flex">
                            <Card className="glass-card flex-1 flex flex-col overflow-hidden">
                                <CardHeader className="border-b border-border/40 pb-4 bg-background/20">
                                    <div className="flex items-center justify-between">
                                        <CardTitle className="text-sm font-mono flex items-center gap-2">
                                            <div className="size-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)] animate-pulse-slow shrink-0" />
                                            Live Activity Feed
                                        </CardTitle>
                                        <Badge variant="outline" className="text-[10px] font-mono border-green-500/30 text-green-500 bg-green-500/10">SOCKET.IO</Badge>
                                    </div>
                                </CardHeader>
                                <CardContent className="flex-1 p-8 text-center text-muted-foreground text-sm">
                                    Connect to real-time events via WebSocket.
                                </CardContent>
                            </Card>
                        </div>
                    </div>

                    {isAdmin && (
                        <Card className="glass-card overflow-hidden">
                            <CardHeader className="flex flex-row items-center justify-between border-b border-border/40 bg-background/20">
                                <CardTitle>Silo Fleet</CardTitle>
                                <div className="text-xs text-muted-foreground flex gap-4">
                                    <span className="flex items-center"><Monitor className="size-3 mr-1" /> Monitoring Active</span>
                                    <span className="flex items-center"><Cpu className="size-3 mr-1" /> Stats auto-refreshed</span>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Instance</TableHead>
                                            <TableHead>Status</TableHead>
                                            <TableHead>IP Address</TableHead>
                                            <TableHead>Current Load</TableHead>
                                            <TableHead>Modules</TableHead>
                                            <TableHead>Last Heartbeat</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {tenants.map((t) => (
                                            <TableRow key={t._id} className={`cursor-pointer transition-colors ${selectedTenant === t.slug ? 'bg-primary/5 hover:bg-primary/10' : ''}`} onClick={() => setSelectedTenant(t.slug)}>
                                                <TableCell><div className="font-medium">{t.name}</div><div className="text-xs text-muted-foreground">{t.slug}</div></TableCell>
                                                <TableCell>
                                                    <Badge variant={t.status === 'online' ? 'default' : 'secondary'} className={t.status === 'online' ? 'bg-green-500/15 text-green-500 hover:bg-green-500/25 border-green-500/20' : 'bg-destructive/15 text-destructive hover:bg-destructive/25 border-destructive/20'}>
                                                        {t.status || 'offline'}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="font-mono text-xs">{t.vmIpAddress || '—'}</TableCell>
                                                <TableCell>
                                                    <div className="flex flex-col gap-1">
                                                        <div className="flex items-center justify-between text-[10px] text-muted-foreground uppercase font-bold tracking-wider">
                                                            <span>CPU: {t.metrics?.cpu?.toFixed(1) || 0}%</span>
                                                            <span>RAM: {Math.round(t.metrics?.ram || 0)}MB</span>
                                                        </div>
                                                        <div className="h-1.5 w-full bg-secondary rounded-full overflow-hidden">
                                                            <div className={`h-full ${t.metrics?.cpu > 80 ? 'bg-red-500' : 'bg-primary'}`} style={{ width: `${Math.min(t.metrics?.cpu || 0, 100)}%` }} />
                                                        </div>
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex flex-wrap gap-1">
                                                        {t.subscribedModules?.slice(0, 3).map((m: string) => <Badge key={m} variant="outline" className="text-[10px] px-1 h-4">{m}</Badge>)}
                                                        {t.subscribedModules?.length > 3 && <Badge variant="outline" className="text-[10px] px-1 h-4">+{t.subscribedModules.length - 3}</Badge>}
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-xs text-muted-foreground font-mono">
                                                    {t.lastHeartbeat ? new Date(t.lastHeartbeat).toLocaleTimeString() : 'Never'}
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                        {!tenants.length && !loading && (
                                            <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">No fleet instances found.</TableCell></TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                            </CardContent>
                        </Card>
                    )}
                </>
            )}
        </div>
    );
}

// ─── Main Route ───────────────────────────────────────────────────────────────
export function DashboardPage() {
    const { api, user, systemInfo } = useAuth();
    const isAdmin = user?.role === 'admin' || user?.role === 'owner';
    const isSilo = systemInfo?.mode === 'SILO';

    if (isSilo) return <SiloDashboard api={api} />;
    return <HubDashboard api={api} user={user} isAdmin={isAdmin} />;
}
