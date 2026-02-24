import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/auth-context';
import {
    BedDouble,
    Users,
    CalendarCheck,
    TrendingUp,
    RefreshCcw,
    Clock,
    LogIn,
    LogOut,
    Sparkles,
    Building2,
    Wrench,
    Brush,
    BarChart2,
    BookOpen,
    ShoppingBag,
    Tag,
    UserCog,
    Info,
    Settings2,
} from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { RoomGrid } from './RoomGrid';
import { CustomerList } from './CustomerList';
import { BookingList } from './BookingList';
import { ServiceList } from './ServiceList';
import { AgentList } from './AgentList';
import { TransactionList } from './TransactionList';
import { TransactionCategoryList } from './TransactionCategoryList';
import { BusinessInfoPage } from './BusinessInfoPage';
import { SettingsPage } from './SettingsPage';
import Housekeeping from './Housekeeping';
import { InventoryList } from './InventoryList';
import { Reporting } from './Reporting';

type Tab =
    | 'overview'
    | 'rooms'
    | 'housekeeping'
    | 'inventory'
    | 'customers'
    | 'bookings'
    | 'services'
    | 'transactions'
    | 'transaction-categories'
    | 'agents'
    | 'business-info'
    | 'settings'
    | 'reports';

const tabGroups: { label: string; icon: any; tabs: { key: Tab; label: string; icon: any }[] }[] = [
    {
        label: 'Operations',
        icon: Building2,
        tabs: [
            { key: 'overview', label: 'Overview', icon: BarChart2 },
            { key: 'rooms', label: 'Rooms', icon: BedDouble },
            { key: 'housekeeping', label: 'Housekeeping', icon: Brush },
            { key: 'inventory', label: 'Inventory', icon: ShoppingBag },
            { key: 'customers', label: 'Guests', icon: Users },
            { key: 'bookings', label: 'Bookings', icon: BookOpen },
        ],
    },
    {
        label: 'Finance',
        icon: TrendingUp,
        tabs: [
            { key: 'services', label: 'Services', icon: Sparkles },
            { key: 'transactions', label: 'Transactions', icon: TrendingUp },
            { key: 'transaction-categories', label: 'Categories', icon: Tag },
        ],
    },
    {
        label: 'Admin',
        icon: Settings2,
        tabs: [
            { key: 'agents', label: 'Agents', icon: UserCog },
            { key: 'business-info', label: 'Business Info', icon: Info },
            { key: 'settings', label: 'Settings', icon: Settings2 },
        ],
    },
    {
        label: 'Analytics',
        icon: BarChart2,
        tabs: [{ key: 'reports', label: 'Reports', icon: BarChart2 }],
    },
];

interface Activity {
    id: string;
    type: 'check-in' | 'check-out' | 'booking' | 'housekeeping';
    title: string;
    description: string;
    time: string;
    status: 'pending' | 'done';
}

interface ScheduleItem {
    id: string;
    guestName: string;
    roomNumber: string;
    type: 'arrival' | 'departure';
    time: string;
}

