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
import { Loader2, Plus, Pencil, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Service {
    _id: string;
    name: string;
    description?: string;
    rate: number;
    gstRate: number;
    isActive: boolean;
}

const emptyForm = {
    name: '',
    description: '',
    rate: 0,
    gstRate: 0,
};

export function ServiceList({ hotelTenant }: { hotelTenant?: string }) {
    const { api } = useAuth();
    const { toast } = useToast();
    const [services, setServices] = useState<Service[]>([]);
    const [loading, setLoading] = useState(true);
    const [open, setOpen] = useState(false);
    const [editingService, setEditingService] = useState<Service | null>(null);
    const [formData, setFormData] = useState(emptyForm);
    const [submitting, setSubmitting] = useState(false);

    const fetchServices = async () => {
        if (!hotelTenant) {
            setLoading(false);
            return;
        }
        try {
            const res = await api.get('/m/hotel/services', {
                headers: { 'x-tenant-id': hotelTenant },
            });
            if (res.data.success) setServices(res.data.data);
        } catch (error) {
            console.error('Failed to fetch services', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchServices();
    }, [api, hotelTenant]);

    const handleOpenCreate = () => {
        setEditingService(null);
        setFormData(emptyForm);
        setOpen(true);
    };

    const handleOpenEdit = (service: Service) => {
        setEditingService(service);
        setFormData({
            name: service.name,
            description: service.description || '',
            rate: service.rate,
            gstRate: service.gstRate,
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
            const isEdit = !!editingService;
            const url = isEdit ? `/m/hotel/services/${editingService._id}` : '/m/hotel/services';
            const payload: any = { ...formData };
            if (!payload.description) delete payload.description;

            const res = await api({
                method: isEdit ? 'patch' : 'post',
                url,
                data: payload,
                headers: { 'x-tenant-id': hotelTenant },
            });

            if (res.data.success) {
                toast({ title: 'Success', description: res.data.message });
                setOpen(false);
                fetchServices();
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
                : errorData?.message || 'Failed to save service';
            toast({ variant: 'destructive', title: 'Error', description: msg });
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = async (service: Service) => {
        if (!hotelTenant) {
            toast({
                variant: 'destructive',
                title: 'No Tenant Context',
                description: 'Please ensure you are viewing a valid hotel tenant instance.',
            });
            return;
        }
        if (!confirm(`Delete service "${service.name}"?`)) return;
        try {
            const res = await api.delete(`/m/hotel/services/${service._id}`, {
                headers: { 'x-tenant-id': hotelTenant },
            });
            if (res.data.success) {
                toast({ title: 'Success', description: res.data.message });
                fetchServices();
            } else {
                toast({ variant: 'destructive', title: 'Error', description: res.data.message });
            }
        } catch (error: any) {
            toast({
                variant: 'destructive',
                title: 'Error',
                description: error.response?.data?.message || 'Failed to delete service',
            });
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
                    {services.length} service{services.length !== 1 ? 's' : ''}
                </p>
                <Dialog open={open} onOpenChange={setOpen}>
                    <DialogTrigger asChild>
                        <Button onClick={handleOpenCreate}>
                            <Plus className="h-4 w-4 mr-2" /> Add Service
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-md">
                        <DialogHeader>
                            <DialogTitle>
                                {editingService ? 'Edit Service' : 'Add New Service'}
                            </DialogTitle>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                            <div className="space-y-2">
                                <Label htmlFor="name">Name *</Label>
                                <Input
                                    id="name"
                                    value={formData.name}
                                    onChange={(e) =>
                                        setFormData({ ...formData, name: e.target.value })
                                    }
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="description">Description</Label>
                                <Input
                                    id="description"
                                    value={formData.description}
                                    onChange={(e) =>
                                        setFormData({ ...formData, description: e.target.value })
                                    }
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="rate">Rate *</Label>
                                    <Input
                                        id="rate"
                                        type="number"
                                        value={formData.rate}
                                        onChange={(e) =>
                                            setFormData({
                                                ...formData,
                                                rate: parseFloat(e.target.value) || 0,
                                            })
                                        }
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="gstRate">GST Rate (%)</Label>
                                    <Input
                                        id="gstRate"
                                        type="number"
                                        value={formData.gstRate}
                                        onChange={(e) =>
                                            setFormData({
                                                ...formData,
                                                gstRate: parseFloat(e.target.value) || 0,
                                            })
                                        }
                                    />
                                </div>
                            </div>
                        </div>
                        <DialogFooter>
                            <Button onClick={handleSubmit} disabled={submitting}>
                                {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                                {editingService ? 'Update Service' : 'Save Service'}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>

            {services.length === 0 ? (
                <div className="text-center py-10 text-muted-foreground">
                    {!hotelTenant ? (
                        <div className="space-y-2">
                            <p className="font-semibold text-foreground">No Tenant Selected</p>
                            <p className="text-sm">
                                You are viewing the hotel module in global context. Please select or
                                be assigned to a hotel tenant.
                            </p>
                        </div>
                    ) : (
                        'No services yet. Add one to get started.'
                    )}
                </div>
            ) : (
                <div className="rounded-md border">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Name</TableHead>
                                <TableHead>Description</TableHead>
                                <TableHead className="text-right">Rate</TableHead>
                                <TableHead className="text-right">GST %</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="w-[80px]"></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {services.map((service) => (
                                <TableRow key={service._id}>
                                    <TableCell className="font-medium">{service.name}</TableCell>
                                    <TableCell>{service.description || '-'}</TableCell>
                                    <TableCell className="text-right">{service.rate}</TableCell>
                                    <TableCell className="text-right">{service.gstRate}%</TableCell>
                                    <TableCell>
                                        <Badge variant={service.isActive ? 'default' : 'secondary'}>
                                            {service.isActive ? 'Active' : 'Inactive'}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex gap-1">
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => handleOpenEdit(service)}
                                            >
                                                <Pencil className="h-4 w-4" />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => handleDelete(service)}
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
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
