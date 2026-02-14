import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
    children: ReactNode;
    fallback?: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error('[ErrorBoundary]', error, errorInfo);
    }

    render() {
        if (this.state.hasError) {
            if (this.props.fallback) {
                return this.props.fallback;
            }

            return (
                <div
                    style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        minHeight: '100vh',
                        padding: '2rem',
                        background: 'hsl(var(--background))',
                        color: 'hsl(var(--foreground))',
                        fontFamily: 'Inter, system-ui, sans-serif',
                    }}
                >
                    <div
                        style={{
                            maxWidth: '480px',
                            textAlign: 'center',
                            padding: '2.5rem',
                            borderRadius: '12px',
                            border: '1px solid hsl(var(--border))',
                            background: 'hsl(var(--card))',
                            boxShadow: '0 4px 24px rgba(0,0,0,0.1)',
                        }}
                    >
                        <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>⚠️</div>
                        <h2
                            style={{
                                fontSize: '1.5rem',
                                fontWeight: 600,
                                marginBottom: '0.75rem',
                            }}
                        >
                            Something went wrong
                        </h2>
                        <p
                            style={{
                                color: 'hsl(var(--muted-foreground))',
                                marginBottom: '1.5rem',
                                lineHeight: 1.6,
                            }}
                        >
                            An unexpected error occurred. Please try refreshing the page.
                        </p>
                        {this.state.error && (
                            <pre
                                style={{
                                    fontSize: '0.75rem',
                                    color: 'hsl(var(--destructive))',
                                    background: 'hsl(var(--muted))',
                                    padding: '1rem',
                                    borderRadius: '8px',
                                    overflow: 'auto',
                                    textAlign: 'left',
                                    marginBottom: '1.5rem',
                                    maxHeight: '120px',
                                }}
                            >
                                {this.state.error.message}
                            </pre>
                        )}
                        <button
                            onClick={() => window.location.reload()}
                            style={{
                                padding: '0.625rem 1.5rem',
                                borderRadius: '8px',
                                border: 'none',
                                background: 'hsl(var(--primary))',
                                color: 'hsl(var(--primary-foreground))',
                                fontWeight: 500,
                                cursor: 'pointer',
                                fontSize: '0.875rem',
                            }}
                        >
                            Reload Page
                        </button>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}
