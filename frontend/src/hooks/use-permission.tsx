import React from 'react';
import { useAuth, type Role } from '../contexts/auth-context';

export const usePermission = () => {
    const { user } = useAuth();

    // LEGACY: Keeping this around temporarily to prevent breaking existing UI
    // before we migrate every single component.
    const ROLE_HIERARCHY: Record<string, number> = {
        superuser: 5,
        owner: 4,
        admin: 3,
        staff: 2,
        user: 1,
    };

    const hasRole = (requiredRole: Role | string) => {
        if (!user || !user.role) return false;

        // Owner/Superuser bypass
        if (user.role === 'superuser') return true;

        const userLevel = ROLE_HIERARCHY[user.role as string] || 0;
        const requiredLevel = ROLE_HIERARCHY[requiredRole as string] || 0;

        return userLevel >= requiredLevel;
    };

    const is = (role: Role | string) => user?.role === role;

    // NEW GRANULAR RBAC MATRIX CHECK
    const hasPermission = (permission: string) => {
        if (!user) return false;

        // Owner/Superuser bypass
        if (user.role === 'superuser') return true;

        if (!user.permissions || !Array.isArray(user.permissions)) return false;

        // Check for wildcard or specific permission
        return user.permissions.includes('*') || user.permissions.includes(permission);
    };

    // Check if user has ANY of an array of permissions
    const hasAnyPermission = (permissions: string[]) => {
        return permissions.some(hasPermission);
    };

    // Check if user has ALL of an array of permissions
    const hasAllPermissions = (permissions: string[]) => {
        return permissions.every(hasPermission);
    };

    return {
        hasRole,
        is,
        hasPermission,
        hasAnyPermission,
        hasAllPermissions,
        role: user?.role,
        permissions: user?.permissions,
    };
};

export const Can = ({
    role,
    permission,
    children,
    fallback = null,
}: {
    role?: Role | string;
    permission?: string | string[];
    children: React.ReactNode;
    fallback?: React.ReactNode;
}) => {
    const { hasRole, hasPermission, hasAnyPermission } = usePermission();

    // If a permission string or array is provided, use Granular RBAC
    if (permission) {
        let granted = false;
        if (Array.isArray(permission)) {
            granted = hasAnyPermission(permission);
        } else {
            granted = hasPermission(permission);
        }

        if (granted) return <>{children}</>;
        return <>{fallback}</>;
    }

    // Fallback to legacy role check
    if (role && hasRole(role)) {
        return <>{children}</>;
    }

    return <>{fallback}</>;
};
