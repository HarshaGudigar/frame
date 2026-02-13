import { Settings } from 'lucide-react';
import { Card } from '@/components/ui/card';

export function SettingsPage() {
    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
                <p className="text-sm text-muted-foreground">Account and platform configuration</p>
            </div>
            <Card className="flex flex-col items-center justify-center py-16">
                <Settings className="size-12 text-muted-foreground mb-3" />
                <h3 className="text-lg font-semibold">Coming Soon</h3>
                <p className="text-sm text-muted-foreground">Account settings, API keys, and platform configuration will be available here.</p>
            </Card>
        </div>
    );
}
