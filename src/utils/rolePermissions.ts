// Role-based permissions and route definitions
export const USER_ROLES = {
  PATIENT: 'patient',
  HEALTH_PERSONNEL: 'health_personnel',
  PHARMACY: 'pharmacy',
  INSTITUTION_ADMIN: 'institution_admin',
  INSTITUTION_STAFF: 'institution_staff',
  ADMIN: 'admin',
  LAB: 'lab',
  SUPER_ADMIN: 'super_admin',
  SUPPORT: 'support',
  DOCTOR: 'doctor',
  NURSE: 'nurse',
  RADIOLOGIST: 'radiologist',
  PHARMACIST: 'pharmacist',
  LAB_TECHNICIAN: 'lab_technician'
} as const;

export type UserRole = typeof USER_ROLES[keyof typeof USER_ROLES];

// Define which routes each role can access
export const ROLE_PERMISSIONS = {
  [USER_ROLES.PATIENT]: [
    '/',
    '/home',
    '/onboarding',
    '/symptoms',
    '/appointments',
    '/appointments/:id',
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
    '/advanced-dashboard',
    '/blockchain-records',
    '/iot-monitoring',
    '/health-analytics',
    '/emergency-response',
    '/telemedicine',
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
    '/notifications',
    '/privacy-security',
    '/medications',
    '/provider-calendar',
    '/payment-success',
    '/payment-cancel'
  ],
  [USER_ROLES.HEALTH_PERSONNEL]: [
    '/',
    '/home',
    '/onboarding',
    '/provider-dashboard',
    '/provider-portal',
    '/appointments',
    '/appointments/:id',
    '/chat',
    '/prescriptions',
    '/profile',
    '/settings',
    '/wallet',
    '/emergency',
    '/connections',
    '/pharmacy-portal',
    '/pharmacy-inventory',
    '/pharmacy-management',
    '/hospital-management',
    '/lab-management',
    '/ai-diagnostics',
    '/advanced-dashboard',
    '/blockchain-records',
    '/iot-monitoring',
    '/health-analytics',
    '/emergency-response',
    '/telemedicine',
    '/compliance-audit',
    '/map',
    '/search',
    '/medical-records',
    '/healthcare-application',
    '/notifications',
    '/privacy-security',
    '/medications',
    '/provider-calendar',
    '/application-status',
    '/video-consultations',
    '/payment-success',
    '/payment-cancel'
  ],
  [USER_ROLES.DOCTOR]: [
    '/',
    '/home',
    '/onboarding',
    '/provider-dashboard',
    '/provider-portal',
    '/appointments',
    '/appointments/:id',
    '/chat',
    '/prescriptions',
    '/profile',
    '/settings',
    '/wallet',
    '/emergency',
    '/connections',
    '/ai-diagnostics',
    '/advanced-dashboard',
    '/blockchain-records',
    '/iot-monitoring',
    '/health-analytics',
    '/emergency-response',
    '/telemedicine',
    '/map',
    '/search',
    '/medical-records',
    '/notifications',
    '/privacy-security',
    '/medications',
    '/provider-calendar',
    '/video-consultations',
    '/payment-success',
    '/payment-cancel'
  ],
  [USER_ROLES.NURSE]: [
    '/',
    '/home',
    '/onboarding',
    '/provider-dashboard',
    '/appointments',
    '/chat',
    '/profile',
    '/settings',
    '/wallet',
    '/emergency',
    '/iot-monitoring',
    '/health-analytics',
    '/emergency-response',
    '/telemedicine',
    '/map',
    '/search',
    '/medical-records',
    '/notifications',
    '/privacy-security',
    '/medications',
    '/provider-calendar',
    '/payment-success',
    '/payment-cancel'
  ],
  [USER_ROLES.RADIOLOGIST]: [
    '/',
    '/home',
    '/onboarding',
    '/provider-dashboard',
    '/appointments',
    '/chat',
    '/profile',
    '/settings',
    '/wallet',
    '/map',
    '/search',
    '/medical-records',
    '/notifications',
    '/privacy-security',
    '/payment-success',
    '/payment-cancel'
  ],
  [USER_ROLES.PHARMACIST]: [
    '/',
    '/home',
    '/onboarding',
    '/pharmacy-portal',
    '/pharmacy-inventory',
    '/pharmacy-management',
    '/prescriptions',
    '/profile',
    '/settings',
    '/wallet',
    '/marketplace',
    '/map',
    '/search',
    '/notifications',
    '/privacy-security',
    '/medications',
    '/payment-success',
    '/payment-cancel'
  ],
  [USER_ROLES.LAB_TECHNICIAN]: [
    '/',
    '/home',
    '/onboarding',
    '/lab-management',
    '/profile',
    '/settings',
    '/wallet',
    '/map',
    '/search',
    '/medical-records',
    '/notifications',
    '/privacy-security',
    '/medications',
    '/payment-success',
    '/payment-cancel'
  ],
  [USER_ROLES.PHARMACY]: [
    '/',
    '/home',
    '/onboarding',
    '/pharmacy-portal',
    '/pharmacy-inventory',
    '/pharmacy-management',
    '/prescriptions',
    '/profile',
    '/settings',
    '/wallet',
    '/marketplace',
    '/map',
    '/search',
    '/notifications',
    '/privacy-security',
    '/medications',
    '/payment-success',
    '/payment-cancel'
  ],
  [USER_ROLES.LAB]: [
    '/',
    '/home',
    '/onboarding',
    '/lab-management',
    '/profile',
    '/settings',
    '/wallet',
    '/map',
    '/search',
    '/notifications',
    '/privacy-security',
    '/medications',
    '/payment-success',
    '/payment-cancel'
  ],
  [USER_ROLES.INSTITUTION_ADMIN]: [
    '/',
    '/home',
    '/onboarding',
    '/institution-portal',
    '/appointments',
    '/appointments/:id',
    '/chat',
    '/profile',
    '/settings',
    '/wallet',
    '/map',
    '/search',
    '/healthcare-institutions',
    '/hospital-management',
    '/institution-portal',
    '/institution-registration',
    '/institution-status',
    '/institution-dashboard',
    '/institution/personnel',
    '/institution/patients',
    '/institution/reports',
    '/institution/appointments',
    '/institution/settings',
    '/notifications',
    '/privacy-security',
    '/medications',
    '/payment-success',
    '/payment-cancel'
  ],
  [USER_ROLES.INSTITUTION_STAFF]: [
    '/',
    '/home',
    '/onboarding',
    '/institution-portal',
    '/appointments',
    '/appointments/:id',
    '/chat',
    '/profile',
    '/settings',
    '/map',
    '/search',
    '/hospital-management',
    '/institution-dashboard',
    '/institution/patients',
    '/institution/reports',
    '/institution/appointments',
    '/notifications',
    '/privacy-security',
    '/medications',
    '/payment-success',
    '/payment-cancel'
  ],
  [USER_ROLES.ADMIN]: [
    '/',
    '/home',
    '/onboarding',
    '/admin-dashboard',
    '/super-admin-dashboard',
    '/appointments',
    '/appointments/:id',
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
    '/hospital-management',
    '/pharmacy-management',
    '/lab-management',
    '/ai-diagnostics',
    '/advanced-dashboard',
    '/blockchain-records',
    '/iot-monitoring',
    '/health-analytics',
    '/emergency-response',
    '/notifications',
    '/privacy-security',
    '/medications',
    '/provider-calendar',
    '/testing',
    '/documentation',
    '/payment-success',
    '/payment-cancel'
  ],
  [USER_ROLES.SUPPORT]: [
    '/',
    '/home',
    '/onboarding',
    '/admin-dashboard',
    '/super-admin-dashboard',
    '/chat',
    '/profile',
    '/settings',
    '/search',
    '/healthcare-application',
    '/notifications',
    '/privacy-security',
    '/payment-success',
    '/payment-cancel'
  ],
  [USER_ROLES.SUPER_ADMIN]: [
    '/',
    '/home',
    '/onboarding',
    '/symptoms',
    '/appointments',
    '/appointments/:id',
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
    '/provider-dashboard',
    '/provider-portal',
    '/pharmacy-portal',
    '/pharmacy-inventory',
    '/compliance-audit',
    '/healthcare-application',
    '/lab-management',
    '/institution-portal',
    '/hospital-management',
    '/pharmacy-management',
    '/admin-dashboard',
    '/super-admin-dashboard',
    '/admin-wallet',
    '/create-admin',
    '/payment-success',
    '/payment-cancel'
  ]
};

