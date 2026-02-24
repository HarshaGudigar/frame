/**
 * Whitelabel Configuration
 *
 * This file centralizes all branding configuration.
 * You can customize these values by setting environment variables in your .env file:
 * - VITE_APP_NAME
 * - VITE_APP_PRODUCT
 * - VITE_APP_DESCRIPTION
 */

export const BRAND = {
    // The main company or org name (e.g., "Alyxnet", "Acme Corp")
    name: import.meta.env.VITE_APP_NAME || 'SMDS Technologies',

    // The specific product name (e.g., "Frame", "Dashboard")
    product: import.meta.env.VITE_APP_PRODUCT || '',

    // Combined name for page titles
    get fullName() {
        return `${this.name} ${this.product}`.trim();
    },

    // Tagline or subtitle used in login screens and sidebars
    description: import.meta.env.VITE_APP_DESCRIPTION || 'Enterprise Control Plane',

    // Links (can be extended for support, terms, etc.)
    links: {
        website: 'https://alyxnet.com',
    },
};
