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
import { Loader2, Plus, Pencil } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Customer {
    _id: string;
    firstName: string;
    lastName: string;
    email?: string;
    phone: string;
    idProofType?: string;
    idProofNumber?: string;
    gender?: string;
    city?: string;
    state?: string;
    pinCode?: string;
    birthDate?: string;
    marriageDate?: string;
    address?: string;
    notes?: string;
    createdAt: string;
}

const emptyForm = {
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    idProofType: '',
    idProofNumber: '',
    gender: '',
    city: '',
    state: '',
    pinCode: '',
    birthDate: '',
    marriageDate: '',
    address: '',
    notes: '',
};

export function CustomerList({ hotelTenant }: { hotelTenant?: string }) {
    const { api } = useAuth();
    const { toast } = useToast();
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [loading, setLoading] = useState(true);
    const [open, setOpen] = useState(false);
    const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
    const [formData, setFormData] = useState(emptyForm);
    const [submitting, setSubmitting] = useState(false);

    const fetchCustomers = async () => {
        if (!hotelTenant) {
            setLoading(false);
            return;
        }
        try {
            const res = await api.get('/m/hotel/customers', {
                headers: { 'x-tenant-id': hotelTenant },
            });
            if (res.data.success) setCustomers(res.data.data);
        } catch (error) {
            console.error('Failed to fetch customers', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchCustomers();
    }, [api, hotelTenant]);

    const handleOpenCreate = () => {
        setEditingCustomer(null);
        setFormData(emptyForm);
        setOpen(true);
    };

    const handleOpenEdit = (customer: Customer) => {
        setEditingCustomer(customer);
        setFormData({
            firstName: customer.firstName,
            lastName: customer.lastName,
            email: customer.email || '',
            phone: customer.phone,
            idProofType: customer.idProofType || '',
            idProofNumber: customer.idProofNumber || '',
            gender: customer.gender || '',
            city: customer.city || '',
            state: customer.state || '',
            pinCode: customer.pinCode || '',
            birthDate: customer.birthDate ? customer.birthDate.split('T')[0] : '',
            marriageDate: customer.marriageDate ? customer.marriageDate.split('T')[0] : '',
            address: customer.address || '',
            notes: customer.notes || '',
        });
        setOpen(true);
    };

    const handleSubmit = async () => {
        if (!hotelTenant) return;
        setSubmitting(true);
        try {
            const isEdit = !!editingCustomer;
            const url = isEdit ? `/m/hotel/customers/${editingCustomer._id}` : '/m/hotel/customers';

            const payload: any = { ...formData };
            // Convert empty strings to undefined for optional fields
            if (!payload.email) delete payload.email;
            if (!payload.idProofType) delete payload.idProofType;
            if (!payload.idProofNumber) delete payload.idProofNumber;
            if (!payload.gender) delete payload.gender;
            if (!payload.city) delete payload.city;
            if (!payload.state) delete payload.state;
            if (!payload.pinCode) delete payload.pinCode;
            if (!payload.address) delete payload.address;
            if (!payload.notes) delete payload.notes;
            if (payload.birthDate) {
                payload.birthDate = new Date(payload.birthDate).toISOString();
            } else {
                delete payload.birthDate;
            }
            if (payload.marriageDate) {
                payload.marriageDate = new Date(payload.marriageDate).toISOString();
            } else {
                delete payload.marriageDate;
            }

            const res = await api({
                method: isEdit ? 'patch' : 'post',
                url,
                data: payload,
                headers: { 'x-tenant-id': hotelTenant },
            });

            if (res.data.success) {
                toast({ title: 'Success', description: res.data.message });
                setOpen(false);
                fetchCustomers();
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
                : errorData?.message || 'Failed to save customer';
            toast({ variant: 'destructive', title: 'Error', description: msg });
        } finally {
            setSubmitting(false);
        }
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
                    {customers.length} customer{customers.length !== 1 ? 's' : ''} registered
                </p>
                <Dialog open={open} onOpenChange={setOpen}>
                    <DialogTrigger asChild>
                        <Button onClick={handleOpenCreate}>
                            <Plus className="h-4 w-4 mr-2" /> Add Customer
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
                        <DialogHeader>
                            <DialogTitle>
                                {editingCustomer ? 'Edit Customer' : 'Register New Customer'}
                            </DialogTitle>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="firstName">First Name *</Label>
                                    <Input
                                        id="firstName"
                                        value={formData.firstName}
                                        onChange={(e) =>
                                            setFormData({ ...formData, firstName: e.target.value })
                                        }
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="lastName">Last Name *</Label>
                                    <Input
                                        id="lastName"
                                        value={formData.lastName}
                                        onChange={(e) =>
                                            setFormData({ ...formData, lastName: e.target.value })
                                        }
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="email">Email</Label>
                                    <Input
                                        id="email"
                                        type="email"
                                        value={formData.email}
                                        onChange={(e) =>
                                            setFormData({ ...formData, email: e.target.value })
                                        }
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="phone">Phone *</Label>
                                    <Input
                                        id="phone"
                                        value={formData.phone}
                                        onChange={(e) =>
                                            setFormData({ ...formData, phone: e.target.value })
                                        }
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-3 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="gender">Gender</Label>
                                    <Select
                                        value={formData.gender}
                                        onValueChange={(val) =>
                                            setFormData({ ...formData, gender: val })
                                        }
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="Male">Male</SelectItem>
                                            <SelectItem value="Female">Female</SelectItem>
                                            <SelectItem value="Other">Other</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="birthDate">Birth Date</Label>
                                    <Input
                                        id="birthDate"
                                        type="date"
                                        value={formData.birthDate}
                                        onChange={(e) =>
                                            setFormData({ ...formData, birthDate: e.target.value })
                                        }
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="marriageDate">Marriage Date</Label>
                                    <Input
                                        id="marriageDate"
                                        type="date"
                                        value={formData.marriageDate}
                                        onChange={(e) =>
                                            setFormData({
                                                ...formData,
                                                marriageDate: e.target.value,
                                            })
                                        }
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="idProofType">ID Proof Type</Label>
                                    <Input
                                        id="idProofType"
                                        value={formData.idProofType}
                                        placeholder="e.g. Passport, Aadhaar"
                                        onChange={(e) =>
                                            setFormData({
                                                ...formData,
                                                idProofType: e.target.value,
                                            })
                                        }
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="idProofNumber">ID Number</Label>
                                    <Input
                                        id="idProofNumber"
                                        value={formData.idProofNumber}
                                        onChange={(e) =>
                                            setFormData({
                                                ...formData,
                                                idProofNumber: e.target.value,
                                            })
                                        }
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-3 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="city">City</Label>
                                    <Input
                                        id="city"
                                        value={formData.city}
                                        onChange={(e) =>
                                            setFormData({ ...formData, city: e.target.value })
                                        }
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="state">State</Label>
                                    <Input
                                        id="state"
                                        value={formData.state}
                                        onChange={(e) =>
                                            setFormData({ ...formData, state: e.target.value })
                                        }
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="pinCode">PIN Code</Label>
                                    <Input
                                        id="pinCode"
                                        value={formData.pinCode}
                                        onChange={(e) =>
                                            setFormData({ ...formData, pinCode: e.target.value })
                                        }
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="address">Address</Label>
                                <Input
                                    id="address"
                                    value={formData.address}
                                    onChange={(e) =>
                                        setFormData({ ...formData, address: e.target.value })
                                    }
                                />
                            </div>
                        </div>
                        <DialogFooter>
                            <Button onClick={handleSubmit} disabled={submitting}>
                                {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                                {editingCustomer ? 'Update Customer' : 'Register Customer'}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>

            {customers.length === 0 ? (
                <div className="text-center py-10 text-muted-foreground">
                    No customers registered yet. Add one to get started.
                </div>
            ) : (
                <div className="rounded-md border">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Name</TableHead>
                                <TableHead>Phone</TableHead>
                                <TableHead>Email</TableHead>
                                <TableHead>City</TableHead>
                                <TableHead>ID Proof</TableHead>
                                <TableHead className="w-[60px]"></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {customers.map((customer) => (
                                <TableRow key={customer._id}>
                                    <TableCell className="font-medium">
                                        {customer.firstName} {customer.lastName}
                                    </TableCell>
                                    <TableCell>{customer.phone}</TableCell>
                                    <TableCell>{customer.email || '-'}</TableCell>
                                    <TableCell>{customer.city || '-'}</TableCell>
                                    <TableCell>
                                        {customer.idProofType ? (
                                            <Badge variant="outline">{customer.idProofType}</Badge>
                                        ) : (
                                            '-'
                                        )}
                                    </TableCell>
                                    <TableCell>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => handleOpenEdit(customer)}
                                        >
                                            <Pencil className="h-4 w-4" />
                                        </Button>
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