// Default landing pages for each role
export const ROLE_LANDING_PAGES = {
  [USER_ROLES.PATIENT]: '/home',
  [USER_ROLES.HEALTH_PERSONNEL]: '/provider-dashboard',
  [USER_ROLES.ADMIN]: '/admin-dashboard',
  [USER_ROLES.LAB]: '/lab-management',
  [USER_ROLES.PHARMACY]: '/pharmacy-portal',
  [USER_ROLES.INSTITUTION_ADMIN]: '/institution-portal',
  [USER_ROLES.INSTITUTION_STAFF]: '/institution-dashboard',
  [USER_ROLES.SUPER_ADMIN]: '/super-admin-dashboard',
  [USER_ROLES.SUPPORT]: '/admin-dashboard',
  [USER_ROLES.DOCTOR]: '/provider-dashboard',
  [USER_ROLES.NURSE]: '/provider-dashboard',
  [USER_ROLES.RADIOLOGIST]: '/provider-dashboard',
  [USER_ROLES.PHARMACIST]: '/pharmacy-portal',
  [USER_ROLES.LAB_TECHNICIAN]: '/lab-management'
};

// Public routes that don't require authentication
export const PUBLIC_ROUTES = [
  '/auth',
  '/login',
  '/register',
  '/landing',
  '/healthcare-professionals',
  '/healthcare-institutions',
  '/healthcare-application',
  '/terms',
  '/privacy',
  '/contact'
];

