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
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';

interface Room {
    _id: string;
    number: string;
    type: string;
    status: 'Available' | 'Occupied' | 'Dirty' | 'Maintenance' | 'Cleaning';
    floor: number;
}

interface HousekeepingTask {
    _id: string;
    room: any;
    staffName?: string;
    status: 'Pending' | 'In Progress' | 'Completed' | 'Delayed';
    type: string;
    priority: string;
}

const statusConfig = {
    Available: { color: 'bg-green-100 text-green-800 border-green-200', icon: CheckCircle2 },
    Occupied: { color: 'bg-blue-100 text-blue-800 border-blue-200', icon: AlertCircle },
    Dirty: { color: 'bg-red-100 text-red-800 border-red-200', icon: Brush },
    Maintenance: { color: 'bg-yellow-100 text-yellow-800 border-yellow-200', icon: Hammer },
    Cleaning: { color: 'bg-sky-100 text-sky-800 border-sky-200', icon: RefreshCcw },
};

export default function Housekeeping({ hotelTenant: propTenant }: { hotelTenant?: string }) {
    const { api, user } = useAuth();
    const { toast } = useToast();
    const [rooms, setRooms] = useState<Room[]>([]);
    const [tasks, setTasks] = useState<HousekeepingTask[]>([]);
    const [loading, setLoading] = useState(true);
    const [updatingId, setUpdatingId] = useState<string | null>(null);
    const [hotelTenant, setHotelTenant] = useState<string | undefined>(propTenant);

    useEffect(() => {
        const findTenant = async () => {
            if (hotelTenant) return;
            const userTenant = user?.tenants?.find((t: any) =>
                t.tenant?.subscribedModules?.includes('hotel'),
            )?.tenant?.slug;

            if (userTenant) {
                setHotelTenant(userTenant);
                return;
            }

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

    const fetchData = async () => {
        if (!hotelTenant) {
            if (user) setLoading(false);
            return;
        }
        setLoading(true);
        try {
            const [roomsRes, tasksRes] = await Promise.all([
                api.get('/m/hotel/rooms', { headers: { 'x-tenant-id': hotelTenant } }),
                api.get('/m/hotel/housekeeping', { headers: { 'x-tenant-id': hotelTenant } }),
            ]);
            if (roomsRes.data.success) setRooms(roomsRes.data.data);
            if (tasksRes.data.success) setTasks(tasksRes.data.data);
        } catch (error) {
            console.error('Failed to fetch housekeeping data', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (hotelTenant) {
            fetchData();
        }
    }, [api, hotelTenant]);

    const handleRoomStatusUpdate = async (roomId: string, newStatus: string) => {
        setUpdatingId(roomId);
        try {
            const res = await api.patch(
                `/m/hotel/rooms/${roomId}/status`,
                { status: newStatus },
                { headers: { 'x-tenant-id': hotelTenant } },
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

    const handleTaskStatusUpdate = async (taskId: string, newStatus: string) => {
        try {
            const res = await api.patch(
                `/m/hotel/housekeeping/${taskId}/status`,
                { status: newStatus },
                { headers: { 'x-tenant-id': hotelTenant } },
            );
            if (res.data.success) {
                toast({ title: 'Success', description: 'Task status updated' });
                fetchData();
            }
        } catch (error: any) {
            toast({
                variant: 'destructive',
                title: 'Error',
                description: 'Failed to update task',
            });
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
        pendingTasks: tasks.filter((t) => t.status !== 'Completed').length,
    };

    return (
        <div className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card className="bg-muted/50">
                    <CardHeader className="pb-2">
                        <CardDescription>Total Rooms</CardDescription>
                        <CardTitle className="text-2xl">{stats.total}</CardTitle>
                    </CardHeader>
                </Card>
                <Card className="bg-red-50 border-red-100">
                    <CardHeader className="pb-2">
                        <CardDescription className="text-red-600">Dirty Rooms</CardDescription>
                        <CardTitle className="text-2xl text-red-700">{stats.dirty}</CardTitle>
                    </CardHeader>
                </Card>
                <Card className="bg-green-50 border-green-100">
                    <CardHeader className="pb-2">
                        <CardDescription className="text-green-600">Available</CardDescription>
                        <CardTitle className="text-2xl text-green-700">{stats.available}</CardTitle>
                    </CardHeader>
                </Card>
                <Card className="bg-blue-50 border-blue-100">
                    <CardHeader className="pb-2">
                        <CardDescription className="text-blue-600">Pending Tasks</CardDescription>
                        <CardTitle className="text-2xl text-blue-700">
                            {stats.pendingTasks}
                        </CardTitle>
                    </CardHeader>
                </Card>
            </div>

            <div className="space-y-4">
                <div className="flex justify-between items-center">
                    <h2 className="text-xl font-bold">Room Status Quick-Change</h2>
                    <Button variant="outline" size="sm" onClick={fetchData}>
                        <RefreshCcw className="h-4 w-4 mr-2" /> Refresh
                    </Button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {rooms.map((room) => {
                        const Config = (statusConfig as any)[room.status] || statusConfig.Available;
                        const StatusIcon = Config.icon;
                        return (
                            <Card
                                key={room._id}
                                className="overflow-hidden border-l-4"
                                style={{
                                    borderLeftColor:
                                        room.status === 'Dirty'
                                            ? '#ef4444'
                                            : room.status === 'Available'
                                              ? '#10b981'
                                              : '#f59e0b',
                                }}
                            >
                                <CardHeader className="pb-2">
                                    <div className="flex justify-between items-center">
                                        <span className="font-bold text-lg">
                                            Room {room.number}
                                        </span>
                                        <Badge variant="outline">F{room.floor}</Badge>
                                    </div>
                                    <div className="flex items-center gap-1 text-xs font-medium uppercase tracking-wider text-muted-foreground mt-1">
                                        <StatusIcon className="h-3 w-3" />
                                        {room.status}
                                    </div>
                                </CardHeader>
                                <CardFooter className="pt-2 gap-1 flex-wrap">
                                    <Button
                                        size="sm"
                                        variant="ghost"
                                        className="h-7 px-2 text-[10px]"
                                        disabled={
                                            room.status === 'Dirty' || updatingId === room._id
                                        }
                                        onClick={() => handleRoomStatusUpdate(room._id, 'Dirty')}
                                    >
                                        Dirty
                                    </Button>
                                    <Button
                                        size="sm"
                                        variant="ghost"
                                        className="h-7 px-2 text-[10px]"
                                        disabled={
                                            room.status === 'Available' || updatingId === room._id
                                        }
                                        onClick={() =>
                                            handleRoomStatusUpdate(room._id, 'Available')
                                        }
                                    >
                                        Ready
                                    </Button>
                                    <Button
                                        size="sm"
                                        variant="ghost"
                                        className="h-7 px-2 text-[10px]"
                                        disabled={
                                            room.status === 'Maintenance' || updatingId === room._id
                                        }
                                        onClick={() =>
                                            handleRoomStatusUpdate(room._id, 'Maintenance')
                                        }
                                    >
                                        Maint.
                                    </Button>
                                </CardFooter>
                            </Card>
                        );
                    })}
                </div>
            </div>

            <div className="space-y-4">
                <h2 className="text-xl font-bold">Cleaning Assignments & Tasks</h2>
                <div className="rounded-md border">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Room</TableHead>
                                <TableHead>Type</TableHead>
                                <TableHead>Staff</TableHead>
                                <TableHead>Priority</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {tasks.filter((t) => t.status !== 'Completed').length === 0 ? (
                                <TableRow>
                                    <TableCell
                                        colSpan={6}
                                        className="text-center py-6 text-muted-foreground"
                                    >
                                        No pending assignments.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                tasks
                                    .filter((t) => t.status !== 'Completed')
                                    .map((task) => (
                                        <TableRow key={task._id}>
                                            <TableCell className="font-bold">
                                                Room {task.room?.number || 'N/A'}
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant="outline">{task.type}</Badge>
                                            </TableCell>
                                            <TableCell>{task.staffName || 'Unassigned'}</TableCell>
                                            <TableCell>
                                                <Badge
                                                    variant={
                                                        task.priority === 'High' ||
                                                        task.priority === 'Emergency'
                                                            ? 'destructive'
                                                            : 'secondary'
                                                    }
                                                >
                                                    {task.priority}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant="outline" className="animate-pulse">
                                                    {task.status}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex justify-end gap-2">
                                                    {task.status === 'Pending' && (
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            onClick={() =>
                                                                handleTaskStatusUpdate(
                                                                    task._id,
                                                                    'In Progress',
                                                                )
                                                            }
                                                        >
                                                            Start
                                                        </Button>
                                                    )}
                                                    {task.status === 'In Progress' && (
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            className="bg-green-50 text-green-700 hover:bg-green-100"
                                                            onClick={() =>
                                                                handleTaskStatusUpdate(
                                                                    task._id,
                                                                    'Completed',
                                                                )
                                                            }
                                                        >
                                                            Complete
                                                        </Button>
                                                    )}
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))
                            )}
                        </TableBody>
                    </Table>
                </div>
            </div>
        </div>
    );
}
