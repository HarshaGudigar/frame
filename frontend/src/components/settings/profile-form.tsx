import { useState } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

export function ProfileForm() {
    const { user, api } = useAuth();
    const { toast } = useToast();
    const [loading, setLoading] = useState(false);

    const [formData, setFormData] = useState({
        firstName: user?.firstName || '',
        lastName: user?.lastName || '',
        currentPassword: '',
        newPassword: '',
        confirmNewPassword: '',
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData({ ...formData, [e.target.id]: e.target.value });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        // Client-side validation
        if (formData.newPassword) {
            if (formData.newPassword !== formData.confirmNewPassword) {
                toast({
                    variant: 'destructive',
                    title: 'Error',
                    description: 'New passwords do not match.',
                });
                setLoading(false);
                return;
            }
            if (!formData.currentPassword) {
                toast({
                    variant: 'destructive',
                    title: 'Error',
                    description: 'Current password is required to set a new password.',
                });
                setLoading(false);
                return;
            }
        }

        try {
            const payload: any = {
                firstName: formData.firstName,
                lastName: formData.lastName,
            };

            if (formData.newPassword) {
                payload.currentPassword = formData.currentPassword;
                payload.newPassword = formData.newPassword;
                payload.confirmNewPassword = formData.confirmNewPassword;
            }

            const res = await api.patch('/auth/profile', payload);

            if (res.data.success) {
                toast({
                    title: 'Profile updated',
                    description: 'Your changes have been saved successfully.',
                });
                // Clear password fields
                setFormData((prev) => ({
                    ...prev,
                    currentPassword: '',
                    newPassword: '',
                    confirmNewPassword: '',
                }));
            }
        } catch (error: any) {
            console.error('Profile update error:', error);
            const msg =
                error.response?.data?.message ||
                error.response?.data?.errors?.[0]?.message ||
                'Failed to update profile.';
            toast({
                variant: 'destructive',
                title: 'Error',
                description: msg,
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit}>
            <Card>
                <CardHeader>
                    <CardTitle>My Profile</CardTitle>
                    <CardDescription>
                        Update your personal information and password.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="firstName">First Name</Label>
                            <Input
                                id="firstName"
                                value={formData.firstName}
                                onChange={handleChange}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="lastName">Last Name</Label>
                            <Input
                                id="lastName"
                                value={formData.lastName}
                                onChange={handleChange}
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="email">Email</Label>
                        <Input id="email" value={user?.email} disabled className="bg-muted" />
                    </div>

                    <div className="pt-4 border-t">
                        <h4 className="text-sm font-medium mb-4 text-muted-foreground">
                            Change Password
                        </h4>
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="currentPassword">Current Password</Label>
                                <Input
                                    id="currentPassword"
                                    type="password"
                                    value={formData.currentPassword}
                                    onChange={handleChange}
                                    placeholder="Required to set new password"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="newPassword">New Password</Label>
                                    <Input
                                        id="newPassword"
                                        type="password"
                                        value={formData.newPassword}
                                        onChange={handleChange}
                                        placeholder="Min 6 chars"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="confirmNewPassword">Confirm New Password</Label>
                                    <Input
                                        id="confirmNewPassword"
                                        type="password"
                                        value={formData.confirmNewPassword}
                                        onChange={handleChange}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                </CardContent>
                <CardFooter className="justify-between">
                    <div className="text-sm text-muted-foreground">
                        {loading && 'Saving changes...'}
                    </div>
                    <Button type="submit" disabled={loading}>
                        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Save Changes
                    </Button>
                </CardFooter>
            </Card>
        </form>
    );
}
