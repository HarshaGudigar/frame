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
import { Loader2, Plus, Pencil, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface TransactionCategory {
    _id: string;
    name: string;
    type: 'Expense' | 'Income';
    isActive: boolean;
}

const emptyForm = { name: '', type: 'Expense' as const };

export function TransactionCategoryList() {
    const { api } = useAuth();
    const { toast } = useToast();
    const [categories, setCategories] = useState<TransactionCategory[]>([]);
    const [loading, setLoading] = useState(true);
    const [open, setOpen] = useState(false);
    const [editing, setEditing] = useState<TransactionCategory | null>(null);
    const [formData, setFormData] = useState(emptyForm);
    const [submitting, setSubmitting] = useState(false);

    const fetchCategories = async () => {
        setLoading(true);
        try {
            const res = await api.get('/m/hotel/transaction-categories');
            if (res.data.success) setCategories(res.data.data);
        } catch (error) {
            console.error('Failed to fetch categories', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchCategories();
    }, [api]);

    const handleOpenCreate = () => {
        setEditing(null);
        setFormData(emptyForm);
        setOpen(true);
    };

    const handleOpenEdit = (cat: TransactionCategory) => {
        setEditing(cat);
        setFormData({ name: cat.name, type: cat.type });
        setOpen(true);
    };

    const handleSubmit = async () => {
        setSubmitting(true);
        try {
            const isEdit = !!editing;
            const url = isEdit
                ? `/m/hotel/transaction-categories/${editing._id}`
                : '/m/hotel/transaction-categories';
            const res = await api({
                method: isEdit ? 'patch' : 'post',
                url,
                data: formData,
            });

            if (res.data.success) {
                toast({ title: 'Success', description: res.data.message });
                setOpen(false);
                fetchCategories();
            } else {
                toast({ variant: 'destructive', title: 'Error', description: res.data.message });
            }
        } catch (error: any) {
            toast({
                variant: 'destructive',
                title: 'Error',
                description: error.response?.data?.message || 'Failed to save category',
            });
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = async (cat: TransactionCategory) => {
        if (!confirm(`Delete category "${cat.name}"?`)) return;
        try {
            const res = await api.delete(`/m/hotel/transaction-categories/${cat._id}`);
            if (res.data.success) {
                toast({ title: 'Success', description: res.data.message });
                fetchCategories();
            } else {
                toast({ variant: 'destructive', title: 'Error', description: res.data.message });
            }
        } catch (error: any) {
            toast({
                variant: 'destructive',
                title: 'Error',
                description: error.response?.data?.message || 'Failed to delete category',
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
                    {categories.length} categor{categories.length !== 1 ? 'ies' : 'y'}
                </p>
                <Dialog open={open} onOpenChange={setOpen}>
                    <DialogTrigger asChild>
                        <Button onClick={handleOpenCreate}>
                            <Plus className="h-4 w-4 mr-2" /> Add Category
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-md">
                        <DialogHeader>
                            <DialogTitle>{editing ? 'Edit Category' : 'Add Category'}</DialogTitle>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                            <div className="space-y-2">
                                <Label>Name *</Label>
                                <Input
                                    value={formData.name}
                                    onChange={(e) =>
                                        setFormData({ ...formData, name: e.target.value })
                                    }
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Type *</Label>
                                <Select
                                    value={formData.type}
                                    onValueChange={(val: 'Expense' | 'Income') =>
                                        setFormData({ ...formData, type: val })
                                    }
                                >
                                    <SelectTrigger id="type">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="Expense">Expense</SelectItem>
                                        <SelectItem value="Income">Income</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <DialogFooter>
                            <Button onClick={handleSubmit} disabled={submitting}>
                                {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                                {editing ? 'Update' : 'Save'}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>

            {categories.length === 0 ? (
                <div className="text-center py-10 text-muted-foreground">
                    No categories yet.
                </div>
            ) : (
                <div className="rounded-md border">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Name</TableHead>
                                <TableHead>Type</TableHead>
                                <TableHead className="w-[80px]"></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {categories.map((cat) => (
                                <TableRow key={cat._id}>
                                    <TableCell className="font-medium">{cat.name}</TableCell>
                                    <TableCell>
                                        <Badge
                                            variant={
                                                cat.type === 'Income' ? 'default' : 'secondary'
                                            }
                                        >
                                            {cat.type}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex gap-1">
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => handleOpenEdit(cat)}
                                            >
                                                <Pencil className="h-4 w-4" />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => handleDelete(cat)}
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
