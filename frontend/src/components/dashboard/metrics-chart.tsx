import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    AreaChart,
    Area,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface MetricsChartProps {
    data: any[];
    title: string;
    dataKey: string;
    color: string;
    unit?: string;
}

export function MetricsChart({ data, title, dataKey, color, unit = '%' }: MetricsChartProps) {
    // Format timestamp for XAxis
    const chartData = data.map((item) => ({
        ...item,
        displayTime: new Date(item.timestamp).toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
        }),
        value: item.metrics?.[dataKey] || 0,
    }));

    return (
        <Card className="col-span-1">
            <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">{title}</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="h-[200px] w-full min-w-0">
                    <ResponsiveContainer width="99%" height="100%" minWidth={0} debounce={100}>
                        <AreaChart data={chartData}>
                            <defs>
                                <linearGradient
                                    id={`gradient-${dataKey}`}
                                    x1="0"
                                    y1="0"
                                    x2="0"
                                    y2="1"
                                >
                                    <stop offset="5%" stopColor={color} stopOpacity={0.3} />
                                    <stop offset="95%" stopColor={color} stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid
                                strokeDasharray="3 3"
                                vertical={false}
                                stroke="hsl(var(--muted))"
                            />
                            <XAxis
                                dataKey="displayTime"
                                fontSize={10}
                                tickLine={false}
                                axisLine={false}
                                stroke="hsl(var(--muted-foreground))"
                            />
                            <YAxis
                                fontSize={10}
                                tickLine={false}
                                axisLine={false}
                                stroke="hsl(var(--muted-foreground))"
                                tickFormatter={(value) => `${value}${unit}`}
                            />
                            <Tooltip
                                contentStyle={{
                                    backgroundColor: 'hsl(var(--background))',
                                    borderColor: 'hsl(var(--border))',
                                    fontSize: '12px',
                                }}
                                itemStyle={{ color: color }}
                                labelStyle={{ color: 'hsl(var(--foreground))' }}
                            />
                            <Area
                                type="monotone"
                                dataKey="value"
                                stroke={color}
                                strokeWidth={2}
                                fillOpacity={1}
                                fill={`url(#gradient-${dataKey})`}
                                animationDuration={1000}
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </CardContent>
        </Card>
    );
}
