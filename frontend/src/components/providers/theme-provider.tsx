import React, { createContext, useContext, useEffect, useState } from 'react';

type Theme = 'dark' | 'light' | 'system';

type ThemeProviderState = {
    theme: Theme;
    setTheme: (theme: Theme) => void;
};

const initialState: ThemeProviderState = {
    theme: 'light', // Set a default to satisfy the type but fix unused warning if it's coming from destructuring
    setTheme: () => null,
};

const ThemeProviderContext = createContext<ThemeProviderState>(initialState);

// Notify Electron main process to update the titleBarOverlay colors
function notifyElectronTheme(isDark: boolean) {
    try {
        const { ipcRenderer } = window.require?.('electron') ?? {};
        if (!ipcRenderer) return;
        ipcRenderer.send('theme-changed', isDark);
    } catch {
        // Not in Electron — silently ignore
    }
}

export function ThemeProvider({
    children,
    defaultTheme = 'system',
    storageKey = 'vite-ui-theme',
    ...props
}: {
    children: React.ReactNode;
    defaultTheme?: Theme;
    storageKey?: string;
}) {
    const [theme, setTheme] = useState<Theme>(
        () => (localStorage.getItem(storageKey) as Theme) || defaultTheme,
    );

    useEffect(() => {
        const root = window.document.documentElement;

        root.classList.remove('light', 'dark');

        if (theme === 'system') {
            const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
            const systemTheme = isDark ? 'dark' : 'light';

            root.classList.add(systemTheme);
            notifyElectronTheme(isDark);
            return;
        }

        root.classList.add(theme);
        notifyElectronTheme(theme === 'dark');
    }, [theme]);

    const value = {
        theme,
        setTheme: (theme: Theme) => {
            localStorage.setItem(storageKey, theme);
            setTheme(theme);
        },
    };

    return (
        <ThemeProviderContext.Provider {...props} value={value}>
            {children}
        </ThemeProviderContext.Provider>
    );
}

export const useTheme = () => {
    const context = useContext(ThemeProviderContext);

    if (context === undefined) throw new Error('useTheme must be used within a ThemeProvider');

    return context;
};
