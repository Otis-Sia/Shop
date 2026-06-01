import React from 'react';

export type IconName =
  | 'shopping_cart'
  | 'arrow_forward'
  | 'devices'
  | 'checkroom'
  | 'chair'
  | 'sports_soccer'
  | 'spa'
  | 'menu_book'
  | 'local_shipping'
  | 'shield_lock'
  | 'swap_horiz'
  | 'workspace_premium'
  | 'inventory_2'
  | 'group'
  | 'speed'
  | 'headset_mic'
  | 'storefront'
  | 'expand_more'
  | 'sync'
  | 'info'
  | 'shopping_bag'
  | 'lock'
  | 'error'
  | 'bolt'
  | 'loyalty'
  | 'apple'
  | 'verified'
  | 'tune'
  | 'dashboard'
  | 'inventory'
  | 'shopping_basket'
  | 'settings'
  | 'add'
  | 'calendar_today'
  | 'trending_up'
  | 'more_vert'
  | 'auto_graph'
  | 'search'
  | 'category'
  | 'payments'
  | 'warning'
  | 'check'
  | 'check_circle'
  | 'send'
  | 'email'
  | 'phone'
  | 'location_on'
  | 'schedule'
  | 'refresh'
  | 'arrow_back'
  | 'progress_activity'
  | 'database'
  | 'shield'
  | 'cookie'
  | 'handshake'
  | 'gavel'
  | 'mail'
  | 'grid_view'
  | 'view_list'
  | 'event'
  | 'list_alt'
  | 'block'
  | 'description'
  | 'account_circle'
  | 'favorite'
  | 'close'
  | 'favorite_border'
  | 'star_border'
  | 'delete';

interface IconProps extends React.SVGProps<SVGSVGElement> {
  name: IconName | string;
  className?: string;
}

