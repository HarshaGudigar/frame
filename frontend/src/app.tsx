import { Routes, Route, Navigate } from 'react-router-dom';
import { Suspense, lazy } from 'react';
import { AuthProvider, useAuth } from '@/contexts/auth-context';
import { ErrorBoundary } from '@/components/error-boundary';
import { Layout } from '@/components/layout';
import { Loader2 } from 'lucide-react';
import { EmailVerificationRequired } from '@/components/email-verification-required';

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
const HotelDashboard = lazy(() =>
    import('@/pages/solutions/hotel/Dashboard').then((module) => ({
        default: module.HotelDashboard,
    })),
);
const Housekeeping = lazy(() => import('@/pages/solutions/hotel/Housekeeping'));
const InvoicePrintView = lazy(() => import('@/pages/solutions/hotel/InvoicePrintView'));

// Auth pages (unauthenticated)
const AcceptInvitePage = lazy(() =>
    import('@/pages/accept-invite').then((module) => ({ default: module.AcceptInvitePage })),
);
const VerifyEmailPage = lazy(() =>
    import('@/pages/verify-email').then((module) => ({ default: module.VerifyEmailPage })),
);
const ForgotPasswordPage = lazy(() =>
    import('@/pages/forgot-password').then((module) => ({ default: module.ForgotPasswordPage })),
);
const ResetPasswordPage = lazy(() =>
    import('@/pages/reset-password').then((module) => ({ default: module.ResetPasswordPage })),
);

const FullPageLoader = (
    <div className="h-screen w-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
    </div>
);

function AppRoutes() {
    const { token, user } = useAuth();

    // Unauthenticated — show login or public auth pages
    if (!token)
        return (
            <Suspense fallback={FullPageLoader}>
                <Routes>
                    <Route path="/accept-invite" element={<AcceptInvitePage />} />
                    <Route path="/verify-email" element={<VerifyEmailPage />} />
                    <Route path="/forgot-password" element={<ForgotPasswordPage />} />
                    <Route path="/reset-password" element={<ResetPasswordPage />} />
                    <Route path="*" element={<LoginPage />} />
                </Routes>
            </Suspense>
        );

    // Authenticated but email not verified — show interstitial
    // Bypass in development to match backend behavior
    const isDev = import.meta.env.DEV;
    if (user && !user.isEmailVerified && !isDev) {
        return (
            <Suspense fallback={FullPageLoader}>
                <Routes>
                    <Route path="/verify-email" element={<VerifyEmailPage />} />
                    <Route path="*" element={<EmailVerificationRequired />} />
                </Routes>
            </Suspense>
        );
    }

    // Authenticated and verified
    return (
        <Routes>
            <Route
                path="/solutions/hotel/invoice/:id"
                element={
                    <Suspense fallback={FullPageLoader}>
                        <InvoicePrintView />
                    </Suspense>
                }
            />
            <Route
                path="*"
                element={
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
                                <Route path="/hotel" element={<HotelDashboard />} />
                                <Route path="/hotel/housekeeping" element={<Housekeeping />} />
                                <Route path="*" element={<Navigate to="/" replace />} />
                            </Routes>
                        </Suspense>
                    </Layout>
                }
            />
        </Routes>
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
