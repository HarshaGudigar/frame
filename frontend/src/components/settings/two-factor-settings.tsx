import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Loader2, Shield, ShieldCheck } from 'lucide-react';

export function TwoFactorSettings() {
    const { api } = useAuth();
    const { toast } = useToast();

    const [isEnabled, setIsEnabled] = useState(false);
    const [loading, setLoading] = useState(true);

    // Setup dialog state
    const [setupOpen, setSetupOpen] = useState(false);
    const [setupLoading, setSetupLoading] = useState(false);
    const [qrCode, setQrCode] = useState('');
    const [manualSecret, setManualSecret] = useState('');
    const [setupCode, setSetupCode] = useState('');
    const [verifying, setVerifying] = useState(false);

    // Disable dialog state
    const [disableOpen, setDisableOpen] = useState(false);
    const [disableCode, setDisableCode] = useState('');
    const [disabling, setDisabling] = useState(false);

    useEffect(() => {
        fetchStatus();
    }, []);

    const fetchStatus = async () => {
        try {
            const res = await api.get('/auth/2fa/status');
            setIsEnabled(res.data.data.isTwoFactorEnabled);
        } catch (err) {
            console.error('Failed to fetch 2FA status:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleSetup = async () => {
        setSetupLoading(true);
        try {
            const res = await api.post('/auth/2fa/setup');
            setQrCode(res.data.data.qrCode);
            setManualSecret(res.data.data.secret);
            setSetupOpen(true);
        } catch (err: any) {
            const msg = err.response?.data?.message || 'Failed to start 2FA setup.';
            toast({ variant: 'destructive', title: 'Error', description: msg });
        } finally {
            setSetupLoading(false);
        }
    };

    const handleVerifySetup = async () => {
        setVerifying(true);
        try {
            await api.post('/auth/2fa/setup/verify', { code: setupCode });
            setIsEnabled(true);
            setSetupOpen(false);
            setSetupCode('');
            setQrCode('');
            setManualSecret('');
            toast({
                title: 'Two-factor authentication enabled',
                description: 'Your account is now protected with 2FA.',
            });
        } catch (err: any) {
            const msg = err.response?.data?.message || 'Invalid verification code.';
            toast({ variant: 'destructive', title: 'Verification failed', description: msg });
        } finally {
            setVerifying(false);
        }
    };

    const handleDisable = async () => {
        setDisabling(true);
        try {
            await api.post('/auth/2fa/disable', { code: disableCode });
            setIsEnabled(false);
            setDisableOpen(false);
            setDisableCode('');
            toast({
                title: 'Two-factor authentication disabled',
                description: '2FA has been removed from your account.',
            });
        } catch (err: any) {
            const msg = err.response?.data?.message || 'Invalid verification code.';
            toast({ variant: 'destructive', title: 'Error', description: msg });
        } finally {
            setDisabling(false);
        }
    };

    if (loading) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Two-Factor Authentication</CardTitle>
                </CardHeader>
                <CardContent className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </CardContent>
            </Card>
        );
    }

    return (
        <>
            <Card>
                <CardHeader>
                    <CardTitle>Two-Factor Authentication</CardTitle>
                    <CardDescription>
                        Add an extra layer of security to your account with a TOTP authenticator
                        app.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {isEnabled ? (
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <ShieldCheck className="h-5 w-5 text-green-500" />
                                <div>
                                    <p className="text-sm font-medium">2FA is enabled</p>
                                    <p className="text-sm text-muted-foreground">
                                        Your account is protected with an authenticator app.
                                    </p>
                                </div>
                            </div>
                            <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => setDisableOpen(true)}
                            >
                                Disable
                            </Button>
                        </div>
                    ) : (
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <Shield className="h-5 w-5 text-muted-foreground" />
                                <div>
                                    <p className="text-sm font-medium">2FA is not enabled</p>
                                    <p className="text-sm text-muted-foreground">
                                        Protect your account with a TOTP authenticator app.
                                    </p>
                                </div>
                            </div>
                            <Button size="sm" onClick={handleSetup} disabled={setupLoading}>
                                {setupLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Enable
                            </Button>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Setup Dialog */}
            <Dialog open={setupOpen} onOpenChange={setSetupOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Set Up Two-Factor Authentication</DialogTitle>
                        <DialogDescription>
                            Scan the QR code below with your authenticator app (Google
                            Authenticator, Authy, etc.), then enter the 6-digit code to verify.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4">
                        {qrCode && (
                            <div className="flex justify-center">
                                <img
                                    src={qrCode}
                                    alt="Two-factor authentication QR code"
                                    className="rounded-lg border"
                                    width={200}
                                    height={200}
                                />
                            </div>
                        )}

                        <div className="space-y-1.5">
                            <Label className="text-xs text-muted-foreground">
                                Manual entry code
                            </Label>
                            <code className="block w-full rounded bg-muted p-2 text-center text-sm font-mono tracking-widest select-all">
                                {manualSecret}
                            </code>
                        </div>

                        <div className="space-y-1.5">
                            <Label htmlFor="setupCode">Verification Code</Label>
                            <Input
                                id="setupCode"
                                inputMode="numeric"
                                maxLength={6}
                                placeholder="000000"
                                value={setupCode}
                                onChange={(e) => setSetupCode(e.target.value.replace(/\D/g, ''))}
                                className="text-center text-lg tracking-[0.5em] font-mono"
                            />
                        </div>
                    </div>

                    <DialogFooter>
                        <Button
                            onClick={handleVerifySetup}
                            disabled={verifying || setupCode.length !== 6}
                        >
                            {verifying && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Verify & Enable
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Disable Dialog */}
            <Dialog open={disableOpen} onOpenChange={setDisableOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Disable Two-Factor Authentication</DialogTitle>
                        <DialogDescription>
                            Enter your current authenticator code to disable 2FA. Your account will
                            be less secure without it.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-1.5">
                        <Label htmlFor="disableCode">Verification Code</Label>
                        <Input
                            id="disableCode"
                            inputMode="numeric"
                            maxLength={6}
                            placeholder="000000"
                            value={disableCode}
                            onChange={(e) => setDisableCode(e.target.value.replace(/\D/g, ''))}
                            className="text-center text-lg tracking-[0.5em] font-mono"
                        />
                    </div>

                    <DialogFooter>
                        <Button
                            variant="destructive"
                            onClick={handleDisable}
                            disabled={disabling || disableCode.length !== 6}
                        >
                            {disabling && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Disable 2FA
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}
