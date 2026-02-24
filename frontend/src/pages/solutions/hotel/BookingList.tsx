import { useEffect, useState, useMemo } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { getBadgeColor, tableStyles } from '@/lib/module-styles';
import { Search } from 'lucide-react';
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
import {
    Loader2,
    Plus,
    MoreHorizontal,
    LogIn,
    LogOut,
    XCircle,
    UserMinus,
    Printer,
    LayoutList,
    CalendarDays,
    X,
    Check,
} from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { BookingTapeChart } from './BookingTapeChart';

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

// Status colors come from shared module-styles via getBadgeColor()

export function BookingList() {
    const { api } = useAuth();
    const { toast } = useToast();
    const [bookings, setBookings] = useState<Booking[]>([]);
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [rooms, setRooms] = useState<Room[]>([]);
    const [agents, setAgents] = useState<Agent[]>([]);
    const [loading, setLoading] = useState(true);
    const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');
    const [open, setOpen] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    const [formData, setFormData] = useState({
        customerId: '',
        roomIds: [] as string[],
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
        try {
            const [bookingsRes, customersRes, roomsRes, agentsRes] = await Promise.all([
                api.get('/m/hotel/bookings'),
                api.get('/m/hotel/customers'),
                api.get('/m/hotel/rooms'),
                api.get('/m/hotel/agents'),
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
    }, [api]);

    const getEstimatedTotal = () => {
        const selectedRooms = rooms.filter((r) => formData.roomIds.includes(r._id));
        if (selectedRooms.length > 0 && formData.numberOfDays > 0) {
            const sum = selectedRooms.reduce((acc, r) => acc + r.pricePerNight, 0);
            return sum * formData.numberOfDays;
        }
        return 0;
    };

    const getCheckoutPreview = () => {
        if (!formData.checkInDate || formData.numberOfDays < 1) return null;
        try {
            const date = new Date(formData.checkInDate);
            date.setDate(date.getDate() + formData.numberOfDays);
            return date.toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
            });
        } catch {
            return null;
        }
    };

    const handleCreate = async () => {
        if (!formData.customerId || formData.roomIds.length === 0 || !formData.checkInDate) {
            toast({
                variant: 'destructive',
                title: 'Error',
                description: 'Please select a customer, at least one room, and check-in date',
            });
            return;
        }
        setSubmitting(true);
        try {
            const payload: any = {
                customerId: formData.customerId,
                roomIds: formData.roomIds,
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

            const res = await api.post('/m/hotel/bookings', payload);

            if (res.data.success) {
                toast({ title: 'Success', description: res.data.message });
                setOpen(false);
                setFormData({
                    customerId: '',
                    roomIds: [],
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
        try {
            const res = await api.post(
                `/m/hotel/bookings/${bookingId}/${action}`,
                {}
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

    const filteredBookings = useMemo(() => {
        const q = searchQuery.toLowerCase().trim();
        if (!q) return bookings;
        return bookings.filter((b) => {
            const guest =
                `${b.customer?.firstName ?? ''} ${b.customer?.lastName ?? ''}`.toLowerCase();
            const room = `room ${b.room?.number ?? ''}`.toLowerCase();
            const status = b.status.toLowerCase();
            const num = (b.checkInNumber ?? '').toLowerCase();
            return guest.includes(q) || room.includes(q) || status.includes(q) || num.includes(q);
        });
    }, [bookings, searchQuery]);

    if (loading) {
        return (
            <div className="flex items-center justify-center py-10">
                <Loader2 className="h-8 w-8 animate-spin" />
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <div className="flex flex-wrap justify-between items-center gap-3">
                <div className="flex items-center gap-2 flex-wrap">
                    <div className="flex items-center border rounded-md p-1 bg-muted/50">
                        <Button
                            variant={viewMode === 'list' ? 'secondary' : 'ghost'}
                            size="sm"
                            className="h-8 px-3"
                            onClick={() => setViewMode('list')}
                        >
                            <LayoutList className="h-4 w-4 mr-2" /> List
                        </Button>
                        <Button
                            variant={viewMode === 'calendar' ? 'secondary' : 'ghost'}
                            size="sm"
                            className="h-8 px-3"
                            onClick={() => setViewMode('calendar')}
                        >
                            <CalendarDays className="h-4 w-4 mr-2" /> Timeline
                        </Button>
                    </div>
                    {/* Search */}
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                        <Input
                            className="pl-9 h-8 w-52 text-sm"
                            placeholder="Search guest, room, status…"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                    <p className="text-sm text-muted-foreground">
                        {filteredBookings.length} booking{filteredBookings.length !== 1 ? 's' : ''}
                    </p>
                </div>
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
                                        <SelectTrigger id="customerId">
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
                                    <Label>Rooms * (Group Booking)</Label>
                                    <Popover>
                                        <PopoverTrigger asChild>
                                            <Button
                                                variant="outline"
                                                className="w-full justify-between"
                                            >
                                                {formData.roomIds.length === 0
                                                    ? 'Select rooms'
                                                    : `${formData.roomIds.length} room(s) selected`}
                                                <Plus className="h-4 w-4 opacity-50" />
                                            </Button>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-[300px] p-0" align="start">
                                            <div className="max-h-[300px] overflow-y-auto p-2">
                                                {rooms.map((r) => (
                                                    <div
                                                        key={r._id}
                                                        className="flex items-center space-x-2 p-2 hover:bg-muted rounded-md cursor-pointer"
                                                        onClick={() => {
                                                            const exists =
                                                                formData.roomIds.includes(r._id);
                                                            const newIds = exists
                                                                ? formData.roomIds.filter(
                                                                    (id) => id !== r._id,
                                                                )
                                                                : [...formData.roomIds, r._id];
                                                            setFormData({
                                                                ...formData,
                                                                roomIds: newIds,
                                                            });
                                                        }}
                                                    >
                                                        <Checkbox
                                                            checked={formData.roomIds.includes(
                                                                r._id,
                                                            )}
                                                            onCheckedChange={() => { }} // Handled by div click
                                                        />
                                                        <div className="grid gap-0.5 leading-none">
                                                            <div className="text-sm font-medium">
                                                                Room {r.number}
                                                            </div>
                                                            <div className="text-xs text-muted-foreground">
                                                                {r.type} - {r.pricePerNight}/night
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </PopoverContent>
                                    </Popover>
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
                                        <SelectTrigger id="serviceType">
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
                                        <SelectTrigger id="checkInType">
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
                                        <SelectTrigger id="agentId">
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
                            <div className="p-3 bg-muted rounded-md text-sm flex justify-between items-center">
                                <div>
                                    Estimated Total: <strong>{getEstimatedTotal()}</strong> (Sum of
                                    Rooms x Days)
                                </div>
                                <div className="text-muted-foreground">
                                    Checkout:{' '}
                                    <span className="text-primary font-medium">
                                        {getCheckoutPreview() || 'N/A'}
                                    </span>
                                </div>
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
            ) : viewMode === 'calendar' ? (
                <BookingTapeChart bookings={filteredBookings} rooms={rooms} />
            ) : (
                <div className={tableStyles.wrapper}>
                    <Table>
                        <TableHeader>
                            <TableRow className={tableStyles.headerRow}>
                                <TableHead className={tableStyles.headerCell}>Check-in #</TableHead>
                                <TableHead className={tableStyles.headerCell}>Customer</TableHead>
                                <TableHead className={tableStyles.headerCell}>Room</TableHead>
                                <TableHead className={tableStyles.headerCell}>Check-in</TableHead>
                                <TableHead className={tableStyles.headerCell}>Days</TableHead>
                                <TableHead className={tableStyles.headerCell}>Status</TableHead>
                                <TableHead className={tableStyles.headerCell}>Payment</TableHead>
                                <TableHead className={`${tableStyles.headerCell} text-right`}>
                                    Amount
                                </TableHead>
                                <TableHead className="w-[60px]"></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredBookings.map((booking) => (
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
                                            className={getBadgeColor(booking.status)}
                                        >
                                            {booking.status}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        <Badge
                                            variant="outline"
                                            className={getBadgeColor(booking.paymentStatus)}
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
                                                    <DropdownMenuItem
                                                        onClick={() =>
                                                            window.open(
                                                                `/solutions/hotel/invoice/${booking._id}`,
                                                                '_blank',
                                                            )
                                                        }
                                                    >
                                                        <Printer className="h-4 w-4 mr-2" /> Print
                                                        Invoice
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
