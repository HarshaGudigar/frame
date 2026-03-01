import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Server, AlertCircle, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/auth-context';
import { useToast } from '@/hooks/use-toast';

const API_BASE = `${window.location.protocol}//${window.location.hostname}:5000/api`;

export function AcceptInvitePage() {
    const { login, logout, token: authToken } = useAuth();
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const { toast } = useToast();
    const token = searchParams.get('token');
    const [form, setForm] = useState({ password: '', confirmPassword: '' });
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (authToken) {
            logout();
        }
    }, [authToken, logout]);

    if (!token) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-background to-muted/50">
                <Card className="w-full max-w-md shadow-2xl border-border/50">
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-2 text-destructive">
                            <AlertCircle className="size-4" />
                            <p>Invalid invitation link. No token provided.</p>
                        </div>
                    </CardContent>
                </Card>
            </div>
        );
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        if (form.password !== form.confirmPassword) {
            setError('Passwords do not match');
            return;
        }

        setLoading(true);
        try {
            const res = await axios.post(`${API_BASE}/auth/accept-invite`, {
                token,
                password: form.password,
                confirmPassword: form.confirmPassword,
            });
            login(res.data.data.accessToken, res.data.data.refreshToken, res.data.data.user);
            toast({
                title: 'Account Activated',
                description: 'Your account is now active. Welcome!',
            });
            navigate('/');
        } catch (err: any) {
            const msg = err.response?.data?.message || 'Failed to accept invitation';
            setError(msg);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-background to-muted/50">
            <Card className="w-full max-w-md shadow-2xl border-border/50">
                <CardHeader className="text-center space-y-2 pb-4">
                    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground">
                        <Server className="size-6" />
                    </div>
                    <h1 className="text-2xl font-bold tracking-tight">Accept Invitation</h1>
                    <p className="text-sm text-muted-foreground">
                        Set your password to activate your account
                    </p>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-1.5">
                            <Label htmlFor="password">Password</Label>
                            <Input
                                id="password"
                                type="password"
                                placeholder="Min 6 characters"
                                required
                                value={form.password}
                                onChange={(e) =>
                                    setForm((f) => ({ ...f, password: e.target.value }))
                                }
                            />
                        </div>

                        <div className="space-y-1.5">
                            <Label htmlFor="confirmPassword">Confirm Password</Label>
                            <Input
                                id="confirmPassword"
                                type="password"
                                placeholder="Confirm your password"
                                required
                                value={form.confirmPassword}
                                onChange={(e) =>
                                    setForm((f) => ({ ...f, confirmPassword: e.target.value }))
                                }
                            />
                        </div>

                        {error && (
                            <div className="flex items-center gap-2 text-sm text-destructive">
                                <AlertCircle className="size-4" />
                                {error}
                            </div>
                        )}

                        <Button type="submit" className="w-full" disabled={loading}>
                            {loading ? 'Please wait...' : 'Set Password & Activate'}
                        </Button>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}
