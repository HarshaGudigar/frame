import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { CreditCard, ExternalLink, Package, ShieldCheck, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { getBadgeColor } from '@/lib/module-styles';

export function BillingPage() {
    const { api } = useAuth();
    const { toast } = useToast();
    const [loading, setLoading] = useState(true);
    const [subscriptions, setSubscriptions] = useState<any[]>([]);
    const [products, setProducts] = useState<any[]>([]);

    useEffect(() => {
        const fetchBillingData = async () => {
            try {
                const [tenantRes, prodRes] = await Promise.all([
                    api.get('/admin/tenants'),
                    api.get('/marketplace/products'),
                ]);

                const activeTenants = tenantRes.data.data;
                const marketProducts = prodRes.data.data || [];
                setProducts(marketProducts);

                if (activeTenants.length > 0) {
                    const subSlugs = activeTenants[0].subscribedModules || [];
                    // Only show modules that exist as products in the marketplace
                    const filteredSubs = subSlugs.filter((slug: string) =>
                        marketProducts.find((p: any) => p.slug === slug),
                    );
                    setSubscriptions(filteredSubs);
                }
            } catch (err: any) {
                toast({
                    variant: 'destructive',
                    title: 'Error',
                    description: 'Failed to load billing information.',
                });
            } finally {
                setLoading(false);
            }
        };

        fetchBillingData();
    }, [api, toast]);

    const getProductDetails = (slug: string) => {
        return (
            products.find((p) => p.slug === slug) || {
                name: slug,
                description: 'Module subscription.',
            }
        );
    };

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Billing & Subscriptions</h1>
                <p className="text-sm text-muted-foreground">
                    Manage your subscription plans, payment methods, and billing history.
                </p>
            </div>

            <Card className="border-primary/20 bg-primary/5">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <CreditCard className="size-5 text-primary" />
                        Billing Overview
                    </CardTitle>
                    <CardDescription>
                        View your active module subscriptions and manage billing details.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <p className="text-sm text-foreground/80">
                        Payments are securely processed via Razorpay. Your current plan status is
                        strictly tied to your active marketplace modules.
                    </p>
                </CardContent>
            </Card>

            <div>
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-semibold">Active Modules</h2>
                    {!loading && subscriptions.length > 0 && (
                        <Badge variant="outline" className="text-xs font-normal">
                            {subscriptions.length} Subscribed
                        </Badge>
                    )}
                </div>

                {loading ? (
                    <div className="grid gap-4 sm:grid-cols-2">
                        <Skeleton className="h-32 w-full" />
                        <Skeleton className="h-32 w-full" />
                    </div>
                ) : subscriptions.length > 0 ? (
                    <div className="grid gap-4 sm:grid-cols-2">
                        {subscriptions.map((modSlug, i) => {
                            const details = getProductDetails(modSlug);
                            return (
                                <Card
                                    key={i}
                                    className="group hover:border-primary/50 transition-colors"
                                >
                                    <CardHeader className="pb-3 flex flex-row items-start justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors">
                                                <Package className="size-5 text-primary" />
                                            </div>
                                            <div>
                                                <CardTitle className="text-lg">
                                                    {details.name}
                                                </CardTitle>
                                                <CardDescription className="text-xs">
                                                    Slot {i + 1}
                                                </CardDescription>
                                            </div>
                                        </div>
                                        <Badge className={getBadgeColor('Paid')}>Active</Badge>
                                    </CardHeader>
                                    <CardContent>
                                        <p className="text-sm text-muted-foreground line-clamp-2">
                                            {details.description ||
                                                'Included in your organization plan.'}
                                        </p>
                                    </CardContent>
                                </Card>
                            );
                        })}
                    </div>
                ) : (
                    <Card className="flex flex-col items-center justify-center py-12 text-center border-dashed">
                        <ShieldCheck className="size-12 text-muted-foreground/40 mb-4" />
                        <h3 className="text-lg font-semibold">No Active Subscriptions</h3>
                        <p className="text-sm text-muted-foreground max-w-sm mb-6">
                            You are currently on the free tier. Visit the Marketplace to subscribe
                            to premium modules.
                        </p>
                        <Button variant="outline" asChild>
                            <a href="/marketplace">Visit Marketplace</a>
                        </Button>
                    </Card>
                )}
            </div>
        </div>
    );
}
