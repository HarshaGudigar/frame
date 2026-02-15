import { Routes, Route, Navigate } from 'react-router-dom';
import { Suspense, lazy } from 'react';
import { AuthProvider, useAuth } from '@/contexts/auth-context';
import { ErrorBoundary } from '@/components/error-boundary';
import { Layout } from '@/components/layout';
import { Loader2 } from 'lucide-react';

// Lazy load pages
const LoginPage = lazy(() =>
    import('@/pages/login').then((module) => ({ default: module.LoginPage })),
);
const DashboardPage = lazy(() =>
    import('@/pages/dashboard').then((module) => ({ default: module.DashboardPage })),
);
const TenantsPage = lazy(() =>
    import('@/pages/tenants').then((module) => ({ default: module.TenantsPage })),
);
const MarketplacePage = lazy(() =>
    import('@/pages/marketplace').then((module) => ({ default: module.MarketplacePage })),
);
const UsersPage = lazy(() => import('@/pages/users')); // Default export
const SettingsPage = lazy(() =>
    import('@/pages/settings').then((module) => ({ default: module.SettingsPage })),
);
const AuditLogsPage = lazy(() =>
    import('@/pages/audit-logs').then((module) => ({ default: module.AuditLogsPage })),
);

function AppRoutes() {
    const { token } = useAuth();

    if (!token)
        return (
            <Suspense
                fallback={
                    <div className="h-screen w-screen flex items-center justify-center">
                        <Loader2 className="h-8 w-8 animate-spin" />
                    </div>
                }
            >
                <LoginPage />
            </Suspense>
        );

    return (
        <Layout>
            <Suspense
                fallback={
                    <div className="flex-1 flex items-center justify-center h-full">
                        <Loader2 className="h-8 w-8 animate-spin" />
                    </div>
                }
            >
                <Routes>
                    <Route path="/" element={<DashboardPage />} />
                    <Route path="/tenants" element={<TenantsPage />} />
                    <Route path="/marketplace" element={<MarketplacePage />} />
                    <Route path="/users" element={<UsersPage />} />
                    <Route path="/settings" element={<SettingsPage />} />
                    <Route path="/audit-logs" element={<AuditLogsPage />} />
                    <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
            </Suspense>
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
