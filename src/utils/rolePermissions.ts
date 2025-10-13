// Role-based permissions and route definitions
export const USER_ROLES = {
  PATIENT: 'patient',
  HEALTH_PERSONNEL: 'health_personnel',
  ADMIN: 'admin'
} as const;

export type UserRole = typeof USER_ROLES[keyof typeof USER_ROLES];

// Define which routes each role can access
export const ROLE_PERMISSIONS = {
  [USER_ROLES.PATIENT]: [
    '/',
    '/symptoms',
    '/appointments',
    '/chat',
    '/prescriptions',
    '/profile',
    '/settings',
    '/wallet',
    '/emergency',
    '/healthcare-professionals',
    '/healthcare-institutions',
    '/connections',
    '/ai-diagnostics',
    '/iot-monitoring',
    '/health-analytics',
    '/telemedicine',
    '/blockchain-records',
    '/ar-anatomy',
    '/mental-health',
    '/genomic-analysis',
    '/smart-contracts',
    '/quantum-encryption',
    '/map',
    '/search',
    '/payment-success',
    '/payment-cancel'
  ],
  [USER_ROLES.HEALTH_PERSONNEL]: [
    '/',
    '/provider-dashboard',
    '/appointments',
    '/chat',
    '/prescriptions',
    '/profile',
    '/settings',
    '/wallet',
    '/emergency',
    '/connections',
    '/pharmacy-portal',
    '/pharmacy-inventory',
    '/ai-diagnostics',
    '/iot-monitoring',
    '/health-analytics',
    '/telemedicine',
    '/blockchain-records',
    '/compliance-audit',
    '/map',
    '/search',
    '/payment-success',
    '/payment-cancel'
  ],
  [USER_ROLES.ADMIN]: [
    '/',
    '/admin-dashboard',
    '/super-admin-dashboard',
    '/appointments',
    '/chat',
    '/profile',
    '/settings',
    '/wallet',
    '/admin-wallet',
    '/create-admin',
    '/compliance-audit',
    '/quantum-encryption',
    '/map',
    '/search',
    '/payment-success',
    '/payment-cancel'
  ]
};

// Default landing pages for each role
export const ROLE_LANDING_PAGES = {
  [USER_ROLES.PATIENT]: '/symptoms',
  [USER_ROLES.HEALTH_PERSONNEL]: '/provider-dashboard',
  [USER_ROLES.ADMIN]: '/admin-dashboard'
};

// Public routes that don't require authentication
export const PUBLIC_ROUTES = [
  '/auth',
  '/register',
  '/landing',
  '/healthcare-professionals',
  '/healthcare-institutions',
  '/terms',
  '/privacy',
  '/contact'
];

// Check if a user role has permission to access a route
export const hasRoutePermission = (userRole: UserRole | null, route: string): boolean => {
  if (!userRole) return PUBLIC_ROUTES.includes(route);
  return ROLE_PERMISSIONS[userRole]?.includes(route) || false;
};

// Get the appropriate landing page for a user role
export const getRoleLandingPage = (userRole: UserRole | null): string => {
  if (!userRole) return '/auth';
  return ROLE_LANDING_PAGES[userRole] || '/';
};

// Get navigation items based on user role
export const getRoleNavigation = (userRole: UserRole | null) => {
  const baseNavigation = [
    { path: '/profile', label: 'Profile', icon: 'User' },
    { path: '/settings', label: 'Settings', icon: 'Settings' }
  ];

  switch (userRole) {
    case USER_ROLES.PATIENT:
      return [
        { path: '/symptoms', label: 'Symptoms', icon: 'Heart' },
        { path: '/appointments', label: 'Appointments', icon: 'Calendar' },
        { path: '/chat', label: 'Messages', icon: 'MessageCircle' },
        { path: '/prescriptions', label: 'Prescriptions', icon: 'Pill' },
        { path: '/healthcare-professionals', label: 'Find Providers', icon: 'Search' },
        { path: '/map', label: 'Map', icon: 'MapPin' },
        { path: '/wallet', label: 'Wallet', icon: 'Wallet' },
        { path: '/emergency', label: 'Emergency', icon: 'AlertTriangle' },
        ...baseNavigation
      ];

    case USER_ROLES.HEALTH_PERSONNEL:
      return [
        { path: '/provider-dashboard', label: 'Dashboard', icon: 'LayoutDashboard' },
        { path: '/appointments', label: 'Appointments', icon: 'Calendar' },
        { path: '/chat', label: 'Messages', icon: 'MessageCircle' },
        { path: '/prescriptions', label: 'Prescriptions', icon: 'Pill' },
        { path: '/pharmacy-portal', label: 'Pharmacy', icon: 'Building2' },
        { path: '/map', label: 'Map', icon: 'MapPin' },
        { path: '/wallet', label: 'Wallet', icon: 'Wallet' },
        { path: '/emergency', label: 'Emergency', icon: 'AlertTriangle' },
        ...baseNavigation
      ];

    case USER_ROLES.ADMIN:
      return [
        { path: '/admin-dashboard', label: 'Admin Dashboard', icon: 'LayoutDashboard' },
        { path: '/super-admin-dashboard', label: 'Super Admin', icon: 'Shield' },
        { path: '/create-admin', label: 'Create Admin', icon: 'UserPlus' },
        { path: '/admin-wallet', label: 'Admin Wallet', icon: 'Wallet' },
        { path: '/compliance-audit', label: 'Compliance', icon: 'FileCheck' },
        { path: '/map', label: 'Map', icon: 'MapPin' },
        ...baseNavigation
      ];

    default:
      return baseNavigation;
  }
};
