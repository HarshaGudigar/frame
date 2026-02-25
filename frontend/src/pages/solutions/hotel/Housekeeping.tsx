import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
    Loader2,
    RefreshCcw,
    BedDouble,
    Brush,
    Wrench,
    CheckCircle2,
    Plus,
    ChevronRight,
    AlertCircle,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
    getBadgeColor,
    kanbanColumns,
    KanbanStatus,
    priorityConfig,
    roomBorderColors,
    iconBg,
} from '@/lib/module-styles';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';

interface Room {
    _id: string;
    number: string;
    type: string;
    status: 'Available' | 'Occupied' | 'Dirty' | 'Maintenance' | 'Cleaning';
    floor: number;
}

interface HousekeepingTask {
    _id: string;
    room: any;
    staffName?: string;
    status: KanbanStatus;
    type: string;
    priority: string;
    notes?: string;
}

const STATUS_FLOW: Record<KanbanStatus, KanbanStatus | null> = {
    Pending: 'In Progress',
    'In Progress': 'Completed',
    Completed: 'Delayed',
    Delayed: 'In Progress',
};

const TASK_TYPES = [
    'Checkout Clean',
    'Daily Clean',
    'Deep Clean',
    'Turndown',
    'Maintenance',
    'Inspection',
];

const roomStatusMeta: Record<string, { label: string; icon: any; color: string; bg: string }> = {
    Available: {
        label: 'Available',
        icon: CheckCircle2,
        color: 'text-green-600 dark:text-green-400',
        bg: iconBg.green,
    },
    Occupied: {
        label: 'Occupied',
        icon: BedDouble,
        color: 'text-blue-600 dark:text-blue-400',
        bg: iconBg.blue,
    },
    Dirty: {
        label: 'Dirty',
        icon: Brush,
        color: 'text-yellow-600 dark:text-yellow-400',
        bg: iconBg.yellow,
    },
    Maintenance: {
        label: 'Maintenance',
        icon: Wrench,
        color: 'text-red-600 dark:text-red-400',
        bg: iconBg.red,
    },
    Cleaning: {
        label: 'Cleaning',
        icon: RefreshCcw,
        color: 'text-sky-600 dark:text-sky-400',
        bg: iconBg.teal,
    },
};

