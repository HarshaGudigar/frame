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
    type: string;
}

interface Transaction {
    _id: string;
    type: 'Expense' | 'Income';
    referenceNumber?: string;
    date: string;
    accountType: string;
    category: TransactionCategory;
    amount: number;
    from?: string;
    to?: string;
    remarks?: string;
}

const emptyForm = {
    type: 'Expense' as const,
    referenceNumber: '',
    date: '',
    accountType: 'Petty Cash' as const,
    categoryId: '',
    amount: 0,
    from: '',
    to: '',
    remarks: '',
};

export function TransactionList({ hotelTenant }: { hotelTenant?: string }) {
    const { api } = useAuth();
    const { toast } = useToast();
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [categories, setCategories] = useState<TransactionCategory[]>([]);
    const [loading, setLoading] = useState(true);
    const [open, setOpen] = useState(false);
    const [editing, setEditing] = useState<Transaction | null>(null);
    const [formData, setFormData] = useState(emptyForm);
    const [submitting, setSubmitting] = useState(false);
    const [filterType, setFilterType] = useState<string>('all');

    const fetchData = async () => {
        if (!hotelTenant) {
            setLoading(false);
            return;
        }
        try {
            const params = filterType !== 'all' ? `?type=${filterType}` : '';
            const [txRes, catRes] = await Promise.all([
                api.get(`/m/hotel/transactions${params}`, {
                    headers: { 'x-tenant-id': hotelTenant },
                }),
                api.get('/m/hotel/transaction-categories', {
                    headers: { 'x-tenant-id': hotelTenant },
                }),
            ]);
            if (txRes.data.success) setTransactions(txRes.data.data);
            if (catRes.data.success) setCategories(catRes.data.data);
        } catch (error) {
            console.error('Failed to fetch transactions', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [api, hotelTenant, filterType]);

    const handleOpenCreate = () => {
        setEditing(null);
        setFormData(emptyForm);
        setOpen(true);
    };

    const handleOpenEdit = (tx: Transaction) => {
        setEditing(tx);
        setFormData({
            type: tx.type,
            referenceNumber: tx.referenceNumber || '',
            date: tx.date ? tx.date.split('T')[0] : '',
            accountType: tx.accountType as typeof emptyForm.accountType,
            categoryId: tx.category?._id || '',
            amount: tx.amount,
            from: tx.from || '',
            to: tx.to || '',
            remarks: tx.remarks || '',
        });
        setOpen(true);
    };

    const handleSubmit = async () => {
        if (!hotelTenant) return;
        setSubmitting(true);
        try {
            const isEdit = !!editing;
            const url = isEdit ? `/m/hotel/transactions/${editing._id}` : '/m/hotel/transactions';

            const payload: any = {
                ...formData,
                date: new Date(formData.date).toISOString(),
            };
            if (!payload.referenceNumber) delete payload.referenceNumber;
            if (!payload.from) delete payload.from;
            if (!payload.to) delete payload.to;
            if (!payload.remarks) delete payload.remarks;

            const res = await api({
                method: isEdit ? 'patch' : 'post',
                url,
                data: payload,
                headers: { 'x-tenant-id': hotelTenant },
            });

            if (res.data.success) {
                toast({ title: 'Success', description: res.data.message });
                setOpen(false);
                fetchData();
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
                : errorData?.message || 'Failed to save transaction';
            toast({ variant: 'destructive', title: 'Error', description: msg });
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = async (tx: Transaction) => {
        if (!hotelTenant || !confirm('Delete this transaction?')) return;
        try {
            const res = await api.delete(`/m/hotel/transactions/${tx._id}`, {
                headers: { 'x-tenant-id': hotelTenant },
            });
            if (res.data.success) {
                toast({ title: 'Success', description: res.data.message });
                fetchData();
            } else {
                toast({ variant: 'destructive', title: 'Error', description: res.data.message });
            }
        } catch (error: any) {
            toast({
                variant: 'destructive',
                title: 'Error',
                description: error.response?.data?.message || 'Failed to delete transaction',
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
                <div className="flex items-center gap-4">
                    <p className="text-sm text-muted-foreground">
                        {transactions.length} transaction{transactions.length !== 1 ? 's' : ''}
                    </p>
                    <Select value={filterType} onValueChange={setFilterType}>
                        <SelectTrigger className="w-[150px]">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Types</SelectItem>
                            <SelectItem value="Expense">Expense</SelectItem>
                            <SelectItem value="Income">Income</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                <Dialog open={open} onOpenChange={setOpen}>
                    <DialogTrigger asChild>
                        <Button onClick={handleOpenCreate}>
                            <Plus className="h-4 w-4 mr-2" /> Add Transaction
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-lg">
                        <DialogHeader>
                            <DialogTitle>
                                {editing ? 'Edit Transaction' : 'Add Transaction'}
                            </DialogTitle>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Type *</Label>
                                    <Select
                                        value={formData.type}
                                        onValueChange={(val: 'Expense' | 'Income') =>
                                            setFormData({ ...formData, type: val })
                                        }
                                    >
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="Expense">Expense</SelectItem>
                                            <SelectItem value="Income">Income</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label>Date *</Label>
                                    <Input
                                        type="date"
                                        value={formData.date}
                                        onChange={(e) =>
                                            setFormData({ ...formData, date: e.target.value })
                                        }
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Account Type *</Label>
                                    <Select
                                        value={formData.accountType}
                                        onValueChange={(val) =>
                                            setFormData({
                                                ...formData,
                                                accountType: val as typeof formData.accountType,
                                            })
                                        }
                                    >
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="Petty Cash">Petty Cash</SelectItem>
                                            <SelectItem value="Undeposited Funds">
                                                Undeposited Funds
                                            </SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label>Category *</Label>
                                    <Select
                                        value={formData.categoryId}
                                        onValueChange={(val) =>
                                            setFormData({ ...formData, categoryId: val })
                                        }
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select category" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {categories.map((cat) => (
                                                <SelectItem key={cat._id} value={cat._id}>
                                                    {cat.name} ({cat.type})
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Amount *</Label>
                                    <Input
                                        type="number"
                                        value={formData.amount}
                                        onChange={(e) =>
                                            setFormData({
                                                ...formData,
                                                amount: parseFloat(e.target.value) || 0,
                                            })
                                        }
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Reference #</Label>
                                    <Input
                                        value={formData.referenceNumber}
                                        onChange={(e) =>
                                            setFormData({
                                                ...formData,
                                                referenceNumber: e.target.value,
                                            })
                                        }
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>From</Label>
                                    <Input
                                        value={formData.from}
                                        onChange={(e) =>
                                            setFormData({ ...formData, from: e.target.value })
                                        }
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>To</Label>
                                    <Input
                                        value={formData.to}
                                        onChange={(e) =>
                                            setFormData({ ...formData, to: e.target.value })
                                        }
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label>Remarks</Label>
                                <Input
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
                                {editing ? 'Update' : 'Save'}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>

            {transactions.length === 0 ? (
                <div className="text-center py-10 text-muted-foreground">No transactions yet.</div>
            ) : (
                <div className="rounded-md border">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Date</TableHead>
                                <TableHead>Type</TableHead>
                                <TableHead>Ref #</TableHead>
                                <TableHead>Account</TableHead>
                                <TableHead>Category</TableHead>
                                <TableHead className="text-right">Amount</TableHead>
                                <TableHead>From/To</TableHead>
                                <TableHead className="w-[80px]"></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {transactions.map((tx) => (
                                <TableRow key={tx._id}>
                                    <TableCell>{formatDate(tx.date)}</TableCell>
                                    <TableCell>
                                        <Badge
                                            variant={tx.type === 'Income' ? 'default' : 'secondary'}
                                        >
                                            {tx.type}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>{tx.referenceNumber || '-'}</TableCell>
                                    <TableCell>{tx.accountType}</TableCell>
                                    <TableCell>{tx.category?.name || '-'}</TableCell>
                                    <TableCell className="text-right font-medium">
                                        {tx.amount}
                                    </TableCell>
                                    <TableCell className="text-sm">
                                        {tx.from && <span>From: {tx.from}</span>}
                                        {tx.from && tx.to && <br />}
                                        {tx.to && <span>To: {tx.to}</span>}
                                        {!tx.from && !tx.to && '-'}
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex gap-1">
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => handleOpenEdit(tx)}
                                            >
                                                <Pencil className="h-4 w-4" />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => handleDelete(tx)}
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
