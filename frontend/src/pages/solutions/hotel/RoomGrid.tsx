import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { Loader2, Plus, Pencil, Trash2, CheckCircle, Square, CheckSquare, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogFooter,
    DialogDescription,
} from '@/components/ui/dialog';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { getRoomStatusStyle, roomBorderColors } from '@/lib/module-styles';
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetDescription,
} from '@/components/ui/sheet';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Brush, Clock, User, Calendar, Layers } from 'lucide-react';

interface Room {
    _id: string;
    number: string;
    type: string;
    status: string;
    pricePerNight: number;
    floor: number;
}

interface Booking {
    _id: string;
    customer: { firstName: string; lastName: string; phone: string };
    room: { _id: string; number: string };
    checkInDate: string;
    checkOutDate: string;
    status: string;
}

interface RoomTypeOption {
    label: string;
    value: string;
    isActive: boolean;
}

const fallbackTypes = ['Single', 'Double', 'Suite', 'Deluxe'];

export function RoomGrid({ bookings = [] }: { bookings?: Booking[] }) {
    const { api } = useAuth();
    const { toast } = useToast();
    const [rooms, setRooms] = useState<Room[]>([]);
    const [roomTypes, setRoomTypes] = useState<string[]>(fallbackTypes);
    const [loading, setLoading] = useState(true);
    const [open, setOpen] = useState(false);
    const [editingRoom, setEditingRoom] = useState<Room | null>(null);
    const [formData, setFormData] = useState({
        number: '',
        type: 'Single',
        pricePerNight: 100,
        floor: 1,
    });
    const [submitting, setSubmitting] = useState(false);
    const [isSelectMode, setIsSelectMode] = useState(false);
    const [selectedRooms, setSelectedRooms] = useState<Set<string>>(new Set());
    const [peekRoom, setPeekRoom] = useState<Room | null>(null);

    const fetchRooms = async () => {
        setLoading(true);
        try {
            const res = await api.get('/m/hotel/rooms');
            if (res.data.success) setRooms(res.data.data);
        } catch (error) {
            console.error('Failed to fetch rooms', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchRoomTypes = async () => {
        try {
            const res = await api.get('/m/hotel/settings/roomType');
            if (res.data.success && res.data.data?.options) {
                const activeTypes = res.data.data.options
                    .filter((o: RoomTypeOption) => o.isActive)
                    .map((o: RoomTypeOption) => o.value);
                if (activeTypes.length > 0) setRoomTypes(activeTypes);
            }
        } catch {
            // Fallback to defaults
        }
    };

    useEffect(() => {
        fetchRooms();
        fetchRoomTypes();
    }, [api]);

    const handleOpenCreate = () => {
        setEditingRoom(null);
        setFormData({ number: '', type: roomTypes[0] || 'Single', pricePerNight: 100, floor: 1 });
        setOpen(true);
    };

    const handleOpenEdit = (room: Room) => {
        setEditingRoom(room);
        setFormData({
            number: room.number,
            type: room.type,
            pricePerNight: room.pricePerNight,
            floor: room.floor,
        });
        setOpen(true);
    };

    const handleSubmit = async () => {
        setSubmitting(true);
        try {
            const isEdit = !!editingRoom;
            const url = isEdit ? `/m/hotel/rooms/${editingRoom._id}` : '/m/hotel/rooms';
            const res = await api({
                method: isEdit ? 'patch' : 'post',
                url,
                data: formData,
            });

            if (res.data.success) {
                toast({ title: 'Success', description: res.data.message });
                setOpen(false);
                fetchRooms();
            } else {
                const msg = res.data.errors
                    ? res.data.errors.map((e: any) => e.message).join(', ')
                    : res.data.message;
                toast({ variant: 'destructive', title: 'Error', description: msg });
            }
        } catch (error: any) {
            const errorData = error.response?.data;
            const msg = errorData?.errors
                ? errorData.errors.map((e: any) => e.message).join(', ')
                : errorData?.message || 'Failed to save room';
            toast({ variant: 'destructive', title: 'Error', description: msg });
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = async (room: Room) => {
        if (!confirm(`Delete room ${room.number}?`)) return;
        try {
            const res = await api.delete(`/m/hotel/rooms/${room._id}`);
            if (res.data.success) {
                toast({ title: 'Success', description: res.data.message });
                fetchRooms();
            } else {
                toast({
                    variant: 'destructive',
                    title: 'Error',
                    description: res.data.message || 'Failed to delete room.',
                });
            }
        } catch (error: any) {
            toast({
                variant: 'destructive',
                title: 'Error',
                description: error.response?.data?.message || 'Failed to delete room',
            });
        }
    };

    const handleStatusChange = async (room: Room, status: string) => {
        try {
            const res = await api.patch(`/m/hotel/rooms/${room._id}`, { status });
            if (res.data.success) {
                toast({ title: 'Success', description: `Room ${room.number} marked as ${status}` });
                fetchRooms();
            } else {
                toast({
                    variant: 'destructive',
                    title: 'Error',
                    description: res.data.message || 'Failed to update status.',
                });
            }
        } catch (error: any) {
            toast({
                variant: 'destructive',
                title: 'Error',
                description: error.response?.data?.message || 'Failed to update room',
            });
        }
    };

    const handleBulkStatusChange = async (status: string) => {
        if (selectedRooms.size === 0) return;
        try {
            setSubmitting(true);
            const promises = Array.from(selectedRooms).map((id) =>
                api.patch(`/m/hotel/rooms/${id}`, { status }),
            );
            await Promise.all(promises);
            toast({
                title: 'Success',
                description: `Updated ${selectedRooms.size} rooms to ${status}`,
            });
            setSelectedRooms(new Set());
            setIsSelectMode(false);
            fetchRooms();
        } catch (error: any) {
            toast({
                variant: 'destructive',
                title: 'Error',
                description: 'Failed to update some rooms',
            });
        } finally {
            setSubmitting(false);
        }
    };

    const toggleRoomSelection = (roomId: string) => {
        const next = new Set(selectedRooms);
        if (next.has(roomId)) next.delete(roomId);
        else next.add(roomId);
        setSelectedRooms(next);
    };

    // Status colors are sourced from shared module-styles (getRoomStatusStyle)

    // Simplified loading check handled by skeletons below

    if (loading && rooms.length === 0) {
        return (
            <div className="space-y-8">
                {[1, 2].map((floor) => (
                    <div key={floor} className="space-y-3">
                        <Skeleton className="h-6 w-24" />
                        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                            {[1, 2, 3, 4, 5, 6].map((i) => (
                                <Skeleton key={i} className="h-36 rounded-xl" />
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        );
    }

    return (
        <div className="space-y-4 animate-in fade-in duration-500">
            <Sheet open={!!peekRoom} onOpenChange={(open) => !open && setPeekRoom(null)}>
                <SheetContent className="sm:max-w-md">
                    <SheetHeader>
                        <SheetTitle className="text-2xl font-bold flex items-center justify-between">
                            Room {peekRoom?.number}
                            <Badge className={peekRoom ? getRoomStatusStyle(peekRoom.status) : ''}>
                                {peekRoom?.status}
                            </Badge>
                        </SheetTitle>
                        <SheetDescription>
                            {peekRoom?.type} - Floor {peekRoom?.floor}
                        </SheetDescription>
                    </SheetHeader>

                    <div className="p-6 space-y-6">
                        {/* Current Guest Selection */}
                        {peekRoom?.status === 'Occupied' &&
                            (() => {
                                const activeBooking = bookings.find(
                                    (b) =>
                                        b.room?._id === peekRoom?._id && b.status === 'CheckedIn',
                                );
                                if (!activeBooking) return null;
                                return (
                                    <Card className="bg-primary/5 border-primary/20">
                                        <div className="p-4 space-y-3">
                                            <div className="flex items-center gap-2 text-primary font-bold text-sm uppercase tracking-wider">
                                                <User className="h-4 w-4" /> Current Guest
                                            </div>
                                            <div>
                                                <p className="text-lg font-bold">
                                                    {activeBooking.customer.firstName}{' '}
                                                    {activeBooking.customer.lastName}
                                                </p>
                                                <p className="text-sm text-muted-foreground">
                                                    {activeBooking.customer.phone}
                                                </p>
                                            </div>
                                            <div className="grid grid-cols-2 gap-4 pt-2">
                                                <div>
                                                    <p className="text-[10px] uppercase text-muted-foreground font-bold">
                                                        Check In
                                                    </p>
                                                    <p className="text-xs font-medium">
                                                        {new Date(
                                                            activeBooking.checkInDate,
                                                        ).toLocaleDateString()}
                                                    </p>
                                                </div>
                                                <div>
                                                    <p className="text-[10px] uppercase text-muted-foreground font-bold">
                                                        Check Out
                                                    </p>
                                                    <p className="text-xs font-medium">
                                                        {new Date(
                                                            activeBooking.checkOutDate,
                                                        ).toLocaleDateString()}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    </Card>
                                );
                            })()}

                        <Separator />

                        <div className="space-y-4">
                            <h4 className="text-sm font-bold flex items-center gap-2">
                                <Clock className="h-4 w-4 text-muted-foreground" /> Upcoming
                                Bookings
                            </h4>
                            {(() => {
                                const upcoming = bookings
                                    .filter(
                                        (b) =>
                                            b.room?._id === peekRoom?._id &&
                                            b.status === 'Confirmed',
                                    )
                                    .slice(0, 3);
                                if (upcoming.length === 0)
                                    return (
                                        <p className="text-xs text-muted-foreground italic">
                                            No upcoming bookings
                                        </p>
                                    );
                                return upcoming.map((b) => (
                                    <div
                                        key={b._id}
                                        className="flex items-center justify-between p-3 rounded-lg border bg-muted/30 text-xs"
                                    >
                                        <div>
                                            <span className="font-bold">
                                                {b.customer.firstName} {b.customer.lastName}
                                            </span>
                                            <p className="text-muted-foreground opacity-70">
                                                {new Date(b.checkInDate).toLocaleDateString()} -{' '}
                                                {new Date(b.checkOutDate).toLocaleDateString()}
                                            </p>
                                        </div>
                                        <Badge variant="outline" className="text-[10px]">
                                            {b.status}
                                        </Badge>
                                    </div>
                                ));
                            })()}
                        </div>

                        <Separator />

                        <div className="space-y-3">
                            <h4 className="text-sm font-bold flex items-center gap-2">
                                <Zap className="h-4 w-4 text-muted-foreground" /> Quick Actions
                            </h4>
                            <div className="grid grid-cols-2 gap-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleOpenEdit(peekRoom!)}
                                >
                                    <Pencil className="h-3 w-3 mr-2" /> Edit Room
                                </Button>
                                {peekRoom?.status === 'Dirty' && (
                                    <Button
                                        variant="default"
                                        size="sm"
                                        onClick={() => handleStatusChange(peekRoom!, 'Available')}
                                    >
                                        <Brush className="h-3 w-3 mr-2" /> Mark Clean
                                    </Button>
                                )}
                                {peekRoom?.status === 'Available' && (
                                    <Button
                                        variant="secondary"
                                        size="sm"
                                        onClick={() => handleStatusChange(peekRoom!, 'Maintenance')}
                                    >
                                        Mark Maint.
                                    </Button>
                                )}
                            </div>
                        </div>
                    </div>
                </SheetContent>
            </Sheet>

            <div className="flex justify-between items-center">
                <div className="flex items-center gap-4">
                    <h2 className="text-xl font-semibold">Rooms</h2>
                    <Button
                        variant={isSelectMode ? 'secondary' : 'ghost'}
                        size="sm"
                        onClick={() => {
                            setIsSelectMode(!isSelectMode);
                            setSelectedRooms(new Set());
                        }}
                    >
                        {isSelectMode ? 'Cancel Selection' : 'Bulk Actions'}
                    </Button>
                    {isSelectMode && selectedRooms.size > 0 && (
                        <div className="flex gap-2">
                            <Button
                                size="sm"
                                variant="outline"
                                className="text-green-600"
                                onClick={() => handleBulkStatusChange('Available')}
                            >
                                Mark Clean
                            </Button>
                            <Button
                                size="sm"
                                variant="outline"
                                className="text-yellow-600"
                                onClick={() => handleBulkStatusChange('Dirty')}
                            >
                                Mark Dirty
                            </Button>
                            <Button
                                size="sm"
                                variant="outline"
                                className="text-gray-600"
                                onClick={() => handleBulkStatusChange('Maintenance')}
                            >
                                Maintenance
                            </Button>
                        </div>
                    )}
                </div>
                <Dialog open={open} onOpenChange={setOpen}>
                    <DialogTrigger asChild>
                        <Button onClick={handleOpenCreate}>
                            <Plus className="h-4 w-4 mr-2" /> Add Room
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>
                                {editingRoom ? `Edit Room ${editingRoom.number}` : 'Add New Room'}
                            </DialogTitle>
                            <DialogDescription>
                                {editingRoom
                                    ? 'Update the details of this room.'
                                    : 'Fill in the details to create a new room.'}
                            </DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="number" className="text-right">
                                    Number
                                </Label>
                                <Input
                                    id="number"
                                    value={formData.number}
                                    onChange={(e) =>
                                        setFormData({ ...formData, number: e.target.value })
                                    }
                                    className="col-span-3"
                                />
                            </div>
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="type" className="text-right">
                                    Type
                                </Label>
                                <Select
                                    value={formData.type}
                                    onValueChange={(val) => setFormData({ ...formData, type: val })}
                                >
                                    <SelectTrigger id="type" className="col-span-3">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {roomTypes.map((t) => (
                                            <SelectItem key={t} value={t}>
                                                {t}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="price" className="text-right">
                                    Price
                                </Label>
                                <Input
                                    id="price"
                                    type="number"
                                    value={formData.pricePerNight}
                                    onChange={(e) =>
                                        setFormData({
                                            ...formData,
                                            pricePerNight: parseInt(e.target.value) || 0,
                                        })
                                    }
                                    className="col-span-3"
                                />
                            </div>
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="floor" className="text-right">
                                    Floor
                                </Label>
                                <Input
                                    id="floor"
                                    type="number"
                                    value={formData.floor}
                                    onChange={(e) =>
                                        setFormData({
                                            ...formData,
                                            floor: parseInt(e.target.value) || 1,
                                        })
                                    }
                                    className="col-span-3"
                                />
                            </div>
                        </div>
                        <DialogFooter>
                            <Button onClick={handleSubmit} disabled={submitting}>
                                {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                                {editingRoom ? 'Update Room' : 'Save Room'}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>

            <div className="space-y-8">
                {(() => {
                    const roomsByFloor = rooms.reduce(
                        (acc, room) => {
                            const floor = room.floor || 1;
                            if (!acc[floor]) acc[floor] = [];
                            acc[floor].push(room);
                            return acc;
                        },
                        {} as Record<number, Room[]>,
                    );

                    const sortedFloors = Object.keys(roomsByFloor)
                        .map(Number)
                        .sort((a, b) => a - b);

                    if (rooms.length === 0)
                        return (
                            <div className="text-center py-10 text-muted-foreground border-2 border-dashed rounded-lg">
                                No rooms found. Create one to get started.
                            </div>
                        );

                    return sortedFloors.map((floor) => (
                        <div key={floor} className="space-y-3">
                            <div className="flex items-center gap-2">
                                <span className="bg-primary/10 text-primary text-xs font-bold px-2 py-0.5 rounded uppercase tracking-wider">
                                    Floor {floor}
                                </span>
                                <div className="h-px flex-1 bg-border/50" />
                            </div>
                            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                                {roomsByFloor[floor].map((room) => (
                                    <div
                                        key={room._id}
                                        onClick={() =>
                                            isSelectMode
                                                ? toggleRoomSelection(room._id)
                                                : setPeekRoom(room)
                                        }
                                        className={`p-4 rounded-xl border-2 ${getRoomStatusStyle(room.status)} flex flex-col justify-between h-36 hover:shadow-md transition-all group relative cursor-pointer ${selectedRooms.has(room._id) ? 'ring-2 ring-primary ring-offset-2' : ''}`}
                                    >
                                        {isSelectMode && (
                                            <div className="absolute top-2 right-2 z-10">
                                                {selectedRooms.has(room._id) ? (
                                                    <CheckSquare className="h-5 w-5 text-primary fill-background" />
                                                ) : (
                                                    <Square className="h-5 w-5 text-muted-foreground/50 fill-background" />
                                                )}
                                            </div>
                                        )}
                                        <div className="flex justify-between items-start">
                                            <div className="flex flex-col">
                                                <span className="text-2xl font-black tracking-tighter">
                                                    {room.number}
                                                </span>
                                                {(() => {
                                                    const activeBooking = bookings.find(
                                                        (b) =>
                                                            b.room?._id === room._id &&
                                                            b.status === 'CheckedIn',
                                                    );
                                                    if (
                                                        activeBooking &&
                                                        activeBooking.rooms &&
                                                        activeBooking.rooms.length > 1
                                                    ) {
                                                        return (
                                                            <div className="flex items-center gap-1 text-[8px] font-bold text-primary/70 uppercase">
                                                                <Layers className="h-2 w-2" /> Group
                                                            </div>
                                                        );
                                                    }
                                                    return null;
                                                })()}
                                            </div>
                                            <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 bg-muted/50 rounded border border-border">
                                                {room.type}
                                            </span>
                                        </div>
                                        <div>
                                            <div className="font-bold text-sm uppercase tracking-tight">
                                                {room.status}
                                            </div>
                                            <div className="text-[10px] opacity-80 font-medium">
                                                ₹{room.pricePerNight} / Night
                                            </div>
                                        </div>
                                        {!isSelectMode && (
                                            <div className="absolute top-1 right-1 hidden group-hover:flex gap-1">
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleOpenEdit(room);
                                                    }}
                                                    className="p-1.5 rounded-lg bg-white/90 hover:bg-white text-gray-700 shadow-sm border"
                                                >
                                                    <Pencil className="h-3 w-3" />
                                                </button>
                                                {room.status === 'Dirty' && (
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleStatusChange(room, 'Available');
                                                        }}
                                                        className="p-1.5 rounded-lg bg-green-500 hover:bg-green-600 text-white shadow-sm"
                                                        title="Mark as cleaned"
                                                    >
                                                        <Brush className="h-3 w-3" />
                                                    </button>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    ));
                })()}
            </div>
        </div>
    );
}
