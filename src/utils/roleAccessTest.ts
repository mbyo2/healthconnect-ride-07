// Role-based access control testing utilities
import { hasRoutePermission, getRoleLandingPage, ROLE_PERMISSIONS, USER_ROLES, PUBLIC_ROUTES } from './rolePermissions';

export interface AccessTestResult {
  role: string;
  route: string;
  hasAccess: boolean;
  expected: boolean;
  passed: boolean;
}

export interface RoleTestSuite {
  role: string;
  totalTests: number;
  passedTests: number;
  failedTests: number;
  results: AccessTestResult[];
}

// Test cases for each role
const TEST_ROUTES = [
  // Patient-specific routes
  '/symptoms',
  '/appointments',
  '/prescriptions',
  '/healthcare-professionals',
  '/ai-diagnostics',
  '/iot-monitoring',
  '/health-analytics',
  
  // Health personnel routes
  '/provider-dashboard',
  '/pharmacy-portal',
  '/pharmacy-inventory',
  '/compliance-audit',
  
  // Admin routes
  '/admin-dashboard',
  '/super-admin-dashboard',
  '/create-admin',
  '/admin-wallet',
  
  // Common routes
  '/profile',
  '/settings',
  '/wallet',
  '/emergency',
  '/map',
  
  // Public routes
  '/auth',
  '/landing',
  '/healthcare-professionals',
  '/healthcare-institutions',
  
  // Invalid routes
  '/non-existent-route',
  '/unauthorized-page'
];

export const testRoleAccess = (role: string): RoleTestSuite => {
  const results: AccessTestResult[] = [];
  const allowedRoutes = ROLE_PERMISSIONS[role as keyof typeof ROLE_PERMISSIONS] || [];
  
  TEST_ROUTES.forEach(route => {
    const hasAccess = hasRoutePermission(role as any, route);
    const expected = allowedRoutes.includes(route) || PUBLIC_ROUTES.includes(route);
    const passed = hasAccess === expected;
    
    results.push({
      role,
      route,
      hasAccess,
      expected,
      passed
    });
  });
  
  const passedTests = results.filter(r => r.passed).length;
  const failedTests = results.filter(r => !r.passed).length;
  
  return {
    role,
    totalTests: results.length,
    passedTests,
    failedTests,
    results
  };
};

export const testAllRoles = (): RoleTestSuite[] => {
  return Object.values(USER_ROLES).map(role => testRoleAccess(role));
};

export const generateAccessReport = (): string => {
  const allTests = testAllRoles();
  let report = '# Role-Based Access Control Test Report\n\n';
  
  allTests.forEach(suite => {
    report += `## ${suite.role.toUpperCase()} Role\n`;
    report += `- Total Tests: ${suite.totalTests}\n`;
    report += `- Passed: ${suite.passedTests}\n`;
    report += `- Failed: ${suite.failedTests}\n`;
    report += `- Success Rate: ${((suite.passedTests / suite.totalTests) * 100).toFixed(1)}%\n\n`;
    
    if (suite.failedTests > 0) {
      report += '### Failed Tests:\n';
      suite.results
        .filter(r => !r.passed)
        .forEach(result => {
          report += `- Route: ${result.route} | Expected: ${result.expected} | Got: ${result.hasAccess}\n`;
        });
      report += '\n';
    }
  });
  
  const totalTests = allTests.reduce((sum, suite) => sum + suite.totalTests, 0);
  const totalPassed = allTests.reduce((sum, suite) => sum + suite.passedTests, 0);
  const overallSuccessRate = ((totalPassed / totalTests) * 100).toFixed(1);
  
  report += `## Overall Summary\n`;
  report += `- Total Tests Across All Roles: ${totalTests}\n`;
  report += `- Total Passed: ${totalPassed}\n`;
  report += `- Total Failed: ${totalTests - totalPassed}\n`;
  report += `- Overall Success Rate: ${overallSuccessRate}%\n`;
  
  return report;
};

// Test landing page redirects
export const testLandingPages = (): { role: string; landingPage: string; isValid: boolean }[] => {
  return Object.values(USER_ROLES).map(role => {
    const landingPage = getRoleLandingPage(role as any);
    const isValid = hasRoutePermission(role as any, landingPage);
    
    return {
      role,
      landingPage,
      isValid
    };
  });
};

// Validate route permissions configuration
export const validatePermissionsConfig = (): string[] => {
  const issues: string[] = [];
  
  // Check if all roles have permissions defined
  Object.values(USER_ROLES).forEach(role => {
    if (!ROLE_PERMISSIONS[role as keyof typeof ROLE_PERMISSIONS]) {
      issues.push(`Missing permissions for role: ${role}`);
    }
  });
  
  // Check if landing pages are accessible by their respective roles
  const landingTests = testLandingPages();
  landingTests.forEach(test => {
    if (!test.isValid) {
      issues.push(`Landing page ${test.landingPage} is not accessible by role ${test.role}`);
    }
  });
  
  // Check for duplicate routes in permissions
  Object.entries(ROLE_PERMISSIONS).forEach(([role, routes]) => {
    const uniqueRoutes = new Set(routes);
    if (uniqueRoutes.size !== routes.length) {
      issues.push(`Duplicate routes found in permissions for role: ${role}`);
    }
  });
  
  return issues;
};