function StatCard({
    label,
    value,
    sub,
    icon: Icon,
    color,
}: {
    label: string;
    value: string | number;
    sub?: string;
    icon: any;
    color: string;
}) {
    return (
        <div
            className={`relative overflow-hidden rounded-2xl border p-4 flex items-center gap-3 bg-card shadow-sm hover:shadow-md transition-all duration-200 group`}
        >
            <div
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${color} transition-transform duration-200 group-hover:scale-110`}
            >
                <Icon className="h-4.5 w-4.5" />
            </div>
            <div className="flex-1 min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    {label}
                </p>
                <p className="text-xl font-black tracking-tight text-foreground mt-0.5">{value}</p>
                {sub && <p className="text-[10px] text-muted-foreground mt-0.5 truncate">{sub}</p>}
            </div>
        </div>
    );
}

function ActivityFeed({ items }: { items: Activity[] }) {
    const iconMap: Record<string, any> = {
        'check-in': LogIn,
        'check-out': LogOut,
        booking: BookOpen,
        housekeeping: Brush,
    };
    const colorMap: Record<string, string> = {
        'check-in': 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400',
        'check-out': 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400',
        booking: 'bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400',
        housekeeping: 'bg-yellow-100 text-yellow-600 dark:bg-yellow-900/30 dark:text-yellow-400',
    };

    if (items.length === 0) {
        return (
            <p className="text-sm text-muted-foreground text-center py-8">No activity yet today.</p>
        );
    }

    return (
        <div className="space-y-4">
            {items.map((item) => {
                const Icon = iconMap[item.type] || Clock;
                return (
                    <div key={item.id} className="flex items-start gap-3 group">
                        <div
                            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${colorMap[item.type]}`}
                        >
                            <Icon className="h-3.5 w-3.5" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-foreground leading-tight">
                                {item.title}
                            </p>
                            <p className="text-xs text-muted-foreground mt-0.5 truncate">
                                {item.description}
                            </p>
                        </div>
                        <span className="text-[10px] text-muted-foreground whitespace-nowrap mt-0.5">
                            {item.time}
                        </span>
                    </div>
                );
            })}
        </div>
    );
}

function ScheduleFeed({
    arrivals,
    departures,
}: {
    arrivals: ScheduleItem[];
    departures: ScheduleItem[];
}) {
    const all = [
        ...arrivals.map((a) => ({ ...a, type: 'arrival' as const })),
        ...departures.map((d) => ({ ...d, type: 'departure' as const })),
    ].sort((a, b) => a.time.localeCompare(b.time));

    if (all.length === 0) {
        return (
            <p className="text-sm text-muted-foreground text-center py-8">All clear for today.</p>
        );
    }

    return (
        <div className="space-y-3">
            {all.map((item) => (
                <div
                    key={item.id}
                    className="flex items-center justify-between py-2 border-b border-border/40 last:border-0"
                >
                    <div className="flex items-center gap-3">
                        <div
                            className={`h-2 w-2 rounded-full ${item.type === 'arrival' ? 'bg-green-500' : 'bg-blue-500'}`}
                        />
                        <div>
                            <p className="text-sm font-semibold text-foreground">
                                {item.guestName}
                            </p>
                            <p className="text-xs text-muted-foreground">Room {item.roomNumber}</p>
                        </div>
                    </div>
                    <div className="text-right">
                        <Badge
                            variant="outline"
                            className={`text-[10px] font-bold ${
                                item.type === 'arrival'
                                    ? 'bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400'
                                    : 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400'
                            }`}
                        >
                            {item.type === 'arrival' ? '↓ Arrival' : '↑ Departure'}
                        </Badge>
                        <p className="text-[10px] text-muted-foreground mt-1">{item.time}</p>
                    </div>
                </div>
            ))}
        </div>
    );
}

