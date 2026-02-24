import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/auth-context';
import { usePermission } from '../hooks/use-permission';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, Shield, Plus, Save } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

interface RoleData {
    _id: string;
    name: string;
    description: string;
    isSystem: boolean;
    permissions: string[];
}

const AVAILABLE_PERMISSIONS = [
    { slug: 'users:read', label: 'View Users', description: 'Can view the list of team members' },
    {
        slug: 'users:write',
        label: 'Manage Users',
        description: 'Can invite, edit, and deactivate users',
    },
    {
        slug: 'marketplace:read',
        label: 'View Marketplace',
        description: 'Can browse the marketplace',
    },
    {
        slug: 'marketplace:write',
        label: 'Manage Marketplace',
        description: 'Can purchase and enable modules',
    },
    {
        slug: 'roles:read',
        label: 'View Roles',
        description: 'Can view the role permissions matrix',
    },
    { slug: 'roles:manage', label: 'Manage Roles', description: 'Can modify role permissions' },
    {
        slug: 'audit:read',
        label: 'View Audit Logs',
        description: 'Can view the system audit trail',
    },
    {
        slug: 'system:read',
        label: 'View System Info',
        description: 'Can view instance configuration',
    },
    {
        slug: 'system:write',
        label: 'Manage System',
        description: 'Can update instance settings and branding',
    },
    { slug: 'hotel:read', label: 'View Hotel', description: 'Can access hotel module dashboard' },
    {
        slug: 'hotel:write',
        label: 'Manage Hotel',
        description: 'Can edit hotel rooms, bookings and settings',
    },
];

