import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { Server, AlertCircle, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/auth-context';

const API_BASE = `${window.location.protocol}//${window.location.hostname}:5000/api`;

export function LoginPage() {
    const { login, systemInfo } = useAuth();
    const [form, setForm] = useState({ email: '', password: '', firstName: '', lastName: '' });
    const [isRegister, setIsRegister] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    // 2FA state
    const [twoFactorPending, setTwoFactorPending] = useState(false);
    const [twoFactorToken, setTwoFactorToken] = useState('');
    const [totpCode, setTotpCode] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setLoading(true);
        try {
            const endpoint = isRegister ? 'register' : 'login';
            const res = await axios.post(`${API_BASE}/auth/${endpoint}`, form);

            // Check if 2FA is required
            if (res.data.data.requiresTwoFactor) {
                setTwoFactorToken(res.data.data.twoFactorToken);
                setTwoFactorPending(true);
                return;
            }

            login(res.data.data.accessToken, res.data.data.refreshToken, res.data.data.user);
        } catch (err: any) {
            console.error('Login error:', err);
            let msg = err.response?.data?.message || err.message || 'Authentication failed';

            // Handle Zod validation errors
            if (err.response?.data?.errors?.length > 0) {
                const validationErrors = err.response.data.errors
                    .map((e: any) => `${e.field}: ${e.message}`)
                    .join(', ');
                msg = `Validation failed: ${validationErrors}`;
            }

            setError(msg);
        } finally {
            setLoading(false);
        }
    };

    const handleTwoFactorSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setLoading(true);
        try {
            const res = await axios.post(`${API_BASE}/auth/2fa/verify-login`, {
                twoFactorToken,
                code: totpCode,
            });
            login(res.data.data.accessToken, res.data.data.refreshToken, res.data.data.user);
        } catch (err: any) {
            console.error('2FA verification error:', err);
            const msg =
                err.response?.data?.message || err.message || 'Two-factor verification failed';
            setError(msg);
        } finally {
            setLoading(false);
        }
    };

    const resetTwoFactor = () => {
        setTwoFactorPending(false);
        setTwoFactorToken('');
        setTotpCode('');
        setError(null);
    };

    const displayTitle = systemInfo?.instanceName || 'Alyxnet Framework';

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-background to-muted/50">
            <Card className="w-full max-w-md shadow-2xl border-border/50">
                <CardHeader className="text-center space-y-2 pb-4">
                    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-xl shadow-primary/20 overflow-hidden">
                        {systemInfo?.branding?.logo ? (
                            <img
                                src={systemInfo.branding.logo}
                                className="size-7 object-contain"
                                alt="Logo"
                            />
                        ) : (
                            <Server className="size-7" />
                        )}
                    </div>
                    <h1 className="text-2xl font-bold tracking-tight">{displayTitle}</h1>
                    <p className="text-sm text-muted-foreground">
                        {systemInfo?.instanceDescription || 'Enterprise Control Plane'}
                    </p>
                </CardHeader>
                <CardContent>
                    {twoFactorPending ? (
                        <form onSubmit={handleTwoFactorSubmit} className="space-y-4">
                            <h3 className="text-lg font-semibold">Two-Factor Authentication</h3>
                            <p className="text-sm text-muted-foreground">
                                Enter the 6-digit code from your authenticator app.
                            </p>

                            <div className="space-y-1.5">
                                <Label htmlFor="totpCode">Verification Code</Label>
                                <Input
                                    id="totpCode"
                                    inputMode="numeric"
                                    maxLength={6}
                                    placeholder="000000"
                                    required
                                    autoFocus
                                    value={totpCode}
                                    onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, ''))}
                                    className="text-center text-2xl tracking-[0.5em] font-mono"
                                />
                            </div>

                            {error && (
                                <div className="flex items-center gap-2 text-sm text-destructive">
                                    <AlertCircle className="size-4" />
                                    {error}
                                </div>
                            )}

                            <Button
                                type="submit"
                                className="w-full"
                                disabled={loading || totpCode.length !== 6}
                            >
                                {loading ? 'Verifying...' : 'Verify & Sign In'}
                            </Button>

                            <button
                                type="button"
                                className="w-full flex items-center justify-center gap-1 text-sm text-primary hover:underline bg-transparent border-none cursor-pointer"
                                onClick={resetTwoFactor}
                            >
                                <ArrowLeft className="size-3" />
                                Back to Sign In
                            </button>
                        </form>
                    ) : (
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <h3 className="text-lg font-semibold">
                                {isRegister ? 'Create Account' : 'Welcome Back'}
                            </h3>

                            {isRegister && (
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="space-y-1.5">
                                        <Label htmlFor="firstName">First Name</Label>
                                        <Input
                                            id="firstName"
                                            placeholder="John"
                                            value={form.firstName}
                                            onChange={(e) =>
                                                setForm((f) => ({
                                                    ...f,
                                                    firstName: e.target.value,
                                                }))
                                            }
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label htmlFor="lastName">Last Name</Label>
                                        <Input
                                            id="lastName"
                                            placeholder="Doe"
                                            value={form.lastName}
                                            onChange={(e) =>
                                                setForm((f) => ({ ...f, lastName: e.target.value }))
                                            }
                                        />
                                    </div>
                                </div>
                            )}

                            <div className="space-y-1.5">
                                <Label htmlFor="email">Email</Label>
                                <Input
                                    id="email"
                                    type="email"
                                    placeholder="you@example.com"
                                    required
                                    value={form.email}
                                    onChange={(e) =>
                                        setForm((f) => ({ ...f, email: e.target.value }))
                                    }
                                />
                            </div>

                            <div className="space-y-1.5">
                                <div className="flex items-center justify-between">
                                    <Label htmlFor="password">Password</Label>
                                    {!isRegister && (
                                        <Link
                                            to="/forgot-password"
                                            className="text-xs text-primary hover:underline"
                                        >
                                            Forgot password?
                                        </Link>
                                    )}
                                </div>
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

                            {error && (
                                <div className="flex items-center gap-2 text-sm text-destructive">
                                    <AlertCircle className="size-4" />
                                    {error}
                                </div>
                            )}

                            <Button type="submit" className="w-full" disabled={loading}>
                                {loading
                                    ? 'Please wait...'
                                    : isRegister
                                      ? 'Create Account'
                                      : 'Sign In'}
                            </Button>

                            <button
                                type="button"
                                className="w-full text-sm text-primary hover:underline bg-transparent border-none cursor-pointer"
                                onClick={() => {
                                    setIsRegister(!isRegister);
                                    setError(null);
                                }}
                            >
                                {isRegister
                                    ? '← Back to Sign In'
                                    : "Don't have an account? Register"}
                            </button>
                        </form>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