export function HotelDashboard() {
    const { api, user } = useAuth();
    const [activeTab, setActiveTab] = useState<Tab>('overview');
    const [stats, setStats] = useState({
        totalRooms: 0,
        occupied: 0,
        available: 0,
        todayCheckIns: 0,
        dirty: 0,
        maintenance: 0,
    });
    const [activities, setActivities] = useState<Activity[]>([]);
    const [arrivals, setArrivals] = useState<ScheduleItem[]>([]);
    const [departures, setDepartures] = useState<ScheduleItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const fetchStats = async (silent = false) => {
        if (!silent) setLoading(true);
        else setRefreshing(true);
        try {
            const [roomsRes, bookingsRes, hkRes] = await Promise.all([
                api.get('/m/hotel/rooms'),
                api.get('/m/hotel/bookings'),
                api.get('/m/hotel/housekeeping'),
            ]);
            const rooms = roomsRes.data?.data || [];
            const bookings = bookingsRes.data?.data || [];
            const hkTasks = hkRes.data?.data || [];
            const today = new Date().toISOString().split('T')[0];

            setStats({
                totalRooms: rooms.length,
                occupied: rooms.filter((r: any) => r.status === 'Occupied').length,
                available: rooms.filter((r: any) => r.status === 'Available').length,
                dirty: rooms.filter((r: any) => r.status === 'Dirty').length,
                maintenance: rooms.filter((r: any) => r.status === 'Maintenance').length,
                todayCheckIns: bookings.filter(
                    (b: any) => b.checkInDate?.startsWith(today) && b.status === 'Confirmed',
                ).length,
            });

            // Schedule: Only pending arrivals/departures
            const todayArrivals: ScheduleItem[] = bookings
                .filter((b: any) => b.checkInDate?.startsWith(today) && b.status === 'Confirmed')
                .map((b: any) => ({
                    id: b._id,
                    guestName:
                        `${b.customer?.firstName || ''} ${b.customer?.lastName || ''}`.trim(),
                    roomNumber: b.rooms?.[0]?.number || 'TBD',
                    type: 'arrival' as const,
                    time: new Date(b.checkInDate).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                    }),
                }));

            const todayDepartures: ScheduleItem[] = bookings
                .filter((b: any) => b.checkOutDate?.startsWith(today) && b.status === 'CheckedIn')
                .map((b: any) => ({
                    id: b._id,
                    guestName:
                        `${b.customer?.firstName || ''} ${b.customer?.lastName || ''}`.trim(),
                    roomNumber: b.rooms?.[0]?.number || 'TBD',
                    type: 'departure' as const,
                    time: new Date(b.checkOutDate).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                    }),
                }));

            setArrivals(todayArrivals);
            setDepartures(todayDepartures);

            // Activity Feed: Everything that happened or is happening today
            const acts: Activity[] = [
                // Arrivals
                ...bookings
                    .filter((b: any) => b.checkInDate?.startsWith(today))
                    .map((b: any) => ({
                        id: `arr-${b._id}`,
                        type: 'check-in' as const,
                        title: b.status === 'CheckedIn' ? 'Guest Checked In' : 'Expected Arrival',
                        description: `${b.customer?.firstName || 'Guest'} → Room ${b.rooms?.map((r: any) => r.number).join(', ') || 'TBD'}`,
                        time: new Date(b.checkInDate).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                        }),
                        status: (b.status === 'CheckedIn' ? 'done' : 'pending') as any,
                    })),
                // Departures
                ...bookings
                    .filter((b: any) => b.checkOutDate?.startsWith(today))
                    .map((b: any) => ({
                        id: `dep-${b._id}`,
                        type: 'check-out' as const,
                        title:
                            b.status === 'CheckedOut' ? 'Guest Checked Out' : 'Expected Departure',
                        description: `${b.customer?.firstName || 'Guest'} ← Room ${b.rooms?.map((r: any) => r.number).join(', ') || 'TBD'}`,
                        time: new Date(b.checkOutDate).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                        }),
                        status: (b.status === 'CheckedOut' ? 'done' : 'pending') as any,
                    })),
                // New Bookings created today
                ...bookings
                    .filter((b: any) => b.createdAt?.startsWith(today))
                    .map((b: any) => ({
                        id: `new-${b._id}`,
                        type: 'booking' as const,
                        title: 'New Booking Created',
                        description: `${b.customer?.firstName || 'Guest'} · ${b.numberOfDays} nights`,
                        time: new Date(b.createdAt).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                        }),
                        status: 'done' as any,
                    })),
                // Housekeeping tasks for today
                ...hkTasks
                    .filter((t: any) => t.createdAt?.startsWith(today))
                    .map((t: any) => ({
                        id: `hk-${t._id}`,
                        type: 'housekeeping' as const,
                        title: `Housekeeping: ${t.room?.number || 'Room'}`,
                        description: `${t.type} · ${t.status}`,
                        time: new Date(t.createdAt).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                        }),
                        status: (t.status === 'Completed' ? 'done' : 'pending') as any,
                    })),
            ]
                .sort((a, b) => b.time.localeCompare(a.time))
                .filter((v, i, a) => a.findIndex((t) => t.id === v.id) === i) // Deduplicate
                .slice(0, 15);

            setActivities(acts);
            (window as any).__hotelData = { bookings };
        } catch (err) {
            console.error('Failed to fetch hotel stats', err);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        fetchStats();
    }, [api]);

    const today = new Date();
    const dateStr = today.toLocaleDateString('en-US', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
    });
    const greeting = (() => {
        const h = today.getHours();
        if (h < 12) return 'Good morning';
        if (h < 17) return 'Good afternoon';
        return 'Good evening';
    })();
    const firstName = user?.firstName || 'Manager';

    if (loading && !stats.totalRooms) {
        return (
            <div className="p-6 space-y-6 animate-in fade-in duration-300">
                <Skeleton className="h-24 w-full rounded-2xl" />
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    {[1, 2, 3, 4].map((i) => (
                        <Skeleton key={i} className="h-24 rounded-2xl" />
                    ))}
                </div>
                <div className="grid gap-6 lg:grid-cols-3">
                    <Skeleton className="lg:col-span-2 h-[400px] rounded-2xl" />
                    <Skeleton className="h-[400px] rounded-2xl" />
                </div>
            </div>
        );
    }

    const occupancyPct =
        stats.totalRooms > 0 ? Math.round((stats.occupied / stats.totalRooms) * 100) : 0;

    const tabContent: Partial<Record<Tab, React.ReactElement>> = {
        rooms: <RoomGrid bookings={(window as any).__hotelData?.bookings || []} />,
        housekeeping: <Housekeeping />,
        inventory: <InventoryList />,
        customers: <CustomerList />,
        bookings: <BookingList />,
        services: <ServiceList />,
        transactions: <TransactionList />,
        'transaction-categories': <TransactionCategoryList />,
        agents: <AgentList />,
        'business-info': <BusinessInfoPage />,
        settings: <SettingsPage />,
        reports: <Reporting />,
    };

    return (
        <div className="space-y-0 max-w-[1600px] mx-auto animate-in fade-in duration-300">
            {/* ─── Page Header ─────────────────────────────────────────── */}
            <div className="rounded-2xl border bg-card shadow-sm p-4 mb-4">
                <div className="flex items-center justify-between">
                    <div>
                        <div className="flex items-center gap-2 mb-0.5">
                            <Building2 className="h-4 w-4 text-primary" />
                            <span className="text-[10px] font-bold uppercase tracking-wider text-primary">
                                Hotel Management
                            </span>
                        </div>
                        <h1 className="text-xl font-black tracking-tight text-foreground">
                            {greeting}, {firstName} 👋
                        </h1>
                        <p className="text-xs text-muted-foreground mt-0.5">
                            {dateStr} · Here's your property at a glance.
                        </p>
                    </div>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => fetchStats(true)}
                        disabled={refreshing}
                        className="gap-2 rounded-xl h-8 text-xs"
                    >
                        <RefreshCcw className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`} />
                        Refresh
                    </Button>
                </div>
            </div>

            {/* ─── Tab Navigation ──────────────────────────────────────── */}
            <div className="flex gap-0.5 border-b overflow-x-auto scrollbar-none [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden mb-5">
                {tabGroups.map((group, gi) => (
                    <div key={group.label} className="flex items-center">
                        {gi > 0 && <div className="w-px h-5 bg-border mx-2" />}
                        {group.tabs.map((tab) => (
                            <button
                                key={tab.key}
                                onClick={() => setActiveTab(tab.key)}
                                className={`flex items-center gap-1.5 px-3 py-2.5 text-sm font-medium border-b-2 transition-all -mb-px whitespace-nowrap rounded-t-sm ${
                                    activeTab === tab.key
                                        ? 'border-primary text-primary bg-primary/5'
                                        : 'border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground/30 hover:bg-muted/40'
                                }`}
                            >
                                <tab.icon className="h-3.5 w-3.5" />
                                {tab.label}
                            </button>
                        ))}
                    </div>
                ))}
            </div>

            {/* ─── Overview Tab ─────────────────────────────────────────── */}
            {activeTab === 'overview' && (
                <div className="space-y-5">
                    {/* Stats Row */}
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                        <StatCard
                            label="Total Rooms"
                            value={stats.totalRooms}
                            sub="All property rooms"
                            icon={BedDouble}
                            color="bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"
                        />
                        <StatCard
                            label="Occupied"
                            value={stats.occupied}
                            sub={`${occupancyPct}% occupancy rate`}
                            icon={Users}
                            color="bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-400"
                        />
                        <StatCard
                            label="Available"
                            value={stats.available}
                            sub={`${stats.dirty > 0 ? `${stats.dirty} need cleaning` : 'All ready'}`}
                            icon={CalendarCheck}
                            color="bg-green-100 text-green-600 dark:bg-green-900/40 dark:text-green-400"
                        />
                        <StatCard
                            label="Today Check-ins"
                            value={stats.todayCheckIns}
                            sub="Confirmed arrivals"
                            icon={TrendingUp}
                            color="bg-violet-100 text-violet-600 dark:bg-violet-900/40 dark:text-violet-400"
                        />
                    </div>

                    {/* Secondary Stats */}
                    {(stats.dirty > 0 || stats.maintenance > 0) && (
                        <div className="grid gap-4 sm:grid-cols-2">
                            {stats.dirty > 0 && (
                                <div className="flex items-center gap-3 rounded-xl border bg-yellow-50 dark:bg-yellow-900/10 border-yellow-200 dark:border-yellow-700/30 p-4">
                                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400">
                                        <Brush className="h-4 w-4" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-bold text-yellow-800 dark:text-yellow-300">
                                            {stats.dirty} Rooms Need Cleaning
                                        </p>
                                        <p className="text-xs text-yellow-600 dark:text-yellow-500">
                                            Marked as dirty — requires housekeeping
                                        </p>
                                    </div>
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        className="ml-auto border-yellow-300 text-yellow-700 hover:bg-yellow-100 text-xs"
                                        onClick={() => setActiveTab('housekeeping')}
                                    >
                                        View
                                    </Button>
                                </div>
                            )}
                            {stats.maintenance > 0 && (
                                <div className="flex items-center gap-3 rounded-xl border bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-700/30 p-4">
                                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400">
                                        <Wrench className="h-4 w-4" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-bold text-red-800 dark:text-red-300">
                                            {stats.maintenance} Rooms Under Maintenance
                                        </p>
                                        <p className="text-xs text-red-600 dark:text-red-500">
                                            Currently out of service
                                        </p>
                                    </div>
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        className="ml-auto border-red-300 text-red-700 hover:bg-red-100 text-xs"
                                        onClick={() => setActiveTab('rooms')}
                                    >
                                        View
                                    </Button>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Main Content Grid */}
                    <div className="grid gap-5 lg:grid-cols-12">
                        {/* Room Grid */}
                        <div className="lg:col-span-8 rounded-2xl border bg-card shadow-sm p-5">
                            <div className="flex items-center justify-between mb-4">
                                <div>
                                    <h3 className="text-base font-bold text-foreground">
                                        Room Status
                                    </h3>
                                    <p className="text-xs text-muted-foreground">
                                        Live property overview — click a room for details
                                    </p>
                                </div>
                                <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                                    <span className="flex items-center gap-1.5">
                                        <span className="h-2.5 w-2.5 rounded-full bg-green-500 inline-block" />
                                        Available
                                    </span>
                                    <span className="flex items-center gap-1.5">
                                        <span className="h-2.5 w-2.5 rounded-full bg-red-500 inline-block" />
                                        Occupied
                                    </span>
                                    <span className="flex items-center gap-1.5">
                                        <span className="h-2.5 w-2.5 rounded-full bg-yellow-500 inline-block" />
                                        Dirty
                                    </span>
                                    <span className="flex items-center gap-1.5">
                                        <span className="h-2.5 w-2.5 rounded-full bg-gray-400 inline-block" />
                                        Maintenance
                                    </span>
                                </div>
                            </div>
                            <RoomGrid bookings={(window as any).__hotelData?.bookings || []} />
                        </div>

                        {/* Right Panel */}
                        <div className="lg:col-span-4 space-y-4">
                            {/* Occupancy Gauge */}
                            <div className="rounded-2xl border bg-card shadow-sm p-4">
                                <h3 className="text-xs font-bold text-foreground mb-2 flex items-center gap-2">
                                    <TrendingUp className="h-3.5 w-3.5 text-blue-500" />
                                    Occupancy Rate
                                </h3>
                                <div className="flex items-end justify-between mb-1.5">
                                    <span className="text-3xl font-black text-foreground">
                                        {occupancyPct}%
                                    </span>
                                    <span className="text-[10px] text-muted-foreground">
                                        {stats.occupied} / {stats.totalRooms} rooms
                                    </span>
                                </div>
                                <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                                    <div
                                        className={`h-full rounded-full transition-all duration-700 ease-out ${occupancyPct >= 80 ? 'bg-green-500' : occupancyPct >= 50 ? 'bg-blue-500' : 'bg-orange-400'}`}
                                        style={{ width: `${occupancyPct}%` }}
                                    />
                                </div>
                            </div>

                            {/* Today's Schedule */}
                            <div className="rounded-2xl border bg-card shadow-sm p-4">
                                <h3 className="text-xs font-bold text-foreground mb-3 flex items-center gap-2">
                                    <CalendarCheck className="h-3.5 w-3.5 text-purple-500" />
                                    Today's Schedule
                                </h3>
                                <ScheduleFeed arrivals={arrivals} departures={departures} />
                            </div>

                            {/* Activity Feed */}
                            <div className="rounded-2xl border bg-card shadow-sm p-4">
                                <h3 className="text-xs font-bold text-foreground mb-3 flex items-center gap-2">
                                    <Clock className="h-3.5 w-3.5 text-orange-500" />
                                    Activity Feed
                                </h3>
                                <ActivityFeed items={activities} />
                            </div>
                        </div>
                    </div>

                    {/* Quick Actions */}
                    <div className="rounded-2xl border bg-card shadow-sm p-4">
                        <h3 className="text-xs font-bold text-foreground mb-3 flex items-center gap-2">
                            <Sparkles className="h-3.5 w-3.5 text-yellow-500" />
                            Quick Actions
                        </h3>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                            {[
                                {
                                    label: 'New Booking',
                                    icon: BookOpen,
                                    color: 'text-violet-600 bg-violet-50 dark:bg-violet-900/20',
                                    tab: 'bookings' as Tab,
                                },
                                {
                                    label: 'Add Guest',
                                    icon: Users,
                                    color: 'text-blue-600 bg-blue-50 dark:bg-blue-900/20',
                                    tab: 'customers' as Tab,
                                },
                                {
                                    label: 'Housekeeping',
                                    icon: Brush,
                                    color: 'text-yellow-600 bg-yellow-50 dark:bg-yellow-900/20',
                                    tab: 'housekeeping' as Tab,
                                },
                                {
                                    label: 'Reports',
                                    icon: BarChart2,
                                    color: 'text-green-600 bg-green-50 dark:bg-green-900/20',
                                    tab: 'reports' as Tab,
                                },
                            ].map(({ label, icon: Icon, color, tab }) => (
                                <button
                                    key={label}
                                    onClick={() => setActiveTab(tab)}
                                    className={`flex flex-col items-center gap-2 rounded-xl p-4 text-center transition-all hover:shadow-md hover:scale-105 active:scale-95 ${color}`}
                                >
                                    <Icon className="h-5 w-5" />
                                    <span className="text-xs font-semibold">{label}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* ─── All Other Tabs ────────────────────────────────────────── */}
            {activeTab !== 'overview' && (
                <div className="rounded-2xl border bg-card shadow-sm p-6">
                    {tabContent[activeTab]}
                </div>
            )}
        </div>
    );
}