export default function Housekeeping() {
    const { api } = useAuth();
    const { toast } = useToast();
    const [rooms, setRooms] = useState<Room[]>([]);
    const [tasks, setTasks] = useState<HousekeepingTask[]>([]);
    const [loading, setLoading] = useState(true);
    const [updatingId, setUpdatingId] = useState<string | null>(null);
    const [createOpen, setCreateOpen] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [newTask, setNewTask] = useState({
        roomId: '',
        type: 'Daily Clean',
        priority: 'Medium',
        staffName: '',
        notes: '',
    });

    const fetchData = async () => {
        setLoading(true);
        try {
            const [roomsRes, tasksRes] = await Promise.all([
                api.get('/m/hotel/rooms'),
                api.get('/m/hotel/housekeeping'),
            ]);
            if (roomsRes.data.success) setRooms(roomsRes.data.data);
            if (tasksRes.data.success) setTasks(tasksRes.data.data);
        } catch (error) {
            console.error('Failed to fetch housekeeping data', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [api]);

    const handleRoomStatus = async (roomId: string, newStatus: string) => {
        setUpdatingId(roomId);
        try {
            const res = await api.patch(`/m/hotel/rooms/${roomId}/status`, { status: newStatus });
            if (res.data.success) {
                toast({ title: 'Updated', description: `Marked as ${newStatus}` });
                setRooms(
                    rooms.map((r) => (r._id === roomId ? { ...r, status: newStatus as any } : r)),
                );
            }
        } catch (error: any) {
            toast({
                variant: 'destructive',
                title: 'Error',
                description: error.response?.data?.message || 'Update failed',
            });
        } finally {
            setUpdatingId(null);
        }
    };

    const handleTaskStatus = async (taskId: string, newStatus: KanbanStatus) => {
        setUpdatingId(taskId);
        try {
            const res = await api.patch(`/m/hotel/housekeeping/${taskId}/status`, {
                status: newStatus,
            });
            if (res.data.success) {
                toast({ title: 'Task updated', description: `Moved to ${newStatus}` });
                setTasks(tasks.map((t) => (t._id === taskId ? { ...t, status: newStatus } : t)));
            }
        } catch {
            toast({ variant: 'destructive', title: 'Error', description: 'Failed to update task' });
        } finally {
            setUpdatingId(null);
        }
    };

    const handleCreateTask = async () => {
        if (!newTask.roomId) {
            toast({
                variant: 'destructive',
                title: 'Required',
                description: 'Please select a room.',
            });
            return;
        }
        setSubmitting(true);
        try {
            const res = await api.post('/m/hotel/housekeeping', newTask);
            if (res.data.success) {
                toast({
                    title: 'Task Created',
                    description: 'Housekeeping task has been assigned.',
                });
                setCreateOpen(false);
                setNewTask({
                    roomId: '',
                    type: 'Daily Clean',
                    priority: 'Medium',
                    staffName: '',
                    notes: '',
                });
                fetchData();
            }
        } catch (err: any) {
            toast({
                variant: 'destructive',
                title: 'Error',
                description: err.response?.data?.message || 'Failed to create task.',
            });
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-20">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    const stats = {
        total: rooms.length,
        dirty: rooms.filter((r) => r.status === 'Dirty').length,
        available: rooms.filter((r) => r.status === 'Available').length,
        maintenance: rooms.filter((r) => r.status === 'Maintenance').length,
        pendingTasks: tasks.filter((t) => t.status !== 'Completed').length,
    };

    const tasksByStatus = Object.keys(kanbanColumns).reduce(
        (acc, key) => {
            acc[key as KanbanStatus] = tasks.filter((t) => t.status === key);
            return acc;
        },
        {} as Record<KanbanStatus, HousekeepingTask[]>,
    );

    return (
        <div className="space-y-6">
            {/* ─── Stats Row ─────────────────────────── */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                    {
                        label: 'Total Rooms',
                        value: stats.total,
                        icon: BedDouble,
                        color: iconBg.slate,
                    },
                    {
                        label: 'Need Cleaning',
                        value: stats.dirty,
                        icon: Brush,
                        color: iconBg.yellow,
                    },
                    {
                        label: 'Available',
                        value: stats.available,
                        icon: CheckCircle2,
                        color: iconBg.green,
                    },
                    {
                        label: 'Pending Tasks',
                        value: stats.pendingTasks,
                        icon: AlertCircle,
                        color: iconBg.blue,
                    },
                ].map(({ label, value, icon: Icon, color }) => (
                    <div
                        key={label}
                        className="flex items-center gap-3 rounded-xl border bg-card p-4 shadow-sm"
                    >
                        <div
                            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${color}`}
                        >
                            <Icon className="h-4 w-4" />
                        </div>
                        <div>
                            <p className="text-xs text-muted-foreground font-medium">{label}</p>
                            <p className="text-xl font-black text-foreground">{value}</p>
                        </div>
                    </div>
                ))}
            </div>

            {/* ─── Room Quick-Status ───────────────────── */}
            <div className="rounded-2xl border bg-card shadow-sm p-5">
                <div className="flex items-center justify-between mb-4">
                    <div>
                        <h3 className="text-base font-bold text-foreground">Room Status</h3>
                        <p className="text-xs text-muted-foreground">
                            Quickly mark rooms clean or send to maintenance
                        </p>
                    </div>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={fetchData}
                        className="gap-2 rounded-xl"
                    >
                        <RefreshCcw className="h-4 w-4" /> Refresh
                    </Button>
                </div>
                {rooms.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-8">
                        No rooms found.
                    </p>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                        {rooms.map((room) => {
                            const meta = roomStatusMeta[room.status] || roomStatusMeta.Available;
                            const Icon = meta.icon;
                            return (
                                <div
                                    key={room._id}
                                    className="relative overflow-hidden rounded-xl border-l-4 bg-muted/30 hover:bg-muted/50 p-4 border border-border/50"
                                    style={{
                                        borderLeftColor: roomBorderColors[room.status] || '#94a3b8',
                                    }}
                                >
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="font-bold text-base text-foreground">
                                            Room {room.number}
                                        </span>
                                        <Badge variant="outline" className="text-[10px]">
                                            F{room.floor}
                                        </Badge>
                                    </div>
                                    <div
                                        className={`flex items-center gap-1 text-xs font-semibold mb-3 ${meta.color}`}
                                    >
                                        <Icon className="h-3 w-3" />
                                        {room.status}
                                    </div>
                                    <div className="flex gap-1 flex-wrap">
                                        {room.status !== 'Available' && (
                                            <button
                                                className="text-[10px] font-bold px-2 py-1 rounded-md bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-300 transition-colors disabled:opacity-50"
                                                disabled={updatingId === room._id}
                                                onClick={() =>
                                                    handleRoomStatus(room._id, 'Available')
                                                }
                                            >
                                                ✓ Ready
                                            </button>
                                        )}
                                        {room.status !== 'Dirty' && room.status !== 'Occupied' && (
                                            <button
                                                className="text-[10px] font-bold px-2 py-1 rounded-md bg-yellow-100 text-yellow-700 hover:bg-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-300 transition-colors disabled:opacity-50"
                                                disabled={updatingId === room._id}
                                                onClick={() => handleRoomStatus(room._id, 'Dirty')}
                                            >
                                                Dirty
                                            </button>
                                        )}
                                        {room.status !== 'Maintenance' && (
                                            <button
                                                className="text-[10px] font-bold px-2 py-1 rounded-md bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400 transition-colors disabled:opacity-50"
                                                disabled={updatingId === room._id}
                                                onClick={() =>
                                                    handleRoomStatus(room._id, 'Maintenance')
                                                }
                                            >
                                                Maint.
                                            </button>
                                        )}
                                        {updatingId === room._id && (
                                            <Loader2 className="h-3 w-3 animate-spin text-muted-foreground mt-1" />
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* ─── Kanban Board ────────────────────────── */}
            <div className="rounded-2xl border bg-card shadow-sm p-5">
                <div className="flex items-center justify-between mb-5">
                    <div>
                        <h3 className="text-base font-bold text-foreground">Task Board</h3>
                        <p className="text-xs text-muted-foreground">
                            Interactive Kanban — drag tasks to any column or click to advance them
                        </p>
                    </div>
                    <Button
                        size="sm"
                        className="gap-2 rounded-xl"
                        onClick={() => setCreateOpen(true)}
                    >
                        <Plus className="h-4 w-4" /> New Task
                    </Button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                    {(Object.keys(kanbanColumns) as KanbanStatus[]).map((status) => {
                        const col = kanbanColumns[status];
                        const colTasks = tasksByStatus[status] || [];
                        return (
                            <div key={status} className="space-y-3">
                                {/* Column Header */}
                                <div
                                    className={`flex items-center justify-between px-3 py-2 rounded-xl border ${col.header}`}
                                >
                                    <div className="flex items-center gap-2">
                                        <span className={`h-2 w-2 rounded-full ${col.dot}`} />
                                        <span className="text-xs font-bold text-foreground">
                                            {col.label}
                                        </span>
                                    </div>
                                    <span
                                        className={`text-xs font-black px-2 py-0.5 rounded-full ${col.count}`}
                                    >
                                        {colTasks.length}
                                    </span>
                                </div>

                                {/* Task Cards */}
                                <div
                                    className="space-y-2 min-h-[150px] transition-colors rounded-xl p-1"
                                    onDragOver={(e) => {
                                        e.preventDefault();
                                        e.currentTarget.classList.add('bg-muted/50');
                                    }}
                                    onDragLeave={(e) => {
                                        e.currentTarget.classList.remove('bg-muted/50');
                                    }}
                                    onDrop={(e) => {
                                        e.preventDefault();
                                        e.currentTarget.classList.remove('bg-muted/50');
                                        const taskId = e.dataTransfer.getData('taskId');
                                        if (taskId && taskId !== '') {
                                            handleTaskStatus(taskId, status);
                                        }
                                    }}
                                >
                                    {colTasks.length === 0 ? (
                                        <div className="flex items-center justify-center h-20 rounded-xl border-2 border-dashed border-border/40 text-xs text-muted-foreground">
                                            No tasks
                                        </div>
                                    ) : (
                                        colTasks.map((task) => {
                                            const priority =
                                                priorityConfig[task.priority] || priorityConfig.Low;
                                            const nextStatus = STATUS_FLOW[status];
                                            return (
                                                <div
                                                    key={task._id}
                                                    draggable
                                                    onDragStart={(e) => {
                                                        e.dataTransfer.setData('taskId', task._id);
                                                        e.dataTransfer.effectAllowed = 'move';
                                                        // Add a slight delay to the styling so it doesn't affect the drag image
                                                        setTimeout(() => {
                                                            (e.target as HTMLElement).classList.add(
                                                                'opacity-40',
                                                            );
                                                        }, 0);
                                                    }}
                                                    onDragEnd={(e) => {
                                                        (e.target as HTMLElement).classList.remove(
                                                            'opacity-40',
                                                        );
                                                    }}
                                                    className="group rounded-xl border bg-card p-3 shadow-sm hover:shadow-md cursor-grab active:cursor-grabbing"
                                                    style={{
                                                        borderLeftWidth: 3,
                                                        borderLeftColor: priority.dot
                                                            .replace('bg-', '')
                                                            .includes('animate')
                                                            ? '#ef4444'
                                                            : undefined,
                                                    }}
                                                >
                                                    <div className="flex items-start justify-between gap-2 mb-2">
                                                        <div className="font-bold text-sm text-foreground">
                                                            Room {task.room?.number || '—'}
                                                        </div>
                                                        <Badge
                                                            variant="outline"
                                                            className={`text-[10px] border ${getBadgeColor(task.priority)}`}
                                                        >
                                                            {task.priority}
                                                        </Badge>
                                                    </div>
                                                    <p className="text-xs text-muted-foreground mb-1">
                                                        {task.type}
                                                    </p>
                                                    {task.staffName && (
                                                        <p className="text-[10px] text-muted-foreground/70 font-medium">
                                                            👤 {task.staffName}
                                                        </p>
                                                    )}
                                                    {nextStatus && (
                                                        <button
                                                            disabled={updatingId === task._id}
                                                            onClick={() =>
                                                                handleTaskStatus(
                                                                    task._id,
                                                                    nextStatus,
                                                                )
                                                            }
                                                            className="mt-2 flex items-center gap-1 text-[10px] font-bold text-primary hover:text-primary/80 disabled:opacity-50 transition-colors"
                                                        >
                                                            {updatingId === task._id ? (
                                                                <Loader2 className="h-3 w-3 animate-spin" />
                                                            ) : (
                                                                <ChevronRight className="h-3 w-3" />
                                                            )}
                                                            Move to {nextStatus}
                                                        </button>
                                                    )}
                                                </div>
                                            );
                                        })
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* ─── Create Task Dialog ──────────────────── */}
            <Dialog open={createOpen} onOpenChange={setCreateOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>New Housekeeping Task</DialogTitle>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="space-y-2">
                            <Label>Room *</Label>
                            <Select
                                value={newTask.roomId}
                                onValueChange={(v) => setNewTask({ ...newTask, roomId: v })}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Select a room" />
                                </SelectTrigger>
                                <SelectContent>
                                    {rooms.map((r) => (
                                        <SelectItem key={r._id} value={r._id}>
                                            Room {r.number} — {r.status}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Task Type</Label>
                                <Select
                                    value={newTask.type}
                                    onValueChange={(v) => setNewTask({ ...newTask, type: v })}
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {TASK_TYPES.map((t) => (
                                            <SelectItem key={t} value={t}>
                                                {t}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>Priority</Label>
                                <Select
                                    value={newTask.priority}
                                    onValueChange={(v) => setNewTask({ ...newTask, priority: v })}
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {Object.keys(priorityConfig).map((p) => (
                                            <SelectItem key={p} value={p}>
                                                {p}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label>Assign Staff</Label>
                            <Input
                                placeholder="Staff member name (optional)"
                                value={newTask.staffName}
                                onChange={(e) =>
                                    setNewTask({ ...newTask, staffName: e.target.value })
                                }
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Notes</Label>
                            <Input
                                placeholder="Any special instructions..."
                                value={newTask.notes}
                                onChange={(e) => setNewTask({ ...newTask, notes: e.target.value })}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setCreateOpen(false)}>
                            Cancel
                        </Button>
                        <Button onClick={handleCreateTask} disabled={submitting}>
                            {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                            Create Task
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
