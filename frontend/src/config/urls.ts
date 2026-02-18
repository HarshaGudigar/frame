/**
 * Utility to determine Backend API and Socket URLs.
 * Defaults to current hostname if VITE_API_URL is missing.
 */
export const getBackendUrls = () => {
    const envUrl = import.meta.env.VITE_API_URL;

    // If VITE_API_URL is provided (e.g. during build or in .env), use it
    if (envUrl) {
        return {
            api: envUrl,
            socket: envUrl.replace(/\/api$/, ''),
        };
    }

    // Fallback: Use current hostname with port 5000
    // This handles deployments where environment variables might be missing during build
    const protocol = window.location.protocol;
    const hostname = window.location.hostname;

    // In production, we assume the backend is on the same host, port 5000
    // If it's localhost, keep localhost:5000
    const api = `${protocol}//${hostname}:5000/api`;
    const socket = `${protocol}//${hostname}:5000`;

    return { api, socket };
};
