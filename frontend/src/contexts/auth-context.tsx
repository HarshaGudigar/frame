import React, { useState, createContext, useContext, useEffect } from 'react';
import axios, { AxiosInstance } from 'axios';

const API_BASE = `${window.location.protocol}//${window.location.hostname}:5000/api`;

export interface User {
    _id: string; // Backend uses _id
    id?: string; // Frontend alias
    email: string;
    firstName: string;
    lastName: string;

    role: Role;
    isActive?: boolean;
    isEmailVerified?: boolean;
    tenants?: any[];
}

export type Role = 'owner' | 'admin' | 'staff' | 'user';

interface AuthContextType {
    user: User | null;
    token: string | null;
    api: AxiosInstance;
    login: (token: string, refreshToken: string, user: User) => void;
    logout: () => void;
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

    // Request Interceptor
    api.interceptors.request.use(
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
    api.interceptors.response.use(
        (res) => res,
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
        <AuthContext.Provider value={{ user, token, api, login, logout }}>
            {children}
        </AuthContext.Provider>
    );
}
