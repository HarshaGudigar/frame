import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { Plus, Pencil, Trash2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '@/components/ui/dialog';

export function TenantsPage() {
    const { api } = useAuth();
    const { toast } = useToast();
    const [tenants, setTenants] = useState<any[]>([]);
    const [showForm, setShowForm] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [form, setForm] = useState({
        name: '',
        slug: '',
        vmIpAddress: '',
        subscribedModules: '',
    });
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    const fetchTenants = async () => {
        try {
            setLoading(true);
            const res = await api.get('/admin/tenants');
            setTenants(res.data.data);
        } catch {
            toast({
                variant: 'destructive',
                title: 'Error',
                description: 'Failed to load tenants.',
            });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchTenants();
    }, []);

    const resetForm = () => {
        setForm({ name: '', slug: '', vmIpAddress: '', subscribedModules: '' });
        setEditingId(null);
        setShowForm(false);
        setError(null);
    };

    const handleEdit = (tenant: any) => {
        setForm({
            name: tenant.name,
            slug: tenant.slug,
            vmIpAddress: tenant.vmIpAddress || '',
            subscribedModules: (tenant.subscribedModules || []).join(', '),
        });
        setEditingId(tenant._id);
        setShowForm(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        const payload = {
            name: form.name,
            slug: form.slug,
            vmIpAddress: form.vmIpAddress,
            subscribedModules: form.subscribedModules
                .split(',')
                .map((s) => s.trim())
                .filter(Boolean),
        };

        try {
            if (editingId) {
                await api.put(`/admin/tenants/${editingId}`, payload);
            } else {
                await api.post('/admin/tenants', payload);
            }
            resetForm();
            fetchTenants();
        } catch (err: any) {
            setError(err.response?.data?.message || 'Operation failed');
        }
    };

    const handleDelete = async (id: string, name: string) => {
        if (!confirm(`Delete tenant "${name}"? This cannot be undone.`)) return;
        try {
            await api.delete(`/admin/tenants/${id}`);
            fetchTenants();
        } catch (err: any) {
            toast({
                variant: 'destructive',
                title: 'Delete Failed',
                description: err.response?.data?.message || 'Failed to delete tenant.',
            });
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Tenant Management</h1>
                    <p className="text-sm text-muted-foreground">
                        Create and manage customer instances
                    </p>
                </div>
                <Button
                    onClick={() => {
                        resetForm();
                        setShowForm(true);
                    }}
                    size="sm"
                >
                    <Plus className="size-4 mr-2" />
                    New Tenant
                </Button>
            </div>

            {/* Create/Edit Dialog */}
            <Dialog
                open={showForm}
                onOpenChange={(open) => {
                    if (!open) resetForm();
                }}
            >
                <DialogContent className="sm:max-w-lg">
                    <DialogHeader>
                        <DialogTitle>{editingId ? 'Edit Tenant' : 'Create Tenant'}</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <Label htmlFor="name">Name</Label>
                                <Input
                                    id="name"
                                    required
                                    value={form.name}
                                    placeholder="My Clinic"
                                    onChange={(e) =>
                                        setForm((f) => ({ ...f, name: e.target.value }))
                                    }
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label htmlFor="slug">Slug</Label>
                                <Input
                                    id="slug"
                                    required
                                    value={form.slug}
                                    placeholder="my-clinic"
                                    disabled={!!editingId}
                                    onChange={(e) =>
                                        setForm((f) => ({ ...f, slug: e.target.value }))
                                    }
                                />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <Label htmlFor="ip">VM IP Address</Label>
                                <Input
                                    id="ip"
                                    value={form.vmIpAddress}
                                    placeholder="1.2.3.4"
                                    onChange={(e) =>
                                        setForm((f) => ({ ...f, vmIpAddress: e.target.value }))
                                    }
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label htmlFor="modules">Modules (comma-separated)</Label>
                                <Input
                                    id="modules"
                                    value={form.subscribedModules}
                                    placeholder="hospital, pharmacy"
                                    onChange={(e) =>
                                        setForm((f) => ({
                                            ...f,
                                            subscribedModules: e.target.value,
                                        }))
                                    }
                                />
                            </div>
                        </div>

                        {error && (
                            <div className="flex items-center gap-2 text-sm text-destructive">
                                <AlertCircle className="size-4" />
                                {error}
                            </div>
                        )}

                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={resetForm}>
                                Cancel
                            </Button>
                            <Button type="submit">{editingId ? 'Update' : 'Create'}</Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Tenants Table */}
            <Card>
                <CardContent className="pt-6">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Name</TableHead>
                                <TableHead>Slug</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>IP</TableHead>
                                <TableHead>Modules</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading &&
                                tenants.length === 0 &&
                                Array.from({ length: 3 }).map((_, i) => (
                                    <TableRow key={`skeleton-${i}`}>
                                        {Array.from({ length: 6 }).map((_, j) => (
                                            <TableCell key={j}>
                                                <Skeleton className="h-4 w-full" />
                                            </TableCell>
                                        ))}
                                    </TableRow>
                                ))}
                            {tenants.map((t) => (
                                <TableRow key={t._id}>
                                    <TableCell className="font-medium">{t.name}</TableCell>
                                    <TableCell>
                                        <code className="text-xs bg-muted px-1.5 py-0.5 rounded">
                                            {t.slug}
                                        </code>
                                    </TableCell>
                                    <TableCell>
                                        <Badge
                                            variant={
                                                t.status === 'online' ? 'default' : 'secondary'
                                            }
                                            className={
                                                t.status === 'online'
                                                    ? 'bg-green-500/15 text-green-500 hover:bg-green-500/25'
                                                    : t.status === 'error'
                                                      ? 'bg-destructive/15 text-destructive hover:bg-destructive/25'
                                                      : ''
                                            }
                                        >
                                            {t.status || 'offline'}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-muted-foreground">
                                        {t.vmIpAddress || '—'}
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex flex-wrap gap-1">
                                            {t.subscribedModules?.map((m: string) => (
                                                <Badge
                                                    key={m}
                                                    variant="outline"
                                                    className="text-xs"
                                                >
                                                    {m}
                                                </Badge>
                                            ))}
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex justify-end gap-1">
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="size-8"
                                                onClick={() => handleEdit(t)}
                                            >
                                                <Pencil className="size-3.5" />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="size-8 text-destructive hover:text-destructive"
                                                onClick={() => handleDelete(t._id, t.name)}
                                            >
                                                <Trash2 className="size-3.5" />
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                            {!tenants.length && !loading && (
                                <TableRow>
                                    <TableCell
                                        colSpan={6}
                                        className="text-center text-muted-foreground py-8"
                                    >
                                        No tenants yet. Create your first one!
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}
