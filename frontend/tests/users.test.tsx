import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import Users from '../src/pages/users';
import { AuthProvider, useAuth } from '../src/contexts/auth-context';
import { usePermission } from '../src/hooks/use-permission';

// Mock dependencies
vi.mock('../src/contexts/auth-context', async () => {
    const actual = await vi.importActual('../src/contexts/auth-context');
    return {
        ...actual,
        useAuth: vi.fn(),
    };
});

vi.mock('../src/hooks/use-permission', () => ({
    usePermission: vi.fn(),
}));

describe('Users Page', () => {
    const mockApi = {
        get: vi.fn(),
        post: vi.fn(),
        delete: vi.fn(),
    };

    beforeEach(() => {
        vi.clearAllMocks();
        (useAuth as any).mockReturnValue({
            api: mockApi,
        });
    });

    it('shows Access Denied for non-admins', () => {
        (usePermission as any).mockReturnValue({ hasRole: (role: string) => false });

        render(<Users />);
        expect(screen.getByText('Access Denied')).toBeTruthy();
    });

    it('renders user list for admins', async () => {
        (usePermission as any).mockReturnValue({ hasRole: (role: string) => true });
        mockApi.get.mockResolvedValue({
            data: {
                success: true,
                data: [
                    {
                        id: '1',
                        firstName: 'John',
                        lastName: 'Doe',
                        email: 'john@example.com',
                        role: 'user',
                        isActive: true,
                    },
                ],
            },
        });

        render(<Users />);

        await waitFor(() => {
            expect(screen.getByText('John Doe')).toBeTruthy();
            expect(screen.getByText('john@example.com')).toBeTruthy();
        });
    });
});
