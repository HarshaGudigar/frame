import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, RefreshCcw, CheckCircle2, AlertCircle, Hammer, Brush } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';

interface Room {
    _id: string;
    number: string;
    type: string;
    status: 'Available' | 'Occupied' | 'Dirty' | 'Maintenance';
    floor: number;
}

const statusConfig = {
    Available: { color: 'bg-green-100 text-green-800 border-green-200', icon: CheckCircle2 },
    Occupied: { color: 'bg-blue-100 text-blue-800 border-blue-200', icon: AlertCircle },
    Dirty: { color: 'bg-red-100 text-red-800 border-red-200', icon: Brush },
    Maintenance: { color: 'bg-yellow-100 text-yellow-800 border-yellow-200', icon: Hammer },
};

export default function Housekeeping({ hotelTenant: propTenant }: { hotelTenant?: string }) {
    const { api, user } = useAuth();
    const { toast } = useToast();
    const [rooms, setRooms] = useState<Room[]>([]);
    const [loading, setLoading] = useState(true);
    const [updatingId, setUpdatingId] = useState<string | null>(null);
    const [hotelTenant, setHotelTenant] = useState<string | undefined>(propTenant);

    useEffect(() => {
        const findTenant = async () => {
            if (hotelTenant) return;
            // 1. Try to find in user object
            const userTenant = user?.tenants?.find((t: any) =>
                t.tenant?.subscribedModules?.includes('hotel'),
            )?.tenant?.slug;

            if (userTenant) {
                setHotelTenant(userTenant);
                return;
            }

            // 2. If owner, fetch from admin API
            if (user?.role === 'owner') {
                try {
                    const res = await api.get('/admin/tenants');
                    const hotelTenants = res.data.data.filter((t: any) =>
                        t.subscribedModules?.includes('hotel'),
                    );
                    if (hotelTenants.length > 0) {
                        setHotelTenant(hotelTenants[0].slug);
                    }
                } catch (err) {
                    console.error('Failed to fetch fallback hotel tenant', err);
                }
            }
        };
        findTenant();
    }, [api, user, hotelTenant]);

    const fetchRooms = async () => {
        if (!hotelTenant) {
            // Only stop loading if we've tried finding the tenant
            if (user) setLoading(false);
            return;
        }
        setLoading(true);
        try {
            const res = await api.get('/m/hotel/rooms', {
                headers: { 'x-tenant-id': hotelTenant },
            });
            if (res.data.success) setRooms(res.data.data);
        } catch (error) {
            console.error('Failed to fetch rooms', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (hotelTenant) {
            fetchRooms();
        }
    }, [api, hotelTenant]);

    const handleStatusUpdate = async (roomId: string, newStatus: string) => {
        setUpdatingId(roomId);
        try {
            const res = await api.patch(
                `/m/hotel/rooms/${roomId}/status`,
                { status: newStatus },
                {
                    headers: { 'x-tenant-id': hotelTenant },
                },
            );

            if (res.data.success) {
                toast({ title: 'Success', description: 'Room status updated' });
                setRooms(rooms.map((r) => (r._id === roomId ? res.data.data : r)));
            }
        } catch (error: any) {
            toast({
                variant: 'destructive',
                title: 'Error',
                description: error.response?.data?.message || 'Update failed',
            });
        } finally {
            setUpdatingId(null);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-20">
                <Loader2 className="h-8 w-8 animate-spin" />
            </div>
        );
    }

    const stats = {
        total: rooms.length,
        dirty: rooms.filter((r) => r.status === 'Dirty').length,
        available: rooms.filter((r) => r.status === 'Available').length,
        maintenance: rooms.filter((r) => r.status === 'Maintenance').length,
    };

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card className="bg-muted/50">
                    <CardHeader className="pb-2">
                        <CardDescription>Total Rooms</CardDescription>
                        <CardTitle className="text-2xl">{stats.total}</CardTitle>
                    </CardHeader>
                </Card>
                <Card className="bg-red-50 border-red-100">
                    <CardHeader className="pb-2">
                        <CardDescription className="text-red-600">Needs Cleaning</CardDescription>
                        <CardTitle className="text-2xl text-red-700">{stats.dirty}</CardTitle>
                    </CardHeader>
                </Card>
                <Card className="bg-green-50 border-green-100">
                    <CardHeader className="pb-2">
                        <CardDescription className="text-green-600">Available</CardDescription>
                        <CardTitle className="text-2xl text-green-700">{stats.available}</CardTitle>
                    </CardHeader>
                </Card>
                <Card className="bg-yellow-50 border-yellow-100">
                    <CardHeader className="pb-2">
                        <CardDescription className="text-yellow-600">Maintenance</CardDescription>
                        <CardTitle className="text-2xl text-yellow-700">
                            {stats.maintenance}
                        </CardTitle>
                    </CardHeader>
                </Card>
            </div>

            <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold">Room Status Overview</h2>
                <Button variant="outline" size="sm" onClick={fetchRooms}>
                    <RefreshCcw className="h-4 w-4 mr-2" /> Refresh
                </Button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {rooms.map((room) => {
                    const Config = statusConfig[room.status];
                    const StatusIcon = Config.icon;
                    return (
                        <Card key={room._id} className="overflow-hidden">
                            <CardHeader className={`pb-4 ${Config.color} border-b`}>
                                <div className="flex justify-between items-center">
                                    <span className="font-bold text-lg">Room {room.number}</span>
                                    <Badge variant="outline" className="bg-white/50">
                                        Floor {room.floor}
                                    </Badge>
                                </div>
                                <div className="flex items-center gap-2 mt-2">
                                    <StatusIcon className="h-4 w-4" />
                                    <span className="text-sm font-semibold">{room.status}</span>
                                </div>
                            </CardHeader>
                            <CardContent className="pt-4">
                                <p className="text-xs text-muted-foreground mb-4">{room.type}</p>
                                <div className="grid grid-cols-2 gap-2">
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        className="text-[10px] h-8 px-1"
                                        disabled={
                                            room.status === 'Dirty' || updatingId === room._id
                                        }
                                        onClick={() => handleStatusUpdate(room._id, 'Dirty')}
                                    >
                                        <Brush className="h-3 w-3 mr-1" /> Mark Dirty
                                    </Button>
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        className="text-[10px] h-8 px-1"
                                        disabled={
                                            room.status === 'Available' || updatingId === room._id
                                        }
                                        onClick={() => handleStatusUpdate(room._id, 'Available')}
                                    >
                                        <CheckCircle2 className="h-3 w-3 mr-1" /> Mark Ready
                                    </Button>
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        className="text-[10px] h-8 px-1"
                                        disabled={
                                            room.status === 'Maintenance' || updatingId === room._id
                                        }
                                        onClick={() => handleStatusUpdate(room._id, 'Maintenance')}
                                    >
                                        <Hammer className="h-3 w-3 mr-1" /> Maintenance
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    );
                })}
            </div>
        </div>
    );
}
