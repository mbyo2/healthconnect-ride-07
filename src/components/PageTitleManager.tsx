import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

const ROUTE_TITLES: Record<string, string> = {
  '/': "Doc' O Clock — Book Doctors & Healthcare in Zambia",
  '/auth': "Sign In or Register | Doc' O Clock Zambia",
  '/dashboard': "Dashboard | Doc' O Clock",
  '/provider-dashboard': "Provider Dashboard | Doc' O Clock",
  '/staff-dashboard': "Staff Dashboard | Doc' O Clock",
  '/institution-dashboard': "Institution Dashboard | Doc' O Clock",
  '/billing': "Billing & Invoices | Doc' O Clock",
  '/prescriptions': "Prescriptions | Doc' O Clock",
  '/appointments': "Appointments | Doc' O Clock",
  '/pharmacy-portal': "Pharmacy Portal | Doc' O Clock",
  '/lab-management': "Lab Management | Doc' O Clock",
  '/institution/settings': "Institution Settings | Doc' O Clock",
  '/institution/personnel': "Staff Management | Doc' O Clock",
  '/medical-records': "Medical Records | Doc' O Clock",
  '/hospital-management': "Hospital Management | Doc' O Clock",
};

export const PageTitleManager = () => {
  const location = useLocation();

  useEffect(() => {
    const path = location.pathname;
    let title = ROUTE_TITLES[path];
    if (!title) {
      const sortedPaths = Object.keys(ROUTE_TITLES).sort((a, b) => b.length - a.length);
      for (const routePath of sortedPaths) {
        if (path.startsWith(routePath) && routePath !== '/') {
          title = ROUTE_TITLES[routePath];
          break;
        }
      }
    }
    if (!title) {
      title = "Doc' O Clock — Healthcare in Zambia";
    }
    document.title = title;
  }, [location.pathname]);

  return null;
};
