import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from '@/contexts/auth-context';
import { ErrorBoundary } from '@/components/error-boundary';
import { Layout } from '@/components/layout';
import { LoginPage } from '@/pages/login';
import { DashboardPage } from '@/pages/dashboard';
import { TenantsPage } from '@/pages/tenants';
import { MarketplacePage } from '@/pages/marketplace';
import UsersPage from '@/pages/users';
import { SettingsPage } from '@/pages/settings';
import { AuditLogsPage } from '@/pages/audit-logs';

function AppRoutes() {
    const { token } = useAuth();

    if (!token) return <LoginPage />;

    return (
        <Layout>
            <Routes>
                <Route path="/" element={<DashboardPage />} />
                <Route path="/tenants" element={<TenantsPage />} />
                <Route path="/marketplace" element={<MarketplacePage />} />
                <Route path="/users" element={<UsersPage />} />
                <Route path="/settings" element={<SettingsPage />} />
                <Route path="/audit-logs" element={<AuditLogsPage />} />
                <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
        </Layout>
    );
}

import { SocketProvider } from '@/components/providers/socket-provider';
import { Toaster } from '@/components/ui/toaster';

function App() {
    return (
        <ErrorBoundary>
            <AuthProvider>
                <SocketProvider>
                    <AppRoutes />
                    <Toaster />
                </SocketProvider>
            </AuthProvider>
        </ErrorBoundary>
    );
}

export default App;
