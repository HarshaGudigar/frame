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
import { MetricsChart } from '@/components/dashboard/metrics-chart';
import { FleetStats } from '@/components/dashboard/fleet-stats';

export function DashboardPage() {
    const { api } = useAuth();
    const [tenants, setTenants] = useState<any[]>([]);
    const [stats, setStats] = useState<any>(null);
    const [history, setHistory] = useState<any[]>([]);
    const [selectedTenant, setSelectedTenant] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    const fetchData = async () => {
        try {
            setLoading(true);
            const [tenantsRes, statsRes] = await Promise.all([
                api.get('/admin/tenants'),
                api.get('/admin/fleet/stats'),
            ]);

            setTenants(tenantsRes.data.data);
            setStats(statsRes.data.data);

            // If a tenant is selected, fetch their history too
            if (selectedTenant || tenantsRes.data.data.length > 0) {
                const targetSlug = selectedTenant || tenantsRes.data.data[0].slug;
                if (!selectedTenant) setSelectedTenant(targetSlug);

                const historyRes = await api.get(`/admin/metrics/${targetSlug}`);
                setHistory(historyRes.data.data);
            }
        } catch (error) {
            console.error('Failed to fetch dashboard data', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchHistoryOnly = async (slug: string) => {
        try {
            const res = await api.get(`/admin/metrics/${slug}`);
            setHistory(res.data.data);
        } catch (error) {
            console.error('Failed to fetch history', error);
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
                    <h1 className="text-2xl font-bold tracking-tight">Fleet Dashboard</h1>
                    <p className="text-sm text-muted-foreground">
                        Real-time control plane and performance analytics
                    </p>
                </div>
                <Button onClick={fetchData} variant="outline" size="sm" disabled={loading}>
                    <RefreshCw className={`size-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                    Refresh
                </Button>
            </div>

            <FleetStats stats={stats} />

            <div className="grid gap-4 md:grid-cols-2">
                <MetricsChart
                    title="Average CPU Utilization"
                    data={history}
                    dataKey="cpu"
                    color="#3b82f6"
                />
                <MetricsChart
                    title="Average RAM Usage"
                    data={history}
                    dataKey="ram"
                    color="#10b981"
                    unit="MB"
                />
            </div>

            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
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
                                                t.status === 'online' ? 'default' : 'secondary'
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
                                                <span>CPU: {t.metrics?.cpu?.toFixed(1) || 0}%</span>
                                                <span>
                                                    RAM: {Math.round(t.metrics?.ram || 0)}MB
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
                                            {t.subscribedModules?.slice(0, 3).map((m: string) => (
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
                                            ? new Date(t.lastHeartbeat).toLocaleTimeString()
                                            : 'Never'}
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}
