import { useState, useEffect } from 'react';
import { User } from '../contexts/auth-context';
import { useAuth } from '../contexts/auth-context';
import { usePermission } from '../hooks/use-permission';
import { InviteUserModal } from '@/components/users/invite-user-modal';
import { EditRoleModal } from '@/components/users/edit-role-modal';
import { ChangePasswordModal } from '@/components/users/change-password-modal';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { MoreHorizontal, Trash2, ShieldCheck, KeyRound } from 'lucide-react';

export default function Users() {
    const { api } = useAuth();
    const { toast } = useToast();
    const [users, setUsers] = useState<User[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [editUser, setEditUser] = useState<User | null>(null);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
    const { hasRole } = usePermission();

    const fetchUsers = async () => {
        setIsLoading(true);
        try {
            const res = await api.get('/admin/users');
            if (res.data.success) {
                setUsers(res.data.data);
            }
        } catch (error) {
            toast({ variant: 'destructive', title: 'Error', description: 'Failed to load users.' });
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchUsers();
    }, []);

    const handleDelete = async (id: string) => {
        if (confirm('Are you sure you want to deactivate this user?')) {
            try {
                await api.delete(`/admin/users/${id}`);
                fetchUsers(); // Refresh list
            } catch (error: any) {
                toast({
                    variant: 'destructive',
                    title: 'Delete Failed',
                    description: error.response?.data?.message || 'Failed to delete user.',
                });
            }
        }
    };

    if (!hasRole('admin')) {
        return <div className="p-8 text-center text-red-500">Access Denied</div>;
    }

    return (
        <div className="p-8 space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Users</h1>
                    <p className="text-muted-foreground">Manage team members and their roles.</p>
                </div>
                {hasRole('admin') && <InviteUserModal onUserInvited={fetchUsers} />}
            </div>

            <div className="rounded-md border">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Name</TableHead>
                            <TableHead>Email</TableHead>
                            <TableHead>Role</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading &&
                            users.length === 0 &&
                            Array.from({ length: 4 }).map((_, i) => (
                                <TableRow key={`skeleton-${i}`}>
                                    {Array.from({ length: 5 }).map((_, j) => (
                                        <TableCell key={j}>
                                            <Skeleton className="h-4 w-full" />
                                        </TableCell>
                                    ))}
                                </TableRow>
                            ))}
                        {users.map((user) => (
                            <TableRow key={user._id || user.id}>
                                <TableCell className="font-medium">
                                    {user.firstName} {user.lastName}
                                </TableCell>
                                <TableCell>{user.email}</TableCell>
                                <TableCell>
                                    <Badge
                                        variant={
                                            user.role === 'owner'
                                                ? 'default'
                                                : user.role === 'admin'
                                                  ? 'secondary'
                                                  : 'outline'
                                        }
                                    >
                                        {user.role}
                                    </Badge>
                                </TableCell>
                                <TableCell>
                                    <Badge
                                        variant={user.isActive ? 'outline' : 'destructive'}
                                        className={
                                            user.isActive ? 'text-green-600 border-green-600' : ''
                                        }
                                    >
                                        {user.isActive ? 'Active' : 'Inactive'}
                                    </Badge>
                                </TableCell>
                                <TableCell className="text-right">
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="ghost" className="h-8 w-8 p-0">
                                                <span className="sr-only">Open menu</span>
                                                <MoreHorizontal className="h-4 w-4" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                            {hasRole('owner') && (
                                                <>
                                                    <DropdownMenuItem
                                                        onClick={() => {
                                                            setEditUser(user);
                                                            setIsEditModalOpen(true);
                                                        }}
                                                    >
                                                        <ShieldCheck className="mr-2 h-4 w-4" />
                                                        Edit Role
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem
                                                        onClick={() => {
                                                            setEditUser(user);
                                                            setIsPasswordModalOpen(true);
                                                        }}
                                                    >
                                                        <KeyRound className="mr-2 h-4 w-4" />
                                                        Change Password
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem
                                                        className="text-red-600"
                                                        onClick={() =>
                                                            user._id && handleDelete(user._id)
                                                        }
                                                    >
                                                        <Trash2 className="mr-2 h-4 w-4" />
                                                        Deactivate
                                                    </DropdownMenuItem>
                                                </>
                                            )}
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </TableCell>
                            </TableRow>
                        ))}
                        {!users.length && !isLoading && (
                            <TableRow>
                                <TableCell
                                    colSpan={5}
                                    className="text-center text-muted-foreground py-8"
                                >
                                    No users found.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>

            <EditRoleModal
                user={editUser}
                open={isEditModalOpen}
                onOpenChange={setIsEditModalOpen}
                onRoleUpdated={fetchUsers}
            />
            <ChangePasswordModal
                user={editUser}
                open={isPasswordModalOpen}
                onOpenChange={setIsPasswordModalOpen}
            />
        </div>
    );
}
