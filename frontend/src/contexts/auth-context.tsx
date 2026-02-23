import React, { useState, createContext, useContext, useEffect } from 'react';
import axios, { AxiosInstance } from 'axios';
import { getBackendUrls } from '@/config/urls';

const { api: API_BASE } = getBackendUrls();

export interface User {
    _id: string; // Backend uses _id
    id?: string; // Frontend alias
    email: string;
    firstName: string;
    lastName: string;

    role: Role | string;
    permissions?: string[];
    isActive?: boolean;
    isEmailVerified?: boolean;
    isTwoFactorEnabled?: boolean;
    tenants?: any[];
}

export type Role = 'owner' | 'admin' | 'staff' | 'user';

interface AuthContextType {
    user: User | null;
    token: string | null;
    api: AxiosInstance;
    login: (token: string, refreshToken: string, user: User) => void;
    logout: () => void;
    systemInfo: { mode: string; tenant?: string; success?: boolean } | null;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function useAuth() {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error('useAuth must be used within AuthProvider');
    return ctx;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [token, setToken] = useState<string | null>(localStorage.getItem('token') || null);
    const [refreshToken, setRefreshToken] = useState<string | null>(
        localStorage.getItem('refreshToken') || null,
    );
    const [user, setUser] = useState<User | null>(() => {
        const savedUser = localStorage.getItem('user');
        if (!savedUser || savedUser === 'undefined') return null;
        try {
            return JSON.parse(savedUser);
        } catch {
            return null;
        }
    });

    const [systemInfo, setSystemInfo] = useState<{
        mode: string;
        tenant?: string;
        success?: boolean;
    } | null>(null);

    // Refs to hold latest values for interceptors
    const tokenRef = React.useRef(token);
    const refreshTokenRef = React.useRef(refreshToken);
    const isRefreshing = React.useRef(false);
    const failedQueue = React.useRef<any[]>([]);

    useEffect(() => {
        tokenRef.current = token;
        refreshTokenRef.current = refreshToken;
    }, [token, refreshToken]);

    const api = React.useMemo(() => axios.create({ baseURL: API_BASE }), []);

    // Fetch system info and latest user permissions on mount
    useEffect(() => {
        const fetchInitialData = async () => {
            try {
                // System Info (Platform Config)
                const configResponse = await axios.get(`${API_BASE}/health`);
                setSystemInfo(configResponse.data);

                // User Profile & Permissions
                if (tokenRef.current) {
                    const userResponse = await api.get('/auth/me');
                    if (userResponse.data.success && userResponse.data.data.user) {
                        const freshUser = userResponse.data.data.user;
                        setUser(freshUser);
                        localStorage.setItem('user', JSON.stringify(freshUser));
                    }
                }
            } catch (err) {
                console.error('Failed to fetch initial application data', err);
            }
        };
        fetchInitialData();
    }, [api]);

    const processQueue = (error: any, newToken: string | null = null) => {
        failedQueue.current.forEach((prom) => {
            if (error) {
                prom.reject(error);
            } else {
                prom.resolve(newToken);
            }
        });
        failedQueue.current = [];
    };

    useEffect(() => {
        // Request Interceptor
        const requestInterceptor = api.interceptors.request.use(
            (config) => {
                // Use ref to get latest token even if closure is stale
                if (tokenRef.current) {
                    config.headers.Authorization = `Bearer ${tokenRef.current}`;
                }
                return config;
            },
            (error) => Promise.reject(error),
        );

        // Response Interceptor
        const responseInterceptor = api.interceptors.response.use(
            (res) => {
                const debugHeader = res.headers['x-debug-context'];
                if (debugHeader) {
                    try {
                        const debugContext = JSON.parse(atob(debugHeader));
                        window.dispatchEvent(
                            new CustomEvent('debug-context', { detail: debugContext }),
                        );
                    } catch (e) {
                        console.error('Failed to parse debug context', e);
                    }
                }
                return res;
            },
            async (err) => {
                const originalRequest = err.config;

                if (err.response?.status === 401 && !originalRequest._retry) {
                    if (isRefreshing.current) {
                        // Queue concurrent requests while refreshing
                        return new Promise((resolve, reject) => {
                            failedQueue.current.push({ resolve, reject });
                        })
                            .then((newToken) => {
                                originalRequest.headers.Authorization = `Bearer ${newToken}`;
                                return api(originalRequest);
                            })
                            .catch((err) => Promise.reject(err));
                    }

                    originalRequest._retry = true;
                    isRefreshing.current = true;

                    try {
                        const currentRefreshToken = refreshTokenRef.current;
                        if (!currentRefreshToken) {
                            throw new Error('No refresh token available');
                        }

                        // Call refresh endpoint directly using axios to avoid interceptor loop
                        const response = await axios.post(`${API_BASE}/auth/refresh-token`, {
                            refreshToken: currentRefreshToken,
                        });

                        const { accessToken, refreshToken: newRefreshToken } = response.data.data;

                        setToken(accessToken);
                        setRefreshToken(newRefreshToken);
                        localStorage.setItem('token', accessToken);
                        localStorage.setItem('refreshToken', newRefreshToken);

                        processQueue(null, accessToken);

                        originalRequest.headers.Authorization = `Bearer ${accessToken}`;
                        return api(originalRequest);
                    } catch (refreshErr) {
                        processQueue(refreshErr, null);
                        logout();
                        return Promise.reject(refreshErr);
                    } finally {
                        isRefreshing.current = false;
                    }
                }
                return Promise.reject(err);
            },
        );

        return () => {
            api.interceptors.request.eject(requestInterceptor);
            api.interceptors.response.eject(responseInterceptor);
        };
    }, [api]);

    const login = (newToken: string, newRefreshToken: string, newUser: User) => {
        setToken(newToken);
        setRefreshToken(newRefreshToken);
        setUser(newUser);
        localStorage.setItem('token', newToken);
        localStorage.setItem('refreshToken', newRefreshToken);
        localStorage.setItem('user', JSON.stringify(newUser));
    };

    const logout = () => {
        // Optional: Call backend logout
        if (refreshTokenRef.current) {
            axios
                .post(`${API_BASE}/auth/logout`, { refreshToken: refreshTokenRef.current })
                .catch(() => {});
        }

        setToken(null);
        setRefreshToken(null);
        setUser(null);
        localStorage.removeItem('token');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('user');
    };

    return (
        <AuthContext.Provider value={{ user, token, api, login, logout, systemInfo }}>
            {children}
        </AuthContext.Provider>
    );
}
