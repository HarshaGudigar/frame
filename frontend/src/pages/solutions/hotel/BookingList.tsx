import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogFooter,
} from '@/components/ui/dialog';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Loader2, Plus, MoreHorizontal, LogIn, LogOut, XCircle, UserMinus } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Customer {
    _id: string;
    firstName: string;
    lastName: string;
    email?: string;
    phone: string;
}

interface Room {
    _id: string;
    number: string;
    type: string;
    status: string;
    pricePerNight: number;
}

interface Agent {
    _id: string;
    firstName: string;
    lastName: string;
    agentCode: string;
}

interface Booking {
    _id: string;
    customer: Customer;
    room: Room;
    agent?: Agent;
    checkInDate: string;
    checkOutDate: string;
    numberOfDays: number;
    roomRent: number;
    status: string;
    totalAmount: number;
    paymentStatus: string;
    checkInNumber: string;
    checkInType: string;
    serviceType: string;
    maleCount: number;
    femaleCount: number;
    childCount: number;
    advanceAmount: number;
    createdAt: string;
}

const statusColors: Record<string, string> = {
    Confirmed: 'bg-blue-100 text-blue-800 border-blue-200',
    CheckedIn: 'bg-green-100 text-green-800 border-green-200',
    CheckedOut: 'bg-gray-100 text-gray-800 border-gray-200',
    Cancelled: 'bg-red-100 text-red-800 border-red-200',
    NoShow: 'bg-yellow-100 text-yellow-800 border-yellow-200',
};

const paymentColors: Record<string, string> = {
    Pending: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    Partial: 'bg-orange-100 text-orange-800 border-orange-200',
    Paid: 'bg-green-100 text-green-800 border-green-200',
};

