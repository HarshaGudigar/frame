import { useState } from 'react';
import { useAuth, User } from '@/contexts/auth-context';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

interface ChangePasswordModalProps {
    user: User | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function ChangePasswordModal({ user, open, onOpenChange }: ChangePasswordModalProps) {
    const { api } = useAuth();
    const { toast } = useToast();
    const [loading, setLoading] = useState(false);
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user?._id && !user?.id) return;

        if (password !== confirmPassword) {
            toast({
                variant: 'destructive',
                title: 'Error',
                description: 'Passwords do not match.',
            });
            return;
        }

        if (password.length < 6) {
            toast({
                variant: 'destructive',
                title: 'Error',
                description: 'Password must be at least 6 characters.',
            });
            return;
        }

        setLoading(true);
        const userId = user._id || user.id;

        try {
            await api.post(`/admin/users/${userId}/password`, { password, confirmPassword });
            toast({
                title: 'Success',
                description: `Password for ${user.firstName} ${user.lastName} updated successfully.`,
            });
            setPassword('');
            setConfirmPassword('');
            onOpenChange(false);
        } catch (error: any) {
            console.error(error);
            toast({
                variant: 'destructive',
                title: 'Error',
                description: error.response?.data?.message || 'Failed to update password.',
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <form onSubmit={handleSubmit}>
                    <DialogHeader>
                        <DialogTitle>Change Password</DialogTitle>
                        <DialogDescription>
                            Set a new password for {user?.firstName} {user?.lastName}.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="password">New Password</Label>
                            <Input
                                id="password"
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="Min 6 characters"
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="confirmPassword">Confirm New Password</Label>
                            <Input
                                id="confirmPassword"
                                type="password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                required
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button type="submit" disabled={loading}>
                            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {loading ? 'Updating...' : 'Update Password'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
