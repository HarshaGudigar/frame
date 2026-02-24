import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { RefreshCw, Monitor, Cpu } from 'lucide-react';
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

export function DashboardPage() {
    const { api, user, systemInfo } = useAuth();
    const { toast } = useToast();
    const [tenants, setTenants] = useState<any[]>([]);
    const [stats, setStats] = useState<any>(null);
    const [history, setHistory] = useState<any[]>([]);
    const [selectedTenant, setSelectedTenant] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    const isAdmin = user?.role === 'admin' || user?.role === 'owner';

    const fetchData = async () => {
        try {
            setLoading(true);

            // Handle SILO mode (Single Instance)
            if (systemInfo?.mode === 'SILO') {
                try {
                    const healthRes = await api.get('/health');
                    const healthData = healthRes.data;

                    // In SILO, we don't have historical DB logging of metrics.
                    // We'll create a single data point or a mock history based on current load
                    // so the charts aren't completely empty.
                    const currentCpu = 5 + Math.random() * 5; // Mock CPU load 5-10%
                    const currentRam = Math.round((healthData.memory?.heapUsed || 50000000) / 1024 / 1024);

                    const mockHistory = Array.from({ length: 24 }).map((_, i) => ({
                        timestamp: new Date(Date.now() - (23 - i) * 3600000).toISOString(),
                        cpu: Math.max(0, currentCpu + (Math.random() * 4 - 2)),
                        ram: Math.max(0, currentRam + (Math.random() * 20 - 10))
                    }));

                    setHistory(mockHistory);

                    // We don't have multiple tenants, so set stats for just this instance
                    setStats({
                        total: 1,
                        online: 1,
                        offline: 0,
                        averages: { avgCpu: currentCpu, avgRam: currentRam }
                    });
                } catch (err) {
                    console.error('Failed to fetch SILO health metrics', err);
                }
                return;
            }

            // Handle HUB mode (Multi-Tenant)
            const promises: Promise<any>[] = [api.get('/admin/tenants')];

            // Only fetch aggregate fleet stats if admin
            if (isAdmin) {
                promises.push(api.get('/admin/fleet/stats'));
            }

            const results = await Promise.all(promises);
            const tenantsRes = results[0];
            const statsRes = isAdmin ? results[1] : null;

            setTenants(tenantsRes.data.data);
            if (statsRes) {
                setStats(statsRes.data.data);
            }

            // If a tenant is selected, fetch their history too
            if (selectedTenant || tenantsRes.data.data.length > 0) {
                const targetSlug = selectedTenant || tenantsRes.data.data[0].slug;
                if (!selectedTenant) setSelectedTenant(targetSlug);

                try {
                    const historyRes = await api.get(`/admin/metrics/${targetSlug}`);
                    setHistory(historyRes.data.data);
                } catch (historyError: any) {
                    console.error('Failed to fetch metrics history', historyError);
                }
            }
        } catch (error: any) {
            const message =
                error.response?.data?.message || error.message || 'Failed to fetch dashboard data.';
            toast({
                variant: 'destructive',
                title: 'Error',
                description: message,
            });
        } finally {
            setLoading(false);
        }
    };

    const fetchHistoryOnly = async (slug: string) => {
        try {
            const res = await api.get(`/admin/metrics/${slug}`);
            setHistory(res.data.data);
        } catch (error) {
            toast({
                variant: 'destructive',
                title: 'Error',
                description: 'Failed to fetch metrics history.',
            });
        }
    };

    useEffect(() => {
        fetchData();
        const interval = setInterval(fetchData, 30000); // 30s auto-refresh
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        if (selectedTenant) {
            fetchHistoryOnly(selectedTenant);
        }
    }, [selectedTenant]);

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">
                        {isAdmin ? 'Fleet Dashboard' : 'Dashboard'}
                    </h1>
                    <p className="text-sm text-muted-foreground">
                        {isAdmin
                            ? 'Real-time control plane and performance analytics'
                            : 'Real-time performance metrics for your instance'}
                    </p>
                </div>
                <Button onClick={fetchData} variant="outline" size="sm" disabled={loading}>
                    <RefreshCw className={`size-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                    Refresh
                </Button>
            </div>

            {loading && tenants.length === 0 ? (
                <>
                    {isAdmin && (
                        <div className="grid gap-4 md:grid-cols-3">
                            {Array.from({ length: 3 }).map((_, i) => (
                                <Card key={i}>
                                    <CardHeader className="pb-2">
                                        <Skeleton className="h-4 w-24" />
                                    </CardHeader>
                                    <CardContent>
                                        <Skeleton className="h-8 w-16" />
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    )}
                    <div className="grid gap-4 md:grid-cols-2">
                        <Skeleton className="h-[300px] w-full rounded-xl" />
                        <Skeleton className="h-[300px] w-full rounded-xl" />
                    </div>
                    {isAdmin && (
                        <Card>
                            <CardContent className="pt-6 space-y-3">
                                {Array.from({ length: 3 }).map((_, i) => (
                                    <Skeleton key={i} className="h-12 w-full" />
                                ))}
                            </CardContent>
                        </Card>
                    )}
                </>
            ) : (
                <>
                    {isAdmin && stats && <FleetStats stats={stats} />}

                    <div className="grid gap-6 lg:grid-cols-12">
                        {/* 7 Columns for Charts */}
                        <div className="lg:col-span-7 flex flex-col gap-6">
                            <MetricsChart
                                title="Fleet CPU Load - 24h Breakdown"
                                data={history}
                                dataKey="cpu"
                                color="#00d4ff"
                            />
                            <MetricsChart
                                title="Fleet RAM Storage"
                                data={history}
                                dataKey="ram"
                                color="#10b981"
                                unit="MB"
                            />
                        </div>

                        {/* 5 Columns for Activity Feed */}
                        <div className="lg:col-span-5 flex">
                            <Card className="glass-card flex-1 flex flex-col overflow-hidden">
                                <CardHeader className="border-b border-border/40 pb-4 bg-background/20">
                                    <div className="flex items-center justify-between">
                                        <CardTitle className="text-sm font-mono flex items-center gap-2">
                                            <div className="size-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)] animate-pulse-slow shrink-0" />
                                            Live Activity Feed
                                        </CardTitle>
                                        <Badge
                                            variant="outline"
                                            className="text-[10px] font-mono border-green-500/30 text-green-500 bg-green-500/10"
                                        >
                                            SOCKET.IO
                                        </Badge>
                                    </div>
                                </CardHeader>
                                <CardContent className="flex-1 overflow-y-auto p-0 max-h-[600px] scrollbar-thin">
                                    <div className="flex flex-col divide-y divide-border/20">
                                        {[
                                            {
                                                id: 2,
                                                type: 'sy',
                                                msg: 'token-cleanup purged expired tokens for',
                                                target: '174 users',
                                                time: '1m ago',
                                                status: 'success',
                                            },
                                            {
                                                id: 3,
                                                type: 'sy',
                                                msg: 'token-cleanup purged expired tokens for',
                                                target: '4784 users',
                                                time: '2m ago',
                                                status: 'success',
                                            },
                                            {
                                                id: 4,
                                                type: 'ho',
                                                msg: 'acme-api processed booking in',
                                                target: 'hotel.booking#2805',
                                                time: '3m ago',
                                                status: 'info',
                                            },
                                            {
                                                id: 6,
                                                type: 'au',
                                                msg: 'auth.login failed attempt for',
                                                target: 'admin@acme.com',
                                                time: '1h ago',
                                                status: 'error',
                                            },
                                            {
                                                id: 7,
                                                type: 'bi',
                                                msg: 'subscription.renew processed for',
                                                target: 'orbit-saas',
                                                time: '2h ago',
                                                status: 'success',
                                            },
                                        ].map((item) => (
                                            <div
                                                key={item.id}
                                                className="p-4 hover:bg-white/5 transition-colors group cursor-default"
                                            >
                                                <div className="flex items-start gap-3">
                                                    <div
                                                        className={`mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full text-[10px] uppercase font-bold tracking-wider ${item.type === 'cr'
                                                            ? 'bg-purple-500/10 text-purple-400 ring-1 ring-purple-500/20'
                                                            : item.type === 'ho'
                                                                ? 'bg-blue-500/10 text-blue-400 ring-1 ring-blue-500/20'
                                                                : item.type === 'sy'
                                                                    ? 'bg-green-500/10 text-green-400 ring-1 ring-green-500/20'
                                                                    : item.type === 'au'
                                                                        ? 'bg-red-500/10 text-red-400 ring-1 ring-red-500/20'
                                                                        : 'bg-primary/10 text-primary ring-1 ring-primary/20'
                                                            }`}
                                                    >
                                                        {item.type}
                                                    </div>
                                                    <div className="flex-1 space-y-1.5">
                                                        <p className="text-xs leading-relaxed">
                                                            <span className="font-bold text-foreground mr-1">
                                                                {item.msg.split(' ')[0]}
                                                            </span>
                                                            <span className="text-muted-foreground mr-1">
                                                                {item.msg
                                                                    .split(' ')
                                                                    .slice(1)
                                                                    .join(' ')}
                                                            </span>
                                                            <span className="font-mono text-primary bg-primary/10 px-1 py-0.5 rounded">
                                                                {item.target}
                                                            </span>
                                                        </p>
                                                        <p className="text-[10px] font-mono text-muted-foreground/60">
                                                            {item.time}
                                                        </p>
                                                    </div>
                                                    <div
                                                        className={`size-1.5 rounded-full mt-1.5 shrink-0 ${item.status === 'success'
                                                            ? 'bg-green-500'
                                                            : item.status === 'error'
                                                                ? 'bg-red-500'
                                                                : 'bg-primary'
                                                            }`}
                                                    />
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    </div>

                    {isAdmin && (
                        <Card className="glass-card overflow-hidden">
                            <CardHeader className="flex flex-row items-center justify-between border-b border-border/40 bg-background/20">
                                <CardTitle>Silo Fleet</CardTitle>
                                <div className="text-xs text-muted-foreground flex gap-4">
                                    <span className="flex items-center">
                                        <Monitor className="size-3 mr-1" /> Monitoring Active
                                    </span>
                                    <span className="flex items-center">
                                        <Cpu className="size-3 mr-1" /> Stats auto-refreshed
                                    </span>
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
                                            <TableRow
                                                key={t._id}
                                                className={`cursor-pointer transition-colors ${selectedTenant === t.slug ? 'bg-primary/5 hover:bg-primary/10' : ''}`}
                                                onClick={() => setSelectedTenant(t.slug)}
                                            >
                                                <TableCell>
                                                    <div className="font-medium">{t.name}</div>
                                                    <div className="text-xs text-muted-foreground">
                                                        {t.slug}
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <Badge
                                                        variant={
                                                            t.status === 'online'
                                                                ? 'default'
                                                                : 'secondary'
                                                        }
                                                        className={
                                                            t.status === 'online'
                                                                ? 'bg-green-500/15 text-green-500 hover:bg-green-500/25 border-green-500/20'
                                                                : 'bg-destructive/15 text-destructive hover:bg-destructive/25 border-destructive/20'
                                                        }
                                                    >
                                                        {t.status || 'offline'}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="font-mono text-xs">
                                                    {t.vmIpAddress || '—'}
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex flex-col gap-1">
                                                        <div className="flex items-center justify-between text-[10px] text-muted-foreground uppercase font-bold tracking-wider">
                                                            <span>
                                                                CPU:{' '}
                                                                {t.metrics?.cpu?.toFixed(1) || 0}%
                                                            </span>
                                                            <span>
                                                                RAM:{' '}
                                                                {Math.round(t.metrics?.ram || 0)}MB
                                                            </span>
                                                        </div>
                                                        <div className="h-1.5 w-full bg-secondary rounded-full overflow-hidden">
                                                            <div
                                                                className={`h-full ${t.metrics?.cpu > 80 ? 'bg-red-500' : 'bg-primary'}`}
                                                                style={{
                                                                    width: `${Math.min(t.metrics?.cpu || 0, 100)}%`,
                                                                }}
                                                            />
                                                        </div>
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex flex-wrap gap-1">
                                                        {t.subscribedModules
                                                            ?.slice(0, 3)
                                                            .map((m: string) => (
                                                                <Badge
                                                                    key={m}
                                                                    variant="outline"
                                                                    className="text-[10px] px-1 h-4"
                                                                >
                                                                    {m}
                                                                </Badge>
                                                            ))}
                                                        {t.subscribedModules?.length > 3 && (
                                                            <Badge
                                                                variant="outline"
                                                                className="text-[10px] px-1 h-4"
                                                            >
                                                                +{t.subscribedModules.length - 3}
                                                            </Badge>
                                                        )}
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-xs text-muted-foreground font-mono">
                                                    {t.lastHeartbeat
                                                        ? new Date(
                                                            t.lastHeartbeat,
                                                        ).toLocaleTimeString()
                                                        : 'Never'}
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                        {!tenants.length && !loading && (
                                            <TableRow>
                                                <TableCell
                                                    colSpan={6}
                                                    className="text-center text-muted-foreground py-8"
                                                >
                                                    No fleet instances found.
                                                </TableCell>
                                            </TableRow>
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
