import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Loader2, TrendingUp, DollarSign, Bed, Percent, BarChart3, PieChart } from 'lucide-react';
import {
    BarChart,
    Bar,
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Cell,
    Legend,
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

interface TrendData {
    date: string;
    revenue: number;
    occupancy: number;
}

export function Reporting({ hotelTenant }: { hotelTenant?: string }) {
    const { api } = useAuth();
    const [metrics, setMetrics] = useState<Metrics | null>(null);
    const [trends, setTrends] = useState<TrendData[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchData = async () => {
        if (!hotelTenant) {
            setLoading(false);
            return;
        }
        try {
            console.log('Fetching reports for tenant:', hotelTenant);
            const [metricsRes, trendsRes] = await Promise.allSettled([
                api.get('/m/hotel/reports/summary', { headers: { 'x-tenant-id': hotelTenant } }),
                api.get('/m/hotel/reports/trends', { headers: { 'x-tenant-id': hotelTenant } }),
            ]);

            if (metricsRes.status === 'fulfilled' && metricsRes.value.data.success) {
                setMetrics(metricsRes.value.data.data.metrics);
            } else if (metricsRes.status === 'rejected') {
                console.error('Summary fetch failed:', metricsRes.reason);
            }

            if (trendsRes.status === 'fulfilled' && trendsRes.value.data.success) {
                setTrends(trendsRes.value.data.data.trends);
            } else if (trendsRes.status === 'rejected') {
                console.error('Trends fetch failed:', trendsRes.reason);
            }
        } catch (error) {
            console.error('Unexpected error fetching reports', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [api, hotelTenant]);

    if (loading || !metrics) {
        return (
            <div className="space-y-6 animate-in fade-in duration-500">
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    {[1, 2, 3, 4].map((i) => (
                        <Skeleton key={i} className="h-24 rounded-xl" />
                    ))}
                </div>
                <div className="grid gap-6 lg:grid-cols-3">
                    <Skeleton className="lg:col-span-2 h-[400px] rounded-xl" />
                    <Skeleton className="h-[400px] rounded-xl" />
                </div>
            </div>
        );
    }

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

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                <Card className="lg:col-span-2">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <TrendingUp className="h-4 w-4 text-primary" /> Revenue & Occupancy
                            Trend (Last 7 Days)
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="h-[350px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={trends}>
                                <CartesianGrid
                                    strokeDasharray="3 3"
                                    vertical={false}
                                    opacity={0.3}
                                />
                                <XAxis
                                    dataKey="date"
                                    fontSize={10}
                                    axisLine={false}
                                    tickLine={false}
                                />
                                <YAxis
                                    yAxisId="left"
                                    fontSize={10}
                                    axisLine={false}
                                    tickLine={false}
                                />
                                <YAxis
                                    yAxisId="right"
                                    orientation="right"
                                    fontSize={10}
                                    axisLine={false}
                                    tickLine={false}
                                />
                                <Tooltip
                                    contentStyle={{
                                        borderRadius: '8px',
                                        border: 'none',
                                        boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                                    }}
                                />
                                <Legend
                                    verticalAlign="top"
                                    align="right"
                                    height={36}
                                    iconType="circle"
                                />
                                <Line
                                    yAxisId="left"
                                    type="monotone"
                                    dataKey="revenue"
                                    stroke="#3b82f6"
                                    strokeWidth={3}
                                    dot={{ r: 4, fill: '#3b82f6', strokeWidth: 2, stroke: '#fff' }}
                                    activeDot={{ r: 6 }}
                                    name="Revenue (₹)"
                                />
                                <Line
                                    yAxisId="right"
                                    type="monotone"
                                    dataKey="occupancy"
                                    stroke="#10b981"
                                    strokeWidth={3}
                                    dot={{ r: 4, fill: '#10b981', strokeWidth: 2, stroke: '#fff' }}
                                    activeDot={{ r: 6 }}
                                    name="Occupancy (%)"
                                />
                            </LineChart>
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
                        <div className="flex justify-between items-center p-3 rounded-xl bg-blue-50/30 border border-blue-100">
                            <span className="text-sm font-medium">Total Rooms Sold</span>
                            <span className="font-bold text-blue-700">
                                {metrics.totalRoomsSoldToday}
                            </span>
                        </div>
                        <div className="flex justify-between items-center p-3 rounded-xl bg-green-50/30 border border-green-100">
                            <span className="text-sm font-medium">Average Room Price</span>
                            <span className="font-bold text-green-700">
                                ₹{metrics.adr.toFixed(2)}
                            </span>
                        </div>
                        <div className="flex justify-between items-center p-3 rounded-xl bg-purple-50/30 border border-purple-100">
                            <span className="text-sm font-medium">RevPAR</span>
                            <span className="font-bold text-purple-700">
                                ₹{metrics.revpar.toFixed(2)}
                            </span>
                        </div>

                        <div className="pt-4 border-t space-y-3">
                            <div className="flex justify-between items-center">
                                <p className="text-[10px] text-muted-foreground uppercase font-black tracking-widest">
                                    Current Occupancy
                                </p>
                                <span className="text-xs font-bold">{metrics.occupancyRate}%</span>
                            </div>
                            <div className="h-3 w-full bg-muted rounded-full overflow-hidden border">
                                <div
                                    className="h-full bg-primary transition-all duration-1000 ease-out"
                                    style={{ width: `${metrics.occupancyRate}%` }}
                                />
                            </div>
                            <p className="text-[10px] text-muted-foreground italic text-center">
                                {metrics.occupiedRooms} / {metrics.totalRooms} Rooms Occupied
                            </p>
                        </div>
                    </CardContent>
                </Card>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-sm">
                            <BarChart3 className="h-4 w-4" /> Room Distribution
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="h-[250px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={chartData}>
                                <CartesianGrid
                                    strokeDasharray="3 3"
                                    vertical={false}
                                    opacity={0.3}
                                />
                                <XAxis
                                    dataKey="name"
                                    fontSize={10}
                                    axisLine={false}
                                    tickLine={false}
                                />
                                <YAxis fontSize={10} axisLine={false} tickLine={false} />
                                <Tooltip cursor={{ fill: 'transparent' }} />
                                <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                                    {chartData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-indigo-50/50 to-purple-50/50 border-indigo-100">
                    <CardHeader>
                        <CardTitle className="text-sm">Strategic Insights</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="bg-white/80 p-4 rounded-xl shadow-sm border border-indigo-100">
                            <h5 className="text-xs font-bold text-indigo-700 uppercase mb-1">
                                Recommendation
                            </h5>
                            <p className="text-sm">
                                {metrics.occupancyRate > 80
                                    ? 'High occupancy detected. Consider increasing rates for remaining rooms (Yield Management).'
                                    : "Occupancy is currently low. Consider a 'Last Minute' promotion or targeted agent outreach."}
                            </p>
                        </div>
                        <div className="flex gap-2">
                            <Button className="flex-1" variant="outline" size="sm">
                                Download PDF Report
                            </Button>
                            <Button className="flex-1" variant="outline" size="sm">
                                Export CSV
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
