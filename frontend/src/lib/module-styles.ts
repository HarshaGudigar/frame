/**
 * ─────────────────────────────────────────────────────────────────────────────
 * MODULE STYLE SYSTEM
 * Shared design tokens, class helpers, and status configurations
 * that are reusable across ALL business modules (Hotel, CRM, Billing, etc.)
 * ─────────────────────────────────────────────────────────────────────────────
 */

// ─── Layout Primitives ───────────────────────────────────────────────────────

export const moduleLayout = {
    /** Root page wrapper for all module pages */
    page: 'space-y-5 max-w-[1600px] mx-auto animate-in fade-in duration-300',
    /** A standard card panel used to wrap tab content */
    contentCard: 'rounded-2xl border bg-card shadow-sm p-6',
    /** Section header within a card */
    sectionHeader: 'flex items-center justify-between mb-4',
} as const;

// ─── Card Styles ─────────────────────────────────────────────────────────────

export const cardStyles = {
    /** Standard white/card surface */
    base: 'rounded-2xl border bg-card shadow-sm',
    /** Hoverable card — adds lift on hover */
    interactive:
        'rounded-2xl border bg-card shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer',
    /** A highlighted/accent card */
    accent: (color: 'blue' | 'green' | 'violet' | 'yellow' | 'red' | 'orange' | 'slate') =>
        `rounded-2xl border bg-${color}-50 dark:bg-${color}-900/10 border-${color}-200 dark:border-${color}-700/30`,
} as const;

// ─── Stat Card Icon Backgrounds ──────────────────────────────────────────────

export const iconBg = {
    slate: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300',
    blue: 'bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-400',
    green: 'bg-green-100 text-green-600 dark:bg-green-900/40 dark:text-green-400',
    violet: 'bg-violet-100 text-violet-600 dark:bg-violet-900/40 dark:text-violet-400',
    yellow: 'bg-yellow-100 text-yellow-600 dark:bg-yellow-900/40 dark:text-yellow-400',
    red: 'bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-400',
    orange: 'bg-orange-100 text-orange-600 dark:bg-orange-900/40 dark:text-orange-400',
    purple: 'bg-purple-100 text-purple-600 dark:bg-purple-900/40 dark:text-purple-400',
    pink: 'bg-pink-100 text-pink-600 dark:bg-pink-900/40 dark:text-pink-400',
    teal: 'bg-teal-100 text-teal-600 dark:bg-teal-900/40 dark:text-teal-400',
    indigo: 'bg-indigo-100 text-indigo-600 dark:bg-indigo-900/40 dark:text-indigo-400',
} as const;

export type IconBgColor = keyof typeof iconBg;

// ─── Badge / Status Colors (for Tailwind badge variants) ────────────────────

export const badgeColors = {
    // ── Booking Status ──────────────────────────────────────────────────────
    Confirmed:
        'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-800',
    CheckedIn:
        'bg-green-100 text-green-800 border-green-200 dark:bg-green-900/20 dark:text-green-300 dark:border-green-800',
    CheckedOut:
        'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800/50 dark:text-slate-400 dark:border-slate-700',
    Cancelled:
        'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/20 dark:text-red-300 dark:border-red-800',
    NoShow: 'bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/20 dark:text-yellow-300 dark:border-yellow-800',

    // ── Payment Status ──────────────────────────────────────────────────────
    Pending:
        'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/20 dark:text-amber-300 dark:border-amber-800',
    Partial:
        'bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-900/20 dark:text-orange-300 dark:border-orange-800',
    Paid: 'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-300 dark:border-emerald-800',
    Refunded:
        'bg-violet-100 text-violet-800 border-violet-200 dark:bg-violet-900/20 dark:text-violet-300 dark:border-violet-800',

    // ── Room Status ──────────────────────────────────────────────────────────
    Available:
        'bg-green-100 text-green-800 border-green-200 dark:bg-green-900/20 dark:text-green-300 dark:border-green-800',
    Occupied:
        'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/20 dark:text-red-300 dark:border-red-800',
    Dirty: 'bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/20 dark:text-yellow-300 dark:border-yellow-800',
    Maintenance:
        'bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-800/50 dark:text-gray-400 dark:border-gray-700',
    Cleaning:
        'bg-sky-100 text-sky-800 border-sky-200 dark:bg-sky-900/20 dark:text-sky-300 dark:border-sky-800',

    // ── Task / Housekeeping Status ────────────────────────────────────────────
    'In Progress':
        'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-800',
    Completed:
        'bg-green-100 text-green-800 border-green-200 dark:bg-green-900/20 dark:text-green-300 dark:border-green-800',
    Delayed:
        'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/20 dark:text-red-300 dark:border-red-800',

    // ── Priority ──────────────────────────────────────────────────────────────
    Low: 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800/50 dark:text-slate-400',
    Medium: 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/20 dark:text-blue-300',
    High: 'bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-900/20 dark:text-orange-300',
    Emergency: 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/20 dark:text-red-300',

    // ── Subscription / Tenant Module Status ────────────────────────────────────
    active: 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900/20 dark:text-green-300',
    trialing: 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/20 dark:text-blue-300',
    cancelled: 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/20 dark:text-red-300',
    expired:
        'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800/50 dark:text-slate-400',

    // ── Generic ────────────────────────────────────────────────────────────────
    default: 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-400',
} as const;

