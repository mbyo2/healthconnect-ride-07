import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChevronLeft, Loader2, ShieldCheck } from 'lucide-react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { useAuth } from '@/context/AuthContext';
import { useUserRoles } from '@/context/UserRolesContext';
import { supabase } from '@/integrations/supabase/client';

const CreateAdmin: React.FC = () => {
  const { isAuthenticated } = useAuth();
  const { isAdmin, isSuperAdmin } = useUserRoles();
  const [isCreating, setIsCreating] = useState(false);
  const [credentials, setCredentials] = useState<{ email: string; adminLevel: string } | null>(null);
  const [form, setForm] = useState({
    email: '',
    password: '',
    firstName: '',
    lastName: '',
    adminLevel: 'admin',
  });

  if (!isAuthenticated || !isAdmin) {
    return (
      <div className="container mx-auto p-4">
        <Card className="max-w-md mx-auto">
          <CardHeader>
            <CardTitle>Access Restricted</CardTitle>
            <CardDescription>Only administrators can create admin accounts.</CardDescription>
          </CardHeader>
          <CardFooter>
            <Link to="/"><Button variant="secondary"><ChevronLeft className="mr-2 h-4 w-4" />Return to Home</Button></Link>
          </CardFooter>
        </Card>
      </div>
    );
  }

  const handleCreate = async () => {
    if (!form.email || !form.password || !form.firstName || !form.lastName) {
      toast.error('All fields are required');
      return;
    }
    if (form.password.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }

    setIsCreating(true);
    try {
      const { data, error } = await supabase.functions.invoke('create-admin-user', {
        body: {
          email: form.email,
          password: form.password,
          firstName: form.firstName,
          lastName: form.lastName,
          adminLevel: form.adminLevel,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast.success(`${data.adminLevel === 'superadmin' ? 'Super Admin' : 'Admin'} created successfully`);
      setCredentials({ email: data.email, adminLevel: data.adminLevel });
      setForm({ email: '', password: '', firstName: '', lastName: '', adminLevel: 'admin' });
    } catch (err: any) {
      toast.error(err.message || 'Failed to create admin');
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="container mx-auto p-4 max-w-lg">
      <Link to="/admin-dashboard">
        <Button variant="ghost" className="mb-4"><ChevronLeft className="mr-2 h-4 w-4" />Back to Dashboard</Button>
      </Link>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" />
            Create Admin Account
          </CardTitle>
          <CardDescription>
            Create a new administrator account. {isSuperAdmin ? 'You can create admins and superadmins.' : 'You can create standard admins.'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {credentials ? (
            <div className="bg-muted p-4 rounded-md space-y-1">
              <h3 className="font-semibold text-sm">✅ Account Created</h3>
              <p className="text-sm"><span className="font-medium">Email:</span> {credentials.email}</p>
              <p className="text-sm"><span className="font-medium">Level:</span> {credentials.adminLevel}</p>
              <p className="text-xs text-muted-foreground mt-2">The user can now log in with the credentials you set.</p>
              <Button size="sm" variant="outline" className="mt-3" onClick={() => setCredentials(null)}>Create Another</Button>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>First Name</Label>
                  <Input value={form.firstName} onChange={e => setForm({ ...form, firstName: e.target.value })} />
                </div>
                <div className="space-y-1">
                  <Label>Last Name</Label>
                  <Input value={form.lastName} onChange={e => setForm({ ...form, lastName: e.target.value })} />
                </div>
              </div>
              <div className="space-y-1">
                <Label>Email</Label>
                <Input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label>Password</Label>
                <Input type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} placeholder="Min 8 characters" />
              </div>
              {isSuperAdmin && (
                <div className="space-y-1">
                  <Label>Admin Level</Label>
                  <Select value={form.adminLevel} onValueChange={v => setForm({ ...form, adminLevel: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="admin">Admin</SelectItem>
                      <SelectItem value="superadmin">Super Admin</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </>
          )}
        </CardContent>
        {!credentials && (
          <CardFooter>
            <Button className="w-full" onClick={handleCreate} disabled={isCreating}>
              {isCreating ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Creating...</> : 'Create Admin Account'}
            </Button>
          </CardFooter>
        )}
      </Card>
    </div>
  );
};

export default CreateAdmin;
