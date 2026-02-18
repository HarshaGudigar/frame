import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/contexts/auth-context';
import { Loader2, BedDouble, Users, CalendarCheck, BookOpen } from 'lucide-react';
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
import { ActivityTimeline, Activity } from './ActivityTimeline';
import { TodaySchedule, ScheduleItem } from './TodaySchedule';
import { QuickActions } from './QuickActions';

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

const tabGroups: { label: string; tabs: { key: Tab; label: string }[] }[] = [
    {
        label: 'Operations',
        tabs: [
            { key: 'overview', label: 'Overview' },
            { key: 'rooms', label: 'Rooms' },
            { key: 'housekeeping', label: 'Housekeeping' },
            { key: 'inventory', label: 'Inventory' },
            { key: 'customers', label: 'Customers' },
            { key: 'bookings', label: 'Bookings' },
        ],
    },
    {
        label: 'Finance',
        tabs: [
            { key: 'services', label: 'Services' },
            { key: 'transactions', label: 'Transactions' },
            { key: 'transaction-categories', label: 'Categories' },
        ],
    },
    {
        label: 'Admin',
        tabs: [
            { key: 'agents', label: 'Agents' },
            { key: 'business-info', label: 'Business Info' },
            { key: 'settings', label: 'Settings' },
        ],
    },
    {
        label: 'Analytics',
        tabs: [{ key: 'reports', label: 'Reports' }],
    },
];

