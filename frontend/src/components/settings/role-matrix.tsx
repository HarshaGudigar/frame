import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface RoleDoc {
    _id: string;
    name: string;
    description: string;
    isSystem: boolean;
    permissions: string[];
}

const AVAILABLE_PERMISSIONS = [
    { id: 'users:read', label: 'View Users' },
    { id: 'users:write', label: 'Manage Users' },
    { id: 'tenants:read', label: 'View Tenants' },
    { id: 'tenants:write', label: 'Manage Tenants' },
    { id: 'marketplace:read', label: 'View Marketplace' },
    { id: 'marketplace:write', label: 'Manage Marketplace' },
    { id: 'roles:read', label: 'View Roles' },
    { id: 'roles:manage', label: 'Manage Roles' },
    { id: 'audit:read', label: 'View Audit Logs' },
    { id: 'system:read', label: 'View System Info' },
];

export function RoleMatrix() {
    const { api } = useAuth();
    const { toast } = useToast();
    const [roles, setRoles] = useState<RoleDoc[]>([]);
    const [loading, setLoading] = useState(true);
    const [updatingParams, setUpdatingParams] = useState<{ roleId: string; permId: string } | null>(
        null,
    );

    useEffect(() => {
        fetchRoles();
    }, []);

    const fetchRoles = async () => {
        try {
            const res = await api.get('/roles');
            setRoles(res.data.data);
        } catch (error) {
            toast({
                title: 'Error',
                description: 'Failed to fetch roles matrix.',
                variant: 'destructive',
            });
        } finally {
            setLoading(false);
        }
    };

    const handleTogglePermission = async (
        role: RoleDoc,
        permissionId: string,
        isChecked: boolean,
    ) => {
        setUpdatingParams({ roleId: role._id, permId: permissionId });

        // Optimistic UI update
        const originalRoles = [...roles];
        const newPermissions = isChecked
            ? [...role.permissions, permissionId]
            : role.permissions.filter((p) => p !== permissionId);

        setRoles(
            roles.map((r) => (r._id === role._id ? { ...r, permissions: newPermissions } : r)),
        );

        try {
            await api.put(`/roles/${role._id}`, {
                permissions: newPermissions,
            });

            toast({
                title: 'Matrix Updated',
                description: `Updated permissions for ${role.name}`,
            });
        } catch (error: any) {
            // Revert on failure
            setRoles(originalRoles);
            toast({
                title: 'Update failed',
                description: error.response?.data?.message || 'Failed to update matrix',
                variant: 'destructive',
            });
        } finally {
            setUpdatingParams(null);
        }
    };

    if (loading) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Role Permissions Matrix</CardTitle>
                </CardHeader>
                <CardContent className="flex justify-center py-6">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </CardContent>
            </Card>
        );
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>Role Permissions Matrix</CardTitle>
                <CardDescription>
                    Configure granular Attribute-Based Access Control (ABAC) for each user role.
                </CardDescription>
            </CardHeader>
            <CardContent className="overflow-x-auto">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-[200px] border-r">Access Permission</TableHead>
                            {roles.map((role) => (
                                <TableHead key={role._id} className="text-center min-w-[120px]">
                                    <div className="flex flex-col items-center gap-1">
                                        <span className="font-semibold capitalize">
                                            {role.name}
                                        </span>
                                        {role.isSystem && (
                                            <Badge variant="secondary" className="text-[10px]">
                                                System
                                            </Badge>
                                        )}
                                    </div>
                                </TableHead>
                            ))}
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {AVAILABLE_PERMISSIONS.map((perm) => (
                            <TableRow key={perm.id}>
                                <TableCell className="font-medium border-r bg-muted/20">
                                    <div className="flex flex-col">
                                        <span>{perm.label}</span>
                                        <span className="text-[10px] text-muted-foreground font-mono">
                                            {perm.id}
                                        </span>
                                    </div>
                                </TableCell>
                                {roles.map((role) => {
                                    const hasPerm =
                                        role.permissions.includes('*') ||
                                        role.permissions.includes(perm.id);
                                    const isUpdating =
                                        updatingParams?.roleId === role._id &&
                                        updatingParams?.permId === perm.id;

                                    // Owners or '*' usually bypass visual toggles, but here we can just show them locked
                                    const isLocked =
                                        role.permissions.includes('*') && perm.id !== '*';

                                    return (
                                        <TableCell
                                            key={`${role._id}-${perm.id}`}
                                            className="text-center"
                                        >
                                            {isUpdating ? (
                                                <Loader2 className="h-4 w-4 animate-spin mx-auto text-primary" />
                                            ) : (
                                                <Checkbox
                                                    checked={hasPerm}
                                                    disabled={
                                                        isLocked ||
                                                        (role.isSystem && role.name === 'superuser')
                                                    }
                                                    onCheckedChange={(checked) =>
                                                        handleTogglePermission(
                                                            role,
                                                            perm.id,
                                                            !!checked,
                                                        )
                                                    }
                                                    className="mx-auto"
                                                />
                                            )}
                                        </TableCell>
                                    );
                                })}
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );
}
