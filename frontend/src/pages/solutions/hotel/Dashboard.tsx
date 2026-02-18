import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
                }
            } catch (error) {
                console.error('Failed to fetch hotel stats', error);
            } finally {
                setLoading(false);
            }
        };

        fetchStats();
    }, [api, hotelTenant]);

    if (loading) {
        return (
            <div className="flex h-full items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold tracking-tight">Hotel Management</h1>
            </div>

            {/* Tab Navigation — Grouped */}
            <div className="flex gap-1 border-b overflow-x-auto">
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
                <div className="space-y-6">
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Total Rooms</CardTitle>
                                <BedDouble className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{stats.totalRooms}</div>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Occupied</CardTitle>
                                <Users className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{stats.occupied}</div>
                                <p className="text-xs text-muted-foreground">
                                    {Math.round((stats.occupied / (stats.totalRooms || 1)) * 100)}%
                                    Occupancy
                                </p>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Available</CardTitle>
                                <CalendarCheck className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{stats.available}</div>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">
                                    Today's Check-ins
                                </CardTitle>
                                <BookOpen className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{stats.todayCheckIns}</div>
                            </CardContent>
                        </Card>
                    </div>

                    <Card>
                        <CardHeader>
                            <CardTitle>Room Status</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <RoomGrid hotelTenant={hotelTenant} />
                        </CardContent>
                    </Card>
                </div>
            )}

            {activeTab === 'rooms' && (
                <Card>
                    <CardHeader>
                        <CardTitle>Room Management</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <RoomGrid hotelTenant={hotelTenant} />
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
