import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { getRoleNavigation, UserRole } from '@/utils/rolePermissions';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import * as Icons from 'lucide-react';

interface RoleBasedNavigationProps {
  className?: string;
  variant?: 'desktop' | 'mobile' | 'sidebar';
}

export const RoleBasedNavigation: React.FC<RoleBasedNavigationProps> = ({ 
  className, 
  variant = 'desktop' 
}) => {
  const { userRole } = useAuth();
  const location = useLocation();
  const navigation = getRoleNavigation(userRole as UserRole);

  const getIcon = (iconName: string) => {
    const IconComponent = Icons[iconName as keyof typeof Icons] as React.ComponentType<any>;
    return IconComponent ? <IconComponent className="h-4 w-4" /> : null;
  };

  const isActive = (path: string) => location.pathname === path;

  if (variant === 'mobile') {
    return (
      <nav className={cn("flex justify-around items-center bg-background border-t", className)}>
        {navigation.slice(0, 5).map((item) => (
          <Link
            key={item.path}
            to={item.path}
            className={cn(
              "flex flex-col items-center p-2 text-xs transition-colors",
              isActive(item.path) 
                ? "text-primary" 
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {getIcon(item.icon)}
            <span className="mt-1">{item.label}</span>
          </Link>
        ))}
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

  // Desktop variant
  return (
    <nav className={cn("flex items-center space-x-4", className)}>
      {navigation.map((item) => (
        <Button
          key={item.path}
          asChild
          variant={isActive(item.path) ? "default" : "ghost"}
          size="sm"
        >
          <Link to={item.path} className="flex items-center space-x-2">
            {getIcon(item.icon)}
            <span>{item.label}</span>
          </Link>
        </Button>
      ))}
    </nav>
  );
};

export default RoleBasedNavigation;