// Check if a user has permission to access a route (supports multiple roles)
export const hasRoutePermission = (userRoles: UserRole[] | null, route: string): boolean => {
  if (!userRoles || userRoles.length === 0) return PUBLIC_ROUTES.includes(route);

  // Super admin has access to everything
  if (userRoles.includes(USER_ROLES.SUPER_ADMIN)) return true;

  // Check if any of the user's roles has permission for this route
  return userRoles.some(role => {
    const permissions = ROLE_PERMISSIONS[role] || [];

    // Exact match
    if (permissions.includes(route)) return true;

    // Dynamic route match (e.g., /appointments/:id)
    return permissions.some(p => {
      if (p.includes(':')) {
        const pattern = p.split('/:')[0];
        return route.startsWith(pattern + '/');
      }
      return false;
    });
  });
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

  // Priority order: admin > institution_admin > health_personnel > pharmacy > lab > patient
  if (userRoles.includes(USER_ROLES.ADMIN) || userRoles.includes(USER_ROLES.SUPER_ADMIN)) return '/admin-dashboard';
  if (userRoles.includes(USER_ROLES.INSTITUTION_ADMIN)) return '/institution-portal';
  if (userRoles.includes(USER_ROLES.INSTITUTION_STAFF)) return '/institution-dashboard';
  if (userRoles.includes(USER_ROLES.HEALTH_PERSONNEL) || userRoles.includes(USER_ROLES.DOCTOR) || userRoles.includes(USER_ROLES.NURSE) || userRoles.includes(USER_ROLES.RADIOLOGIST)) return '/provider-dashboard';
  if (userRoles.includes(USER_ROLES.PHARMACY) || userRoles.includes(USER_ROLES.PHARMACIST)) return '/pharmacy-portal';
  if (userRoles.includes(USER_ROLES.LAB) || userRoles.includes(USER_ROLES.LAB_TECHNICIAN)) return '/lab-management';
  if (userRoles.includes(USER_ROLES.PATIENT)) return '/home';

  return '/home';
};