export function HotelDashboard() {
    const { api, user } = useAuth();

    const [hotelTenant, setHotelTenant] = useState<string | undefined>(
        user?.tenants?.find((t: any) => t.tenant?.subscribedModules?.includes('hotel'))?.tenant
            ?.slug,
    );

    const [activeTab, setActiveTab] = useState<Tab>('overview');
    const [stats, setStats] = useState({
        totalRooms: 0,
        occupied: 0,
        available: 0,
        todayCheckIns: 0,
    });
    const [activities, setActivities] = useState<Activity[]>([]);
    const [arrivals, setArrivals] = useState<ScheduleItem[]>([]);
    const [departures, setDepartures] = useState<ScheduleItem[]>([]);
    const [loading, setLoading] = useState(true);

    // Fetch fallback tenant for owners
    useEffect(() => {
        const findTenant = async () => {
            if (hotelTenant) return;
            if (user?.role === 'owner') {
                try {
                    const res = await api.get('/admin/tenants');
                    const hotelTenants = res.data.data.filter((t: any) =>
                        t.subscribedModules?.includes('hotel'),
                    );
                    if (hotelTenants.length > 0) {
                        setHotelTenant(hotelTenants[0].slug);
                    } else {
                        setLoading(false);
                    }
                } catch (err) {
                    console.error('Failed to fetch fallback hotel tenant', err);
                    setLoading(false);
                }
            } else {
                setLoading(false);
            }
        };
        findTenant();
    }, [api, hotelTenant, user?.role]);

    useEffect(() => {
        const fetchStats = async () => {
            if (!hotelTenant) return;

            setLoading(true);
            try {
                const [roomsRes, bookingsRes] = await Promise.all([
                    api.get('/m/hotel/rooms', {
                        headers: { 'x-tenant-id': hotelTenant },
                    }),
                    api.get('/m/hotel/bookings', {
                        headers: { 'x-tenant-id': hotelTenant },
                    }),
                ]);

                const rooms = roomsRes.data;
                const bookings = bookingsRes.data;

                if (rooms.data) {
                    const totalRooms = rooms.data.length;
                    const occupied = rooms.data.filter((r: any) => r.status === 'Occupied').length;
                    const available = rooms.data.filter(
                        (r: any) => r.status === 'Available',
                    ).length;
                    setStats((prev) => ({ ...prev, totalRooms, occupied, available }));
                }

                if (bookings.data) {
                    const today = new Date().toISOString().split('T')[0];
                    const todayCheckIns = bookings.data.filter(
                        (b: any) => b.checkInDate?.startsWith(today) && b.status === 'Confirmed',
                    ).length;
                    setStats((prev) => ({ ...prev, todayCheckIns }));

                    // Populate Schedule Items
                    const todayArrivals = bookings.data
                        .filter(
                            (b: any) =>
                                b.checkInDate?.startsWith(today) && b.status === 'Confirmed',
                        )
                        .map((b: any) => ({
                            id: b._id,
                            guestName: `${b.customer?.firstName} ${b.customer?.lastName}`,
                            roomNumber: b.room?.number || 'TBD',
                            type: 'arrival',
                            time: new Date(b.checkInDate).toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit',
                            }),
                        }));

                    const todayDepartures = bookings.data
                        .filter(
                            (b: any) =>
                                b.checkOutDate?.startsWith(today) && b.status === 'CheckedIn',
                        )
                        .map((b: any) => ({
                            id: b._id,
                            guestName: `${b.customer?.firstName} ${b.customer?.lastName}`,
                            roomNumber: b.room?.number || 'TBD',
                            type: 'departure',
                            time: new Date(b.checkOutDate).toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit',
                            }),
                        }));

                    setArrivals(todayArrivals);
                    setDepartures(todayDepartures);

                    // Generate dummy activity feed based on actual data
                    const recentActivities: Activity[] = [];

                    // Add check-ins as activity
                    todayArrivals.forEach((a) => {
                        recentActivities.push({
                            id: `act-arr-${a.id}`,
                            type: 'check-in',
                            title: 'Guest Arrival',
                            description: `${a.guestName} arriving for Room ${a.roomNumber}`,
                            time: a.time,
                            status: 'pending',
                        });
                    });

                    // Add check-outs as activity
                    todayDepartures.forEach((d) => {
                        recentActivities.push({
                            id: `act-dep-${d.id}`,
                            type: 'check-out',
                            title: 'Guest Departure',
                            description: `${d.guestName} checking out from Room ${d.roomNumber}`,
                            time: d.time,
                            status: 'pending',
                        });
                    });

                    setActivities(
                        recentActivities.sort((a, b) => b.time.localeCompare(a.time)).slice(0, 5),
                    );

                    // Keep track of full bookings for components that need it
                    (window as any).__hotelData = { bookings: bookings.data };
                }
            } catch (error) {
                console.error('Failed to fetch hotel stats', error);
            } finally {
                setLoading(false);
            }
        };

        fetchStats();
    }, [api, hotelTenant]);

    if (loading && !stats.totalRooms) {
        return (
            <div className="p-6 space-y-6 animate-in fade-in duration-500">
                <div className="flex justify-between items-center">
                    <Skeleton className="h-10 w-48" />
                    <Skeleton className="h-10 w-32" />
                </div>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    {[1, 2, 3, 4].map((i) => (
                        <Skeleton key={i} className="h-24 rounded-xl" />
                    ))}
                </div>
                <div className="grid gap-6 lg:grid-cols-3">
                    <div className="lg:col-span-2 space-y-6">
                        <Skeleton className="h-[400px] rounded-xl" />
                    </div>
                    <div className="space-y-6">
                        <Skeleton className="h-[200px] rounded-xl" />
                        <Skeleton className="h-[300px] rounded-xl" />
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6 max-w-[1600px] mx-auto animate-in fade-in slide-in-from-bottom-2 duration-500">
            <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold tracking-tight">Hotel Management</h1>
            </div>

            {/* Tab Navigation — Grouped */}
            <div className="flex gap-1 border-b overflow-x-auto scrollbar-none [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {tabGroups.map((group, gi) => (
                    <div key={group.label} className="flex items-center">
                        {gi > 0 && <div className="w-px h-6 bg-border mx-2" />}
                        {group.tabs.map((tab) => (
                            <button
                                key={tab.key}
                                onClick={() => setActiveTab(tab.key)}
                                className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors -mb-px whitespace-nowrap ${
                                    activeTab === tab.key
                                        ? 'border-primary text-primary'
                                        : 'border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground/30'
                                }`}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </div>
                ))}
            </div>

            {/* Tab Content */}
            {activeTab === 'overview' && (
                <Card className="border-primary/10 transition-all">
                    <CardHeader className="pb-4">
                        <CardTitle className="text-xl font-bold">Dashboard Overview</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                            <Card className="bg-muted/50 border-primary/10">
                                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                    <CardTitle className="text-sm font-medium">
                                        Total Rooms
                                    </CardTitle>
                                    <BedDouble className="h-4 w-4 text-muted-foreground" />
                                </CardHeader>
                                <CardContent>
                                    <div className="text-2xl font-bold">{stats.totalRooms}</div>
                                </CardContent>
                            </Card>
                            <Card className="bg-blue-500/10 border-blue-500/20">
                                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                    <CardTitle className="text-sm font-medium">Occupied</CardTitle>
                                    <Users className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                                </CardHeader>
                                <CardContent>
                                    <div className="text-2xl font-bold">{stats.occupied}</div>
                                    <p className="text-xs text-muted-foreground">
                                        {Math.round(
                                            (stats.occupied / (stats.totalRooms || 1)) * 100,
                                        )}
                                        % Occupancy
                                    </p>
                                </CardContent>
                            </Card>
                            <Card className="bg-green-500/10 border-green-500/20">
                                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                    <CardTitle className="text-sm font-medium">Available</CardTitle>
                                    <CalendarCheck className="h-4 w-4 text-green-600 dark:text-green-400" />
                                </CardHeader>
                                <CardContent>
                                    <div className="text-2xl font-bold">{stats.available}</div>
                                </CardContent>
                            </Card>
                            <Card className="bg-purple-500/10 border-purple-500/20">
                                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                    <CardTitle className="text-sm font-medium">
                                        Today's Check-ins
                                    </CardTitle>
                                    <BookOpen className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                                </CardHeader>
                                <CardContent>
                                    <div className="text-2xl font-bold">{stats.todayCheckIns}</div>
                                </CardContent>
                            </Card>
                        </div>

                        <div className="grid gap-6 lg:grid-cols-12">
                            {/* Primary Operational Row */}
                            <div className="lg:col-span-8">
                                <Card className="border-primary/20 h-full">
                                    <CardHeader className="flex flex-row items-center justify-between">
                                        <CardTitle>Room Status Heatmap</CardTitle>
                                        <div className="flex gap-2">
                                            <div className="flex items-center gap-1">
                                                <div className="w-3 h-3 rounded-full bg-green-500" />
                                                <span className="text-[10px] text-muted-foreground">
                                                    Available
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-1">
                                                <div className="w-3 h-3 rounded-full bg-red-500" />
                                                <span className="text-[10px] text-muted-foreground">
                                                    Occupied
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-1">
                                                <div className="w-3 h-3 rounded-full bg-yellow-500" />
                                                <span className="text-[10px] text-muted-foreground">
                                                    Dirty
                                                </span>
                                            </div>
                                        </div>
                                    </CardHeader>
                                    <CardContent>
                                        <RoomGrid
                                            hotelTenant={hotelTenant}
                                            bookings={(window as any).__hotelData?.bookings || []}
                                        />
                                    </CardContent>
                                </Card>
                            </div>

                            <div className="lg:col-span-4">
                                <QuickActions
                                    className="h-full"
                                    onAction={(action) => {
                                        if (action === 'new-booking') setActiveTab('bookings');
                                        if (action === 'check-in') setActiveTab('bookings');
                                        if (action === 'search') setActiveTab('customers');
                                    }}
                                />
                            </div>

                            {/* Feeds & Schedule Row */}
                            <div className="lg:col-span-6">
                                <TodaySchedule arrivals={arrivals} departures={departures} />
                            </div>
                            <div className="lg:col-span-6">
                                <ActivityTimeline activities={activities} />
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}

            {activeTab === 'rooms' && (
                <Card>
                    <CardHeader>
                        <CardTitle>Room Management</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <RoomGrid
                            hotelTenant={hotelTenant}
                            bookings={(window as any).__hotelData?.bookings || []}
                        />
                    </CardContent>
                </Card>
            )}

            {activeTab === 'housekeeping' && (
                <Card>
                    <CardHeader>
                        <CardTitle>Housekeeping Overview</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Housekeeping hotelTenant={hotelTenant} />
                    </CardContent>
                </Card>
            )}

            {activeTab === 'inventory' && (
                <Card>
                    <CardHeader>
                        <CardTitle>Inventory Management</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <InventoryList hotelTenant={hotelTenant} />
                    </CardContent>
                </Card>
            )}

            {activeTab === 'customers' && (
                <Card>
                    <CardHeader>
                        <CardTitle>Customer Registry</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <CustomerList hotelTenant={hotelTenant} />
                    </CardContent>
                </Card>
            )}

            {activeTab === 'bookings' && (
                <Card>
                    <CardHeader>
                        <CardTitle>Bookings</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <BookingList hotelTenant={hotelTenant} />
                    </CardContent>
                </Card>
            )}

            {activeTab === 'services' && (
                <Card>
                    <CardHeader>
                        <CardTitle>Services</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <ServiceList hotelTenant={hotelTenant} />
                    </CardContent>
                </Card>
            )}

            {activeTab === 'transactions' && (
                <Card>
                    <CardHeader>
                        <CardTitle>Transactions</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <TransactionList hotelTenant={hotelTenant} />
                    </CardContent>
                </Card>
            )}

            {activeTab === 'transaction-categories' && (
                <Card>
                    <CardHeader>
                        <CardTitle>Transaction Categories</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <TransactionCategoryList hotelTenant={hotelTenant} />
                    </CardContent>
                </Card>
            )}

            {activeTab === 'agents' && (
                <Card>
                    <CardHeader>
                        <CardTitle>Agents</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <AgentList hotelTenant={hotelTenant} />
                    </CardContent>
                </Card>
            )}

            {activeTab === 'business-info' && (
                <Card>
                    <CardHeader>
                        <CardTitle>Business Information</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <BusinessInfoPage hotelTenant={hotelTenant} />
                    </CardContent>
                </Card>
            )}

            {activeTab === 'settings' && (
                <Card>
                    <CardHeader>
                        <CardTitle>Settings</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <SettingsPage hotelTenant={hotelTenant} />
                    </CardContent>
                </Card>
            )}

            {activeTab === 'reports' && (
                <Card>
                    <CardHeader>
                        <CardTitle>Management Reports</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Reporting hotelTenant={hotelTenant} />
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
