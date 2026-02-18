import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar, UserCheck, UserMinus, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

export interface ScheduleItem {
    id: string;
    guestName: string;
    roomNumber: string;
    type: 'arrival' | 'departure';
    time: string;
}

export function TodaySchedule({
    arrivals,
    departures,
}: {
    arrivals: ScheduleItem[];
    departures: ScheduleItem[];
}) {
    return (
        <Card className="border-primary/20">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
                <CardTitle className="text-base font-semibold">Today's Schedule</CardTitle>
                <Calendar className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="space-y-3">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                        <UserCheck className="h-3 w-3 text-green-500" /> Arrivals ({arrivals.length}
                        )
                    </h4>
                    {arrivals.length === 0 ? (
                        <div className="py-4 text-center w-full border border-dashed border-border/50 rounded-lg bg-muted/5">
                            <p className="text-sm text-muted-foreground">No arrivals today</p>
                        </div>
                    ) : (
                        arrivals.slice(0, 3).map((item) => (
                            <div
                                key={item.id}
                                className="flex items-center justify-between p-2 rounded-lg bg-green-500/10 border border-green-500/20 italic"
                            >
                                <div>
                                    <p className="text-sm font-medium">{item.guestName}</p>
                                    <p className="text-[10px] text-muted-foreground">
                                        Room {item.roomNumber} - {item.time}
                                    </p>
                                </div>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 hover:bg-green-500/20"
                                >
                                    <ArrowRight className="h-4 w-4" />
                                </Button>
                            </div>
                        ))
                    )}
                </div>

                <div className="space-y-3">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                        <UserMinus className="h-3 w-3 text-orange-500" /> Departures (
                        {departures.length})
                    </h4>
                    {departures.length === 0 ? (
                        <div className="py-4 text-center w-full border border-dashed border-border/50 rounded-lg bg-muted/5">
                            <p className="text-sm text-muted-foreground">No departures today</p>
                        </div>
                    ) : (
                        departures.slice(0, 3).map((item) => (
                            <div
                                key={item.id}
                                className="flex items-center justify-between p-2 rounded-lg bg-orange-500/10 border border-orange-500/20 italic"
                            >
                                <div>
                                    <p className="text-sm font-medium">{item.guestName}</p>
                                    <p className="text-[10px] text-muted-foreground">
                                        Room {item.roomNumber} - {item.time}
                                    </p>
                                </div>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 hover:bg-orange-500/20"
                                >
                                    <ArrowRight className="h-4 w-4" />
                                </Button>
                            </div>
                        ))
                    )}
                </div>
            </CardContent>
        </Card>
    );
}
