import { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/auth-context';
import { Loader2, Printer } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Booking {
    _id: string;
    checkInNumber: string;
    customer: {
        firstName: string;
        lastName: string;
        email?: string;
        phone: string;
        address?: string;
    };
    room: {
        number: string;
        type: string;
        pricePerNight: number;
    };
    checkInDate: string;
    checkOutDate: string;
    numberOfDays: number;
    roomRent: number;
    totalAmount: number;
    advanceAmount: number;
    paymentStatus: string;
    status: string;
    createdAt: string;
}

interface BusinessInfo {
    name: string;
    address: string;
    phone: string;
    email: string;
    gstin?: string;
}

export default function InvoicePrintView() {
    const { id } = useParams();
    const [searchParams] = useSearchParams();
    const tenantId = searchParams.get('tenantId');
    const { api } = useAuth();
    const [booking, setBooking] = useState<Booking | null>(null);
    const [businessInfo, setBusinessInfo] = useState<BusinessInfo | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            if (!id || !tenantId) return;
            try {
                const [bookingRes, businessRes] = await Promise.all([
                    api.get(`/m/hotel/bookings/${id}`, {
                        headers: { 'x-tenant-id': tenantId },
                    }),
                    api.get('/m/hotel/business-info', {
                        headers: { 'x-tenant-id': tenantId },
                    }),
                ]);

                if (bookingRes.data.success) setBooking(bookingRes.data.data);
                if (businessRes.data.success) setBusinessInfo(businessRes.data.data);
            } catch (error) {
                console.error('Failed to fetch invoice data', error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [id, tenantId, api]);

    const handlePrint = () => {
        window.print();
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen">
                <Loader2 className="h-8 w-8 animate-spin mb-2" />
                <p>Generating Invoice...</p>
            </div>
        );
    }

    if (!booking) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <p className="text-destructive">Booking not found.</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 p-4 sm:p-8 print:bg-white print:p-0">
            <div className="max-w-4xl mx-auto bg-white shadow-lg p-8 print:shadow-none print:max-w-none">
                {/* Header Actions */}
                <div className="flex justify-end mb-8 print:hidden">
                    <Button onClick={handlePrint}>
                        <Printer className="h-4 w-4 mr-2" /> Print Invoice
                    </Button>
                </div>

                {/* Invoice Header */}
                <div className="flex justify-between items-start border-b pb-8 mb-8">
                    <div>
                        <h1 className="text-3xl font-bold text-primary mb-2">INVOICE</h1>
                        <p className="text-muted-foreground"># {booking.checkInNumber}</p>
                        <p className="text-sm mt-4">Date: {new Date().toLocaleDateString()}</p>
                    </div>
                    <div className="text-right">
                        <h2 className="text-xl font-bold">{businessInfo?.name || 'Hotel Name'}</h2>
                        <p className="text-sm text-muted-foreground whitespace-pre-line">
                            {businessInfo?.address || 'Hotel Address'}
                        </p>
                        <p className="text-sm text-muted-foreground">Ph: {businessInfo?.phone}</p>
                        <p className="text-sm text-muted-foreground">{businessInfo?.email}</p>
                        {businessInfo?.gstin && (
                            <p className="text-sm font-semibold mt-2">
                                GSTIN: {businessInfo.gstin}
                            </p>
                        )}
                    </div>
                </div>

                {/* Billing Info */}
                <div className="grid grid-cols-2 gap-8 mb-12">
                    <div>
                        <h3 className="text-sm font-bold uppercase text-muted-foreground mb-4">
                            Bill To:
                        </h3>
                        <p className="font-bold text-lg">
                            {booking.customer.firstName} {booking.customer.lastName}
                        </p>
                        <p className="text-sm text-muted-foreground">{booking.customer.phone}</p>
                        <p className="text-sm text-muted-foreground">{booking.customer.email}</p>
                        <p className="text-sm text-muted-foreground whitespace-pre-line mt-2">
                            {booking.customer.address}
                        </p>
                    </div>
                    <div>
                        <h3 className="text-sm font-bold uppercase text-muted-foreground mb-4">
                            Booking Details:
                        </h3>
                        <div className="space-y-1 text-sm">
                            <p>
                                <span className="font-semibold">Room:</span> {booking.room.number} (
                                {booking.room.type})
                            </p>
                            <p>
                                <span className="font-semibold">Check-in:</span>{' '}
                                {new Date(booking.checkInDate).toLocaleDateString()}
                            </p>
                            <p>
                                <span className="font-semibold">Check-out:</span>{' '}
                                {new Date(booking.checkOutDate).toLocaleDateString()}
                            </p>
                            <p>
                                <span className="font-semibold">Nights:</span>{' '}
                                {booking.numberOfDays}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Table */}
                <table className="w-full mb-12">
                    <thead>
                        <tr className="border-b-2 border-primary/20">
                            <th className="text-left py-4 px-2 font-bold uppercase text-xs">
                                Description
                            </th>
                            <th className="text-right py-4 px-2 font-bold uppercase text-xs">
                                Rate
                            </th>
                            <th className="text-center py-4 px-2 font-bold uppercase text-xs">
                                Qty (Nights)
                            </th>
                            <th className="text-right py-4 px-2 font-bold uppercase text-xs">
                                Amount
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr className="border-b">
                            <td className="py-4 px-2">
                                <p className="font-semibold">Room Charges</p>
                                <p className="text-xs text-muted-foreground">
                                    Room {booking.room.number} - {booking.room.type}
                                </p>
                            </td>
                            <td className="text-right py-4 px-2">{booking.room.pricePerNight}</td>
                            <td className="text-center py-4 px-2">{booking.numberOfDays}</td>
                            <td className="text-right py-4 px-2 font-semibold">
                                {booking.roomRent}
                            </td>
                        </tr>
                        {/* More rows could be added here for additional services if implemented */}
                    </tbody>
                </table>

                {/* Summary */}
                <div className="flex justify-end">
                    <div className="w-64 space-y-3">
                        <div className="flex justify-between text-sm">
                            <span>Subtotal</span>
                            <span>{booking.roomRent}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span>Advance Paid</span>
                            <span className="text-green-600">- {booking.advanceAmount}</span>
                        </div>
                        <div className="flex justify-between border-t border-b py-3 font-bold text-lg">
                            <span>Balance Due</span>
                            <span className="text-primary">
                                {booking.totalAmount - booking.advanceAmount}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="mt-20 border-t pt-8 text-center text-xs text-muted-foreground">
                    <p>Thank you for choosing {businessInfo?.name || 'our hotel'}.</p>
                    <p className="mt-2 text-[10px]">
                        This is a computer-generated invoice and does not require a physical
                        signature.
                    </p>
                </div>
            </div>
        </div>
    );
}