export default function Icon({ name, className = '', ...props }: IconProps) {
  // Normalize names that might come from older string sources
  const normalizedName = String(name).trim().toLowerCase();

  const baseSvgProps = {
    viewBox: '0 0 24 24',
    width: '1em',
    height: '1em',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 2,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    className: `inline-block align-middle select-none ${className}`,
    ...props,
  };

  switch (normalizedName) {
    case 'shopping_cart':
      return (
        <svg {...baseSvgProps}>
          <circle cx="9" cy="21" r="1" />
          <circle cx="20" cy="21" r="1" />
          <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
        </svg>
      );

    case 'arrow_forward':
      return (
        <svg {...baseSvgProps}>
          <line x1="5" y1="12" x2="19" y2="12" />
          <polyline points="12 5 19 12 12 19" />
        </svg>
      );

    case 'devices':
      return (
        <svg {...baseSvgProps}>
          <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
          <line x1="8" y1="21" x2="16" y2="21" />
          <line x1="12" y1="17" x2="12" y2="21" />
        </svg>
      );

    case 'checkroom': // Fashion (Coat Hanger / T-Shirt)
      return (
        <svg {...baseSvgProps}>
          <path d="M20.38 3.46L16 2.14V2a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v.14L3.62 3.46c-.36.11-.62.44-.62.82v5.72c0 1.66 1.34 3 3 3h1v8a2 2 0 0 0 2 2h4a2 2 0 0 0 2-2v-8h1c1.66 0 3-1.34 3-3V4.28c0-.38-.26-.71-.62-.82z" />
        </svg>
      );

    case 'chair': // Home & Living
      return (
        <svg {...baseSvgProps}>
          <path d="M7 18v3" />
          <path d="M17 18v3" />
          <path d="M19 10H5v8h14v-8z" />
          <path d="M17 10V5a2 2 0 0 0-2-2H9a2 2 0 0 0-2 2v5" />
          <path d="M3 13h18" />
        </svg>
      );

    case 'sports_soccer': // Sports
      return (
        <svg {...baseSvgProps}>
          <circle cx="12" cy="12" r="10" />
          <path d="m12 12-4-2.5V5.5" />
          <path d="m12 12 4-2.5V5.5" />
          <path d="m12 12v5.5l-3.5 2" />
          <path d="m12 17.5 3.5 2" />
          <path d="M8 9.5 4.5 11" />
          <path d="M16 9.5l3.5 1.5" />
        </svg>
      );

    case 'spa': // Beauty
      return (
        <svg {...baseSvgProps}>
          <path d="M12 2c0 0-5 5.5-5 9.5c0 2.8 2.2 5 5 5s5-2.2 5-5C17 7.5 12 2 12 2z" />
          <path d="M12 10V8" />
          <path d="M8.5 11h7" />
        </svg>
      );

    case 'menu_book': // Books
      return (
        <svg {...baseSvgProps}>
          <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
          <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
        </svg>
      );

    case 'local_shipping': // Shipping
      return (
        <svg {...baseSvgProps}>
          <rect x="1" y="3" width="15" height="13" />
          <polygon points="16 8 20 8 23 11 23 16 16 16 16 8" />
          <circle cx="5.5" cy="18.5" r="2.5" />
          <circle cx="18.5" cy="18.5" r="2.5" />
        </svg>
      );

    case 'shield_lock': // Secure Payment
      return (
        <svg {...baseSvgProps}>
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          <rect x="9" y="11" width="6" height="5" rx="1" />
          <path d="M10 11V9a2 2 0 0 1 4 0v2" />
        </svg>
      );

    case 'swap_horiz': // Easy Returns
      return (
        <svg {...baseSvgProps}>
          <polyline points="17 10 22 15 17 20" />
          <polyline points="7 14 2 9 7 4" />
          <line x1="2" y1="9" x2="22" y2="9" />
          <line x1="22" y1="15" x2="2" y2="15" />
        </svg>
      );

    case 'workspace_premium': // Quality
      return (
        <svg {...baseSvgProps}>
          <circle cx="12" cy="8" r="6" />
          <path d="M15.47 14 19 22l-7-3-7 3 3.53-8" />
        </svg>
      );

    case 'inventory_2': // Products count
      return (
        <svg {...baseSvgProps}>
          <polyline points="21 8 21 21 3 21 3 8" />
          <rect x="1" y="3" width="22" height="5" />
          <line x1="10" y1="12" x2="14" y2="12" />
        </svg>
      );

    case 'group': // Customers
      return (
        <svg {...baseSvgProps}>
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
          <path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
      );

    case 'speed': // Uptime
      return (
        <svg {...baseSvgProps}>
          <path d="M12 2a10 10 0 0 0-7.38 16.74L6.05 17.3A8 8 0 0 1 12 4a8 8 0 0 1 5.95 13.3l1.43 1.44A10 10 0 0 0 12 2z" />
          <path d="m12 14 4-4" />
          <circle cx="12" cy="14" r="1" />
        </svg>
      );

    case 'headset_mic': // Support
      return (
        <svg {...baseSvgProps}>
          <path d="M3 18v-6a9 9 0 0 1 18 0v6" />
          <path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z" />
        </svg>
      );

    case 'storefront': // Marketplace / Brand
      return (
        <svg {...baseSvgProps}>
          <path d="M3 9h18v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9Z" />
          <path d="M1 3h22l-2 6H3L1 3Z" />
          <path d="M12 9v12" />
        </svg>
      );

    case 'expand_more': // Chevron down
      return (
        <svg {...baseSvgProps}>
          <polyline points="6 9 12 15 18 9" />
        </svg>
      );

    case 'sync': // Refresh loader
      return (
        <svg {...baseSvgProps}>
          <path d="M21.5 2v6h-6" />
          <path d="M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" />
        </svg>
      );

    case 'info': // Info alert
      return (
        <svg {...baseSvgProps}>
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="16" x2="12" y2="12" />
          <line x1="12" y1="8" x2="12.01" y2="8" />
        </svg>
      );

    case 'shopping_bag': // Bag
      return (
        <svg {...baseSvgProps}>
          <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
          <line x1="3" y1="6" x2="21" y2="6" />
          <path d="M16 10a4 4 0 0 1-8 0" />
        </svg>
      );

    case 'lock': // Padlock
      return (
        <svg {...baseSvgProps}>
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
          <path d="M7 11V7a5 5 0 0 1 10 0v4" />
        </svg>
      );

    case 'error': // Alert circle
      return (
        <svg {...baseSvgProps}>
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
      );

    case 'bolt': // Flash
      return (
        <svg {...baseSvgProps}>
          <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
        </svg>
      );

    case 'loyalty': // Offer Tag
      return (
        <svg {...baseSvgProps}>
          <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
          <line x1="7" y1="7" x2="7.01" y2="7" />
        </svg>
      );

    case 'apple': // Apple Logo (solid fill)
      return (
        <svg
          viewBox="0 0 24 24"
          width="1em"
          height="1em"
          fill="currentColor"
          className={`inline-block align-middle select-none ${className}`}
          {...props}
        >
          <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 4.17c.66-.81 1.11-1.93.99-3.05-1 .04-2.22.67-2.94 1.51-.62.72-1.16 1.86-1.01 2.96 1.12.09 2.27-.58 2.96-1.42z" />
        </svg>
      );

    case 'verified': // Check Badge
      return (
        <svg {...baseSvgProps}>
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          <polyline points="9 11 11 13 15 9" />
        </svg>
      );

    case 'tune': // Filters
      return (
        <svg {...baseSvgProps}>
          <line x1="4" y1="21" x2="4" y2="14" />
          <line x1="4" y1="10" x2="4" y2="3" />
          <line x1="12" y1="21" x2="12" y2="12" />
          <line x1="12" y1="8" x2="12" y2="3" />
          <line x1="20" y1="21" x2="20" y2="16" />
          <line x1="20" y1="12" x2="20" y2="3" />
          <line x1="1" y1="14" x2="7" y2="14" />
          <line x1="9" y1="8" x2="15" y2="8" />
          <line x1="17" y1="16" x2="23" y2="16" />
        </svg>
      );

    case 'dashboard':
      return (
        <svg {...baseSvgProps}>
          <rect x="3" y="3" width="7" height="9" />
          <rect x="14" y="3" width="7" height="5" />
          <rect x="14" y="12" width="7" height="9" />
          <rect x="3" y="16" width="7" height="5" />
        </svg>
      );

    case 'inventory':
      return (
        <svg {...baseSvgProps}>
          <polyline points="21 8 21 21 3 21 3 8" />
          <rect x="1" y="3" width="22" height="5" />
          <line x1="10" y1="12" x2="14" y2="12" />
        </svg>
      );

    case 'shopping_basket':
      return (
        <svg {...baseSvgProps}>
          <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
          <polyline points="9 22 9 12 15 12 15 22" />
        </svg>
      );

    case 'settings':
      return (
        <svg {...baseSvgProps}>
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
        </svg>
      );

    case 'add':
      return (
        <svg {...baseSvgProps}>
          <line x1="12" y1="5" x2="12" y2="19" />
          <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
      );

    case 'calendar_today':
      return (
        <svg {...baseSvgProps}>
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
          <line x1="16" y1="2" x2="16" y2="6" />
          <line x1="8" y1="2" x2="8" y2="6" />
          <line x1="3" y1="10" x2="21" y2="10" />
        </svg>
      );

    case 'trending_up':
      return (
        <svg {...baseSvgProps}>
          <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
          <polyline points="17 6 23 6 23 12" />
        </svg>
      );

    case 'more_vert':
      return (
        <svg {...baseSvgProps}>
          <circle cx="12" cy="5" r="1" />
          <circle cx="12" cy="12" r="1" />
          <circle cx="12" cy="19" r="1" />
        </svg>
      );

    case 'auto_graph':
      return (
        <svg {...baseSvgProps}>
          <path d="M3 3v18h18" />
          <path d="m18.7 8-5.1 5.2-2.8-2.7L7 14.3" />
        </svg>
      );

    case 'search':
      return (
        <svg {...baseSvgProps}>
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
      );

    case 'category':
      return (
        <svg {...baseSvgProps}>
          <path d="M12 2L2 7l10 5 10-5-10-5z" />
          <path d="M2 17l10 5 10-5" />
          <path d="M2 12l10 5 10-5" />
        </svg>
      );

    case 'payments':
      return (
        <svg {...baseSvgProps}>
          <rect x="2" y="5" width="20" height="14" rx="2" />
          <line x1="2" y1="10" x2="22" y2="10" />
        </svg>
      );

    case 'warning':
      return (
        <svg {...baseSvgProps}>
          <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
          <line x1="12" y1="9" x2="12" y2="13" />
          <line x1="12" y1="17" x2="12.01" y2="17" />
        </svg>
      );

    case 'check':
      return (
        <svg {...baseSvgProps}>
          <polyline points="20 6 9 17 4 12" />
        </svg>
      );

    case 'check_circle':
      return (
        <svg {...baseSvgProps}>
          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
          <polyline points="22 4 12 14.01 9 11.01" />
        </svg>
      );

    case 'send':
      return (
        <svg {...baseSvgProps}>
          <line x1="22" y1="2" x2="11" y2="13" />
          <polygon points="22 2 15 22 11 13 2 9 22 2" />
        </svg>
      );

    case 'email':
    case 'mail':
      return (
        <svg {...baseSvgProps}>
          <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
          <polyline points="22,6 12,13 2,6" />
        </svg>
      );

    case 'phone':
      return (
        <svg {...baseSvgProps}>
          <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
        </svg>
      );

    case 'location_on':
      return (
        <svg {...baseSvgProps}>
          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
          <circle cx="12" cy="10" r="3" />
        </svg>
      );

    case 'schedule':
      return (
        <svg {...baseSvgProps}>
          <circle cx="12" cy="12" r="10" />
          <polyline points="12 6 12 12 16 14" />
        </svg>
      );

    case 'refresh':
      return (
        <svg {...baseSvgProps}>
          <polyline points="23 4 23 10 17 10" />
          <polyline points="1 20 1 14 7 14" />
          <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
        </svg>
      );

    case 'arrow_back':
      return (
        <svg {...baseSvgProps}>
          <line x1="19" y1="12" x2="5" y2="12" />
          <polyline points="12 19 5 12 12 5" />
        </svg>
      );

    case 'progress_activity':
      return (
        <svg {...baseSvgProps}>
          <line x1="12" y1="2" x2="12" y2="6" />
          <line x1="12" y1="18" x2="12" y2="22" />
          <line x1="4.93" y1="4.93" x2="7.76" y2="7.76" />
          <line x1="16.24" y1="16.24" x2="19.07" y2="19.07" />
          <line x1="2" y1="12" x2="6" y2="12" />
          <line x1="18" y1="12" x2="22" y2="12" />
          <line x1="4.93" y1="19.07" x2="7.76" y2="16.24" />
          <line x1="16.24" y1="7.76" x2="19.07" y2="4.93" />
        </svg>
      );

    case 'database':
      return (
        <svg {...baseSvgProps}>
          <ellipse cx="12" cy="5" rx="9" ry="3" />
          <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" />
          <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
        </svg>
      );

    case 'shield':
      return (
        <svg {...baseSvgProps}>
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        </svg>
      );

    case 'cookie':
      return (
        <svg {...baseSvgProps}>
          <path d="M12 2a10 10 0 1 0 10 10 4 4 0 0 1-5-5 4 4 0 0 1-5-5" />
          <path d="M8.5 8.5v.01" />
          <path d="M16 15.5v.01" />
          <path d="M12 12v.01" />
          <path d="M11 17v.01" />
          <path d="M7 14v.01" />
        </svg>
      );

    case 'handshake':
      return (
        <svg {...baseSvgProps}>
          <path d="M8 8l5 5" />
          <path d="M13 13l3.5-3.5a2 2 0 1 1 2.8 2.8L16 15.8" />
          <path d="M16 15.8l-1.4 1.4a2 2 0 0 1-2.8 0l-7-7a2 2 0 0 1 0-2.8L8 4c1.1-1.1 3-1.1 4.2 0" />
          <path d="M6 10l-2 2a2 2 0 0 0 0 2.8l2.8 2.8a2 2 0 0 0 2.8 0L12 15" />
        </svg>
      );

    case 'gavel':
      return (
        <svg {...baseSvgProps}>
          <path d="M14 13L21.5 5.5" />
          <path d="M13 14l-8.5 8.5a1.41 1.41 0 0 1-2-2L11 12" />
          <path d="M16 16l3-3" />
          <path d="M8 8l3-3" />
          <path d="M14 13l-2-2 3-3 2 2z" />
        </svg>
      );

    case 'grid_view':
      return (
        <svg {...baseSvgProps}>
          <rect x="3" y="3" width="7" height="7" />
          <rect x="14" y="3" width="7" height="7" />
          <rect x="14" y="14" width="7" height="7" />
          <rect x="3" y="14" width="7" height="7" />
        </svg>
      );

    case 'view_list':
      return (
        <svg {...baseSvgProps}>
          <line x1="8" y1="6" x2="21" y2="6" />
          <line x1="8" y1="12" x2="21" y2="12" />
          <line x1="8" y1="18" x2="21" y2="18" />
          <line x1="3" y1="6" x2="3.01" y2="6" />
          <line x1="3" y1="12" x2="3.01" y2="12" />
          <line x1="3" y1="18" x2="3.01" y2="18" />
        </svg>
      );

    case 'event':
      return (
        <svg {...baseSvgProps}>
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
          <line x1="16" y1="2" x2="16" y2="6" />
          <line x1="8" y1="2" x2="8" y2="6" />
          <line x1="3" y1="10" x2="21" y2="10" />
        </svg>
      );

    case 'list_alt':
    case 'description':
      return (
        <svg {...baseSvgProps}>
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
          <line x1="16" y1="13" x2="8" y2="13" />
          <line x1="16" y1="17" x2="8" y2="17" />
          <polyline points="10 9 9 9 8 9" />
        </svg>
      );

    case 'block':
      return (
        <svg {...baseSvgProps}>
          <circle cx="12" cy="12" r="10" />
          <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
        </svg>
      );

    case 'account_circle':
      return (
        <svg {...baseSvgProps}>
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
          <circle cx="12" cy="7" r="4" />
        </svg>
      );

    case 'favorite':
      return (
        <svg {...baseSvgProps} fill="currentColor">
          <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
        </svg>
      );

    case 'favorite_border':
      return (
        <svg {...baseSvgProps}>
          <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
        </svg>
      );

    case 'close':
      return (
        <svg {...baseSvgProps}>
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      );

    case 'star_border':
      return (
        <svg {...baseSvgProps}>
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
        </svg>
      );

    case 'delete':
      return (
        <svg {...baseSvgProps}>
          <polyline points="3 6 5 6 21 6" />
          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
          <line x1="10" y1="11" x2="10" y2="17" />
          <line x1="14" y1="11" x2="14" y2="17" />
        </svg>
      );

    default:
      // Graceful fallback: render name text so the system continues to work
      return <span className={className}>{name}</span>;
  }
}
