import React, { useState, useEffect } from 'react';
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
    const { api, refreshUser, systemInfo } = useAuth();
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
    const [assigningTo, setAssigningTo] = useState<any>(null);
    const [assignLoading, setAssignLoading] = useState(false);

    const fetchProducts = async () => {
        try {
            setLoading(true);
            const params = new URLSearchParams();
            if (search) params.append('search', search);
            if (category && category !== 'all') params.append('category', category);

            const prodRes = await api.get(`/marketplace/products?${params.toString()}`);
            setProducts(prodRes.data.data || []);
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
        if (!assigningTo) return;
        setAssignLoading(true);
        try {
            await api.post('/marketplace/purchase', {
                productId: assigningTo._id,
            });

            toast({
                title: 'Provisioning Successful!',
                description: `${assigningTo.name} has been enabled.`,
            });
            await refreshUser();
            window.location.reload(); // Refresh systemInfo
            setAssigningTo(null);
            fetchProducts();
        } catch (err: any) {
            toast({
                variant: 'destructive',
                title: 'Provisioning Failed',
                description:
                    err.response?.data?.message || err.message || 'Failed to provision module',
            });
        } finally {
            setAssignLoading(false);
        }
    };

    const handleUnsubscribe = async (productId: string, productName: string) => {
        if (!confirm(`Are you sure you want to disable ${productName}?`)) return;
        try {
            await api.post('/marketplace/unsubscribe', {
                productId,
            });
            toast({
                title: 'Unsubscribed',
                description: `Successfully disabled ${productName}.`,
            });
            await refreshUser();
            window.location.reload(); // Refresh systemInfo
            fetchProducts();
            setAssigningTo(null);
        } catch (err: any) {
            toast({
                variant: 'destructive',
                title: 'Unsubscribe Failed',
                description: err.response?.data?.message || 'Failed to unsubscribe',
            });
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Marketplace</h1>
                    <p className="text-sm text-muted-foreground">
                        Browse and enable modules for this instance
                    </p>
                </div>
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

            {/* Enable/Disable Dialog */}
            <Dialog open={!!assigningTo} onOpenChange={() => setAssigningTo(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Manage {assigningTo?.name}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <p className="text-sm text-muted-foreground">
                            {(() => {
                                const subscription = systemInfo?.enabledModules?.find(
                                    (m: any) => (m.slug || m) === assigningTo?.slug,
                                );
                                if (subscription && typeof subscription !== 'string') {
                                    return (
                                        <div className="bg-muted/50 rounded-xl p-4 border border-border/50 animate-in fade-in slide-in-from-top-2 duration-300">
                                            <div className="grid grid-cols-2 gap-4">
                                                <div>
                                                    <p className="text-[10px] uppercase tracking-wider font-extrabold text-muted-foreground/70 mb-1">
                                                        Activated On
                                                    </p>
                                                    <p className="text-sm font-bold text-foreground">
                                                        {new Date(
                                                            subscription.activatedAt,
                                                        ).toLocaleDateString()}
                                                    </p>
                                                </div>
                                                <div>
                                                    <p className="text-[10px] uppercase tracking-wider font-extrabold text-muted-foreground/70 mb-1">
                                                        Lease Ends
                                                    </p>
                                                    <p className="text-sm font-bold text-foreground">
                                                        {new Date(
                                                            subscription.expiresAt,
                                                        ).toLocaleDateString()}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="mt-4 pt-4 border-t border-border/50">
                                                <p className="text-xs font-medium text-muted-foreground">
                                                    This module is currently active. If you disable
                                                    it, all users will lose access to its features.
                                                </p>
                                            </div>
                                        </div>
                                    );
                                }
                                return systemInfo?.enabledModules?.some(
                                    (m: any) => (m.slug || m) === assigningTo?.slug,
                                )
                                    ? 'This module is currently enabled for this instance. If you disable it, all users will lose access to its features.'
                                    : 'Enable this module to activate its features for this instance.';
                            })()}
                        </p>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setAssigningTo(null)}>
                            Cancel
                        </Button>
                        {systemInfo?.enabledModules?.some(
                            (m: any) => (m.slug || m) === assigningTo?.slug,
                        ) ? (
                            <Button
                                variant="destructive"
                                onClick={() => handleUnsubscribe(assigningTo._id, assigningTo.name)}
                                disabled={assignLoading}
                            >
                                {assignLoading ? (
                                    <RefreshCw className="size-4 animate-spin mr-2" />
                                ) : (
                                    <AlertCircle className="size-4 mr-2" />
                                )}
                                Disable Module
                            </Button>
                        ) : (
                            <Button onClick={handleAssign} disabled={assignLoading}>
                                {assignLoading ? (
                                    <RefreshCw className="size-4 animate-spin mr-2" />
                                ) : (
                                    <UserPlus className="size-4 mr-2" />
                                )}
                                Enable Module
                            </Button>
                        )}
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
                                {(() => {
                                    const subscription = systemInfo?.enabledModules?.find(
                                        (m: any) => (m.slug || m) === p.slug,
                                    );
                                    if (subscription) {
                                        const activatedAt =
                                            typeof subscription === 'string'
                                                ? null
                                                : new Date(subscription.activatedAt);
                                        const expiresAt =
                                            typeof subscription === 'string'
                                                ? null
                                                : new Date(subscription.expiresAt);

                                        return (
                                            <div className="space-y-3">
                                                <div className="flex items-center gap-2 text-xs font-bold text-green-500 bg-green-500/10 px-3 py-1.5 rounded-lg border border-green-500/20">
                                                    <div className="size-1.5 rounded-full bg-green-500 animate-pulse" />
                                                    Active
                                                </div>

                                                {activatedAt && expiresAt && (
                                                    <div className="grid grid-cols-2 gap-2 text-[10px] uppercase tracking-wider font-bold text-muted-foreground/60">
                                                        <div>
                                                            <p className="mb-0.5">Activated</p>
                                                            <p className="text-foreground">
                                                                {activatedAt.toLocaleDateString()}
                                                            </p>
                                                        </div>
                                                        <div>
                                                            <p className="mb-0.5">Expires</p>
                                                            <p className="text-foreground">
                                                                {expiresAt.toLocaleDateString()}
                                                            </p>
                                                        </div>
                                                    </div>
                                                )}

                                                <Button
                                                    className="w-full text-red-500 hover:text-red-600 hover:bg-red-500/10 border-red-500/20"
                                                    variant="outline"
                                                    onClick={() => setAssigningTo(p)}
                                                >
                                                    <AlertCircle className="size-4 mr-2" />
                                                    Disable
                                                </Button>
                                            </div>
                                        );
                                    }

                                    return (
                                        <Button
                                            className="w-full"
                                            variant="outline"
                                            onClick={() => setAssigningTo(p)}
                                        >
                                            <UserPlus className="size-4 mr-2" />
                                            Enable
                                        </Button>
                                    );
                                })()}
                            </CardFooter>
                        </Card>
                    ))}
                </div>
            ) : !loading ? (
                <Card className="flex flex-col items-center justify-center py-16">
                    <Store className="size-12 text-muted-foreground mb-3" />
                    <h3 className="text-lg font-semibold">No Modules Available</h3>
                    <p className="text-sm text-muted-foreground">
                        There are currently no modules available in the marketplace.
                    </p>
                </Card>
            ) : null}
        </div>
    );
}