export function RolesPage() {
    const { api } = useAuth();
    const { toast } = useToast();
    const { hasPermission } = usePermission();
    const [roles, setRoles] = useState<RoleData[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    const fetchRoles = async () => {
        setIsLoading(true);
        try {
            const res = await api.get('/roles');
            if (res.data.success) {
                setRoles(res.data.data);
            }
        } catch (error) {
            toast({
                variant: 'destructive',
                title: 'Error',
                description: 'Failed to load roles.',
            });
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchRoles();
    }, []);

    const togglePermission = (roleId: string, permissionSlug: string) => {
        setRoles((prev) =>
            prev.map((role) => {
                if (role._id !== roleId) return role;

                const hasPerm = role.permissions.includes(permissionSlug);
                const newPermissions = hasPerm
                    ? role.permissions.filter((p) => p !== permissionSlug)
                    : [...role.permissions, permissionSlug];

                return { ...role, permissions: newPermissions };
            }),
        );
    };

    const handleSave = async (role: RoleData) => {
        setIsSaving(true);
        try {
            const res = await api.put(`/roles/${role._id}`, {
                permissions: role.permissions,
                description: role.description,
            });
            if (res.data.success) {
                toast({
                    title: 'Role Updated',
                    description: `${role.name} permissions have been saved.`,
                });
            }
        } catch (error: any) {
            toast({
                variant: 'destructive',
                title: 'Update Failed',
                description: error.response?.data?.message || 'Failed to save role.',
            });
        } finally {
            setIsSaving(false);
        }
    };

    if (!hasPermission('roles:read')) {
        return (
            <div className="flex h-[50vh] items-center justify-center">
                <p className="text-destructive font-medium">
                    Access Denied: Insufficient Permissions
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-6 max-w-7xl mx-auto">
            <div className="flex justify-between items-center bg-card/50 p-6 rounded-2xl border border-border/50 backdrop-blur-sm shadow-sm transition-all hover:shadow-md">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-3">
                        <Shield className="size-8 text-primary" />
                        Role Matrix
                    </h1>
                    <p className="text-muted-foreground mt-1">
                        Configure granular Attribute-Based Access Control (ABAC) for each user role.
                    </p>
                </div>
                {hasPermission('roles:manage') && (
                    <Button
                        variant="outline"
                        className="gap-2 border-primary/20 hover:bg-primary/5 transition-all"
                    >
                        <Plus className="size-4" />
                        Create Role
                    </Button>
                )}
            </div>

            <Card className="border-border/40 shadow-xl overflow-hidden glass-panel">
                <CardContent className="p-0">
                    <div className="relative overflow-x-auto custom-scrollbar">
                        <Table>
                            <TableHeader className="bg-muted/30">
                                <TableRow className="hover:bg-transparent border-border/40">
                                    <TableHead className="w-[300px] font-bold py-6 px-6">
                                        Access Permission
                                    </TableHead>
                                    {roles.map((role) => (
                                        <TableHead
                                            key={role._id}
                                            className="text-center font-bold px-4 py-6"
                                        >
                                            <div className="flex flex-col items-center gap-2">
                                                <Badge
                                                    variant={
                                                        role.isSystem ? 'secondary' : 'outline'
                                                    }
                                                    className={`px-3 py-1 uppercase tracking-wider text-[10px] ${role.isSystem ? 'bg-primary/10 text-primary border-primary/20' : ''}`}
                                                >
                                                    {role.name}
                                                </Badge>
                                                {hasPermission('roles:manage') &&
                                                    !role.isSystem && (
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            className="h-8 px-2 text-[10px] text-muted-foreground hover:text-primary transition-all"
                                                            onClick={() => handleSave(role)}
                                                            disabled={isSaving}
                                                        >
                                                            <Save className="size-3 mr-1" />
                                                            Save Changes
                                                        </Button>
                                                    )}
                                            </div>
                                        </TableHead>
                                    ))}
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {isLoading
                                    ? Array.from({ length: 8 }).map((_, i) => (
                                          <TableRow key={i} className="border-border/40">
                                              <TableCell className="px-6 py-4">
                                                  <Skeleton className="h-4 w-3/4 mb-1" />
                                                  <Skeleton className="h-3 w-1/2 opacity-50" />
                                              </TableCell>
                                              {Array.from({ length: roles.length || 3 }).map(
                                                  (_, j) => (
                                                      <TableCell key={j} className="text-center">
                                                          <Skeleton className="size-8 mx-auto rounded-full" />
                                                      </TableCell>
                                                  ),
                                              )}
                                          </TableRow>
                                      ))
                                    : AVAILABLE_PERMISSIONS.map((perm) => (
                                          <TableRow
                                              key={perm.slug}
                                              className="hover:bg-primary/5 border-border/40 transition-colors group"
                                          >
                                              <TableCell className="px-6 py-5">
                                                  <div className="flex flex-col">
                                                      <span className="font-semibold text-foreground group-hover:text-primary transition-colors">
                                                          {perm.label}
                                                      </span>
                                                      <code className="text-[10px] font-mono text-muted-foreground/70 tracking-tight">
                                                          {perm.slug}
                                                      </code>
                                                  </div>
                                              </TableCell>
                                              {roles.map((role) => (
                                                  <TableCell
                                                      key={`${role._id}-${perm.slug}`}
                                                      className="text-center"
                                                  >
                                                      <div className="flex justify-center">
                                                          <Switch
                                                              checked={role.permissions.includes(
                                                                  perm.slug,
                                                              )}
                                                              onCheckedChange={() =>
                                                                  togglePermission(
                                                                      role._id,
                                                                      perm.slug,
                                                                  )
                                                              }
                                                              disabled={
                                                                  !hasPermission('roles:manage') ||
                                                                  role.name === 'superuser'
                                                              }
                                                              className="data-[state=checked]:bg-primary shadow-sm"
                                                          />
                                                      </div>
                                                  </TableCell>
                                              ))}
                                          </TableRow>
                                      ))}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>

            <div className="bg-primary/5 rounded-xl border border-primary/10 p-4 flex items-start gap-4 animate-in fade-in slide-in-from-bottom-2 duration-500">
                <Shield className="size-5 text-primary shrink-0 mt-0.5" />
                <div className="text-sm text-primary/80 leading-relaxed">
                    <strong>Superuser Bypass:</strong> The <code>superuser</code> role has absolute
                    bypass and always possesses all permissions (<code>*</code>), even if not
                    explicitly checked in the matrix. Custom roles can be managed but system roles
                    are immutable except for their granular permissions.
                </div>
            </div>
        </div>
    );
}

export default RolesPage;
