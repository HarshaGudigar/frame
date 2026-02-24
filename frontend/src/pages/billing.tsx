import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { CreditCard, ExternalLink, Package, ShieldCheck, Info, AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { getBadgeColor } from '@/lib/module-styles';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from '@/components/ui/dialog';

export function BillingPage() {
    const { api, user, refreshUser, systemInfo } = useAuth();
    const { toast } = useToast();
    const [loading, setLoading] = useState(true);
    const [subscriptions, setSubscriptions] = useState<{ product: any }[]>([]);
    const [products, setProducts] = useState<any[]>([]);

    // Unsubscribe UI state
    const [unsubProcessing, setUnsubProcessing] = useState(false);
    const [moduleToCancel, setModuleToCancel] = useState<{ id: string; name: string } | null>(null);

    const fetchBillingData = async () => {
        try {
            setLoading(true);
            const prodRes = await api.get('/marketplace/products');
            const marketProducts = prodRes.data.data || [];
            setProducts(marketProducts);

            if (systemInfo?.enabledModules) {
                const subSlugs = systemInfo.enabledModules;
                // Only show modules that exist as products in the marketplace
                const filteredSubs = subSlugs.map((slug: string) =>
                    marketProducts.find((p: any) => p.slug === slug),
                ).filter(Boolean).map((p: any) => ({ product: p }));
                setSubscriptions(filteredSubs);
            } else {
                setSubscriptions([]);
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

    useEffect(() => {
        if (user && systemInfo) {
            fetchBillingData();
        }
    }, [api, toast, user, systemInfo]);

    const handleUnsubscribe = async () => {
        if (!moduleToCancel) return;
        setUnsubProcessing(true);
        try {
            await api.post('/marketplace/unsubscribe', {
                productId: moduleToCancel.id,
            });
            toast({
                title: 'Subscription Canceled',
                description: `Successfully removed ${moduleToCancel.name} from the instance.`,
            });
            // Need a hard refresh of the page to trigger new system health fetch
            window.location.reload();
            setModuleToCancel(null);
        } catch (err: any) {
            toast({
                variant: 'destructive',
                title: 'Cancellation Failed',
                description: err.response?.data?.message || 'Failed to cancel subscription',
            });
        } finally {
            setUnsubProcessing(false);
        }
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
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        {subscriptions.map((sub, i) => {
                            const details = sub.product;
                            return (
                                <Card
                                    key={i}
                                    className="group hover:border-primary/50 transition-colors flex flex-col"
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
                                                    {systemInfo?.instanceName || 'Local Instance'}
                                                </CardDescription>
                                            </div>
                                        </div>
                                        <Badge className={getBadgeColor('Paid')}>Active</Badge>
                                    </CardHeader>
                                    <CardContent className="flex-1">
                                        <p className="text-sm text-foreground font-semibold mb-1">
                                            {details.price?.amount ? `$${details.price.amount}/${details.price.interval || 'mo'}` : 'Free'}
                                        </p>
                                        <p className="text-sm text-muted-foreground line-clamp-2">
                                            {details.description ||
                                                'Included in your organization plan.'}
                                        </p>
                                    </CardContent>
                                    <div className="p-6 pt-0 mt-auto">
                                        <Button
                                            variant="outline"
                                            className="w-full border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 hover:border-red-300 transition-colors dark:border-red-900/50 dark:hover:bg-red-900/20"
                                            onClick={() => setModuleToCancel({ id: details._id, name: details.name })}
                                        >
                                            Cancel Plan
                                        </Button>
                                    </div>
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

            {/* Cancel Confirmation Dialog */}
            <Dialog open={!!moduleToCancel} onOpenChange={(open) => !open && setModuleToCancel(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle className="text-red-600 flex items-center gap-2">
                            <AlertCircle className="size-5" />
                            Cancel Subscription
                        </DialogTitle>
                        <DialogDescription>
                            Are you sure you want to cancel your subscription for <strong>{moduleToCancel?.name}</strong>?
                            This action will immediately disable access to the module.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="mt-4">
                        <Button variant="outline" onClick={() => setModuleToCancel(null)} disabled={unsubProcessing}>
                            Keep Subscription
                        </Button>
                        <Button variant="destructive" onClick={handleUnsubscribe} disabled={unsubProcessing}>
                            {unsubProcessing ? (
                                <>
                                    <RefreshCw className="size-4 animate-spin mr-2" />
                                    Canceling...
                                </>
                            ) : (
                                'Yes, Cancel Plan'
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