export function BookingList({ hotelTenant }: { hotelTenant?: string }) {
    const { api } = useAuth();
    const { toast } = useToast();
    const [bookings, setBookings] = useState<Booking[]>([]);
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [rooms, setRooms] = useState<Room[]>([]);
    const [agents, setAgents] = useState<Agent[]>([]);
    const [loading, setLoading] = useState(true);
    const [open, setOpen] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    const [formData, setFormData] = useState({
        customerId: '',
        roomId: '',
        checkInDate: '',
        numberOfDays: 1,
        serviceType: '24 Hours',
        checkInType: 'Walk In',
        maleCount: 0,
        femaleCount: 0,
        childCount: 0,
        agentId: '',
        purposeOfVisit: '',
        advanceAmount: 0,
    });

    const fetchAll = async () => {
        if (!hotelTenant) {
            setLoading(false);
            return;
        }
        try {
            const [bookingsRes, customersRes, roomsRes, agentsRes] = await Promise.all([
                api.get('/m/hotel/bookings', { headers: { 'x-tenant-id': hotelTenant } }),
                api.get('/m/hotel/customers', { headers: { 'x-tenant-id': hotelTenant } }),
                api.get('/m/hotel/rooms', { headers: { 'x-tenant-id': hotelTenant } }),
                api.get('/m/hotel/agents', { headers: { 'x-tenant-id': hotelTenant } }),
            ]);

            if (bookingsRes.data.success) setBookings(bookingsRes.data.data);
            if (customersRes.data.success) setCustomers(customersRes.data.data);
            if (roomsRes.data.success) setRooms(roomsRes.data.data);
            if (agentsRes.data.success) setAgents(agentsRes.data.data);
        } catch (error) {
            console.error('Failed to fetch data', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAll();
    }, [api, hotelTenant]);

    const getEstimatedTotal = () => {
        const room = rooms.find((r) => r._id === formData.roomId);
        if (room && formData.numberOfDays > 0) {
            return room.pricePerNight * formData.numberOfDays;
        }
        return 0;
    };

    const handleCreate = async () => {
        if (!hotelTenant) return;
        if (!formData.customerId || !formData.roomId || !formData.checkInDate) {
            toast({
                variant: 'destructive',
                title: 'Error',
                description: 'Please fill in all required fields',
            });
            return;
        }
        setSubmitting(true);
        try {
            const payload: any = {
                customerId: formData.customerId,
                roomId: formData.roomId,
                checkInDate: new Date(formData.checkInDate).toISOString(),
                numberOfDays: formData.numberOfDays,
                serviceType: formData.serviceType,
                checkInType: formData.checkInType,
                maleCount: formData.maleCount,
                femaleCount: formData.femaleCount,
                childCount: formData.childCount,
                advanceAmount: formData.advanceAmount,
            };
            if (formData.agentId) payload.agentId = formData.agentId;
            if (formData.purposeOfVisit) payload.purposeOfVisit = formData.purposeOfVisit;

            const res = await api.post('/m/hotel/bookings', payload, {
                headers: { 'x-tenant-id': hotelTenant },
            });

            if (res.data.success) {
                toast({ title: 'Success', description: res.data.message });
                setOpen(false);
                setFormData({
                    customerId: '',
                    roomId: '',
                    checkInDate: '',
                    numberOfDays: 1,
                    serviceType: '24 Hours',
                    checkInType: 'Walk In',
                    maleCount: 0,
                    femaleCount: 0,
                    childCount: 0,
                    agentId: '',
                    purposeOfVisit: '',
                    advanceAmount: 0,
                });
                fetchAll();
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
                : errorData?.message || 'Failed to create booking';
            toast({ variant: 'destructive', title: 'Error', description: msg });
        } finally {
            setSubmitting(false);
        }
    };

    const handleAction = async (
        bookingId: string,
        action: 'check-in' | 'check-out' | 'cancel' | 'no-show',
    ) => {
        if (!hotelTenant) return;
        try {
            const res = await api.post(
                `/m/hotel/bookings/${bookingId}/${action}`,
                {},
                {
                    headers: { 'x-tenant-id': hotelTenant },
                },
            );
            if (res.data.success) {
                toast({ title: 'Success', description: res.data.message });
                fetchAll();
            } else {
                toast({
                    variant: 'destructive',
                    title: 'Error',
                    description: res.data.message || `Failed to ${action}`,
                });
            }
        } catch (error: any) {
            toast({
                variant: 'destructive',
                title: 'Error',
                description: error.response?.data?.message || `Failed to ${action}`,
            });
        }
    };

    const formatDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
        });
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-10">
                <Loader2 className="h-8 w-8 animate-spin" />
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <p className="text-sm text-muted-foreground">
                    {bookings.length} booking{bookings.length !== 1 ? 's' : ''}
                </p>
                <Dialog open={open} onOpenChange={setOpen}>
                    <DialogTrigger asChild>
                        <Button>
                            <Plus className="h-4 w-4 mr-2" /> New Booking
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
                        <DialogHeader>
                            <DialogTitle>Create Booking</DialogTitle>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Customer *</Label>
                                    <Select
                                        value={formData.customerId}
                                        onValueChange={(val) =>
                                            setFormData({ ...formData, customerId: val })
                                        }
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select a customer" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {customers.map((c) => (
                                                <SelectItem key={c._id} value={c._id}>
                                                    {c.firstName} {c.lastName} ({c.phone})
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label>Room *</Label>
                                    <Select
                                        value={formData.roomId}
                                        onValueChange={(val) =>
                                            setFormData({ ...formData, roomId: val })
                                        }
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select a room" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {rooms.map((r) => (
                                                <SelectItem key={r._id} value={r._id}>
                                                    Room {r.number} - {r.type} ({r.pricePerNight}
                                                    /night)
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                            <div className="grid grid-cols-3 gap-4">
                                <div className="space-y-2">
                                    <Label>Check-in Date *</Label>
                                    <Input
                                        type="date"
                                        value={formData.checkInDate}
                                        onChange={(e) =>
                                            setFormData({
                                                ...formData,
                                                checkInDate: e.target.value,
                                            })
                                        }
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Number of Days *</Label>
                                    <Input
                                        type="number"
                                        min={1}
                                        value={formData.numberOfDays}
                                        onChange={(e) =>
                                            setFormData({
                                                ...formData,
                                                numberOfDays: parseInt(e.target.value) || 1,
                                            })
                                        }
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Service Type</Label>
                                    <Select
                                        value={formData.serviceType}
                                        onValueChange={(val) =>
                                            setFormData({ ...formData, serviceType: val })
                                        }
                                    >
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="24 Hours">24 Hours</SelectItem>
                                            <SelectItem value="12 Hours">12 Hours</SelectItem>
                                            <SelectItem value="12 PM">12 PM</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Check-in Type</Label>
                                    <Select
                                        value={formData.checkInType}
                                        onValueChange={(val) =>
                                            setFormData({ ...formData, checkInType: val })
                                        }
                                    >
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="Walk In">Walk In</SelectItem>
                                            <SelectItem value="Online Booking">
                                                Online Booking
                                            </SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label>Agent</Label>
                                    <Select
                                        value={formData.agentId}
                                        onValueChange={(val) =>
                                            setFormData({ ...formData, agentId: val })
                                        }
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="None" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {agents.map((a) => (
                                                <SelectItem key={a._id} value={a._id}>
                                                    {a.firstName} {a.lastName} ({a.agentCode})
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                            <div className="grid grid-cols-3 gap-4">
                                <div className="space-y-2">
                                    <Label>Male Count</Label>
                                    <Input
                                        type="number"
                                        min={0}
                                        value={formData.maleCount}
                                        onChange={(e) =>
                                            setFormData({
                                                ...formData,
                                                maleCount: parseInt(e.target.value) || 0,
                                            })
                                        }
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Female Count</Label>
                                    <Input
                                        type="number"
                                        min={0}
                                        value={formData.femaleCount}
                                        onChange={(e) =>
                                            setFormData({
                                                ...formData,
                                                femaleCount: parseInt(e.target.value) || 0,
                                            })
                                        }
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Child Count</Label>
                                    <Input
                                        type="number"
                                        min={0}
                                        value={formData.childCount}
                                        onChange={(e) =>
                                            setFormData({
                                                ...formData,
                                                childCount: parseInt(e.target.value) || 0,
                                            })
                                        }
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Purpose of Visit</Label>
                                    <Input
                                        value={formData.purposeOfVisit}
                                        onChange={(e) =>
                                            setFormData({
                                                ...formData,
                                                purposeOfVisit: e.target.value,
                                            })
                                        }
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Advance Amount</Label>
                                    <Input
                                        type="number"
                                        min={0}
                                        value={formData.advanceAmount}
                                        onChange={(e) =>
                                            setFormData({
                                                ...formData,
                                                advanceAmount: parseFloat(e.target.value) || 0,
                                            })
                                        }
                                    />
                                </div>
                            </div>
                            <div className="p-3 bg-muted rounded-md text-sm">
                                Estimated Total: <strong>{getEstimatedTotal()}</strong> (Room Rent =
                                Price/Night x Days)
                            </div>
                        </div>
                        <DialogFooter>
                            <Button onClick={handleCreate} disabled={submitting}>
                                {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                                Create Booking
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>

            {bookings.length === 0 ? (
                <div className="text-center py-10 text-muted-foreground">
                    No bookings yet. Create one to get started.
                </div>
            ) : (
                <div className="rounded-md border">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Check-in #</TableHead>
                                <TableHead>Customer</TableHead>
                                <TableHead>Room</TableHead>
                                <TableHead>Check-in</TableHead>
                                <TableHead>Days</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Payment</TableHead>
                                <TableHead className="text-right">Amount</TableHead>
                                <TableHead className="w-[60px]"></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {bookings.map((booking) => (
                                <TableRow key={booking._id}>
                                    <TableCell className="font-mono text-xs">
                                        {booking.checkInNumber}
                                    </TableCell>
                                    <TableCell className="font-medium">
                                        {booking.customer?.firstName} {booking.customer?.lastName}
                                    </TableCell>
                                    <TableCell>
                                        {booking.room?.number} ({booking.room?.type})
                                    </TableCell>
                                    <TableCell>{formatDate(booking.checkInDate)}</TableCell>
                                    <TableCell>{booking.numberOfDays}</TableCell>
                                    <TableCell>
                                        <Badge
                                            variant="outline"
                                            className={statusColors[booking.status] || ''}
                                        >
                                            {booking.status}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        <Badge
                                            variant="outline"
                                            className={paymentColors[booking.paymentStatus] || ''}
                                        >
                                            {booking.paymentStatus}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-right font-medium">
                                        {booking.totalAmount}
                                    </TableCell>
                                    <TableCell>
                                        {!['CheckedOut', 'Cancelled'].includes(booking.status) && (
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" size="sm">
                                                        <MoreHorizontal className="h-4 w-4" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    {booking.status === 'Confirmed' && (
                                                        <DropdownMenuItem
                                                            onClick={() =>
                                                                handleAction(
                                                                    booking._id,
                                                                    'check-in',
                                                                )
                                                            }
                                                        >
                                                            <LogIn className="h-4 w-4 mr-2" /> Check
                                                            In
                                                        </DropdownMenuItem>
                                                    )}
                                                    {booking.status === 'CheckedIn' && (
                                                        <DropdownMenuItem
                                                            onClick={() =>
                                                                handleAction(
                                                                    booking._id,
                                                                    'check-out',
                                                                )
                                                            }
                                                        >
                                                            <LogOut className="h-4 w-4 mr-2" />{' '}
                                                            Check Out
                                                        </DropdownMenuItem>
                                                    )}
                                                    {booking.status === 'Confirmed' && (
                                                        <DropdownMenuItem
                                                            onClick={() =>
                                                                handleAction(booking._id, 'no-show')
                                                            }
                                                        >
                                                            <UserMinus className="h-4 w-4 mr-2" />{' '}
                                                            No Show
                                                        </DropdownMenuItem>
                                                    )}
                                                    <DropdownMenuItem
                                                        onClick={() =>
                                                            handleAction(booking._id, 'cancel')
                                                        }
                                                        className="text-destructive"
                                                    >
                                                        <XCircle className="h-4 w-4 mr-2" /> Cancel
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        )}
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            )}
        </div>
    );
}
