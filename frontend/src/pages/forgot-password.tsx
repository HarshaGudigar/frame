import { useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { Server, AlertCircle, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Label } from '@/components/ui/label';

const API_BASE = `${window.location.protocol}//${window.location.hostname}:5000/api`;

export function ForgotPasswordPage() {
    const [email, setEmail] = useState('');
    const [submitted, setSubmitted] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setLoading(true);

        try {
            await axios.post(`${API_BASE}/auth/forgot-password`, { email });
            setSubmitted(true);
        } catch (err: any) {
            setError(err.response?.data?.message || 'Something went wrong. Please try again.');
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
                    <h1 className="text-2xl font-bold tracking-tight">Forgot Password</h1>
                    <p className="text-sm text-muted-foreground">
                        {submitted
                            ? 'Check your email for a reset link'
                            : "Enter your email and we'll send you a reset link"}
                    </p>
                </CardHeader>
                <CardContent>
                    {submitted ? (
                        <div className="space-y-4 text-center">
                            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
                                <Check className="h-6 w-6 text-green-600 dark:text-green-400" />
                            </div>
                            <p className="text-sm text-muted-foreground">
                                If an account with that email exists, we've sent a password reset
                                link. Please check your inbox.
                            </p>
                            <Button variant="outline" asChild className="w-full">
                                <Link to="/">Back to Login</Link>
                            </Button>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="space-y-1.5">
                                <Label htmlFor="email">Email</Label>
                                <Input
                                    id="email"
                                    type="email"
                                    placeholder="you@example.com"
                                    required
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                />
                            </div>

                            {error && (
                                <div className="flex items-center gap-2 text-sm text-destructive">
                                    <AlertCircle className="size-4" />
                                    {error}
                                </div>
                            )}

                            <Button type="submit" className="w-full" disabled={loading}>
                                {loading ? 'Sending...' : 'Send Reset Link'}
                            </Button>

                            <Button variant="ghost" asChild className="w-full">
                                <Link to="/">Back to Login</Link>
                            </Button>
                        </form>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