// Get navigation items based on user's roles (supports multiple roles)
export const getRoleNavigation = (userRoles: UserRole[] | null) => {
  const baseNavigation = [
    { path: '/profile', label: 'Profile', icon: 'User', roles: ['patient', 'health_personnel', 'pharmacy', 'institution_admin', 'institution_staff', 'admin', 'lab', 'super_admin', 'support'] },
    { path: '/settings', label: 'Settings', icon: 'Settings', roles: ['patient', 'health_personnel', 'pharmacy', 'institution_admin', 'institution_staff', 'admin', 'lab', 'super_admin', 'support'] }
  ];

  const allNavigationItems = [
    // Patient routes
    { path: '/symptoms', label: 'Symptoms', icon: 'Heart', roles: ['patient', 'super_admin'] },
    { path: '/appointments', label: 'Appointments', icon: 'Calendar', roles: ['patient', 'health_personnel', 'institution_admin', 'institution_staff', 'super_admin'] },
    { path: '/chat', label: 'Messages', icon: 'MessageCircle', roles: ['patient', 'health_personnel', 'admin', 'institution_admin', 'institution_staff', 'super_admin'] },
    { path: '/prescriptions', label: 'Prescriptions', icon: 'Pill', roles: ['patient', 'health_personnel', 'pharmacy', 'super_admin'] },
    { path: '/healthcare-professionals', label: 'Find Providers', icon: 'Search', roles: ['patient', 'super_admin'] },
    { path: '/map', label: 'Map', icon: 'MapPin', roles: ['patient', 'health_personnel', 'admin', 'super_admin'] },
    { path: '/wallet', label: 'Wallet', icon: 'Wallet', roles: ['patient', 'health_personnel', 'super_admin'] },
    { path: '/emergency', label: 'Emergency', icon: 'AlertTriangle', roles: ['patient', 'health_personnel', 'super_admin'] },
    { path: '/connections', label: 'My Providers', icon: 'Users', roles: ['patient', 'super_admin'] },
    { path: '/medical-records', label: 'Medical Records', icon: 'FileText', roles: ['patient', 'health_personnel', 'super_admin'] },
    { path: '/marketplace-users', label: 'Healthcare Marketplace', icon: 'ShoppingCart', roles: ['patient', 'super_admin'] },
    { path: '/video-consultations', label: 'Video Consultations', icon: 'Video', roles: ['patient', 'health_personnel', 'super_admin'] },
    { path: '/health-dashboard', label: 'Health Dashboard', icon: 'LayoutDashboard', roles: ['patient', 'super_admin'] },

    // Advanced Healthcare Features (Available to all authenticated users)
    { path: '/advanced-dashboard', label: 'Advanced Dashboard', icon: 'Zap', roles: ['patient', 'health_personnel', 'admin', 'super_admin'] },
    { path: '/ai-diagnostics', label: 'AI Diagnostics', icon: 'Brain', roles: ['patient', 'health_personnel', 'admin', 'super_admin'] },
    { path: '/blockchain-records', label: 'Blockchain Records', icon: 'Shield', roles: ['patient', 'health_personnel', 'admin', 'super_admin'] },
    { path: '/iot-monitoring', label: 'IoT Monitoring', icon: 'Activity', roles: ['patient', 'health_personnel', 'admin', 'super_admin'] },
    { path: '/health-analytics', label: 'Health Analytics', icon: 'BarChart3', roles: ['patient', 'health_personnel', 'admin', 'super_admin'] },
    { path: '/emergency-response', label: 'Emergency Response', icon: 'AlertTriangle', roles: ['patient', 'health_personnel', 'admin', 'super_admin'] },

    // Provider routes
    { path: '/provider-dashboard', label: 'Dashboard', icon: 'LayoutDashboard', roles: ['health_personnel', 'super_admin'] },
    { path: '/provider-portal', label: 'Provider Portal', icon: 'Building2', roles: ['health_personnel', 'super_admin'] },

    // Pharmacy routes
    { path: '/pharmacy-portal', label: 'Pharmacy Portal', icon: 'Building2', roles: ['pharmacy', 'health_personnel', 'super_admin'] },
    { path: '/pharmacy-inventory', label: 'Inventory', icon: 'Package', roles: ['pharmacy', 'super_admin'] },

    // Institution routes
    { path: '/institution-portal', label: 'Institution Portal', icon: 'Building', roles: ['institution_admin', 'institution_staff', 'super_admin'] },
    { path: '/institution-dashboard', label: 'Institution Dashboard', icon: 'LayoutDashboard', roles: ['institution_admin', 'institution_staff', 'super_admin'] },
    { path: '/institution/patients', label: 'Patients', icon: 'Users', roles: ['institution_admin', 'institution_staff', 'super_admin'] },
    { path: '/institution/reports', label: 'Reports', icon: 'BarChart', roles: ['institution_admin', 'institution_staff', 'super_admin'] },
    { path: '/institution/appointments', label: 'Appointments', icon: 'Calendar', roles: ['institution_admin', 'institution_staff', 'super_admin'] },

    // Admin routes
    { path: '/admin-dashboard', label: 'Admin Dashboard', icon: 'LayoutDashboard', roles: ['admin', 'support', 'super_admin'] },
    { path: '/super-admin-dashboard', label: 'Super Admin', icon: 'Shield', roles: ['admin', 'support', 'super_admin'] },
    { path: '/create-admin', label: 'Create Admin', icon: 'UserPlus', roles: ['admin', 'super_admin'] },
    { path: '/admin-wallet', label: 'Admin Wallet', icon: 'Wallet', roles: ['admin', 'super_admin'] },
    { path: '/compliance-audit', label: 'Compliance', icon: 'FileCheck', roles: ['admin', 'health_personnel', 'super_admin'] },
    { path: '/hospital-management', label: 'Hospital Management', icon: 'Building', roles: ['admin', 'institution_admin', 'institution_staff', 'health_personnel', 'super_admin'] },
    { path: '/pharmacy-management', label: 'Pharmacy Management', icon: 'Pill', roles: ['admin', 'pharmacy', 'health_personnel', 'super_admin'] },
    { path: '/lab-management', label: 'Lab Management', icon: 'FlaskConical', roles: ['admin', 'lab', 'health_personnel', 'super_admin'] },

    ...baseNavigation
  ];

  if (!userRoles || userRoles.length === 0) {
    return baseNavigation;
  }

  // Super admin gets everything
  if (userRoles.includes(USER_ROLES.SUPER_ADMIN)) {
    return allNavigationItems;
  }

  // Filter navigation items based on user's roles
  return allNavigationItems.filter(item =>
    item.roles.some(role => userRoles.includes(role as UserRole))
  );
};
