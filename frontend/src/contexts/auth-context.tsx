import React, { useState, createContext, useContext, useEffect } from 'react';
import axios, { AxiosInstance } from 'axios';

const API_BASE = import.meta.env.DEV
    ? 'http://localhost:5000/api'
    : `${window.location.protocol}//${window.location.hostname}:5000/api`;

export interface User {
    _id: string; // Backend uses _id
    id?: string; // Frontend alias
    email: string;
    firstName: string;
    lastName: string;
    lastName: string;
    role: Role;
    isActive?: boolean;
    tenants?: any[];
}

export type Role = 'owner' | 'admin' | 'staff' | 'user';

interface AuthContextType {
    user: User | null;
    token: string | null;
    api: AxiosInstance;
    login: (token: string, user: User) => void;
    logout: () => void;
    isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function useAuth() {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error('useAuth must be used within AuthProvider');
    return ctx;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [token, setToken] = useState<string | null>(localStorage.getItem('token') || null);
    const [user, setUser] = useState<User | null>(() => {
        const savedUser = localStorage.getItem('user');
        return savedUser ? JSON.parse(savedUser) : null;
    });
    const [isLoading, setIsLoading] = useState(false); // Initial load is instant from localStorage

    const api = axios.create({ baseURL: API_BASE });

    api.interceptors.request.use((config) => {
        if (token) config.headers.Authorization = `Bearer ${token}`;
        return config;
    });

    api.interceptors.response.use(
        (res) => res,
        (err) => {
            if (err.response?.status === 401 && token) {
                logout();
            }
            return Promise.reject(err);
        },
    );

    const login = (newToken: string, newUser: User) => {
        setToken(newToken);
        setUser(newUser);
        localStorage.setItem('token', newToken);
        localStorage.setItem('user', JSON.stringify(newUser));
    };

    const logout = () => {
        setToken(null);
        setUser(null);
        localStorage.removeItem('token');
        localStorage.removeItem('user');
    };

    return (
        <AuthContext.Provider value={{ user, token, api, login, logout, isLoading }}>
            {children}
        </AuthContext.Provider>
    );
}
