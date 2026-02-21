import React, { useState, useEffect } from 'react';
import { useRazorpay } from 'react-razorpay';
import { useAuth } from '@/contexts/auth-context';
import { Plus, Store, Package, AlertCircle, UserPlus, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '@/components/ui/dialog';

export function MarketplacePage() {
    const { api } = useAuth();
    const { toast } = useToast();
    const [products, setProducts] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [form, setForm] = useState({
        name: '',
        slug: '',
        description: '',
        amount: '',
        interval: 'monthly',
        features: '',
    });
    const [error, setError] = useState<string | null>(null);
    const [search, setSearch] = useState('');
    const [category, setCategory] = useState('all');
    const [tenants, setTenants] = useState<any[]>([]);
    const [assigningTo, setAssigningTo] = useState<any>(null);
    const [selectedTenant, setSelectedTenant] = useState('');
    const [assignLoading, setAssignLoading] = useState(false);
    const { Razorpay } = useRazorpay();

    const fetchProducts = async () => {
        try {
            setLoading(true);
            const params = new URLSearchParams();
            if (search) params.append('search', search);
            if (category && category !== 'all') params.append('category', category);

            const [prodRes, tenantRes] = await Promise.all([
                api.get(`/marketplace/products?${params.toString()}`),
                api.get('/admin/tenants'),
            ]);
            setProducts(prodRes.data.data || []);
            setTenants(tenantRes.data.data || []);
        } catch {
            toast({
                variant: 'destructive',
                title: 'Error',
                description: 'Failed to load marketplace content.',
            });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const timer = setTimeout(fetchProducts, 300);
        return () => clearTimeout(timer);
    }, [search, category]);

    useEffect(() => {
        const query = new URLSearchParams(window.location.search);
        if (query.get('success')) {
            toast({
                title: 'Checkout Successful!',
                description: 'Your subscription is now active.',
            });
        }
        if (query.get('canceled')) {
            toast({
                variant: 'destructive',
                title: 'Checkout Canceled',
                description: 'You abandoned the checkout process.',
            });
        }
        // Clean up URL
        if (query.has('success') || query.has('canceled')) {
            window.history.replaceState({}, '', window.location.pathname);
        }
    }, [toast]);

    const formatPrice = (price: any) => {
        if (!price || !price.amount) return 'Free';
        return `$${price.amount}/${price.interval || 'mo'}`;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        try {
            await api.post('/marketplace/products', {
                name: form.name,
                slug: form.slug,
                description: form.description,
                price: {
                    amount: Number(form.amount) || 0,
                    currency: 'USD',
                    interval: form.interval,
                },
                features: form.features
                    .split(',')
                    .map((s) => s.trim())
                    .filter(Boolean),
            });
            setForm({
                name: '',
                slug: '',
                description: '',
                amount: '',
                interval: 'monthly',
                features: '',
            });
            setShowForm(false);
            fetchProducts();
        } catch (err: any) {
            setError(err.response?.data?.message || 'Failed to create product');
        }
    };

    const handleAssign = async () => {
        if (!selectedTenant || !assigningTo) return;
        setAssignLoading(true);
        try {
            // 1. Create Subscription on Backend
            const res = await api.post(
                '/m/billing/checkout',
                {
                    tenantId: selectedTenant,
                    productId: assigningTo._id,
                },
                {
                    headers: { 'x-tenant-id': selectedTenant },
                },
            );

            const { subscription_id, key_id } = res.data.data;

            // 2. Open Razorpay Checkou Modal
            const options = {
                key: key_id,
                subscription_id: subscription_id,
                name: 'Alyxnet Frame',
                description: `Subscription for ${assigningTo.name}`,
                handler: async function (response: any) {
                    try {
                        // 3. Verify Payment
                        await api.post(
                            '/m/billing/verify',
                            {
                                razorpay_payment_id: response.razorpay_payment_id,
                                razorpay_subscription_id: response.razorpay_subscription_id,
                                razorpay_signature: response.razorpay_signature,
                            },
                            {
                                headers: { 'x-tenant-id': selectedTenant },
                            },
                        );

                        toast({
                            title: 'Checkout Successful!',
                            description: 'Your subscription is now active.',
                        });
                        setAssigningTo(null);
                        setSelectedTenant('');
                        fetchProducts();
                    } catch (err: any) {
                        toast({
                            variant: 'destructive',
                            title: 'Verification Failed',
                            description: 'Payment was made but verification failed.',
                        });
                    }
                },
                theme: {
                    color: '#0f172a', // Tailwind slate-900 or primary
                },
            };

            const rzp = new Razorpay(options);

            rzp.on('payment.failed', function (response: any) {
                toast({
                    variant: 'destructive',
                    title: 'Payment Failed',
                    description: response.error.description,
                });
            });

            rzp.open();
        } catch (err: any) {
            toast({
                variant: 'destructive',
                title: 'Checkout Failed',
                description:
                    err.response?.data?.message || err.message || 'Failed to initiate checkout',
            });
            setAssignLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Marketplace</h1>
                    <p className="text-sm text-muted-foreground">
                        Browse and purchase modules for your tenants
                    </p>
                </div>
                <Button onClick={() => setShowForm(true)} size="sm">
                    <Plus className="size-4 mr-2" />
                    Add Product
                </Button>
            </div>

            <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1">
                    <Input
                        placeholder="Search modules..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
                <div className="w-full sm:w-[200px]">
                    <Select value={category} onValueChange={setCategory}>
                        <SelectTrigger>
                            <SelectValue placeholder="All Categories" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Categories</SelectItem>
                            <SelectItem value="Sales">Sales</SelectItem>
                            <SelectItem value="Marketing">Marketing</SelectItem>
                            <SelectItem value="Infrastructure">Infrastructure</SelectItem>
                            <SelectItem value="General">General</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>

            {/* Add Product Dialog */}
            <Dialog
                open={showForm}
                onOpenChange={(open) => {
                    if (!open) {
                        setShowForm(false);
                        setError(null);
                    }
                }}
            >
                <DialogContent className="sm:max-w-lg">
                    <DialogHeader>
                        <DialogTitle>New Product</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <Label htmlFor="prodName">Name</Label>
                                <Input
                                    id="prodName"
                                    required
                                    value={form.name}
                                    placeholder="Hospital Module"
                                    onChange={(e) =>
                                        setForm((f) => ({ ...f, name: e.target.value }))
                                    }
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label htmlFor="prodSlug">Slug</Label>
                                <Input
                                    id="prodSlug"
                                    required
                                    value={form.slug}
                                    placeholder="hospital"
                                    onChange={(e) =>
                                        setForm((f) => ({ ...f, slug: e.target.value }))
                                    }
                                />
                            </div>
                        </div>
                        <div className="space-y-1.5">
                            <Label htmlFor="prodDesc">Description</Label>
                            <Input
                                id="prodDesc"
                                value={form.description}
                                placeholder="Full hospital management suite"
                                onChange={(e) =>
                                    setForm((f) => ({ ...f, description: e.target.value }))
                                }
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <Label htmlFor="prodPrice">Price (USD)</Label>
                                <Input
                                    id="prodPrice"
                                    type="number"
                                    value={form.amount}
                                    placeholder="99"
                                    onChange={(e) =>
                                        setForm((f) => ({ ...f, amount: e.target.value }))
                                    }
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label>Billing</Label>
                                <Select
                                    value={form.interval}
                                    onValueChange={(val) =>
                                        setForm((f) => ({ ...f, interval: val }))
                                    }
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="monthly">Monthly</SelectItem>
                                        <SelectItem value="yearly">Yearly</SelectItem>
                                        <SelectItem value="once">One-time</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <div className="space-y-1.5">
                            <Label htmlFor="prodFeatures">Features (comma-separated)</Label>
                            <Input
                                id="prodFeatures"
                                value={form.features}
                                placeholder="Patient records, Appointments, Billing"
                                onChange={(e) =>
                                    setForm((f) => ({ ...f, features: e.target.value }))
                                }
                            />
                        </div>

                        {error && (
                            <div className="flex items-center gap-2 text-sm text-destructive">
                                <AlertCircle className="size-4" />
                                {error}
                            </div>
                        )}

                        <DialogFooter>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setShowForm(false)}
                            >
                                Cancel
                            </Button>
                            <Button type="submit">Create Product</Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Assign to Tenant Dialog */}
            <Dialog open={!!assigningTo} onOpenChange={() => setAssigningTo(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Assign {assigningTo?.name}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label>Select Tenant</Label>
                            <Select value={selectedTenant} onValueChange={setSelectedTenant}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Choose a tenant..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {tenants.map((t) => (
                                        <SelectItem key={t._id} value={t._id}>
                                            {t.name} ({t.slug})
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setAssigningTo(null)}>
                            Cancel
                        </Button>
                        <Button onClick={handleAssign} disabled={assignLoading || !selectedTenant}>
                            {assignLoading ? (
                                <RefreshCw className="size-4 animate-spin mr-2" />
                            ) : (
                                <UserPlus className="size-4 mr-2" />
                            )}
                            Provision Now
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
            {loading && products.length === 0 ? (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {Array.from({ length: 3 }).map((_, i) => (
                        <Card key={i} className="flex flex-col">
                            <CardHeader className="pb-3">
                                <Skeleton className="h-10 w-10 rounded-lg mb-2" />
                                <Skeleton className="h-5 w-32" />
                                <Skeleton className="h-4 w-48 mt-1" />
                            </CardHeader>
                            <CardContent className="flex-1">
                                <Skeleton className="h-8 w-20 mb-3" />
                                <div className="space-y-2">
                                    <Skeleton className="h-3 w-full" />
                                    <Skeleton className="h-3 w-3/4" />
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            ) : products.length > 0 ? (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {products.map((p) => (
                        <Card key={p._id} className="flex flex-col">
                            <CardHeader className="pb-3">
                                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 mb-2">
                                    <Package className="size-5 text-primary" />
                                </div>
                                <CardTitle className="text-lg">{p.name}</CardTitle>
                                <p className="text-sm text-muted-foreground">
                                    {p.description || 'No description'}
                                </p>
                            </CardHeader>
                            <CardContent className="flex-1">
                                <p className="text-2xl font-bold text-primary mb-3">
                                    {formatPrice(p.price)}
                                </p>
                                {p.features?.length > 0 && (
                                    <ul className="space-y-1 text-sm text-muted-foreground">
                                        {p.features.map((f: string, i: number) => (
                                            <li key={i} className="flex items-center gap-2">
                                                <span className="size-1 rounded-full bg-primary" />
                                                {f}
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </CardContent>
                            <CardFooter className="pt-0 pb-6">
                                {tenants.length === 1 &&
                                tenants[0].subscribedModules?.includes(p.slug) ? (
                                    <Button className="w-full bg-green-600 hover:bg-green-700 cursor-default">
                                        <RefreshCw className="size-4 mr-2" />
                                        Active
                                    </Button>
                                ) : (
                                    <Button
                                        className="w-full"
                                        variant="outline"
                                        onClick={() => setAssigningTo(p)}
                                    >
                                        <UserPlus className="size-4 mr-2" />
                                        Assign to Tenant
                                    </Button>
                                )}
                            </CardFooter>
                        </Card>
                    ))}
                </div>
            ) : !loading ? (
                <Card className="flex flex-col items-center justify-center py-16">
                    <Store className="size-12 text-muted-foreground mb-3" />
                    <h3 className="text-lg font-semibold">No Products Yet</h3>
                    <p className="text-sm text-muted-foreground">
                        Click "Add Product" to create your first marketplace module.
                    </p>
                </Card>
            ) : null}
        </div>
    );
}
