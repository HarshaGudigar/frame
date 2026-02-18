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
import { Loader2, Plus, Pencil, Trash2, AlertTriangle, Package } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface InventoryItem {
    _id: string;
    name: string;
    category: 'Linen' | 'Toiletries' | 'Mini Bar' | 'Cleaning Supplies' | 'Other';
    quantity: number;
    unit: string;
    minThreshold: number;
    remarks?: string;
}

const emptyForm = {
    name: '',
    category: 'Other' as const,
    quantity: 0,
    unit: 'pcs',
    minThreshold: 5,
    remarks: '',
};

const categories = ['Linen', 'Toiletries', 'Mini Bar', 'Cleaning Supplies', 'Other'];

export function InventoryList({ hotelTenant }: { hotelTenant?: string }) {
    const { api } = useAuth();
    const { toast } = useToast();
    const [items, setItems] = useState<InventoryItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [open, setOpen] = useState(false);
    const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
    const [formData, setFormData] = useState(emptyForm);
    const [submitting, setSubmitting] = useState(false);

    const fetchItems = async () => {
        if (!hotelTenant) {
            setLoading(false);
            return;
        }
        try {
            const res = await api.get('/m/hotel/inventory', {
                headers: { 'x-tenant-id': hotelTenant },
            });
            if (res.data.success) setItems(res.data.data);
        } catch (error) {
            console.error('Failed to fetch inventory', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchItems();
    }, [api, hotelTenant]);

    const handleOpenCreate = () => {
        setEditingItem(null);
        setFormData(emptyForm);
        setOpen(true);
    };

    const handleOpenEdit = (item: InventoryItem) => {
        setEditingItem(item);
        setFormData({
            name: item.name,
            category: item.category,
            quantity: item.quantity,
            unit: item.unit,
            minThreshold: item.minThreshold,
            remarks: item.remarks || '',
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
            const isEdit = !!editingItem;
            const url = isEdit ? `/m/hotel/inventory/${editingItem._id}` : '/m/hotel/inventory';

            const res = await api({
                method: isEdit ? 'patch' : 'post',
                url,
                data: formData,
                headers: { 'x-tenant-id': hotelTenant },
            });

            if (res.data.success) {
                toast({ title: 'Success', description: res.data.message });
                setOpen(false);
                fetchItems();
            }
        } catch (error: any) {
            const errorData = error.response?.data;
            const msg = errorData?.errors
                ? errorData.errors.map((e: any) => e.message).join(', ')
                : errorData?.message || 'Failed to save item';
            toast({ variant: 'destructive', title: 'Error', description: msg });
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = async (item: InventoryItem) => {
        if (!hotelTenant) return;
        if (!confirm(`Delete inventory item "${item.name}"?`)) return;
        try {
            const res = await api.delete(`/m/hotel/inventory/${item._id}`, {
                headers: { 'x-tenant-id': hotelTenant },
            });
            if (res.data.success) {
                toast({ title: 'Success', description: res.data.message });
                fetchItems();
            }
        } catch (error: any) {
            toast({
                variant: 'destructive',
                title: 'Error',
                description: error.response?.data?.message || 'Failed to delete item',
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
                    {items.length} item{items.length !== 1 ? 's' : ''} in inventory
                </p>
                <Dialog open={open} onOpenChange={setOpen}>
                    <DialogTrigger asChild>
                        <Button onClick={handleOpenCreate}>
                            <Plus className="h-4 w-4 mr-2" /> Add Item
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-md">
                        <DialogHeader>
                            <DialogTitle>
                                {editingItem ? 'Edit Item' : 'Add New Inventory Item'}
                            </DialogTitle>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                            <div className="space-y-2">
                                <Label htmlFor="name">Item Name *</Label>
                                <Input
                                    id="name"
                                    placeholder="e.g. Soap Bar, Bed Sheet"
                                    value={formData.name}
                                    onChange={(e) =>
                                        setFormData({ ...formData, name: e.target.value })
                                    }
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Category</Label>
                                    <Select
                                        value={formData.category}
                                        onValueChange={(val: any) =>
                                            setFormData({ ...formData, category: val })
                                        }
                                    >
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {categories.map((c) => (
                                                <SelectItem key={c} value={c}>
                                                    {c}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="unit">Unit</Label>
                                    <Input
                                        id="unit"
                                        placeholder="pcs, kg, liters"
                                        value={formData.unit}
                                        onChange={(e) =>
                                            setFormData({ ...formData, unit: e.target.value })
                                        }
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="quantity">Quantity *</Label>
                                    <Input
                                        id="quantity"
                                        type="number"
                                        value={formData.quantity}
                                        onChange={(e) =>
                                            setFormData({
                                                ...formData,
                                                quantity: parseInt(e.target.value) || 0,
                                            })
                                        }
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="threshold">Min Threshold *</Label>
                                    <Input
                                        id="threshold"
                                        type="number"
                                        value={formData.minThreshold}
                                        onChange={(e) =>
                                            setFormData({
                                                ...formData,
                                                minThreshold: parseInt(e.target.value) || 0,
                                            })
                                        }
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="remarks">Remarks</Label>
                                <Input
                                    id="remarks"
                                    value={formData.remarks}
                                    onChange={(e) =>
                                        setFormData({ ...formData, remarks: e.target.value })
                                    }
                                />
                            </div>
                        </div>
                        <DialogFooter>
                            <Button onClick={handleSubmit} disabled={submitting}>
                                {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                                {editingItem ? 'Update Item' : 'Save Item'}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>

            {items.length === 0 ? (
                <div className="text-center py-10 text-muted-foreground border rounded-md border-dashed">
                    <Package className="h-10 w-10 mx-auto mb-2 opacity-20" />
                    <p>No inventory items yet.</p>
                </div>
            ) : (
                <div className="rounded-md border overflow-hidden">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Item Name</TableHead>
                                <TableHead>Category</TableHead>
                                <TableHead className="text-center">Stock</TableHead>
                                <TableHead className="text-center">Threshold</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="w-[80px]"></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {items.map((item) => {
                                const isLowStock = item.quantity <= item.minThreshold;
                                return (
                                    <TableRow key={item._id}>
                                        <TableCell className="font-medium">
                                            <div className="flex flex-col">
                                                <span>{item.name}</span>
                                                <span className="text-[10px] text-muted-foreground">
                                                    {item.remarks}
                                                </span>
                                            </div>
                                        </TableCell>
                                        <TableCell>{item.category}</TableCell>
                                        <TableCell className="text-center">
                                            <span
                                                className={
                                                    isLowStock ? 'text-red-500 font-bold' : ''
                                                }
                                            >
                                                {item.quantity} {item.unit}
                                            </span>
                                        </TableCell>
                                        <TableCell className="text-center">
                                            {item.minThreshold} {item.unit}
                                        </TableCell>
                                        <TableCell>
                                            {isLowStock ? (
                                                <Badge
                                                    variant="destructive"
                                                    className="flex w-fit gap-1"
                                                >
                                                    <AlertTriangle className="h-3 w-3" /> Low Stock
                                                </Badge>
                                            ) : (
                                                <Badge variant="default" className="bg-green-600">
                                                    In Stock
                                                </Badge>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex gap-1">
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => handleOpenEdit(item)}
                                                >
                                                    <Pencil className="h-4 w-4" />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => handleDelete(item)}
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                );
                            })}
                        </TableBody>
                    </Table>
                </div>
            )}
        </div>
    );
}
