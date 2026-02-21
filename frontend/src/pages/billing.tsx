import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { CreditCard, ExternalLink, Package, ShieldCheck, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';

export function BillingPage() {
    const { api, user } = useAuth();
    const { toast } = useToast();
    const [loading, setLoading] = useState(true);
    const [subscriptions, setSubscriptions] = useState<any[]>([]);

    // We assume the user has a selected tenant in a real app,
    // but for now we fetch subscriptions for all tenants they have access to,
    // or just rely on the API to return the context tenant's subs.

    useEffect(() => {
        const fetchBillingData = async () => {
            try {
                // In a multi-tenant app, the active tenant ID should be in headers
                // For this demo, we assume the backend returns subs for the active context
                // We'll just fetch the tenant info to display
                const res = await api.get('/admin/tenants');
                const activeTenants = res.data.data;

                // For simplicity, we just look at the first tenant's subscribed modules
                if (activeTenants.length > 0) {
                    setSubscriptions(activeTenants[0].subscribedModules || []);
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

        // Also handle the success redirect from Stripe Checkout
        const query = new URLSearchParams(window.location.search);
        if (query.get('success')) {
            toast({
                title: 'Subscription Active',
                description: 'Your payment was successful and the module is provisioning.',
            });
            window.history.replaceState({}, '', window.location.pathname);
        }

        fetchBillingData();
    }, [api, toast]);

    // No longer using Stripe Customer Portal
    // For Razorpay, subscriptions are managed via their own dashboard or custom API integration.
    // For now, we will just display active modules here.

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
                <h2 className="text-xl font-semibold mb-4">Active Modules</h2>
                {loading ? (
                    <div className="space-y-4">
                        <Skeleton className="h-20 w-full" />
                        <Skeleton className="h-20 w-full" />
                    </div>
                ) : subscriptions.length > 0 ? (
                    <div className="grid gap-4 sm:grid-cols-2">
                        {subscriptions.map((modSlug, i) => (
                            <Card key={i}>
                                <CardHeader className="pb-3 flex flex-row items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <Package className="size-5 text-muted-foreground" />
                                        <CardTitle className="text-lg capitalize">
                                            {modSlug.replace('-', ' ')}
                                        </CardTitle>
                                    </div>
                                    <Badge variant="default" className="bg-green-500">
                                        Active
                                    </Badge>
                                </CardHeader>
                                <CardContent>
                                    <p className="text-sm text-muted-foreground">
                                        Included in your organization plan.
                                    </p>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                ) : (
                    <Card className="flex flex-col items-center justify-center py-12 text-center">
                        <ShieldCheck className="size-12 text-muted-foreground mb-4" />
                        <h3 className="text-lg font-semibold">No Active Subscriptions</h3>
                        <p className="text-sm text-muted-foreground max-w-sm mb-4">
                            You are currently on the free tier. Visit the Marketplace to subscribe
                            to premium modules.
                        </p>
                    </Card>
                )}
            </div>
        </div>
    );
}
