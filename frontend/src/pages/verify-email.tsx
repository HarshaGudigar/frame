import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import axios from 'axios';
import { Server, AlertCircle, Check, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/auth-context';

const API_BASE = `${window.location.protocol}//${window.location.hostname}:5000/api`;

export function VerifyEmailPage() {
    const { logout, token: authToken } = useAuth();
    const [searchParams] = useSearchParams();
    const token = searchParams.get('token');
    const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
    const [message, setMessage] = useState('');

    useEffect(() => {
        if (authToken) {
            logout();
        }
    }, [authToken, logout]);

    useEffect(() => {
        if (!token) {
            setStatus('error');
            setMessage('Invalid verification link. No token provided.');
            return;
        }

        axios
            .post(`${API_BASE}/auth/verify-email`, { token })
            .then((res) => {
                setStatus('success');
                setMessage(res.data.message || 'Email verified successfully!');
            })
            .catch((err) => {
                setStatus('error');
                setMessage(err.response?.data?.message || 'Email verification failed.');
            });
    }, [token]);

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-background to-muted/50">
            <Card className="w-full max-w-md shadow-2xl border-border/50">
                <CardHeader className="text-center space-y-2 pb-4">
                    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground">
                        <Server className="size-6" />
                    </div>
                    <h1 className="text-2xl font-bold tracking-tight">Email Verification</h1>
                </CardHeader>
                <CardContent className="text-center space-y-4">
                    {status === 'loading' && (
                        <div className="flex flex-col items-center gap-3">
                            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                            <p className="text-muted-foreground">Verifying your email...</p>
                        </div>
                    )}

                    {status === 'success' && (
                        <div className="flex flex-col items-center gap-3">
                            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
                                <Check className="h-6 w-6 text-green-600 dark:text-green-400" />
                            </div>
                            <p className="text-green-700 dark:text-green-400">{message}</p>
                            <Button asChild>
                                <Link to="/">Go to Dashboard</Link>
                            </Button>
                        </div>
                    )}

                    {status === 'error' && (
                        <div className="flex flex-col items-center gap-3">
                            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30">
                                <AlertCircle className="h-6 w-6 text-red-600 dark:text-red-400" />
                            </div>
                            <p className="text-destructive">{message}</p>
                            <Button variant="outline" asChild>
                                <Link to="/">Go to Login</Link>
                            </Button>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
