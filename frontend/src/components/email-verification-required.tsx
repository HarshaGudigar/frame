import { useState } from 'react';
import { Server, Mail, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { useAuth } from '@/contexts/auth-context';

export function EmailVerificationRequired() {
    const { api, logout, user } = useAuth();
    const [resending, setResending] = useState(false);
    const [resent, setResent] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleResend = async () => {
        setResending(true);
        setError(null);
        try {
            await api.post('/auth/resend-verification');
            setResent(true);
        } catch (err: any) {
            setError(err.response?.data?.message || 'Failed to resend verification email');
        } finally {
            setResending(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-background to-muted/50">
            <Card className="w-full max-w-md shadow-2xl border-border/50">
                <CardHeader className="text-center space-y-2 pb-4">
                    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground">
                        <Mail className="size-6" />
                    </div>
                    <h1 className="text-2xl font-bold tracking-tight">Verify Your Email</h1>
                    <p className="text-sm text-muted-foreground">
                        We sent a verification email to{' '}
                        <span className="font-medium text-foreground">{user?.email}</span>. Please
                        check your inbox and click the verification link.
                    </p>
                </CardHeader>
                <CardContent className="space-y-4">
                    {resent && (
                        <p className="text-sm text-center text-green-600 dark:text-green-400">
                            Verification email sent! Check your inbox.
                        </p>
                    )}

                    {error && <p className="text-sm text-center text-destructive">{error}</p>}

                    <Button
                        className="w-full"
                        variant="outline"
                        onClick={handleResend}
                        disabled={resending || resent}
                    >
                        {resending ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Sending...
                            </>
                        ) : resent ? (
                            'Email Sent'
                        ) : (
                            'Resend Verification Email'
                        )}
                    </Button>

                    <Button className="w-full" variant="ghost" onClick={logout}>
                        Logout
                    </Button>
                </CardContent>
            </Card>
        </div>
    );
}
