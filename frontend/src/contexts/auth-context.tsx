import React, { useState, createContext, useContext } from 'react';
import axios, { AxiosInstance } from 'axios';

const API_BASE = import.meta.env.DEV
    ? 'http://localhost:5000/api'
    : `${window.location.protocol}//${window.location.hostname}:5000/api`;

interface AuthContextType {
    token: string | null;
    api: AxiosInstance;
    login: (token: string) => void;
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

    const api = axios.create({ baseURL: API_BASE });

    api.interceptors.request.use(config => {
        if (token) config.headers.Authorization = `Bearer ${token}`;
        return config;
    });

    api.interceptors.response.use(
        res => res,
        err => {
            if (err.response?.status === 401 && token) {
                logout();
            }
            return Promise.reject(err);
        }
    );

    const login = (newToken: string) => {
        setToken(newToken);
        localStorage.setItem('token', newToken);
    };

    const logout = () => {
        setToken(null);
        localStorage.removeItem('token');
    };

    return (
        <AuthContext.Provider value={{ token, api, login, logout }}>
            {children}
        </AuthContext.Provider>
    );
}
