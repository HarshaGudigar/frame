import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from '@/contexts/auth-context';
import { useToast } from '@/hooks/use-toast';

interface SocketContextType {
    socket: Socket | null;
    isConnected: boolean;
}

const SocketContext = createContext<SocketContextType>({
    socket: null,
    isConnected: false,
});

export const useSocket = () => useContext(SocketContext);

export const SocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [socket, setSocket] = useState<Socket | null>(null);
    const [isConnected, setIsConnected] = useState(false);
    const { user, token } = useAuth();
    const { toast } = useToast();
    const hasConnectedOnce = useRef(false);

    useEffect(() => {
        if (!user || !token) {
            if (socket) {
                socket.disconnect();
                setSocket(null);
                setIsConnected(false);
            }
            return;
        }

        // Strip '/api' suffix if present to ensure socket.io connects to the root
        const socketUrl = (import.meta.env.VITE_API_URL || 'http://localhost:5000/api').replace(
            /\/api$/,
            '',
        );
        const socketInstance = io(socketUrl, {
            withCredentials: true,
            transports: ['websocket', 'polling'], // Fallback to polling if websocket fails
            auth: { token },
            reconnectionAttempts: 10,
            reconnectionDelay: 1000,
            reconnectionDelayMax: 30000,
        });

        socketInstance.on('connect', () => {
            console.log('Connected to socket server');
            if (hasConnectedOnce.current) {
                toast({
                    title: 'Connection Restored',
                    description: 'Real-time updates are active again.',
                });
            }
            hasConnectedOnce.current = true;
            setIsConnected(true);
        });

        socketInstance.on('disconnect', () => {
            console.log('Disconnected from socket server');
            setIsConnected(false);
            if (hasConnectedOnce.current) {
                toast({
                    variant: 'destructive',
                    title: 'Connection Lost',
                    description: 'Attempting to reconnect...',
                });
            }
        });

        socketInstance.on('connect_error', (err) => {
            console.error('Socket connection error:', err.message);
            setIsConnected(false);
        });

        socketInstance.io.on('reconnect_failed', () => {
            toast({
                variant: 'destructive',
                title: 'Unable to Reconnect',
                description: 'Please refresh the page.',
            });
        });

        setSocket(socketInstance);

        return () => {
            socketInstance.disconnect();
            hasConnectedOnce.current = false;
        };
    }, [user, token]);

    return (
        <SocketContext.Provider value={{ socket, isConnected }}>{children}</SocketContext.Provider>
    );
};
