import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import {
    Loader2,
    Download,
    Trash2,
    RotateCcw,
    Plus,
    Upload,
    AlertTriangle,
    Database,
} from 'lucide-react';

interface Backup {
    name: string;
    date: string;
    size: number;
}

function formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

export function DatabaseBackups() {
    const { api } = useAuth();
    const { toast } = useToast();

    const [backups, setBackups] = useState<Backup[]>([]);
    const [loading, setLoading] = useState(true);
    const [creating, setCreating] = useState(false);
    const [deletingFile, setDeletingFile] = useState<string | null>(null);
    const [downloadingFile, setDownloadingFile] = useState<string | null>(null);

    // Restore dialog state
    const [restoreDialogOpen, setRestoreDialogOpen] = useState(false);
    const [restoreTarget, setRestoreTarget] = useState<string | null>(null);
    const [restoreFile, setRestoreFile] = useState<File | null>(null);
    const [restoreConfirmText, setRestoreConfirmText] = useState('');
    const [restoring, setRestoring] = useState(false);

    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        fetchBackups();
    }, []);

    const fetchBackups = async () => {
        try {
            const res = await api.get('/admin/backups');
            setBackups(res.data.data || []);
        } catch (err: any) {
            const msg = err.response?.data?.message || 'Failed to load backups.';
            toast({ variant: 'destructive', title: 'Error', description: msg });
        } finally {
            setLoading(false);
        }
    };

    const handleCreate = async () => {
        setCreating(true);
        try {
            await api.post('/admin/backups');
            toast({
                title: 'Backup created',
                description: 'A new database backup has been created.',
            });
            await fetchBackups();
        } catch (err: any) {
            const msg = err.response?.data?.message || 'Failed to create backup.';
            toast({ variant: 'destructive', title: 'Error', description: msg });
        } finally {
            setCreating(false);
        }
    };

    const handleDownload = async (filename: string) => {
        setDownloadingFile(filename);
        try {
            const res = await api.get(`/admin/backups/${encodeURIComponent(filename)}/download`, {
                responseType: 'blob',
            });
            const url = window.URL.createObjectURL(new Blob([res.data]));
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            a.remove();
            window.URL.revokeObjectURL(url);
        } catch (err: any) {
            const msg = err.response?.data?.message || 'Failed to download backup.';
            toast({ variant: 'destructive', title: 'Error', description: msg });
        } finally {
            setDownloadingFile(null);
        }
    };

    const handleDelete = async (filename: string) => {
        setDeletingFile(filename);
        try {
            await api.delete(`/admin/backups/${encodeURIComponent(filename)}`);
            toast({ title: 'Backup deleted', description: `${filename} has been removed.` });
            setBackups((prev) => prev.filter((b) => b.name !== filename));
        } catch (err: any) {
            const msg = err.response?.data?.message || 'Failed to delete backup.';
            toast({ variant: 'destructive', title: 'Error', description: msg });
        } finally {
            setDeletingFile(null);
        }
    };

    const openRestoreDialog = (filename: string) => {
        setRestoreTarget(filename);
        setRestoreFile(null);
        setRestoreConfirmText('');
        setRestoreDialogOpen(true);
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (!file.name.endsWith('.gz')) {
            toast({
                variant: 'destructive',
                title: 'Invalid file',
                description: 'Only .gz backup files are accepted.',
            });
            e.target.value = '';
            return;
        }

        setRestoreTarget(null);
        setRestoreFile(file);
        setRestoreConfirmText('');
        setRestoreDialogOpen(true);
    };

    const handleRestore = async () => {
        setRestoring(true);
        try {
            if (restoreFile) {
                const formData = new FormData();
                formData.append('file', restoreFile);
                await api.post('/admin/backups/restore', formData, {
                    headers: { 'Content-Type': 'multipart/form-data' },
                    timeout: 10 * 60 * 1000,
                });
            } else if (restoreTarget) {
                await api.post(
                    '/admin/backups/restore',
                    { filename: restoreTarget },
                    {
                        timeout: 10 * 60 * 1000,
                    },
                );
            }

            toast({
                title: 'Database restored',
                description: 'The database has been restored successfully.',
            });
            setRestoreDialogOpen(false);
            await fetchBackups();
        } catch (err: any) {
            const msg = err.response?.data?.message || 'Restore failed.';
            toast({ variant: 'destructive', title: 'Restore failed', description: msg });
        } finally {
            setRestoring(false);
        }
    };

    const restoreSourceName = restoreFile ? restoreFile.name : restoreTarget;

    if (loading) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Database Backups</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                </CardContent>
            </Card>
        );
    }

    return (
        <>
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div className="space-y-1">
                            <CardTitle className="flex items-center gap-2">
                                <Database className="h-5 w-5" />
                                Database Backups
                            </CardTitle>
                            <CardDescription>
                                Create, download, and restore database backups.
                            </CardDescription>
                        </div>
                        <Button onClick={handleCreate} disabled={creating} size="sm">
                            {creating ? (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : (
                                <Plus className="mr-2 h-4 w-4" />
                            )}
                            Create Backup
                        </Button>
                    </div>
                </CardHeader>
                <CardContent className="space-y-4">
                    {backups.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground text-sm">
                            No backups found. Create your first backup to get started.
                        </div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Filename</TableHead>
                                    <TableHead>Date</TableHead>
                                    <TableHead>Size</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {backups.map((backup) => (
                                    <TableRow key={backup.name}>
                                        <TableCell className="font-mono text-sm">
                                            {backup.name}
                                        </TableCell>
                                        <TableCell className="text-sm text-muted-foreground">
                                            {new Date(backup.date).toLocaleString()}
                                        </TableCell>
                                        <TableCell className="text-sm text-muted-foreground">
                                            {formatBytes(backup.size)}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex items-center justify-end gap-1">
                                                <Button
                                                    variant="ghost"
                                                    size="icon-sm"
                                                    onClick={() => handleDownload(backup.name)}
                                                    disabled={downloadingFile === backup.name}
                                                    title="Download"
                                                >
                                                    {downloadingFile === backup.name ? (
                                                        <Loader2 className="h-4 w-4 animate-spin" />
                                                    ) : (
                                                        <Download className="h-4 w-4" />
                                                    )}
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="icon-sm"
                                                    onClick={() => openRestoreDialog(backup.name)}
                                                    title="Restore"
                                                >
                                                    <RotateCcw className="h-4 w-4" />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="icon-sm"
                                                    onClick={() => handleDelete(backup.name)}
                                                    disabled={deletingFile === backup.name}
                                                    title="Delete"
                                                >
                                                    {deletingFile === backup.name ? (
                                                        <Loader2 className="h-4 w-4 animate-spin" />
                                                    ) : (
                                                        <Trash2 className="h-4 w-4" />
                                                    )}
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}

                    <Separator />

                    <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                            <p className="text-sm font-medium">Upload & Restore</p>
                            <p className="text-xs text-muted-foreground">
                                Restore from an external <code>.gz</code> backup file.
                            </p>
                        </div>
                        <div>
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept=".gz"
                                onChange={handleFileSelect}
                                className="hidden"
                            />
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => fileInputRef.current?.click()}
                            >
                                <Upload className="mr-2 h-4 w-4" />
                                Upload & Restore
                            </Button>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Restore Confirmation Dialog */}
            <Dialog
                open={restoreDialogOpen}
                onOpenChange={(open) => {
                    if (!restoring) setRestoreDialogOpen(open);
                }}
            >
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Restore Database</DialogTitle>
                        <DialogDescription>
                            This will restore the database from the selected backup.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4">
                        <Alert variant="destructive">
                            <AlertTriangle className="h-4 w-4" />
                            <AlertDescription>
                                This is a <strong>destructive operation</strong>. All current data
                                will be dropped and replaced with the contents of the backup. This
                                action cannot be undone.
                            </AlertDescription>
                        </Alert>

                        <div className="rounded-md bg-muted p-3 text-sm">
                            <span className="text-muted-foreground">Restoring from: </span>
                            <span className="font-mono font-medium">{restoreSourceName}</span>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="restoreConfirm">
                                Type <strong>RESTORE</strong> to confirm
                            </Label>
                            <Input
                                id="restoreConfirm"
                                value={restoreConfirmText}
                                onChange={(e) => setRestoreConfirmText(e.target.value)}
                                placeholder="RESTORE"
                                disabled={restoring}
                            />
                        </div>
                    </div>

                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => setRestoreDialogOpen(false)}
                            disabled={restoring}
                        >
                            Cancel
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={handleRestore}
                            disabled={restoring || restoreConfirmText !== 'RESTORE'}
                        >
                            {restoring && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Restore Database
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}
