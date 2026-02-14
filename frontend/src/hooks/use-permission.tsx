import React from 'react';
import { useAuth, type Role } from '../contexts/auth-context';

const ROLE_HIERARCHY = {
    owner: 4,
    admin: 3,
    staff: 2,
    user: 1,
};

export const usePermission = () => {
    const { user } = useAuth();

    const hasRole = (requiredRole: Role) => {
        if (!user || !user.role) return false;

        const userLevel = ROLE_HIERARCHY[user.role as Role] || 0;
        const userRole = user.role as Role;
        const requiredLevel = ROLE_HIERARCHY[requiredRole] || 0;

        return ROLE_HIERARCHY[userRole] >= requiredLevel;
    };

    const is = (role: Role) => user?.role === role;

    return { hasRole, is, role: user?.role };
};

export const Can = ({
    role,
    children,
    fallback = null,
}: {
    role: Role;
    children: React.ReactNode;
    fallback?: React.ReactNode;
}) => {
    const { hasRole } = usePermission();

    if (hasRole(role)) {
        return <>{children}</>;
    }

    return <>{fallback}</>;
};
