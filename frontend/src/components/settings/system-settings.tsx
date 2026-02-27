import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
    CardFooter,
} from '@/components/ui/card';
import { Settings, Save, Loader2 } from 'lucide-react';
import { Label } from '@/components/ui/label';

export function SystemSettings() {
    const { api, systemInfo, refreshSystemInfo } = useAuth();
    const { toast } = useToast();
    const [instanceName, setInstanceName] = useState('');
    const [instanceDescription, setInstanceDescription] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (systemInfo) {
            setInstanceName(systemInfo.instanceName || '');
            setInstanceDescription(systemInfo.instanceDescription || '');
        }
    }, [systemInfo]);

    const handleSave = async () => {
        if (!instanceName.trim()) {
            toast({
                title: 'Error',
                description: 'Instance name cannot be empty',
                variant: 'destructive',
            });
            return;
        }

        if (!instanceDescription.trim()) {
            toast({
                title: 'Error',
                description: 'Instance description cannot be empty',
                variant: 'destructive',
            });
            return;
        }

        setIsSaving(true);
        try {
            await api.patch('/admin/app-config', {
                instanceName: instanceName.trim(),
                instanceDescription: instanceDescription.trim(),
            });
            await refreshSystemInfo();

            toast({
                title: 'Success',
                description: 'System settings updated successfully.',
            });
        } catch (error: any) {
            console.error('Failed to update system settings:', error);
            toast({
                title: 'Error',
                description: error.response?.data?.message || 'Failed to update system settings',
                variant: 'destructive',
            });
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <Card className="glass-card shadow-lg shadow-black/5 overflow-hidden transition-all duration-300">
            <CardHeader className="bg-gradient-to-r from-background to-secondary/20 pb-4 border-b">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/10 rounded-lg">
                        <Settings className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                        <CardTitle className="text-lg">System Configuration</CardTitle>
                        <CardDescription>
                            Configure core instance properties like branding names.
                        </CardDescription>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="pt-6">
                <div className="grid gap-4 max-w-xl">
                    <div className="space-y-2">
                        <Label htmlFor="instanceName">Instance Name</Label>
                        <Input
                            id="instanceName"
                            placeholder="e.g. SMDS Technologies"
                            value={instanceName}
                            onChange={(e) => setInstanceName(e.target.value)}
                        />
                        <p className="text-xs text-muted-foreground">
                            This name runs throughout the system, appearing in the sidebar header
                            and document title.
                        </p>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="instanceDescription">Tagline / Description</Label>
                        <Input
                            id="instanceDescription"
                            placeholder="e.g. Enterprise Control Plane"
                            value={instanceDescription}
                            onChange={(e) => setInstanceDescription(e.target.value)}
                        />
                        <p className="text-xs text-muted-foreground">
                            Short tagline that appears on the login screen.
                        </p>
                    </div>
                </div>
            </CardContent>
            <CardFooter className="bg-secondary/10 border-t flex justify-between py-4">
                <div className="text-xs text-muted-foreground">
                    Only <span className="font-semibold text-primary">superusers</span> can view and
                    modify these settings.
                </div>
                <Button
                    onClick={handleSave}
                    disabled={
                        isSaving ||
                        (instanceName === systemInfo?.instanceName &&
                            instanceDescription === systemInfo?.instanceDescription)
                    }
                >
                    {isSaving ? (
                        <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Saving...
                        </>
                    ) : (
                        <>
                            <Save className="h-4 w-4 mr-2" /> Save Changes
                        </>
                    )}
                </Button>
            </CardFooter>
        </Card>
    );
}
