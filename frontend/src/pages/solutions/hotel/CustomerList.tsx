import React, { useEffect, useState, useMemo } from 'react';
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
import { Loader2, Plus, Pencil, Upload, Image as ImageIcon, Search } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { getBadgeColor, tableStyles } from '@/lib/module-styles';

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
    idProofImageUrl?: string;
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
    idProofImageUrl: '',
    notes: '',
};

export function CustomerList() {
    const { api } = useAuth();
    const { toast } = useToast();
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [loading, setLoading] = useState(true);
    const [open, setOpen] = useState(false);
    const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
    const [formData, setFormData] = useState(emptyForm);
    const [submitting, setSubmitting] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploading(true);
        const formDataUpload = new FormData();
        formDataUpload.append('file', file);

        try {
            const res = await api.post('/m/hotel/uploads/id-proof', formDataUpload, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            });

            if (res.data.success) {
                setFormData({ ...formData, idProofImageUrl: res.data.data.url });
                toast({ title: 'Success', description: 'ID Proof uploaded successfully' });
            } else {
                toast({
                    variant: 'destructive',
                    title: 'Upload Failed',
                    description: res.data.message,
                });
            }
        } catch (error: any) {
            toast({
                variant: 'destructive',
                title: 'Upload Error',
                description: error.response?.data?.message || 'Failed to upload file',
            });
        } finally {
            setUploading(false);
        }
    };

    const fetchCustomers = async () => {
        try {
            const res = await api.get('/m/hotel/customers');
            if (res.data.success) setCustomers(res.data.data);
        } catch (error) {
            console.error('Failed to fetch customers', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchCustomers();
    }, [api]);

    const filteredCustomers = useMemo(() => {
        const q = searchQuery.toLowerCase().trim();
        if (!q) return customers;
        return customers.filter((c) => {
            const name = `${c.firstName} ${c.lastName}`.toLowerCase();
            const phone = (c.phone ?? '').toLowerCase();
            const email = (c.email ?? '').toLowerCase();
            const city = (c.city ?? '').toLowerCase();
            return name.includes(q) || phone.includes(q) || email.includes(q) || city.includes(q);
        });
    }, [customers, searchQuery]);

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
            idProofImageUrl: customer.idProofImageUrl || '',
            notes: customer.notes || '',
        });
        setOpen(true);
    };

    const handleSubmit = async () => {
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
            if (!payload.idProofImageUrl) delete payload.idProofImageUrl;
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
            <div className="flex flex-wrap justify-between items-center gap-3">
                <div className="flex items-center gap-3">
                    {/* Search */}
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                        <input
                            className="pl-9 h-8 w-56 text-sm border rounded-md bg-background px-3 py-1 focus:outline-none focus:ring-2 focus:ring-ring"
                            placeholder="Search name, phone, city…"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                    <p className="text-sm text-muted-foreground">
                        {filteredCustomers.length} guest{filteredCustomers.length !== 1 ? 's' : ''}
                    </p>
                </div>
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
                                        <SelectTrigger id="gender">
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

                            <div className="space-y-4 rounded-lg border border-dashed p-4">
                                <div className="space-y-2">
                                    <Label className="text-base">ID Proof Scan</Label>
                                    <div className="flex items-center gap-4">
                                        <div className="flex-1">
                                            <Input
                                                id="idProofFile"
                                                type="file"
                                                accept="image/*"
                                                className="cursor-pointer"
                                                onChange={handleFileUpload}
                                                disabled={uploading}
                                            />
                                        </div>
                                        {uploading && (
                                            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                                        )}
                                    </div>
                                    <p className="text-xs text-muted-foreground">
                                        Upload a clear photo of the ID proof (JPG, PNG, WebP).
                                    </p>
                                </div>

                                {formData.idProofImageUrl && (
                                    <div className="relative aspect-video w-full overflow-hidden rounded-md border bg-muted">
                                        <img
                                            src={formData.idProofImageUrl}
                                            alt="ID Proof Preview"
                                            className="h-full w-full object-contain"
                                        />
                                        <Button
                                            type="button"
                                            variant="destructive"
                                            size="sm"
                                            className="absolute top-2 right-2 h-8 w-8 p-0"
                                            onClick={() =>
                                                setFormData({ ...formData, idProofImageUrl: '' })
                                            }
                                        >
                                            <Plus className="h-4 w-4 rotate-45" />
                                        </Button>
                                    </div>
                                )}
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
                <div className={tableStyles.wrapper}>
                    <Table>
                        <TableHeader>
                            <TableRow className={tableStyles.headerRow}>
                                <TableHead className={tableStyles.headerCell}>Guest</TableHead>
                                <TableHead className={tableStyles.headerCell}>Phone</TableHead>
                                <TableHead className={tableStyles.headerCell}>Email</TableHead>
                                <TableHead className={tableStyles.headerCell}>City</TableHead>
                                <TableHead className={tableStyles.headerCell}>ID Proof</TableHead>
                                <TableHead className="w-[60px]"></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredCustomers.map((customer) => (
                                <TableRow key={customer._id} className={tableStyles.row}>
                                    <TableCell className="font-medium">
                                        <div className="flex items-center gap-3">
                                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary font-bold text-xs">
                                                {customer.firstName?.[0]}
                                                {customer.lastName?.[0]}
                                            </div>
                                            <span>
                                                {customer.firstName} {customer.lastName}
                                            </span>
                                        </div>
                                    </TableCell>
                                    <TableCell>{customer.phone}</TableCell>
                                    <TableCell>{customer.email || '-'}</TableCell>
                                    <TableCell>{customer.city || '-'}</TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-2">
                                            {customer.idProofType ? (
                                                <Badge variant="outline">
                                                    {customer.idProofType}
                                                </Badge>
                                            ) : (
                                                '-'
                                            )}
                                            {customer.idProofImageUrl && (
                                                <a
                                                    href={customer.idProofImageUrl}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    title="View ID Proof"
                                                >
                                                    <ImageIcon className="h-4 w-4 text-primary cursor-pointer hover:text-primary/80" />
                                                </a>
                                            )}
                                        </div>
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
