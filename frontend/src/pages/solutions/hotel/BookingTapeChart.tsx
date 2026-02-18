import { useState, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface Booking {
    _id: string;
    customer: { firstName: string; lastName: string };
    room: { _id: string; number: string };
    checkInDate: string;
    checkOutDate: string;
    status: string;
}

interface Room {
    _id: string;
    number: string;
    type: string;
    floor: number;
}

export function BookingTapeChart({ bookings, rooms }: { bookings: Booking[]; rooms: Room[] }) {
    const [viewDate, setViewDate] = useState(new Date());
    const daysToShow = 14;

    const dateRange = useMemo(() => {
        const dates = [];
        for (let i = 0; i < daysToShow; i++) {
            const date = new Date(viewDate);
            date.setDate(date.getDate() + i);
            dates.push(date);
        }
        return dates;
    }, [viewDate]);

    const roomsByFloor = useMemo(() => {
        const grouped = rooms.reduce(
            (acc, room) => {
                const floor = room.floor || 1;
                if (!acc[floor]) acc[floor] = [];
                acc[floor].push(room);
                return acc;
            },
            {} as Record<number, Room[]>,
        );
        return Object.entries(grouped).sort(([a], [b]) => Number(a) - Number(b));
    }, [rooms]);

    const isBookingOnDate = (booking: Booking, date: Date, room: Room) => {
        if (booking.room?._id !== room._id) return false;
        const start = new Date(booking.checkInDate);
        const end = new Date(booking.checkOutDate);
        const current = new Date(date);
        current.setHours(0, 0, 0, 0);
        start.setHours(0, 0, 0, 0);
        end.setHours(0, 0, 0, 0);
        return current >= start && current < end;
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'Confirmed':
                return 'bg-blue-500';
            case 'CheckedIn':
                return 'bg-green-500';
            case 'CheckedOut':
                return 'bg-gray-400';
            default:
                return 'bg-blue-400';
        }
    };

    return (
        <Card className="overflow-hidden">
            <div className="p-4 border-b flex items-center justify-between bg-muted/30">
                <div className="flex items-center gap-2">
                    <Button
                        variant="outline"
                        size="icon"
                        onClick={() => {
                            const next = new Date(viewDate);
                            next.setDate(next.getDate() - 7);
                            setViewDate(next);
                        }}
                    >
                        <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <span className="text-sm font-semibold">
                        {dateRange[0].toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                        })}{' '}
                        -
                        {dateRange[daysToShow - 1].toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                        })}
                    </span>
                    <Button
                        variant="outline"
                        size="icon"
                        onClick={() => {
                            const next = new Date(viewDate);
                            next.setDate(next.getDate() + 7);
                            setViewDate(next);
                        }}
                    >
                        <ChevronRight className="h-4 w-4" />
                    </Button>
                </div>
                <div className="flex gap-4">
                    <div className="flex items-center gap-1.5">
                        <div className="w-3 h-3 rounded-full bg-blue-500" />
                        <span className="text-xs text-muted-foreground">Confirmed</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <div className="w-3 h-3 rounded-full bg-green-500" />
                        <span className="text-xs text-muted-foreground">Stay-over</span>
                    </div>
                </div>
            </div>
            <div className="overflow-x-auto">
                <div className="min-w-[1000px]">
                    {/* Header: Dates */}
                    <div className="flex border-b">
                        <div className="w-32 flex-shrink-0 p-2 border-r font-bold text-xs sticky left-0 bg-background z-20">
                            Room / Date
                        </div>
                        {dateRange.map((date, i) => (
                            <div
                                key={i}
                                className="flex-1 min-w-[60px] p-2 text-center border-r last:border-r-0 bg-muted/10"
                            >
                                <p className="text-[10px] font-bold uppercase text-muted-foreground">
                                    {date.toLocaleDateString('en-US', { weekday: 'short' })}
                                </p>
                                <p className="text-sm font-black">{date.getDate()}</p>
                            </div>
                        ))}
                    </div>

                    {/* Body: Rooms and Bookings */}
                    <div className="relative">
                        {roomsByFloor.map(([floor, floorRooms]) => (
                            <div key={floor}>
                                <div className="bg-primary/5 p-1 text-[10px] font-bold uppercase tracking-widest pl-32 border-b">
                                    Floor {floor}
                                </div>
                                {floorRooms.map((room) => (
                                    <div
                                        key={room._id}
                                        className="flex border-b hover:bg-muted/5 group"
                                    >
                                        <div className="w-32 flex-shrink-0 p-3 border-r text-sm font-bold sticky left-0 bg-background z-20 group-hover:bg-muted/10">
                                            {room.number}
                                            <p className="text-[10px] font-normal text-muted-foreground">
                                                {room.type}
                                            </p>
                                        </div>
                                        {dateRange.map((date, i) => {
                                            const booking = bookings.find((b) =>
                                                isBookingOnDate(b, date, room),
                                            );
                                            const isStart =
                                                booking &&
                                                new Date(booking.checkInDate).setHours(
                                                    0,
                                                    0,
                                                    0,
                                                    0,
                                                ) === date.setHours(0, 0, 0, 0);

                                            return (
                                                <div
                                                    key={i}
                                                    className="flex-1 min-w-[60px] border-r last:border-r-0 relative h-12"
                                                >
                                                    {booking && isStart && (
                                                        <div
                                                            className={`absolute top-2 left-1 bottom-2 z-10 rounded-md p-1 shadow-sm flex items-center overflow-hidden whitespace-nowrap ${getStatusColor(booking.status)}`}
                                                            style={{
                                                                width: `calc(${Math.max(1, (new Date(booking.checkOutDate).getTime() - new Date(booking.checkInDate).getTime()) / (1000 * 60 * 60 * 24))}00% - 8px)`,
                                                            }}
                                                        >
                                                            <span className="text-[10px] font-bold text-white pl-1 drop-shadow-sm">
                                                                {booking.customer.firstName}{' '}
                                                                {booking.customer.lastName}
                                                            </span>
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                ))}
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </Card>
    );
}
