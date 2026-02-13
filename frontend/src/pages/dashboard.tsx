import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { Activity, Server, Package, RefreshCw } from 'lucide-react';
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

export function DashboardPage() {
    const { api } = useAuth();
    const [tenants, setTenants] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchTenants = async () => {
        try {
            setLoading(true);
            const res = await api.get('/admin/tenants');
            setTenants(res.data.data);
        } catch { }
        finally { setLoading(false); }
    };

    useEffect(() => {
        fetchTenants();
        const interval = setInterval(fetchTenants, 30000);
        return () => clearInterval(interval);
    }, []);

    const online = tenants.filter(t => t.status === 'online').length;
    const subs = tenants.reduce((a: number, t: any) => a + (t.subscribedModules?.length || 0), 0);

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Fleet Overview</h1>
                    <p className="text-sm text-muted-foreground">Real-time monitoring of all silo instances</p>
                </div>
                <Button onClick={fetchTenants} variant="outline" size="sm">
                    <RefreshCw className="size-4 mr-2" />
                    Refresh
                </Button>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
                                <Server className="size-5 text-primary" />
                            </div>
                            <p className="text-sm font-medium text-muted-foreground">Active Silos</p>
                        </div>
                        <p className="text-3xl font-bold">{tenants.length}</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-green-500/10">
                                <Activity className="size-5 text-green-500" />
                            </div>
                            <p className="text-sm font-medium text-muted-foreground">Online</p>
                        </div>
                        <p className="text-3xl font-bold">{online}</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-yellow-500/10">
                                <Package className="size-5 text-yellow-500" />
                            </div>
                            <p className="text-sm font-medium text-muted-foreground">Subscriptions</p>
                        </div>
                        <p className="text-3xl font-bold">{subs}</p>
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Silo Fleet</CardTitle>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Instance</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>IP</TableHead>
                                <TableHead>CPU / RAM</TableHead>
                                <TableHead>Modules</TableHead>
                                <TableHead>Last Seen</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {tenants.map(t => (
                                <TableRow key={t._id}>
                                    <TableCell>
                                        <div className="font-medium">{t.name}</div>
                                        <div className="text-xs text-muted-foreground">{t.slug}</div>
                                    </TableCell>
                                    <TableCell>
                                        <Badge
                                            variant={t.status === 'online' ? 'default' : 'secondary'}
                                            className={
                                                t.status === 'online'
                                                    ? 'bg-green-500/15 text-green-500 hover:bg-green-500/25'
                                                    : t.status === 'error'
                                                        ? 'bg-destructive/15 text-destructive hover:bg-destructive/25'
                                                        : ''
                                            }
                                        >
                                            {t.status || 'offline'}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-muted-foreground">{t.vmIpAddress || '—'}</TableCell>
                                    <TableCell className="text-muted-foreground">
                                        {t.metrics?.cpu ? `${t.metrics.cpu.toFixed(1)}% | ${Math.round(t.metrics.ram)}MB` : '—'}
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex flex-wrap gap-1">
                                            {t.subscribedModules?.map((m: string) => (
                                                <Badge key={m} variant="outline" className="text-xs">
                                                    {m}
                                                </Badge>
                                            ))}
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-xs text-muted-foreground">
                                        {t.lastSeen ? new Date(t.lastSeen).toLocaleTimeString() : 'Never'}
                                    </TableCell>
                                </TableRow>
                            ))}
                            {!tenants.length && !loading && (
                                <TableRow>
                                    <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                                        No silos discovered yet.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}
