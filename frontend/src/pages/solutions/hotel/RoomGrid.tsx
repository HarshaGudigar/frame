import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { Loader2, Plus, Pencil, Trash2 } from 'lucide-react';
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

interface Room {
    _id: string;
    number: string;
    type: string;
    status: string;
    pricePerNight: number;
    floor: number;
}

interface RoomTypeOption {
    label: string;
    value: string;
    isActive: boolean;
}

const fallbackTypes = ['Single', 'Double', 'Suite', 'Deluxe'];

export function RoomGrid({ hotelTenant }: { hotelTenant?: string }) {
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

    const fetchRooms = async () => {
        if (!hotelTenant) {
            setLoading(false);
            return;
        }
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

    const fetchRoomTypes = async () => {
        if (!hotelTenant) return;
        try {
            const res = await api.get('/m/hotel/settings/roomType', {
                headers: { 'x-tenant-id': hotelTenant },
            });
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
    }, [api, hotelTenant]);

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
        if (!hotelTenant) {
            toast({
                variant: 'destructive',
                title: 'No Tenant Context',
                description: 'Please ensure you are viewing a valid hotel tenant instance.',
            });
            return;
        }
        setSubmitting(true);
        try {
            const isEdit = !!editingRoom;
            const url = isEdit ? `/m/hotel/rooms/${editingRoom._id}` : '/m/hotel/rooms';
            const res = await api({
                method: isEdit ? 'patch' : 'post',
                url,
                data: formData,
                headers: { 'x-tenant-id': hotelTenant },
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
        if (!hotelTenant || !confirm(`Delete room ${room.number}?`)) return;
        try {
            const res = await api.delete(`/m/hotel/rooms/${room._id}`, {
                headers: { 'x-tenant-id': hotelTenant },
            });
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
        if (!hotelTenant) return;
        try {
            const res = await api.patch(
                `/m/hotel/rooms/${room._id}`,
                { status },
                { headers: { 'x-tenant-id': hotelTenant } },
            );
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

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'Available':
                return 'bg-green-100 border-green-300 text-green-800';
            case 'Occupied':
                return 'bg-red-100 border-red-300 text-red-800';
            case 'Dirty':
                return 'bg-yellow-100 border-yellow-300 text-yellow-800';
            case 'Maintenance':
                return 'bg-gray-100 border-gray-300 text-gray-800';
            default:
                return 'bg-gray-100 border-gray-300 text-gray-800';
        }
    };

    if (loading) return <Loader2 className="h-8 w-8 animate-spin" />;

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <h2 className="text-xl font-semibold">Rooms</h2>
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

            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {rooms.map((room) => (
                    <div
                        key={room._id}
                        className={`p-4 rounded-lg border-2 ${getStatusColor(room.status)} flex flex-col justify-between h-36 hover:shadow-md transition-shadow group relative`}
                    >
                        <div className="flex justify-between items-start">
                            <span className="text-2xl font-bold">{room.number}</span>
                            <span className="text-xs font-semibold px-2 py-0.5 bg-white/50 rounded-full">
                                {room.type}
                            </span>
                        </div>
                        <div>
                            <div className="font-semibold">{room.status}</div>
                            <div className="text-xs opacity-75">
                                Floor {room.floor} - {room.pricePerNight}
                            </div>
                        </div>
                        <div className="absolute top-1 right-1 hidden group-hover:flex gap-1">
                            <button
                                onClick={() => handleOpenEdit(room)}
                                className="p-1 rounded bg-white/80 hover:bg-white text-gray-600"
                            >
                                <Pencil className="h-3 w-3" />
                            </button>
                            {room.status === 'Dirty' && (
                                <button
                                    onClick={() => handleStatusChange(room, 'Available')}
                                    className="p-1 rounded bg-white/80 hover:bg-white text-green-600 text-xs font-medium"
                                    title="Mark as cleaned"
                                >
                                    Clean
                                </button>
                            )}
                            {room.status === 'Available' && (
                                <button
                                    onClick={() => handleStatusChange(room, 'Maintenance')}
                                    className="p-1 rounded bg-white/80 hover:bg-white text-gray-600 text-xs font-medium"
                                    title="Set to maintenance"
                                >
                                    Maint.
                                </button>
                            )}
                            {room.status === 'Maintenance' && (
                                <button
                                    onClick={() => handleStatusChange(room, 'Available')}
                                    className="p-1 rounded bg-white/80 hover:bg-white text-green-600 text-xs font-medium"
                                    title="Mark available"
                                >
                                    Ready
                                </button>
                            )}
                        </div>
                    </div>
                ))}
                {rooms.length === 0 && (
                    <div className="col-span-full text-center py-10 text-muted-foreground border-2 border-dashed rounded-lg">
                        {!hotelTenant ? (
                            <div className="space-y-2">
                                <p className="font-semibold text-foreground">No Tenant Selected</p>
                                <p className="text-sm">
                                    You are viewing the hotel module in global context. Please
                                    select or be assigned to a hotel tenant.
                                </p>
                            </div>
                        ) : (
                            'No rooms found. Create one to get started.'
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
