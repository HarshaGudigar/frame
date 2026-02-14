import { ProfileForm } from '@/components/settings/profile-form';

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
        </div>
    );
}
