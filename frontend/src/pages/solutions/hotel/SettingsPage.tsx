import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogFooter,
} from '@/components/ui/dialog';
import { Loader2, Plus, Pencil, Trash2, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface SettingsOption {
    label: string;
    value: string;
    isActive: boolean;
}

interface SettingsItem {
    _id: string;
    type: string;
    options: SettingsOption[];
}

export function SettingsPage() {
    const { api } = useAuth();
    const { toast } = useToast();
    const [settings, setSettings] = useState<SettingsItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [open, setOpen] = useState(false);
    const [editingType, setEditingType] = useState<string | null>(null);
    const [formType, setFormType] = useState('');
    const [formOptions, setFormOptions] = useState<SettingsOption[]>([
        { label: '', value: '', isActive: true },
    ]);
    const [submitting, setSubmitting] = useState(false);

    const fetchSettings = async () => {
        setLoading(true);
        try {
            const res = await api.get('/m/hotel/settings');
            if (res.data.success) setSettings(res.data.data);
        } catch (error) {
            console.error('Failed to fetch settings', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchSettings();
    }, [api]);

    const handleOpenCreate = () => {
        setEditingType(null);
        setFormType('');
        setFormOptions([{ label: '', value: '', isActive: true }]);
        setOpen(true);
    };

    const handleOpenEdit = (item: SettingsItem) => {
        setEditingType(item.type);
        setFormType(item.type);
        setFormOptions(item.options.map((o) => ({ ...o })));
        setOpen(true);
    };

    const addOption = () => {
        setFormOptions([...formOptions, { label: '', value: '', isActive: true }]);
    };

    const removeOption = (index: number) => {
        if (formOptions.length <= 1) return;
        setFormOptions(formOptions.filter((_, i) => i !== index));
    };

    const updateOption = (index: number, field: keyof SettingsOption, val: any) => {
        const newOpts = [...formOptions];
        newOpts[index] = { ...newOpts[index], [field]: val };
        // Auto-fill value from label if value is empty
        if (field === 'label' && !newOpts[index].value) {
            newOpts[index].value = val;
        }
        setFormOptions(newOpts);
    };

    const handleSubmit = async () => {
        setSubmitting(true);
        try {
            const isEdit = !!editingType;
            const validOptions = formOptions.filter((o) => o.label && o.value);
            if (validOptions.length === 0) {
                toast({
                    variant: 'destructive',
                    title: 'Error',
                    description: 'At least one option is required',
                });
                setSubmitting(false);
                return;
            }

            let res;
            if (isEdit) {
                res = await api.patch(
                    `/m/hotel/settings/${editingType}`,
                    { options: validOptions }
                );
            } else {
                res = await api.post(
                    '/m/hotel/settings',
                    { type: formType, options: validOptions }
                );
            }

            if (res.data.success) {
                toast({ title: 'Success', description: res.data.message });
                setOpen(false);
                fetchSettings();
            } else {
                const msg = res.data.errors
                    ? res.data.errors.map((e: any) => e.message).join(', ')
                    : res.data.message;
                toast({ variant: 'destructive', title: 'Error', description: msg });
            }
        } catch (error: any) {
            const errorData = error.response?.data;
            const msg = errorData?.errors
                ? errorData.errors.map((e: any) => e.message).join(', ')
                : errorData?.message || 'Failed to save settings';
            toast({ variant: 'destructive', title: 'Error', description: msg });
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = async (type: string) => {
        if (!confirm(`Delete settings type "${type}"?`)) return;
        try {
            const res = await api.delete(`/m/hotel/settings/${type}`);
            if (res.data.success) {
                toast({ title: 'Success', description: res.data.message });
                fetchSettings();
            } else {
                toast({ variant: 'destructive', title: 'Error', description: res.data.message });
            }
        } catch (error: any) {
            toast({
                variant: 'destructive',
                title: 'Error',
                description: error.response?.data?.message || 'Failed to delete settings',
            });
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-10">
                <Loader2 className="h-8 w-8 animate-spin" />
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <p className="text-sm text-muted-foreground">
                    {settings.length} setting type{settings.length !== 1 ? 's' : ''}
                </p>
                <Dialog open={open} onOpenChange={setOpen}>
                    <DialogTrigger asChild>
                        <Button onClick={handleOpenCreate}>
                            <Plus className="h-4 w-4 mr-2" /> Add Settings Type
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
                        <DialogHeader>
                            <DialogTitle>
                                {editingType ? `Edit: ${editingType}` : 'Add Settings Type'}
                            </DialogTitle>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                            {!editingType && (
                                <div className="space-y-2">
                                    <Label>Type Name *</Label>
                                    <Input
                                        value={formType}
                                        placeholder="e.g. roomType, idProofType"
                                        onChange={(e) => setFormType(e.target.value)}
                                    />
                                </div>
                            )}
                            <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <Label>Options</Label>
                                    <Button variant="outline" size="sm" onClick={addOption}>
                                        <Plus className="h-4 w-4 mr-1" /> Add Option
                                    </Button>
                                </div>
                                {formOptions.map((opt, index) => (
                                    <div key={index} className="flex gap-2 items-center">
                                        <Input
                                            placeholder="Label"
                                            value={opt.label}
                                            onChange={(e) =>
                                                updateOption(index, 'label', e.target.value)
                                            }
                                            className="flex-1"
                                        />
                                        <Input
                                            placeholder="Value"
                                            value={opt.value}
                                            onChange={(e) =>
                                                updateOption(index, 'value', e.target.value)
                                            }
                                            className="flex-1"
                                        />
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() =>
                                                updateOption(index, 'isActive', !opt.isActive)
                                            }
                                        >
                                            <Badge
                                                variant={opt.isActive ? 'default' : 'secondary'}
                                                className="text-xs"
                                            >
                                                {opt.isActive ? 'Active' : 'Off'}
                                            </Badge>
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => removeOption(index)}
                                            disabled={formOptions.length <= 1}
                                        >
                                            <X className="h-4 w-4" />
                                        </Button>
                                    </div>
                                ))}
                            </div>
                        </div>
                        <DialogFooter>
                            <Button onClick={handleSubmit} disabled={submitting}>
                                {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                                {editingType ? 'Update' : 'Save'}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>

            {settings.length === 0 ? (
                <div className="text-center py-10 text-muted-foreground">
                    No settings configured yet.
                </div>
            ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {settings.map((item) => (
                        <Card key={item._id}>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">{item.type}</CardTitle>
                                <div className="flex gap-1">
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => handleOpenEdit(item)}
                                    >
                                        <Pencil className="h-3 w-3" />
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => handleDelete(item.type)}
                                    >
                                        <Trash2 className="h-3 w-3" />
                                    </Button>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <div className="flex flex-wrap gap-1">
                                    {item.options.map((opt, i) => (
                                        <Badge
                                            key={i}
                                            variant={opt.isActive ? 'default' : 'secondary'}
                                            className="text-xs"
                                        >
                                            {opt.label}
                                        </Badge>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
}
