import React, { useMemo } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useUserRoles } from '@/context/UserRolesContext';
import { getRoleNavigation } from '@/utils/rolePermissions';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import * as Icons from 'lucide-react';
import { MoreHorizontal } from 'lucide-react';

interface RoleBasedNavigationProps {
  className?: string;
  variant?: 'desktop' | 'mobile' | 'sidebar';
}

interface NavItem {
  path: string;
  label: string;
  icon: string;
}

// getRoleNavigation() can return the same destination more than once for a
// role (e.g. /pharmacy-management is registered under two pharmacy role
// entries). Collapse duplicates so one role never sees two identical items
// pointing at the same destination.
const dedupeByPath = (items: NavItem[]): NavItem[] => {
  const seen = new Set<string>();
  return items.filter((item) => {
    if (seen.has(item.path)) return false;
    seen.add(item.path);
    return true;
  });
};

// Roles that exist in the org taxonomy but have no entries in the role
// navigation map (or any unknown future role) get Profile + Settings instead
// of an empty menu — the nav must never render nothing.
const FALLBACK_NAVIGATION: NavItem[] = [
  { path: '/profile', label: 'Profile', icon: 'User' },
  { path: '/settings', label: 'Settings', icon: 'Settings' },
];

// Bottom-bar slots before overflow items move into the "More" menu.
// The bar must never silently drop items a role is entitled to.
const MAX_MOBILE_ITEMS = 5;

export const RoleBasedNavigation: React.FC<RoleBasedNavigationProps> = ({ 
  className, 
  variant = 'desktop' 
}) => {
  const { availableRoles } = useUserRoles();
  const location = useLocation();

  const navigation = useMemo<NavItem[]>(() => {
    const items = dedupeByPath(getRoleNavigation(availableRoles));
    return items.length > 0 ? items : FALLBACK_NAVIGATION;
  }, [availableRoles]);

  const getIcon = (iconName: string) => {
    const IconComponent = Icons[iconName as keyof typeof Icons] as React.ComponentType<any>;
    return IconComponent ? <IconComponent className="h-4 w-4" /> : null;
  };

  const isActive = (path: string) => location.pathname === path;

  if (variant === 'mobile') {
    const visibleItems = navigation.slice(0, MAX_MOBILE_ITEMS - 1);
    const overflowItems = navigation.slice(MAX_MOBILE_ITEMS - 1);
    const hasOverflow = overflowItems.length > 0;

    return (
      <nav className={cn("flex justify-around items-center bg-background border-t", className)}>
        {visibleItems.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            className={cn(
              "flex flex-1 min-w-0 flex-col items-center p-2 text-xs transition-colors",
              isActive(item.path) 
                ? "text-primary" 
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {getIcon(item.icon)}
            <span className="mt-1 truncate max-w-full">{item.label}</span>
          </Link>
        ))}

        {hasOverflow && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                aria-label="More navigation"
                aria-haspopup="menu"
                className="flex flex-1 min-w-0 flex-col items-center p-2 text-xs transition-colors text-muted-foreground hover:text-foreground"
              >
                <MoreHorizontal className="h-4 w-4" />
                <span className="mt-1 truncate max-w-full">More</span>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="max-h-[70vh] overflow-y-auto">
              {overflowItems.map((item) => (
                <DropdownMenuItem key={item.path} asChild>
                  <Link to={item.path} className="flex items-center gap-2 cursor-pointer">
                    {getIcon(item.icon)}
                    <span>{item.label}</span>
                  </Link>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </nav>
    );
  }

  if (variant === 'sidebar') {
    return (
      <nav className={cn("flex flex-col space-y-2", className)}>
        {navigation.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            className={cn(
              "flex items-center space-x-3 px-3 py-2 rounded-md text-sm transition-colors",
              isActive(item.path)
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground hover:bg-muted"
            )}
          >
            {getIcon(item.icon)}
            <span>{item.label}</span>
          </Link>
        ))}
      </nav>
    );
  }

  // Desktop variant — the row scrolls horizontally instead of wrapping or
  // letting items be cut off by the header container (items keep their
  // intrinsic width via shrink-0). Scrollbar is visually hidden via the
  // .scrollbar-hide utility in index.css; content stays reachable.
  return (
    <nav className={cn("flex items-center space-x-4 overflow-x-auto max-w-full scrollbar-hide", className)}>
      {navigation.map((item) => (
        <Button
          key={item.path}
          asChild
          variant={isActive(item.path) ? "default" : "ghost"}
          size="sm"
          className="shrink-0"
        >
          <Link to={item.path} className="flex items-center space-x-2 whitespace-nowrap">
            {getIcon(item.icon)}
            <span>{item.label}</span>
          </Link>
        </Button>
      ))}
    </nav>
  );
};

export default RoleBasedNavigation;
