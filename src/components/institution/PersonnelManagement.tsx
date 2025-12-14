
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Plus, Trash2, Search, Loader2 } from "lucide-react";

interface Personnel {
    id: string;
    user_id: string;
    role: string;
    status: string;
    profile?: {
        first_name: string;
        last_name: string;
        email: string;
    };
}

export const PersonnelManagement = ({ institutionId }: { institutionId: string }) => {
    const [personnel, setPersonnel] = useState<Personnel[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchEmail, setSearchEmail] = useState("");
    const [isAdding, setIsAdding] = useState(false);
    const [selectedRole, setSelectedRole] = useState("staff");

    const fetchPersonnel = async () => {
        try {
            const { data, error } = await supabase
                .from('institution_personnel')
                .select(`
          *,
          profile:profiles(first_name, last_name, email)
        `)
                .eq('institution_id', institutionId);

            if (error) throw error;
            setPersonnel(data as any || []);
        } catch (error) {
            console.error("Error fetching personnel:", error);
            toast.error("Failed to load personnel");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (institutionId) fetchPersonnel();
    }, [institutionId]);

    const handleAddPersonnel = async () => {
        if (!searchEmail) return;
        setIsAdding(true);

        try {
            // 1. Find user by email
            const { data: users, error: userError } = await supabase
                .from('profiles')
                .select('id')
                .eq('email', searchEmail)
                .single();

            if (userError || !users) {
                toast.error("User not found with this email");
                return;
            }

            // 2. Add to institution
            const { error: addError } = await supabase
                .from('institution_personnel')
                .insert({
                    institution_id: institutionId,
                    user_id: users.id,
                    role: selectedRole,
                    status: 'active'
                });

            if (addError) throw addError;

            toast.success("Personnel added successfully");
            setSearchEmail("");
            fetchPersonnel();
        } catch (error: any) {
            console.error("Error adding personnel:", error);
            toast.error(error.message || "Failed to add personnel");
        } finally {
            setIsAdding(false);
        }
    };

    const handleRemovePersonnel = async (id: string) => {
        try {
            const { error } = await supabase
                .from('institution_personnel')
                .delete()
                .eq('id', id);

            if (error) throw error;
            toast.success("Personnel removed");
            fetchPersonnel();
        } catch (error) {
            console.error("Error removing personnel:", error);
            toast.error("Failed to remove personnel");
        }
    };

    if (loading) return <Loader2 className="animate-spin" />;

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold">Personnel Management</h2>
                <Dialog>
                    <DialogTrigger asChild>
                        <Button>
                            <Plus className="mr-2 h-4 w-4" />
                            Add Personnel
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Add New Personnel</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Email Address</label>
                                <div className="flex gap-2">
                                    <Input
                                        placeholder="user@example.com"
                                        value={searchEmail}
                                        onChange={(e) => setSearchEmail(e.target.value)}
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Role</label>
                                <Select value={selectedRole} onValueChange={setSelectedRole}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="doctor">Doctor</SelectItem>
                                        <SelectItem value="nurse">Nurse</SelectItem>
                                        <SelectItem value="staff">Staff</SelectItem>
                                        <SelectItem value="admin">Admin</SelectItem>
                                        <SelectItem value="technician">Technician</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <Button onClick={handleAddPersonnel} disabled={isAdding} className="w-full">
                                {isAdding ? <Loader2 className="animate-spin mr-2" /> : null}
                                Add User
                            </Button>
                        </div>
                    </DialogContent>
                </Dialog>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Staff List</CardTitle>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Name</TableHead>
                                <TableHead>Email</TableHead>
                                <TableHead>Role</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {personnel.map((p) => (
                                <TableRow key={p.id}>
                                    <TableCell>
                                        {p.profile ? `${p.profile.first_name || ''} ${p.profile.last_name || ''}` : 'Unknown'}
                                    </TableCell>
                                    <TableCell>{p.profile?.email}</TableCell>
                                    <TableCell className="capitalize">{p.role}</TableCell>
                                    <TableCell className="capitalize">{p.status}</TableCell>
                                    <TableCell className="text-right">
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="text-destructive hover:text-destructive/90"
                                            onClick={() => handleRemovePersonnel(p.id)}
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                            {personnel.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                                        No personnel found. Add someone to get started.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
};
