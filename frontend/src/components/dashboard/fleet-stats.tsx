import { Activity, Server, TriangleAlert } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

interface FleetStatsProps {
    stats: {
        total: number;
        online: number;
        offline: number;
        averages: {
            avgCpu: number;
            avgRam: number;
        };
    } | null;
}

export function FleetStats({ stats }: FleetStatsProps) {
    if (!stats) return null;

    return (
        <div className="grid gap-4 md:grid-cols-3">
            <Card className="glass-card relative overflow-hidden group border-primary/20 hover:border-primary/50 transition-colors duration-500">
                <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                <CardContent className="pt-6 relative z-10">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 drop-shadow-[0_0_8px_rgba(0,212,255,0.5)]">
                            <Server className="size-5 text-primary" />
                        </div>
                        <p className="text-sm font-medium text-muted-foreground">Total Silos</p>
                    </div>
                    <div className="flex items-baseline gap-2">
                        <p className="text-3xl font-bold">{stats.total}</p>
                        <p className="text-xs text-muted-foreground">Across all regions</p>
                    </div>
                </CardContent>
            </Card>
            <Card className="glass-card relative overflow-hidden group border-green-500/20 hover:border-green-500/50 transition-colors duration-500">
                <div className="absolute inset-0 bg-gradient-to-br from-green-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                <CardContent className="pt-6 relative z-10">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-green-500/10 drop-shadow-[0_0_8px_rgba(34,197,94,0.5)] animate-pulse-slow">
                            <Activity className="size-5 text-green-500" />
                        </div>
                        <p className="text-sm font-medium text-muted-foreground">Online Now</p>
                    </div>
                    <div className="flex items-baseline gap-2">
                        <p className="text-3xl font-bold text-green-600">{stats.online}</p>
                        <p className="text-xs text-green-600/70">
                            {((stats.online / stats.total) * 100 || 0).toFixed(0)}% available
                        </p>
                    </div>
                </CardContent>
            </Card>
            <Card className="glass-card relative overflow-hidden group border-red-500/20 hover:border-red-500/50 transition-colors duration-500">
                <div className="absolute inset-0 bg-gradient-to-br from-red-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                <CardContent className="pt-6 relative z-10">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-red-500/10">
                            <TriangleAlert className="size-5 text-red-500" />
                        </div>
                        <p className="text-sm font-medium text-muted-foreground">Offline</p>
                    </div>
                    <div className="flex items-baseline gap-2">
                        <p className="text-3xl font-bold text-red-600">{stats.offline}</p>
                        <p className="text-xs text-red-600/70">Needs attention</p>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
