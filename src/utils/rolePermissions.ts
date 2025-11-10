// Role-based permissions and route definitions
export const USER_ROLES = {
  PATIENT: 'patient',
  HEALTH_PERSONNEL: 'health_personnel',
  PHARMACY: 'pharmacy',
  INSTITUTION_ADMIN: 'institution_admin',
  INSTITUTION_STAFF: 'institution_staff',
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
    '/medical-records',
    '/video-consultations',
    '/health-dashboard',
    '/marketplace-users',
    '/marketplace',
    '/payment-success',
    '/payment-cancel'
  ],
  [USER_ROLES.HEALTH_PERSONNEL]: [
    '/',
    '/provider-dashboard',
    '/provider-portal',
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
    '/medical-records',
    '/healthcare-application',
    '/payment-success',
    '/payment-cancel'
  ],
  [USER_ROLES.PHARMACY]: [
    '/',
    '/pharmacy-portal',
    '/pharmacy-inventory',
    '/prescriptions',
    '/profile',
    '/settings',
    '/wallet',
    '/marketplace',
    '/map',
    '/search',
    '/payment-success',
    '/payment-cancel'
  ],
  [USER_ROLES.INSTITUTION_ADMIN]: [
    '/',
    '/institution-portal',
    '/appointments',
    '/chat',
    '/profile',
    '/settings',
    '/wallet',
    '/map',
    '/search',
    '/healthcare-institutions',
    '/payment-success',
    '/payment-cancel'
  ],
  [USER_ROLES.INSTITUTION_STAFF]: [
    '/',
    '/institution-portal',
    '/appointments',
    '/chat',
    '/profile',
    '/settings',
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
    '/healthcare-application',
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
  '/login',
  '/register',
  '/landing',
  '/healthcare-professionals',
  '/healthcare-institutions',
  '/terms',
  '/privacy',
  '/contact'
];

// Check if a user has permission to access a route (supports multiple roles)
export const hasRoutePermission = (userRoles: UserRole[] | null, route: string): boolean => {
  if (!userRoles || userRoles.length === 0) return PUBLIC_ROUTES.includes(route);
  
  // Check if any of the user's roles has permission for this route
  return userRoles.some(role => ROLE_PERMISSIONS[role]?.includes(route) || false);
};

// Check if user has a specific role
export const hasRole = (userRoles: UserRole[] | null, role: UserRole): boolean => {
  if (!userRoles) return false;
  return userRoles.includes(role);
};

// Check if user has any of the specified roles
export const hasAnyRole = (userRoles: UserRole[] | null, roles: UserRole[]): boolean => {
  if (!userRoles) return false;
  return roles.some(role => userRoles.includes(role));
};

// Get the appropriate landing page based on user's primary role
export const getRoleLandingPage = (userRoles: UserRole[] | null): string => {
  if (!userRoles || userRoles.length === 0) return '/auth';
  
  // Priority order: admin > institution_admin > health_personnel > pharmacy > patient
  if (userRoles.includes(USER_ROLES.ADMIN)) return '/admin-dashboard';
  if (userRoles.includes(USER_ROLES.INSTITUTION_ADMIN)) return '/institution-portal';
  if (userRoles.includes(USER_ROLES.HEALTH_PERSONNEL)) return '/provider-dashboard';
  if (userRoles.includes(USER_ROLES.PHARMACY)) return '/pharmacy-portal';
  if (userRoles.includes(USER_ROLES.PATIENT)) return '/symptoms';
  
  return '/';
};

// Get navigation items based on user's roles (supports multiple roles)
export const getRoleNavigation = (userRoles: UserRole[] | null) => {
  const baseNavigation = [
    { path: '/profile', label: 'Profile', icon: 'User', roles: ['patient', 'health_personnel', 'pharmacy', 'institution_admin', 'admin'] },
    { path: '/settings', label: 'Settings', icon: 'Settings', roles: ['patient', 'health_personnel', 'pharmacy', 'institution_admin', 'admin'] }
  ];

  const allNavigationItems = [
    // Patient routes
    { path: '/symptoms', label: 'Symptoms', icon: 'Heart', roles: ['patient'] },
    { path: '/appointments', label: 'Appointments', icon: 'Calendar', roles: ['patient', 'health_personnel'] },
    { path: '/chat', label: 'Messages', icon: 'MessageCircle', roles: ['patient', 'health_personnel', 'admin'] },
    { path: '/prescriptions', label: 'Prescriptions', icon: 'Pill', roles: ['patient', 'health_personnel', 'pharmacy'] },
    { path: '/healthcare-professionals', label: 'Find Providers', icon: 'Search', roles: ['patient'] },
    { path: '/map', label: 'Map', icon: 'MapPin', roles: ['patient', 'health_personnel', 'admin'] },
    { path: '/wallet', label: 'Wallet', icon: 'Wallet', roles: ['patient', 'health_personnel'] },
    { path: '/emergency', label: 'Emergency', icon: 'AlertTriangle', roles: ['patient', 'health_personnel'] },
    { path: '/connections', label: 'My Providers', icon: 'Users', roles: ['patient'] },
    { path: '/medical-records', label: 'Medical Records', icon: 'FileText', roles: ['patient', 'health_personnel'] },
    
    // Provider routes
    { path: '/provider-dashboard', label: 'Dashboard', icon: 'LayoutDashboard', roles: ['health_personnel'] },
    { path: '/provider-portal', label: 'Provider Portal', icon: 'Building2', roles: ['health_personnel'] },
    
    // Pharmacy routes
    { path: '/pharmacy-portal', label: 'Pharmacy Portal', icon: 'Building2', roles: ['pharmacy', 'health_personnel'] },
    { path: '/pharmacy-inventory', label: 'Inventory', icon: 'Package', roles: ['pharmacy'] },
    
    // Institution routes
    { path: '/institution-portal', label: 'Institution Portal', icon: 'Building', roles: ['institution_admin', 'institution_staff'] },
    
    // Admin routes
    { path: '/admin-dashboard', label: 'Admin Dashboard', icon: 'LayoutDashboard', roles: ['admin'] },
    { path: '/super-admin-dashboard', label: 'Super Admin', icon: 'Shield', roles: ['admin'] },
    { path: '/create-admin', label: 'Create Admin', icon: 'UserPlus', roles: ['admin'] },
    { path: '/admin-wallet', label: 'Admin Wallet', icon: 'Wallet', roles: ['admin'] },
    { path: '/compliance-audit', label: 'Compliance', icon: 'FileCheck', roles: ['admin', 'health_personnel'] },
    
    ...baseNavigation
  ];

  if (!userRoles || userRoles.length === 0) {
    return baseNavigation;
  }

  // Filter navigation items based on user's roles
  return allNavigationItems.filter(item => 
    item.roles.some(role => userRoles.includes(role as UserRole))
  );
};
