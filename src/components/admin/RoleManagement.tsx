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

type AppRole = 'admin' | 'health_personnel' | 'patient' | 'pharmacy' | 'institution_admin' | 'institution_staff';

interface UserWithRoles {
  id: string;
  email: string;
  first_name?: string;
  last_name?: string;
  roles: AppRole[];
}

export const RoleManagement: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [users, setUsers] = useState<UserWithRoles[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRole, setSelectedRole] = useState<AppRole | 'all'>('all');

  const availableRoles: AppRole[] = [
    'admin',
    'health_personnel',
    'patient',
    'pharmacy',
    'institution_admin',
    'institution_staff'
  ];

  const roleColors: Record<AppRole, string> = {
    admin: 'bg-red-500',
    health_personnel: 'bg-blue-500',
    patient: 'bg-green-500',
    pharmacy: 'bg-purple-500',
    institution_admin: 'bg-orange-500',
    institution_staff: 'bg-cyan-500'
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      
      // Fetch all profiles
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, email, first_name, last_name')
        .order('email');

      if (profilesError) throw profilesError;

      // Fetch all user roles
      const { data: userRoles, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id, role');

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
    try {
      const { error } = await supabase
        .from('user_roles')
        .insert({
          user_id: userId,
          role,
          granted_by: user?.id
        });

      if (error) throw error;

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
    try {
      const { error } = await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', userId)
        .eq('role', role);

      if (error) throw error;

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
              <SelectContent>
                <SelectItem value="all">All Roles</SelectItem>
                {availableRoles.map(role => (
                  <SelectItem key={role} value={role}>
                    {role.replace('_', ' ').toUpperCase()}
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
                        <Badge key={role} className={roleColors[role]}>
                          {role.replace('_', ' ')}
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
                    <SelectContent>
                      {availableRoles
                        .filter(role => !userData.roles.includes(role))
                        .map(role => (
                          <SelectItem key={role} value={role}>
                            <div className="flex items-center gap-2">
                              <UserPlus className="h-4 w-4" />
                              {role.replace('_', ' ').toUpperCase()}
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
