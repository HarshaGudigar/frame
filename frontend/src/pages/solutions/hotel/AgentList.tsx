import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
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
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogFooter,
} from '@/components/ui/dialog';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Loader2, Plus, Pencil, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Agent {
    _id: string;
    firstName: string;
    lastName: string;
    agentCode: string;
    email?: string;
    phone?: string;
    sharePercentage: number;
    businessType: string;
    city?: string;
    state?: string;
    gstin?: string;
    pan?: string;
    bankName?: string;
    bankBranch?: string;
    bankIfsc?: string;
    bankAccountNumber?: string;
    isActive: boolean;
}

const emptyForm = {
    firstName: '',
    lastName: '',
    agentCode: '',
    email: '',
    phone: '',
    sharePercentage: 0,
    address: '',
    city: '',
    state: '',
    pinCode: '',
    country: '',
    businessType: 'Unregistered',
    gstin: '',
    pan: '',
    cin: '',
    bankName: '',
    bankBranch: '',
    bankIfsc: '',
    bankAccountNumber: '',
    profilePic: '',
};

export function AgentList() {
    const { api } = useAuth();
    const { toast } = useToast();
    const [agents, setAgents] = useState<Agent[]>([]);
    const [loading, setLoading] = useState(true);
    const [open, setOpen] = useState(false);
    const [editingAgent, setEditingAgent] = useState<Agent | null>(null);
    const [formData, setFormData] = useState(emptyForm);
    const [submitting, setSubmitting] = useState(false);

    const fetchAgents = async () => {
        try {
            const res = await api.get('/m/hotel/agents');
            if (res.data.success) setAgents(res.data.data);
        } catch (error) {
            console.error('Failed to fetch agents', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAgents();
    }, [api]);

    const handleOpenCreate = () => {
        setEditingAgent(null);
        setFormData(emptyForm);
        setOpen(true);
    };

    const handleOpenEdit = (agent: Agent) => {
        setEditingAgent(agent);
        setFormData({
            firstName: agent.firstName,
            lastName: agent.lastName,
            agentCode: agent.agentCode,
            email: agent.email || '',
            phone: agent.phone || '',
            sharePercentage: agent.sharePercentage,
            address: '',
            city: agent.city || '',
            state: agent.state || '',
            pinCode: '',
            country: '',
            businessType: agent.businessType,
            gstin: agent.gstin || '',
            pan: agent.pan || '',
            cin: '',
            bankName: agent.bankName || '',
            bankBranch: agent.bankBranch || '',
            bankIfsc: agent.bankIfsc || '',
            bankAccountNumber: agent.bankAccountNumber || '',
        });
        setOpen(true);
    };

    const handleSubmit = async () => {
        setSubmitting(true);
        try {
            const isEdit = !!editingAgent;
            const url = isEdit ? `/m/hotel/agents/${editingAgent._id}` : '/m/hotel/agents';

            // Strip empty optional strings
            const payload: any = { ...formData };
            for (const key of [
                'email',
                'phone',
                'address',
                'city',
                'state',
                'pinCode',
                'country',
                'gstin',
                'pan',
                'cin',
                'bankName',
                'bankBranch',
                'bankIfsc',
                'bankAccountNumber',
            ]) {
                if (!payload[key]) delete payload[key];
            }

            const res = await api({
                method: isEdit ? 'patch' : 'post',
                url,
                data: payload,
            });

            if (res.data.success) {
                toast({ title: 'Success', description: res.data.message });
                setOpen(false);
                fetchAgents();
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
                : errorData?.message || 'Failed to save agent';
            toast({ variant: 'destructive', title: 'Error', description: msg });
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = async (agent: Agent) => {
        if (!confirm(`Delete agent "${agent.firstName} ${agent.lastName}"?`)) return;
        try {
            const res = await api.delete(`/m/hotel/agents/${agent._id}`);
            if (res.data.success) {
                toast({ title: 'Success', description: res.data.message });
                fetchAgents();
            } else {
                toast({ variant: 'destructive', title: 'Error', description: res.data.message });
            }
        } catch (error: any) {
            toast({
                variant: 'destructive',
                title: 'Error',
                description: error.response?.data?.message || 'Failed to delete agent',
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
                    {agents.length} agent{agents.length !== 1 ? 's' : ''}
                </p>
                <Dialog open={open} onOpenChange={setOpen}>
                    <DialogTrigger asChild>
                        <Button onClick={handleOpenCreate}>
                            <Plus className="h-4 w-4 mr-2" /> Add Agent
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
                        <DialogHeader>
                            <DialogTitle>
                                {editingAgent ? 'Edit Agent' : 'Add New Agent'}
                            </DialogTitle>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                            {/* Basic Info */}
                            <p className="text-sm font-semibold text-muted-foreground">
                                Basic Information
                            </p>
                            <div className="grid grid-cols-3 gap-4">
                                <div className="space-y-2">
                                    <Label>First Name *</Label>
                                    <Input
                                        value={formData.firstName}
                                        onChange={(e) =>
                                            setFormData({ ...formData, firstName: e.target.value })
                                        }
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Last Name *</Label>
                                    <Input
                                        value={formData.lastName}
                                        onChange={(e) =>
                                            setFormData({ ...formData, lastName: e.target.value })
                                        }
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Agent Code *</Label>
                                    <Input
                                        value={formData.agentCode}
                                        onChange={(e) =>
                                            setFormData({ ...formData, agentCode: e.target.value })
                                        }
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-3 gap-4">
                                <div className="space-y-2">
                                    <Label>Email</Label>
                                    <Input
                                        type="email"
                                        value={formData.email}
                                        onChange={(e) =>
                                            setFormData({ ...formData, email: e.target.value })
                                        }
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Phone</Label>
                                    <Input
                                        value={formData.phone}
                                        onChange={(e) =>
                                            setFormData({ ...formData, phone: e.target.value })
                                        }
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Share %</Label>
                                    <Input
                                        type="number"
                                        value={formData.sharePercentage}
                                        onChange={(e) =>
                                            setFormData({
                                                ...formData,
                                                sharePercentage: parseFloat(e.target.value) || 0,
                                            })
                                        }
                                    />
                                </div>
                            </div>

                            {/* Address */}
                            <p className="text-sm font-semibold text-muted-foreground mt-2">
                                Address
                            </p>
                            <div className="grid grid-cols-3 gap-4">
                                <div className="space-y-2">
                                    <Label>City</Label>
                                    <Input
                                        value={formData.city}
                                        onChange={(e) =>
                                            setFormData({ ...formData, city: e.target.value })
                                        }
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>State</Label>
                                    <Input
                                        value={formData.state}
                                        onChange={(e) =>
                                            setFormData({ ...formData, state: e.target.value })
                                        }
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Country</Label>
                                    <Input
                                        value={formData.country}
                                        onChange={(e) =>
                                            setFormData({ ...formData, country: e.target.value })
                                        }
                                    />
                                </div>
                            </div>

                            {/* Business */}
                            <p className="text-sm font-semibold text-muted-foreground mt-2">
                                Business Details
                            </p>
                            <div className="grid grid-cols-3 gap-4">
                                <div className="space-y-2">
                                    <Label>Business Type</Label>
                                    <Select
                                        value={formData.businessType}
                                        onValueChange={(val) =>
                                            setFormData({ ...formData, businessType: val })
                                        }
                                    >
                                        <SelectTrigger id="businessType">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="Registered">Registered</SelectItem>
                                            <SelectItem value="Unregistered">
                                                Unregistered
                                            </SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label>GSTIN</Label>
                                    <Input
                                        value={formData.gstin}
                                        onChange={(e) =>
                                            setFormData({ ...formData, gstin: e.target.value })
                                        }
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>PAN</Label>
                                    <Input
                                        value={formData.pan}
                                        onChange={(e) =>
                                            setFormData({ ...formData, pan: e.target.value })
                                        }
                                    />
                                </div>
                            </div>

                            {/* Bank */}
                            <p className="text-sm font-semibold text-muted-foreground mt-2">
                                Bank Details
                            </p>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Bank Name</Label>
                                    <Input
                                        value={formData.bankName}
                                        onChange={(e) =>
                                            setFormData({ ...formData, bankName: e.target.value })
                                        }
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Branch</Label>
                                    <Input
                                        value={formData.bankBranch}
                                        onChange={(e) =>
                                            setFormData({ ...formData, bankBranch: e.target.value })
                                        }
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>IFSC</Label>
                                    <Input
                                        value={formData.bankIfsc}
                                        onChange={(e) =>
                                            setFormData({ ...formData, bankIfsc: e.target.value })
                                        }
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Account Number</Label>
                                    <Input
                                        value={formData.bankAccountNumber}
                                        onChange={(e) =>
                                            setFormData({
                                                ...formData,
                                                bankAccountNumber: e.target.value,
                                            })
                                        }
                                    />
                                </div>
                            </div>

                            {/* Social/Media */}
                            <p className="text-sm font-semibold text-muted-foreground mt-2">
                                Media
                            </p>
                            <div className="space-y-2">
                                <Label>Profile Picture URL</Label>
                                <Input
                                    placeholder="https://example.com/photo.jpg"
                                    value={formData.profilePic}
                                    onChange={(e) =>
                                        setFormData({ ...formData, profilePic: e.target.value })
                                    }
                                />
                            </div>
                        </div>
                        <DialogFooter>
                            <Button onClick={handleSubmit} disabled={submitting}>
                                {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                                {editingAgent ? 'Update Agent' : 'Save Agent'}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>

            {agents.length === 0 ? (
                <div className="text-center py-10 text-muted-foreground">
                    No agents yet. Add one to get started.
                </div>
            ) : (
                <div className="rounded-md border">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Name</TableHead>
                                <TableHead>Code</TableHead>
                                <TableHead>Email</TableHead>
                                <TableHead>Phone</TableHead>
                                <TableHead className="text-right">Share %</TableHead>
                                <TableHead>Type</TableHead>
                                <TableHead className="w-[80px]"></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {agents.map((agent) => (
                                <TableRow key={agent._id}>
                                    <TableCell className="font-medium">
                                        {agent.firstName} {agent.lastName}
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant="outline">{agent.agentCode}</Badge>
                                    </TableCell>
                                    <TableCell>{agent.email || '-'}</TableCell>
                                    <TableCell>{agent.phone || '-'}</TableCell>
                                    <TableCell className="text-right">
                                        {agent.sharePercentage}%
                                    </TableCell>
                                    <TableCell>{agent.businessType}</TableCell>
                                    <TableCell>
                                        <div className="flex gap-1">
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => handleOpenEdit(agent)}
                                            >
                                                <Pencil className="h-4 w-4" />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => handleDelete(agent)}
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            )}
        </div>
    );
}
