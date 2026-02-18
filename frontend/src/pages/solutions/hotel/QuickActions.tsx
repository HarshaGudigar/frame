import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, Search, DollarSign, Bed, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function QuickActions({ onAction }: { onAction: (action: string) => void }) {
    const actions = [
        {
            label: 'New Booking',
            icon: Plus,
            color: 'text-blue-600 dark:text-blue-400',
            bg: 'bg-blue-500/10',
            id: 'new-booking',
        },
        {
            label: 'Check In',
            icon: Bed,
            color: 'text-green-600 dark:text-green-400',
            bg: 'bg-green-500/10',
            id: 'check-in',
        },
        {
            label: 'Add Expense',
            icon: DollarSign,
            color: 'text-orange-600 dark:text-orange-400',
            bg: 'bg-orange-500/10',
            id: 'add-expense',
        },
        {
            label: 'Guest Search',
            icon: Search,
            color: 'text-purple-600 dark:text-purple-400',
            bg: 'bg-purple-500/10',
            id: 'search',
        },
    ];

    return (
        <Card className="border-primary/20 bg-primary/5 transition-all hover:shadow-md">
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
                <CardTitle className="text-base font-semibold">Quick Actions</CardTitle>
                <Zap className="h-4 w-4 text-primary fill-primary/20" />
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-3">
                {actions.map((action) => (
                    <Button
                        key={action.id}
                        variant="ghost"
                        className="h-auto flex-col items-center justify-center gap-2 p-3 hover:bg-muted border border-transparent hover:border-border"
                        onClick={() => onAction(action.id)}
                    >
                        <div className={`p-2 rounded-lg ${action.bg}`}>
                            <action.icon className={`h-4 w-4 ${action.color}`} />
                        </div>
                        <span className="text-xs font-medium">{action.label}</span>
                    </Button>
                ))}
            </CardContent>
        </Card>
    );
}
