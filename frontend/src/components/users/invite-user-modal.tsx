import { useState } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Plus, Copy, Check } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

interface InviteUserModalProps {
    onUserInvited: () => void;
}

export function InviteUserModal({ onUserInvited }: InviteUserModalProps) {
    const { api } = useAuth();
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [tempPassword, setTempPassword] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);
    const [formData, setFormData] = useState({
        email: '',
        firstName: '',
        lastName: '',
        role: 'user',
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setTempPassword(null);

        try {
            const res = await api.post('/admin/users/invite', formData);
            if (res.data.success && res.data.data.tempPassword) {
                setTempPassword(res.data.data.tempPassword);
                onUserInvited();
                setFormData({ email: '', firstName: '', lastName: '', role: 'user' });
            } else {
                setOpen(false);
                onUserInvited();
            }
        } catch (error) {
            console.error(error);
            alert('Failed to invite user');
        } finally {
            setLoading(false);
        }
    };

    const copyToClipboard = () => {
        if (tempPassword) {
            navigator.clipboard.writeText(tempPassword);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    const handleClose = (isOpen: boolean) => {
        setOpen(isOpen);
        if (!isOpen) {
            setTempPassword(null); // Clear password on close
            setCopied(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={handleClose}>
            <DialogTrigger asChild>
                <Button>
                    <Plus className="mr-2 h-4 w-4" /> Invite User
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Invite User</DialogTitle>
                    <DialogDescription>
                        {tempPassword
                            ? 'User invited successfully! Please copy the temporary password below.'
                            : 'Send an invitation to a new team member.'}
                    </DialogDescription>
                </DialogHeader>

                {tempPassword ? (
                    <div className="py-4 space-y-4">
                        <Alert className="bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800">
                            <Check className="h-4 w-4 text-green-600 dark:text-green-400" />
                            <AlertTitle className="text-green-800 dark:text-green-300">
                                Invitation Sent
                            </AlertTitle>
                            <AlertDescription className="text-green-700 dark:text-green-400 mt-2">
                                The user has been created. Share this temporary password with them:
                            </AlertDescription>
                        </Alert>

                        <div className="flex items-center space-x-2">
                            <div className="grid flex-1 gap-2">
                                <Label htmlFor="link" className="sr-only">
                                    Link
                                </Label>
                                <Input
                                    id="link"
                                    defaultValue={tempPassword}
                                    readOnly
                                    className="font-mono text-center tracking-wider bg-muted"
                                />
                            </div>
                            <Button
                                size="sm"
                                className="px-3"
                                onClick={copyToClipboard}
                                variant={copied ? 'outline' : 'default'}
                            >
                                {copied ? (
                                    <Check className="h-4 w-4" />
                                ) : (
                                    <Copy className="h-4 w-4" />
                                )}
                            </Button>
                        </div>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit}>
                        <div className="grid gap-4 py-4">
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="firstName" className="text-right">
                                    First Name
                                </Label>
                                <Input
                                    id="firstName"
                                    value={formData.firstName}
                                    onChange={(e) =>
                                        setFormData({ ...formData, firstName: e.target.value })
                                    }
                                    className="col-span-3"
                                    required
                                />
                            </div>
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="lastName" className="text-right">
                                    Last Name
                                </Label>
                                <Input
                                    id="lastName"
                                    value={formData.lastName}
                                    onChange={(e) =>
                                        setFormData({ ...formData, lastName: e.target.value })
                                    }
                                    className="col-span-3"
                                    required
                                />
                            </div>
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="email" className="text-right">
                                    Email
                                </Label>
                                <Input
                                    id="email"
                                    type="email"
                                    value={formData.email}
                                    onChange={(e) =>
                                        setFormData({ ...formData, email: e.target.value })
                                    }
                                    className="col-span-3"
                                    required
                                />
                            </div>
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="role" className="text-right">
                                    Role
                                </Label>
                                <Select
                                    value={formData.role}
                                    onValueChange={(val) => setFormData({ ...formData, role: val })}
                                >
                                    <SelectTrigger className="col-span-3">
                                        <SelectValue placeholder="Select a role" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="admin">Admin</SelectItem>
                                        <SelectItem value="staff">Staff</SelectItem>
                                        <SelectItem value="user">User</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <DialogFooter>
                            <Button type="submit" disabled={loading}>
                                {loading ? 'Inviting...' : 'Send Invitation'}
                            </Button>
                        </DialogFooter>
                    </form>
                )}
                {tempPassword && (
                    <DialogFooter>
                        <Button variant="secondary" onClick={() => handleClose(false)}>
                            Done
                        </Button>
                    </DialogFooter>
                )}
            </DialogContent>
        </Dialog>
    );
}
