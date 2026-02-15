import { useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import axios from 'axios';
import { Server, AlertCircle, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Label } from '@/components/ui/label';

const API_BASE = `${window.location.protocol}//${window.location.hostname}:5000/api`;

export function ResetPasswordPage() {
    const [searchParams] = useSearchParams();
    const token = searchParams.get('token');
    const [form, setForm] = useState({ password: '', confirmPassword: '' });
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);

    if (!token) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-background to-muted/50">
                <Card className="w-full max-w-md shadow-2xl border-border/50">
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-2 text-destructive">
                            <AlertCircle className="size-4" />
                            <p>Invalid reset link. No token provided.</p>
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
            await axios.post(`${API_BASE}/auth/reset-password`, {
                token,
                password: form.password,
                confirmPassword: form.confirmPassword,
            });
            setSuccess(true);
        } catch (err: any) {
            const msg = err.response?.data?.message || 'Password reset failed';
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
                    <h1 className="text-2xl font-bold tracking-tight">Reset Password</h1>
                    <p className="text-sm text-muted-foreground">
                        {success ? 'Your password has been reset' : 'Choose a new password'}
                    </p>
                </CardHeader>
                <CardContent>
                    {success ? (
                        <div className="space-y-4 text-center">
                            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
                                <Check className="h-6 w-6 text-green-600 dark:text-green-400" />
                            </div>
                            <p className="text-sm text-muted-foreground">
                                Your password has been reset successfully. You can now sign in with
                                your new password.
                            </p>
                            <Button asChild className="w-full">
                                <Link to="/">Go to Login</Link>
                            </Button>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="space-y-1.5">
                                <Label htmlFor="password">New Password</Label>
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
                                {loading ? 'Please wait...' : 'Reset Password'}
                            </Button>
                        </form>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
