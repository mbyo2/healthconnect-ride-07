import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { DataTable } from '@/components/ui/data-table';
import { ColumnDef } from '@tanstack/react-table';
import { toast } from 'sonner';
import { Search, UserCog, Shield, Users } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';

type UserRole = 'patient' | 'health_personnel' | 'admin' | 'institution_admin';

interface UserWithRoles {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  created_at: string;
  roles: UserRole[];
  is_profile_complete: boolean;
}

export function UserManagement() {
  const [users, setUsers] = useState<UserWithRoles[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUser, setSelectedUser] = useState<UserWithRoles | null>(null);
  const [isRoleDialogOpen, setIsRoleDialogOpen] = useState(false);
  const [selectedRole, setSelectedRole] = useState<UserRole>('patient');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setIsLoading(true);
      
      // Fetch all profiles
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (profilesError) throw profilesError;

      // Fetch roles for each user
      const usersWithRoles: UserWithRoles[] = await Promise.all(
        (profilesData || []).map(async (profile) => {
          const { data: rolesData } = await supabase
            .from('user_roles')
            .select('role')
            .eq('user_id', profile.id);

          return {
            id: profile.id,
            email: profile.email || '',
            first_name: profile.first_name,
            last_name: profile.last_name,
            created_at: profile.created_at,
            roles: rolesData?.map(r => r.role as UserRole) || [],
            is_profile_complete: profile.is_profile_complete || false,
          };
        })
      );

      setUsers(usersWithRoles);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast.error('Failed to load users');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAssignRole = async () => {
    if (!selectedUser) return;

    try {
      setIsSubmitting(true);

      // Check if role already exists
      if (selectedUser.roles.includes(selectedRole)) {
        toast.error('User already has this role');
        return;
      }

      // Insert new role
      const { error } = await supabase
        .from('user_roles')
        .insert({
          user_id: selectedUser.id,
          role: selectedRole,
          granted_by: (await supabase.auth.getUser()).data.user?.id,
        });

      if (error) throw error;

      toast.success(`Role "${selectedRole}" assigned successfully`);
      setIsRoleDialogOpen(false);
      fetchUsers();
    } catch (error: any) {
      console.error('Error assigning role:', error);
      toast.error(error.message || 'Failed to assign role');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRevokeRole = async (userId: string, role: UserRole) => {
    try {
      const { error } = await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', userId)
        .eq('role', role);

      if (error) throw error;

      toast.success(`Role "${role}" revoked successfully`);
      fetchUsers();
    } catch (error: any) {
      console.error('Error revoking role:', error);
      toast.error(error.message || 'Failed to revoke role');
    }
  };

  const filteredUsers = users.filter(
    (user) =>
      user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.first_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.last_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const columns: ColumnDef<UserWithRoles>[] = [
    {
      accessorKey: 'email',
      header: 'Email',
    },
    {
      accessorKey: 'first_name',
      header: 'Name',
      cell: ({ row }) => {
        const user = row.original;
        return user.first_name && user.last_name
          ? `${user.first_name} ${user.last_name}`
          : 'Not set';
      },
    },
    {
      accessorKey: 'roles',
      header: 'Roles',
      cell: ({ row }) => {
        const user = row.original;
        return (
          <div className="flex gap-1 flex-wrap">
            {user.roles.length > 0 ? (
              user.roles.map((role) => (
                <Badge
                  key={role}
                  variant="outline"
                  className="cursor-pointer hover:bg-destructive hover:text-destructive-foreground"
                  onClick={() => {
                    if (window.confirm(`Revoke role "${role}" from this user?`)) {
                      handleRevokeRole(user.id, role);
                    }
                  }}
                >
                  {role} ×
                </Badge>
              ))
            ) : (
              <span className="text-muted-foreground text-sm">No roles</span>
            )}
          </div>
        );
      },
    },
    {
      accessorKey: 'created_at',
      header: 'Joined',
      cell: ({ row }) => {
        return new Date(row.getValue('created_at')).toLocaleDateString();
      },
    },
    {
      id: 'actions',
      cell: ({ row }) => {
        const user = row.original;
        return (
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setSelectedUser(user);
              setIsRoleDialogOpen(true);
            }}
          >
            <UserCog className="h-4 w-4 mr-2" />
            Assign Role
          </Button>
        );
      },
    },
  ];

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                User Management
              </CardTitle>
              <CardDescription>
                Manage user accounts and role assignments
              </CardDescription>
            </div>
            <Badge variant="secondary" className="text-lg px-4 py-2">
              {users.length} Users
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search users by email or name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          <DataTable columns={columns} data={filteredUsers} />
        </CardContent>
      </Card>

      <Dialog open={isRoleDialogOpen} onOpenChange={setIsRoleDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Assign Role
            </DialogTitle>
            <DialogDescription>
              Assign a new role to {selectedUser?.email}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Current Roles</Label>
              <div className="flex gap-2 flex-wrap">
                {selectedUser?.roles.map((role) => (
                  <Badge key={role} variant="secondary">
                    {role}
                  </Badge>
                ))}
                {selectedUser?.roles.length === 0 && (
                  <span className="text-sm text-muted-foreground">No roles assigned</span>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="role">Select Role to Assign</Label>
              <Select value={selectedRole} onValueChange={(value: UserRole) => setSelectedRole(value)}>
                <SelectTrigger id="role">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="patient">Patient</SelectItem>
                  <SelectItem value="health_personnel">Health Personnel</SelectItem>
                  <SelectItem value="institution_admin">Institution Admin</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsRoleDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAssignRole} disabled={isSubmitting}>
              {isSubmitting ? 'Assigning...' : 'Assign Role'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
