import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { useDebounce } from '@/hooks/use-debounce';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetDescription,
} from '@/components/ui/sheet';
import { Input } from '@/components/ui/input';
import { ChevronLeft, ChevronRight, Search } from 'lucide-react';

interface AuditEntry {
    _id: string;
    user: {
        firstName: string;
        lastName: string;
        email: string;
    };
    action: string;
    target: string;
    details: any;
    ip: string;
    createdAt: string;
}

export function AuditLogsPage() {
    const { api } = useAuth();
    const [logs, setLogs] = useState<AuditEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const { toast } = useToast();

    // Pagination & Filters
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [filters, setFilters] = useState({
        action: '',
        userId: '',
        startDate: '',
        endDate: '',
    });

    const debouncedFilters = useDebounce(filters, 400);

    // Details Dialog
    const [selectedLog, setSelectedLog] = useState<AuditEntry | null>(null);

    useEffect(() => {
        fetchLogs();
    }, [page, debouncedFilters]); // Refetch when page or debounced filters change

    const fetchLogs = async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            params.append('page', page.toString());
            params.append('limit', '20');
            if (filters.action) params.append('action', filters.action);
            if (filters.userId) params.append('userId', filters.userId);
            if (filters.startDate) params.append('startDate', filters.startDate);
            if (filters.endDate) params.append('endDate', filters.endDate);

            const res = await api.get(`/admin/audit-logs?${params.toString()}`);
            if (res.data.success) {
                setLogs(res.data.data.logs);
                setTotalPages(res.data.data.pagination.totalPages);
            }
        } catch (error) {
            console.error(error);
            toast({
                variant: 'destructive',
                title: 'Error',
                description: 'Failed to fetch audit logs.',
            });
        } finally {
            setLoading(false);
        }
    };

    const handleFilterChange = (key: string, value: string) => {
        setFilters((prev) => ({ ...prev, [key]: value }));
        setPage(1); // Reset to page 1 on filter change
    };

    const getActionBadge = (action: string) => {
        switch (action) {
            case 'TENANT_CREATED':
                return (
                    <Badge
                        variant="success"
                        className="bg-green-500/15 text-green-600 hover:bg-green-500/25 border-green-200"
                    >
                        Created Tenant
                    </Badge>
                );
            case 'TENANT_UPDATED':
                return (
                    <Badge variant="outline" className="text-blue-600 border-blue-200 bg-blue-50">
                        Updated Tenant
                    </Badge>
                );
            case 'TENANT_DELETED':
                return (
                    <Badge
                        variant="destructive"
                        className="bg-red-500/15 text-red-600 hover:bg-red-500/25 border-red-200"
                    >
                        Deleted Tenant
                    </Badge>
                );
            case 'USER_INVITED':
                return (
                    <Badge
                        variant="secondary"
                        className="bg-purple-500/15 text-purple-600 border-purple-200"
                    >
                        Invited User
                    </Badge>
                );
            case 'USER_DEACTIVATED':
                return <Badge variant="destructive">Deactivated User</Badge>;
            case 'USER_ROLE_UPDATED':
                return <Badge variant="outline">Updated Role</Badge>;
            default:
                return (
                    <Badge variant="outline" className="font-mono text-[10px]">
                        {action}
                    </Badge>
                );
        }
    };

    return (
        <div className="space-y-6 p-8">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Audit Logs</h1>
                    <p className="text-muted-foreground">
                        History of administrative actions across the platform.
                    </p>
                </div>
            </div>

            {/* Filters */}
            <Card>
                <CardContent className="pt-6">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Action</label>
                            <Select
                                value={filters.action}
                                onValueChange={(value) =>
                                    handleFilterChange('action', value === 'ALL' ? '' : value)
                                }
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="All Actions" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="ALL">All Actions</SelectItem>
                                    <SelectItem value="TENANT_CREATED">Tenant Created</SelectItem>
                                    <SelectItem value="TENANT_UPDATED">Tenant Updated</SelectItem>
                                    <SelectItem value="TENANT_DELETED">Tenant Deleted</SelectItem>
                                    <SelectItem value="USER_INVITED">User Invited</SelectItem>
                                    <SelectItem value="USER_DEACTIVATED">
                                        User Deactivated
                                    </SelectItem>
                                    <SelectItem value="USER_ROLE_UPDATED">
                                        User Role Updated
                                    </SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">User ID / Email</label>
                            <div className="relative">
                                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder="Search by User ID..."
                                    value={filters.userId}
                                    onChange={(e) => handleFilterChange('userId', e.target.value)}
                                    className="pl-8"
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Start Date</label>
                            <Input
                                type="date"
                                value={filters.startDate}
                                onChange={(e) => handleFilterChange('startDate', e.target.value)}
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">End Date</label>
                            <Input
                                type="date"
                                value={filters.endDate}
                                onChange={(e) => handleFilterChange('endDate', e.target.value)}
                            />
                        </div>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Recent Activity</CardTitle>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="space-y-2">
                            <Skeleton className="h-10 w-full" />
                            <Skeleton className="h-10 w-full" />
                            <Skeleton className="h-10 w-full" />
                        </div>
                    ) : (
                        <>
                            <div className="rounded-md border">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Time</TableHead>
                                            <TableHead>User</TableHead>
                                            <TableHead>Action</TableHead>
                                            <TableHead>Target</TableHead>
                                            <TableHead>Details</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {logs.length === 0 ? (
                                            <TableRow>
                                                <TableCell colSpan={5} className="text-center py-8">
                                                    No audit logs found.
                                                </TableCell>
                                            </TableRow>
                                        ) : (
                                            logs.map((log) => (
                                                <TableRow key={log._id}>
                                                    <TableCell className="text-xs font-mono whitespace-nowrap">
                                                        {new Date(log.createdAt).toLocaleString()}
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className="flex flex-col">
                                                            <span className="font-medium">
                                                                {log.user?.firstName}{' '}
                                                                {log.user?.lastName}
                                                            </span>
                                                            <span className="text-xs text-muted-foreground">
                                                                {log.user?.email || 'Unknown User'}
                                                            </span>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>
                                                        {getActionBadge(log.action)}
                                                    </TableCell>
                                                    <TableCell className="font-mono text-xs max-w-[200px] truncate">
                                                        {log.target}
                                                    </TableCell>
                                                    <TableCell>
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            className="text-primary hover:text-primary hover:bg-primary/10"
                                                            onClick={() => setSelectedLog(log)}
                                                        >
                                                            View Details
                                                        </Button>
                                                    </TableCell>
                                                </TableRow>
                                            ))
                                        )}
                                    </TableBody>
                                </Table>
                            </div>

                            {/* Pagination Controls */}
                            <div className="flex items-center justify-end space-x-2 py-4">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                                    disabled={page === 1}
                                >
                                    <ChevronLeft className="h-4 w-4 mr-2" />
                                    Previous
                                </Button>
                                <span className="text-sm text-muted-foreground">
                                    Page {page} of {totalPages}
                                </span>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                                    disabled={page === totalPages}
                                >
                                    Next
                                    <ChevronRight className="h-4 w-4 ml-2" />
                                </Button>
                            </div>
                        </>
                    )}
                </CardContent>
            </Card>

            {/* Details Sheet */}
            <Sheet open={!!selectedLog} onOpenChange={(open) => !open && setSelectedLog(null)}>
                <SheetContent className="w-[400px] sm:w-[540px] overflow-y-auto">
                    <SheetHeader>
                        <SheetTitle>Audit Log Details</SheetTitle>
                        <SheetDescription>
                            Complete metadata for the selected action.
                        </SheetDescription>
                    </SheetHeader>
                    {selectedLog && (
                        <div className="mt-6 space-y-6 text-sm">
                            <div className="grid gap-4 p-4 border rounded-md bg-muted/40">
                                <div className="grid grid-cols-3 gap-2">
                                    <span className="font-semibold text-muted-foreground">
                                        Action
                                    </span>
                                    <span className="col-span-2 font-medium">
                                        {selectedLog.action}
                                    </span>
                                </div>
                                <div className="grid grid-cols-3 gap-2">
                                    <span className="font-semibold text-muted-foreground">
                                        Target
                                    </span>
                                    <span className="col-span-2 font-mono text-xs bg-muted px-2 py-0.5 rounded break-all">
                                        {selectedLog.target}
                                    </span>
                                </div>
                                <div className="grid grid-cols-3 gap-2">
                                    <span className="font-semibold text-muted-foreground">
                                        User
                                    </span>
                                    <div className="col-span-2 flex flex-col">
                                        <span className="font-medium">
                                            {selectedLog.user?.email}
                                        </span>
                                        <span className="text-xs text-muted-foreground">
                                            {selectedLog.user?.firstName}{' '}
                                            {selectedLog.user?.lastName}
                                        </span>
                                    </div>
                                </div>
                                <div className="grid grid-cols-3 gap-2">
                                    <span className="font-semibold text-muted-foreground">
                                        Timestamp
                                    </span>
                                    <span className="col-span-2">
                                        {new Date(selectedLog.createdAt).toLocaleString()}
                                    </span>
                                </div>
                                <div className="grid grid-cols-3 gap-2">
                                    <span className="font-semibold text-muted-foreground">
                                        IP Address
                                    </span>
                                    <span className="col-span-2 font-mono text-xs">
                                        {selectedLog.ip || 'N/A'}
                                    </span>
                                </div>
                            </div>

                            <div>
                                <h4 className="font-semibold mb-3 flex items-center gap-2">
                                    Change Details / Metadata
                                </h4>
                                <div className="relative">
                                    <pre className="bg-slate-950 text-slate-50 p-4 rounded-lg text-xs font-mono overflow-auto max-h-[400px]">
                                        {JSON.stringify(selectedLog.details, null, 2)}
                                    </pre>
                                </div>
                            </div>
                        </div>
                    )}
                </SheetContent>
            </Sheet>
        </div>
    );
}
