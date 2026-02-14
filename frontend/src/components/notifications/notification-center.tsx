import React, { useState, useEffect } from 'react';
import { Bell } from 'lucide-react';
import { useSocket } from '@/components/providers/socket-provider';
import { useToast } from '@/hooks/use-toast';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
    DropdownMenuHeader,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface Notification {
    id: string;
    message: string;
    timestamp: Date;
    type: 'info' | 'success' | 'warning' | 'error';
    read: boolean;
}

export const NotificationCenter: React.FC = () => {
    const { socket } = useSocket();
    const { toast } = useToast();
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);

    useEffect(() => {
        if (!socket) return;

        const handleNotification = (event: string, data: any) => {
            let message = '';
            let type: Notification['type'] = 'info';

            switch (event) {
                case 'tenant:created':
                    message = `New tenant created: ${data.name}`;
                    type = 'success';
                    break;
                case 'tenant:status_change':
                    message = `Tenant ${data.name} is now ${data.isActive ? 'online' : 'offline'}`;
                    type = data.isActive ? 'success' : 'warning';
                    break;
                case 'user:invited':
                    message = `New user invited: ${data.email}`;
                    type = 'info';
                    break;
                default:
                    message = `New event: ${event}`;
            }

            const newNotification: Notification = {
                id: Math.random().toString(36).substr(2, 9),
                message,
                timestamp: new Date(),
                type,
                read: false,
            };

            setNotifications((prev) => [newNotification, ...prev].slice(0, 10));
            setUnreadCount((prev) => prev + 1);

            toast({
                title: 'New Update',
                description: message,
            });
        };

        socket.on('tenant:created', (data) => handleNotification('tenant:created', data));
        socket.on('tenant:status_change', (data) =>
            handleNotification('tenant:status_change', data),
        );
        socket.on('user:invited', (data) => handleNotification('user:invited', data));

        return () => {
            socket.off('tenant:created');
            socket.off('tenant:status_change');
            socket.off('user:invited');
        };
    }, [socket, toast]);

    const markAsRead = () => {
        setUnreadCount(0);
        setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    };

    return (
        <DropdownMenu onOpenChange={(open) => open && markAsRead()}>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="relative">
                    <Bell className="h-5 w-5" />
                    {unreadCount > 0 && (
                        <Badge
                            className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-[10px]"
                            variant="destructive"
                        >
                            {unreadCount}
                        </Badge>
                    )}
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80">
                <div className="flex items-center justify-between p-4 font-semibold border-b">
                    <span>Notifications</span>
                    {notifications.length > 0 && (
                        <Button variant="ghost" size="sm" onClick={() => setNotifications([])}>
                            Clear all
                        </Button>
                    )}
                </div>
                <div className="max-h-96 overflow-y-auto">
                    {notifications.length === 0 ? (
                        <div className="p-8 text-center text-muted-foreground">
                            No notifications yet
                        </div>
                    ) : (
                        notifications.map((n) => (
                            <DropdownMenuItem
                                key={n.id}
                                className="flex flex-col items-start p-4 cursor-default focus:bg-accent"
                            >
                                <div className="text-sm">{n.message}</div>
                                <div className="text-xs text-muted-foreground mt-1">
                                    {n.timestamp.toLocaleTimeString()}
                                </div>
                            </DropdownMenuItem>
                        ))
                    )}
                </div>
            </DropdownMenuContent>
        </DropdownMenu>
    );
};
