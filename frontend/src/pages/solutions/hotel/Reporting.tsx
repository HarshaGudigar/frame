import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, TrendingUp, DollarSign, Bed, Percent, BarChart3, PieChart } from 'lucide-react';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Cell,
} from 'recharts';

interface Metrics {
    occupancyRate: number;
    occupiedRooms: number;
    totalRooms: number;
    totalRevenueToday: number;
    adr: number;
    revpar: number;
    totalRoomsSoldToday: number;
}

export function Reporting({ hotelTenant }: { hotelTenant?: string }) {
    const { api } = useAuth();
    const [metrics, setMetrics] = useState<Metrics | null>(null);
    const [loading, setLoading] = useState(true);

    const fetchReports = async () => {
        if (!hotelTenant) {
            setLoading(false);
            return;
        }
        try {
            const res = await api.get('/m/hotel/reports/summary', {
                headers: { 'x-tenant-id': hotelTenant },
            });
            if (res.data.success) {
                setMetrics(res.data.data.metrics);
            }
        } catch (error) {
            console.error('Failed to fetch reports', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchReports();
    }, [api, hotelTenant]);

    if (loading) {
        return (
            <div className="flex items-center justify-center py-20">
                <Loader2 className="h-8 w-8 animate-spin" />
            </div>
        );
    }

    if (!metrics) return <div>No data available.</div>;

    const chartData = [
        { name: 'Occupied', value: metrics.occupiedRooms, color: '#3b82f6' },
        { name: 'Available', value: metrics.totalRooms - metrics.occupiedRooms, color: '#10b981' },
    ];

    return (
        <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card className="bg-blue-50/50">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">Occupancy</CardTitle>
                        <Percent className="h-4 w-4 text-blue-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{metrics.occupancyRate}%</div>
                        <p className="text-xs text-muted-foreground">
                            {metrics.occupiedRooms} / {metrics.totalRooms} Rooms
                        </p>
                    </CardContent>
                </Card>
                <Card className="bg-green-50/50">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">Daily Revenue</CardTitle>
                        <DollarSign className="h-4 w-4 text-green-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            ₹{metrics.totalRevenueToday.toLocaleString()}
                        </div>
                        <p className="text-xs text-muted-foreground">
                            {metrics.totalRoomsSoldToday} Bookings Today
                        </p>
                    </CardContent>
                </Card>
                <Card className="bg-purple-50/50">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">ADR</CardTitle>
                        <TrendingUp className="h-4 w-4 text-purple-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">₹{metrics.adr.toFixed(2)}</div>
                        <p className="text-xs text-muted-foreground">Average Daily Rate</p>
                    </CardContent>
                </Card>
                <Card className="bg-orange-50/50">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">RevPAR</CardTitle>
                        <BarChart3 className="h-4 w-4 text-orange-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">₹{metrics.revpar.toFixed(2)}</div>
                        <p className="text-xs text-muted-foreground">Revenue Per Available Room</p>
                    </CardContent>
                </Card>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <PieChart className="h-4 w-4" /> Room Distribution
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={chartData}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                <XAxis dataKey="name" />
                                <YAxis />
                                <Tooltip cursor={{ fill: 'transparent' }} />
                                <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                                    {chartData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Percent className="h-4 w-4" /> Performance Summary
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex justify-between items-center p-2 rounded-lg bg-muted/30">
                            <span className="text-sm">Total Rooms Sold</span>
                            <span className="font-bold">{metrics.totalRoomsSoldToday}</span>
                        </div>
                        <div className="flex justify-between items-center p-2 rounded-lg bg-muted/30">
                            <span className="text-sm">Average Room Price</span>
                            <span className="font-bold">₹{metrics.adr.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between items-center p-2 rounded-lg bg-muted/30">
                            <span className="text-sm">Active Inventory Items</span>
                            <span className="text-xs text-muted-foreground italic">
                                Check Inventory Tab
                            </span>
                        </div>
                        <div className="pt-4 border-t">
                            <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">
                                Target vs Actual
                            </p>
                            <div className="mt-2 h-2 w-full bg-muted rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-primary transition-all duration-500"
                                    style={{ width: `${metrics.occupancyRate}%` }}
                                />
                            </div>
                            <p className="text-[10px] mt-1 text-right">
                                {metrics.occupancyRate}% Capacity Reached
                            </p>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
