export function BackgroundDecoration() {
    return (
        <div className="fixed inset-0 -z-50 overflow-hidden pointer-events-none select-none">
            {/* Base Background Fill */}
            <div className="absolute inset-0 bg-background" />

            {/* Ambient Blobs - Light Mode Oriented */}
            <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] rounded-full bg-primary/10 blur-[130px] animate-pulse-slow dark:hidden" />
            <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-amber-200/20 blur-[120px] animate-pulse-slow [animation-delay:3s] dark:hidden" />

            {/* Ambient Blobs - Dark Mode Oriented */}
            <div className="absolute top-[-10%] left-[-20%] w-[70%] h-[70%] rounded-full bg-indigo-500/10 blur-[150px] animate-pulse-slow hidden dark:block" />
            <div className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] rounded-full bg-emerald-500/10 blur-[150px] animate-pulse-slow [animation-delay:2s] hidden dark:block" />

            {/* Rotating Beams */}
            <div className="absolute inset-0 flex items-center justify-center opacity-[0.03] dark:opacity-[0.08] animate-rotate-slow">
                <div className="absolute w-[200%] h-[1px] bg-gradient-to-r from-transparent via-primary to-transparent rotate-45" />
                <div className="absolute w-[200%] h-[1px] bg-gradient-to-r from-transparent via-primary to-transparent -rotate-45" />
            </div>

            {/* Floating Subtle Particles */}
            <div className="absolute top-1/4 left-1/3 w-2 h-2 rounded-full bg-primary/30 blur-[1px] animate-float opacity-50" />
            <div className="absolute top-3/4 left-1/4 w-3 h-3 rounded-full bg-accent/30 blur-[2px] animate-float [animation-delay:3.5s] [animation-duration:15s] opacity-40" />
            <div className="absolute top-1/2 right-1/4 w-2 h-2 rounded-full bg-primary/20 blur-[1px] animate-float [animation-delay:1.5s] [animation-duration:12s] opacity-50" />

            {/* Modern Grid Overlay */}
            <div className="absolute inset-0 bg-[linear-gradient(to_right,var(--border)_1px,transparent_1px),linear-gradient(to_bottom,var(--border)_1px,transparent_1px)] [background-size:64px_64px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] opacity-[0.05] dark:opacity-[0.08]" />

            {/* Noise & Vignette Overlay */}
            <div className="absolute inset-0 noise-overlay opacity-[0.15] dark:opacity-[0.25]" />
            <div className="absolute inset-0 vignette opacity-40 dark:opacity-60" />
        </div>
    );
}