export type BadgeColorKey = keyof typeof badgeColors;

/**
 * Get a badge class string for any status key.
 * Falls back to `default` if key not found.
 *
 * @example
 * className={`border ${getBadgeColor('CheckedIn')}`}
 */
export function getBadgeColor(status: string): string {
    return (badgeColors as Record<string, string>)[status] ?? badgeColors.default;
}

// ─── Room Status Colors (for room card backgrounds) ─────────────────────────

export const roomStatusStyles: Record<string, string> = {
    Available: 'bg-green-500/10 border-green-500/30 text-green-700 dark:text-green-400',
    Occupied: 'bg-red-500/10 border-red-500/30 text-red-700 dark:text-red-400',
    Dirty: 'bg-yellow-500/10 border-yellow-500/30 text-yellow-700 dark:text-yellow-400',
    Maintenance: 'bg-gray-500/10 border-gray-500/30 text-gray-700 dark:text-gray-400',
    Cleaning: 'bg-sky-500/10 border-sky-500/30 text-sky-700 dark:text-sky-400',
};

export function getRoomStatusStyle(status: string): string {
    return roomStatusStyles[status] ?? roomStatusStyles['Maintenance'];
}

// ─── Left-border color for housekeeping task cards (Kanban) ──────────────────

export const roomBorderColors: Record<string, string> = {
    Dirty: '#ef4444',
    Available: '#10b981',
    Maintenance: '#f59e0b',
    Cleaning: '#0ea5e9',
    Occupied: '#3b82f6',
};

// ─── Typography Utilities ────────────────────────────────────────────────────

export const text = {
    pageTitle: 'text-2xl font-black tracking-tight text-foreground',
    sectionTitle: 'text-base font-bold text-foreground',
    subLabel: 'text-xs font-semibold uppercase tracking-wider text-muted-foreground',
    body: 'text-sm text-foreground',
    muted: 'text-sm text-muted-foreground',
    micro: 'text-[10px] font-bold uppercase tracking-wider text-muted-foreground',
} as const;

// ─── Empty State Helper ──────────────────────────────────────────────────────

export const emptyState = {
    wrapper: 'flex flex-col items-center justify-center py-16 text-center text-muted-foreground',
    icon: 'h-12 w-12 mb-3 opacity-30',
    title: 'text-sm font-semibold text-foreground',
    description: 'text-xs text-muted-foreground mt-1',
} as const;

// ─── Table Styles ─────────────────────────────────────────────────────────────

export const tableStyles = {
    wrapper: 'rounded-xl border overflow-hidden',
    headerRow: 'bg-muted/40',
    headerCell: 'text-xs font-bold uppercase tracking-wider text-muted-foreground',
    row: 'hover:bg-muted/30 transition-colors',
} as const;

// ─── Form / Dialog ────────────────────────────────────────────────────────────

export const formStyles = {
    fieldWrapper: 'space-y-2',
    label: 'text-sm font-semibold text-foreground',
    section: 'space-y-4 pt-4 border-t border-border/50',
    sectionTitle: 'text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3',
} as const;

// ─── Kanban Column Colors ────────────────────────────────────────────────────

export const kanbanColumns = {
    Pending: {
        label: 'Pending',
        header: 'bg-amber-50 dark:bg-amber-900/10 border-amber-200 dark:border-amber-800/30',
        dot: 'bg-amber-500',
        count: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
    },
    'In Progress': {
        label: 'In Progress',
        header: 'bg-blue-50 dark:bg-blue-900/10 border-blue-200 dark:border-blue-800/30',
        dot: 'bg-blue-500',
        count: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
    },
    Completed: {
        label: 'Completed',
        header: 'bg-green-50 dark:bg-green-900/10 border-green-200 dark:border-green-800/30',
        dot: 'bg-green-500',
        count: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
    },
    Delayed: {
        label: 'Delayed',
        header: 'bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-800/30',
        dot: 'bg-red-500',
        count: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
    },
} as const;

export type KanbanStatus = keyof typeof kanbanColumns;

// ─── Priority Configuration ──────────────────────────────────────────────────

export const priorityConfig: Record<string, { label: string; dot: string; badge: string }> = {
    Low: { label: 'Low', dot: 'bg-slate-400', badge: badgeColors.Low },
    Medium: { label: 'Medium', dot: 'bg-blue-500', badge: badgeColors.Medium },
    High: { label: 'High', dot: 'bg-orange-500', badge: badgeColors.High },
    Emergency: {
        label: 'Emergency',
        dot: 'bg-red-600 animate-pulse',
        badge: badgeColors.Emergency,
    },
};
