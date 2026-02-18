import { ProfileForm } from '@/components/settings/profile-form';
import { TwoFactorSettings } from '@/components/settings/two-factor-settings';
import { DatabaseBackups } from '@/components/settings/database-backups';
import { Can } from '@/hooks/use-permission';

export function SettingsPage() {
    return (
        <div className="space-y-6 container mx-auto p-6 max-w-4xl">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
                <p className="text-muted-foreground">
                    Manage your account settings and preferences.
                </p>
            </div>

            <ProfileForm />
            <TwoFactorSettings />
            <Can role="admin">
                <DatabaseBackups />
            </Can>
        </div>
    );
}
