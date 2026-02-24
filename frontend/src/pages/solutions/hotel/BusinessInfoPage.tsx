import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Plus, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const emptyForm = {
    legalName: '',
    brandName: '',
    address: '',
    city: '',
    state: '',
    pinCode: '',
    country: '',
    email: '',
    website: '',
    phone: '',
    gst: '',
    cin: '',
    pan: '',
    extraInfo: [] as { key: string; value: string }[],
};

export function BusinessInfoPage() {
    const { api } = useAuth();
    const { toast } = useToast();
    const [formData, setFormData] = useState(emptyForm);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        const fetchInfo = async () => {
            try {
                const res = await api.get('/m/hotel/business-info');
                if (res.data.success && res.data.data) {
                    const d = res.data.data;
                    setFormData({
                        legalName: d.legalName || '',
                        brandName: d.brandName || '',
                        address: d.address || '',
                        city: d.city || '',
                        state: d.state || '',
                        pinCode: d.pinCode || '',
                        country: d.country || '',
                        email: d.email || '',
                        website: d.website || '',
                        phone: d.phone || '',
                        gst: d.gst || '',
                        cin: d.cin || '',
                        pan: d.pan || '',
                        extraInfo: d.extraInfo || [],
                    });
                }
            } catch (error) {
                console.error('Failed to fetch business info', error);
            } finally {
                setLoading(false);
            }
        };
        fetchInfo();
    }, [api]);

    const handleSubmit = async () => {
        setSubmitting(true);
        try {
            const payload: any = { ...formData };
            // Strip empty optional strings
            for (const key of [
                'brandName',
                'address',
                'city',
                'state',
                'pinCode',
                'country',
                'email',
                'website',
                'phone',
                'gst',
                'cin',
                'pan',
            ]) {
                if (!payload[key]) delete payload[key];
            }

            const res = await api.put('/m/hotel/business-info', payload);

            if (res.data.success) {
                toast({ title: 'Success', description: res.data.message });
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
                : errorData?.message || 'Failed to save business info';
            toast({ variant: 'destructive', title: 'Error', description: msg });
        } finally {
            setSubmitting(false);
        }
    };

    const addExtraInfo = () => {
        if (formData.extraInfo.length >= 5) return;
        setFormData({ ...formData, extraInfo: [...formData.extraInfo, { key: '', value: '' }] });
    };

    const removeExtraInfo = (index: number) => {
        const newExtra = formData.extraInfo.filter((_, i) => i !== index);
        setFormData({ ...formData, extraInfo: newExtra });
    };

    const updateExtraInfo = (index: number, field: 'key' | 'value', val: string) => {
        const newExtra = [...formData.extraInfo];
        newExtra[index] = { ...newExtra[index], [field]: val };
        setFormData({ ...formData, extraInfo: newExtra });
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-10">
                <Loader2 className="h-8 w-8 animate-spin" />
            </div>
        );
    }

    return (
        <div className="space-y-6 max-w-2xl">
            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label>Legal Name *</Label>
                    <Input
                        value={formData.legalName}
                        onChange={(e) => setFormData({ ...formData, legalName: e.target.value })}
                    />
                </div>
                <div className="space-y-2">
                    <Label>Brand Name</Label>
                    <Input
                        value={formData.brandName}
                        onChange={(e) => setFormData({ ...formData, brandName: e.target.value })}
                    />
                </div>
            </div>

            <div className="space-y-2">
                <Label>Address</Label>
                <Input
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                />
            </div>

            <div className="grid grid-cols-4 gap-4">
                <div className="space-y-2">
                    <Label>City</Label>
                    <Input
                        value={formData.city}
                        onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    />
                </div>
                <div className="space-y-2">
                    <Label>State</Label>
                    <Input
                        value={formData.state}
                        onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                    />
                </div>
                <div className="space-y-2">
                    <Label>PIN Code</Label>
                    <Input
                        value={formData.pinCode}
                        onChange={(e) => setFormData({ ...formData, pinCode: e.target.value })}
                    />
                </div>
                <div className="space-y-2">
                    <Label>Country</Label>
                    <Input
                        value={formData.country}
                        onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                    />
                </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                    <Label>Email</Label>
                    <Input
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    />
                </div>
                <div className="space-y-2">
                    <Label>Phone</Label>
                    <Input
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    />
                </div>
                <div className="space-y-2">
                    <Label>Website</Label>
                    <Input
                        value={formData.website}
                        onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                    />
                </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                    <Label>GST</Label>
                    <Input
                        value={formData.gst}
                        onChange={(e) => setFormData({ ...formData, gst: e.target.value })}
                    />
                </div>
                <div className="space-y-2">
                    <Label>CIN</Label>
                    <Input
                        value={formData.cin}
                        onChange={(e) => setFormData({ ...formData, cin: e.target.value })}
                    />
                </div>
                <div className="space-y-2">
                    <Label>PAN</Label>
                    <Input
                        value={formData.pan}
                        onChange={(e) => setFormData({ ...formData, pan: e.target.value })}
                    />
                </div>
            </div>

            <div className="space-y-3">
                <div className="flex items-center justify-between">
                    <Label>Extra Information (max 5)</Label>
                    {formData.extraInfo.length < 5 && (
                        <Button variant="outline" size="sm" onClick={addExtraInfo}>
                            <Plus className="h-4 w-4 mr-1" /> Add
                        </Button>
                    )}
                </div>
                {formData.extraInfo.map((item, index) => (
                    <div key={index} className="flex gap-2 items-center">
                        <Input
                            placeholder="Key"
                            value={item.key}
                            onChange={(e) => updateExtraInfo(index, 'key', e.target.value)}
                            className="flex-1"
                        />
                        <Input
                            placeholder="Value"
                            value={item.value}
                            onChange={(e) => updateExtraInfo(index, 'value', e.target.value)}
                            className="flex-1"
                        />
                        <Button variant="ghost" size="sm" onClick={() => removeExtraInfo(index)}>
                            <X className="h-4 w-4" />
                        </Button>
                    </div>
                ))}
            </div>

            <Button onClick={handleSubmit} disabled={submitting}>
                {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Save Business Info
            </Button>
        </div>
    );
}
