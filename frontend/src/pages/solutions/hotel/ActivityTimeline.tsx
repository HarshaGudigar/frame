import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LogIn, LogOut, Brush, AlertTriangle, CheckCircle2, Clock } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export interface Activity {
    id: string;
    type: 'check-in' | 'check-out' | 'cleaning' | 'inventory';
    title: string;
    description: string;
    time: string;
    status: 'pending' | 'completed' | 'urgent';
}

export function ActivityTimeline({ activities }: { activities: Activity[] }) {
    const getIcon = (type: Activity['type']) => {
        switch (type) {
            case 'check-in':
                return <LogIn className="h-4 w-4 text-blue-500" />;
            case 'check-out':
                return <LogOut className="h-4 w-4 text-orange-500" />;
            case 'cleaning':
                return <Brush className="h-4 w-4 text-purple-500" />;
            case 'inventory':
                return <AlertTriangle className="h-4 w-4 text-red-500" />;
            default:
                return <Clock className="h-4 w-4 text-gray-500" />;
        }
    };

    return (
        <Card className="border-primary/20">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-base font-semibold">Activity Feed</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
                <div className="space-y-4">
                    {activities.length === 0 ? (
                        <p className="text-sm text-muted-foreground py-4 text-center">
                            No recent activity
                        </p>
                    ) : (
                        activities.map((activity, idx) => (
                            <div key={activity.id} className="relative pl-6 pb-4 last:pb-0">
                                {idx !== activities.length - 1 && (
                                    <div className="absolute left-[7px] top-6 bottom-0 w-px bg-border" />
                                )}
                                <div className="absolute left-0 top-1 p-1 bg-muted/30 rounded-full border border-border/50">
                                    {getIcon(activity.type)}
                                </div>
                                <div className="space-y-1">
                                    <div className="flex items-center justify-between">
                                        <p className="text-sm font-medium leading-none">
                                            {activity.title}
                                        </p>
                                        <span className="text-[10px] text-muted-foreground">
                                            {activity.time}
                                        </span>
                                    </div>
                                    <p className="text-xs text-muted-foreground">
                                        {activity.description}
                                    </p>
                                    {activity.status === 'urgent' && (
                                        <Badge
                                            variant="destructive"
                                            className="text-[10px] px-1 py-0 h-4"
                                        >
                                            Urgent
                                        </Badge>
                                    )}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </CardContent>
        </Card>
    );
}
