import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Search, UserPlus, UserMinus, Shield, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { USER_ROLES, ROLE_META, type UserRole } from '@/config/roleConfig';
import { syncAdminLevel } from '@/lib/adminLevelSync';
import { useUserRoles } from '@/context/UserRolesContext';

type AppRole = UserRole;

interface UserWithRoles {
  id: string;
  email: string;
  first_name?: string;
  last_name?: string;
  roles: AppRole[];
}

export const RoleManagement: React.FC = () => {
  const { user } = useAuth();
  const { isSuperAdmin } = useUserRoles();
  const { toast } = useToast();
  const [users, setUsers] = useState<UserWithRoles[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRole, setSelectedRole] = useState<AppRole | 'all'>('all');

  // Every role in the taxonomy is assignable — driven by roleConfig so new
  // cadres appear here automatically. Privileged roles stay superadmin-only.
  const availableRoles: AppRole[] = Object.values(USER_ROLES);
  const assignableRoles: AppRole[] = isSuperAdmin
    ? availableRoles
    : availableRoles.filter(r => r !== USER_ROLES.ADMIN && r !== USER_ROLES.SUPER_ADMIN);

  const CATEGORY_STYLES: Record<string, string> = {
    admin: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
    clinical: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
    nursing: 'bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-300',
    allied: 'bg-violet-100 text-violet-800 dark:bg-violet-900/30 dark:text-violet-300',
    community: 'bg-lime-100 text-lime-800 dark:bg-lime-900/30 dark:text-lime-300',
    patient: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
    pharmacy: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
    lab: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300',
    institution: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300',
  };

  const roleLabel = (role: string): string =>
    ROLE_META[role as AppRole]?.label || role.replace(/_/g, ' ');

  const roleColors = (role: string): string => {
    const category = ROLE_META[role as AppRole]?.category || 'clinical';
    return CATEGORY_STYLES[category] || CATEGORY_STYLES.clinical;
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);

      // Bounded: newest 200 users + their roles (roles scoped to those ids)
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, email, first_name, last_name')
        .order('created_at', { ascending: false })
        .limit(200);

      if (profilesError) throw profilesError;

      const ids = (profiles || []).map(p => p.id);
      const { data: userRoles, error: rolesError } = ids.length
        ? await supabase.from('user_roles').select('user_id, role').in('user_id', ids)
        : { data: [] as any[], error: null };

      if (rolesError) throw rolesError;

      // Combine data
      const usersWithRoles: UserWithRoles[] = (profiles || []).map(profile => ({
        id: profile.id,
        email: profile.email || '',
        first_name: profile.first_name || '',
        last_name: profile.last_name || '',
        roles: (userRoles || [])
          .filter(ur => ur.user_id === profile.id)
          .map(ur => ur.role as AppRole)
      }));

      setUsers(usersWithRoles);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const assignRole = async (userId: string, role: AppRole) => {
    // Privileged roles are a superadmin prerogative (RLS would 403 anyway)
    if ((role === USER_ROLES.ADMIN || role === USER_ROLES.SUPER_ADMIN) && !isSuperAdmin) {
      toast({
        title: 'Not permitted',
        description: 'Only super admins can assign admin roles',
        variant: 'destructive'
      });
      return;
    }
    try {
      const { error } = await supabase
        .from('user_roles')
        .insert({
          user_id: userId,
          role,
          granted_by: user?.id
        });

      if (error) throw error;

      // Keep legacy profiles.admin_level in sync (used by older UI/RLS paths)
      if (role === 'admin' || role === 'super_admin') {
        await syncAdminLevel(userId);
      }

      toast({
        title: 'Success',
        description: `Role ${role} assigned successfully`
      });

      fetchUsers();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to assign role',
        variant: 'destructive'
      });
    }
  };

  const revokeRole = async (userId: string, role: AppRole) => {
    // Privileged roles are a superadmin prerogative (RLS would 403 anyway)
    if ((role === USER_ROLES.ADMIN || role === USER_ROLES.SUPER_ADMIN) && !isSuperAdmin) {
      toast({
        title: 'Not permitted',
        description: 'Only super admins can revoke admin roles',
        variant: 'destructive'
      });
      return;
    }
    try {
      const { error } = await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', userId)
        .eq('role', role);

      if (error) throw error;

      // Keep legacy profiles.admin_level in sync (used by older UI/RLS paths)
      if (role === 'admin' || role === 'super_admin') {
        await syncAdminLevel(userId);
      }

      toast({
        title: 'Success',
        description: `Role ${role} revoked successfully`
      });

      fetchUsers();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to revoke role',
        variant: 'destructive'
      });
    }
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch =
      user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      `${user.first_name} ${user.last_name}`.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesRole = selectedRole === 'all' || user.roles.includes(selectedRole);

    return matchesSearch && matchesRole;
  });

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Loading...</CardTitle>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Role Management
              </CardTitle>
              <CardDescription>
                Manage user roles and permissions across the system
                <span className="block text-[11px] mt-1">Showing up to 200 most recent users — use search to find specific users.</span>
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Role changes take effect immediately. Be careful when assigning admin roles.
            </AlertDescription>
          </Alert>

          <div className="flex gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search users by email or name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={selectedRole} onValueChange={(value) => setSelectedRole(value as AppRole | 'all')}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filter by role" />
              </SelectTrigger>
              <SelectContent className="max-h-80">
                <SelectItem value="all">All Roles</SelectItem>
                {availableRoles.map(role => (
                  <SelectItem key={role} value={role}>
                    {roleLabel(role)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4">
        {filteredUsers.map(userData => (
          <Card key={userData.id}>
            <CardContent className="pt-6">
              <div className="flex items-start justify-between">
                <div className="space-y-2">
                  <div>
                    <h3 className="font-semibold">{userData.first_name} {userData.last_name}</h3>
                    <p className="text-sm text-muted-foreground">{userData.email}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {userData.roles.length > 0 ? (
                      userData.roles.map(role => (
                        <Badge key={role} className={roleColors(role)}>
                          {roleLabel(role)}
                          <button
                            onClick={() => revokeRole(userData.id, role)}
                            className="ml-2 hover:bg-white/20 rounded-full p-0.5"
                            title="Revoke role"
                          >
                            <UserMinus className="h-3 w-3" />
                          </button>
                        </Badge>
                      ))
                    ) : (
                      <span className="text-sm text-muted-foreground">No roles assigned</span>
                    )}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Select onValueChange={(role) => assignRole(userData.id, role as AppRole)}>
                    <SelectTrigger className="w-48">
                      <SelectValue placeholder="Assign role" />
                    </SelectTrigger>
                <SelectContent className="max-h-80">
                  {assignableRoles
                    .filter(role => !userData.roles.includes(role))
                    .map(role => (
                      <SelectItem key={role} value={role}>
                        <div className="flex items-center gap-2">
                          <UserPlus className="h-4 w-4" />
                          {roleLabel(role)}
                        </div>
                      </SelectItem>
                    ))}
                </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredUsers.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">No users found matching your criteria</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
