import { useEffect, useState, useRef } from 'react';
import { XAxis, YAxis, CartesianGrid, Tooltip, AreaChart, Area } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface MetricsChartProps {
    data: any[];
    title: string;
    dataKey: string;
    color: string;
    unit?: string;
}

export function MetricsChart({ data, title, dataKey, color, unit = '%' }: MetricsChartProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const [dimensions, setDimensions] = useState<{ width: number; height: number } | null>(null);

    useEffect(() => {
        if (!containerRef.current) return;

        const updateDimensions = () => {
            if (containerRef.current) {
                const { width, height } = containerRef.current.getBoundingClientRect();
                if (width > 0 && height > 0) {
                    setDimensions({ width, height });
                }
            }
        };

        const resizeObserver = new ResizeObserver((entries) => {
            for (const entry of entries) {
                const { width, height } = entry.contentRect;
                if (width > 0 && height > 0) {
                    setDimensions({ width, height });
                }
            }
        });

        resizeObserver.observe(containerRef.current);
        // Initial measurement
        updateDimensions();

        return () => resizeObserver.disconnect();
    }, []);

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
        <Card className="col-span-1 border-none shadow-none bg-transparent">
            <CardHeader className="pb-2 px-0">
                <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
            </CardHeader>
            <CardContent className="px-0">
                <div
                    ref={containerRef}
                    className="w-full relative h-[200px]"
                    style={{ minHeight: '200px' }}
                >
                    {dimensions && (
                        <AreaChart
                            width={dimensions.width}
                            height={dimensions.height}
                            data={chartData}
                            margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                        >
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
                                isAnimationActive={true}
                            />
                        </AreaChart>
                    )}
                    {!dimensions && (
                        <div className="w-full h-full flex items-center justify-center text-xs text-muted-foreground">
                            Loading chart...
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}
