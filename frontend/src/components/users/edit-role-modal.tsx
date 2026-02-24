import React, { useState, useEffect } from 'react';
import { useAuth, User, Role } from '@/contexts/auth-context';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';

interface EditRoleModalProps {
    user: User | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onRoleUpdated: () => void;
}

export function EditRoleModal({ user, open, onOpenChange, onRoleUpdated }: EditRoleModalProps) {
    const { api } = useAuth();
    const [loading, setLoading] = useState(false);
    const [role, setRole] = useState<Role>('user');

    useEffect(() => {
        if (user) {
            setRole(user.role);
        }
    }, [user]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user?._id && !user?.id) return;

        setLoading(true);
        const userId = user._id || user.id;

        try {
            await api.patch(`/admin/users/${userId}/role`, { role });
            onOpenChange(false);
            onRoleUpdated();
        } catch (error) {
            console.error(error);
            alert('Failed to update role');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <form onSubmit={handleSubmit}>
                    <DialogHeader>
                        <DialogTitle>Update User Role</DialogTitle>
                        <DialogDescription>
                            Change the access level for {user?.firstName} {user?.lastName}.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="role" className="text-right">
                                Role
                            </Label>
                            <Select value={role} onValueChange={(val) => setRole(val as Role)}>
                                <SelectTrigger className="col-span-3">
                                    <SelectValue placeholder="Select a role" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="superuser">Superuser</SelectItem>
                                    <SelectItem value="admin">Admin</SelectItem>
                                    <SelectItem value="staff">Staff</SelectItem>
                                    <SelectItem value="user">User</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button type="submit" disabled={loading}>
                            {loading ? 'Updating...' : 'Save Changes'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
