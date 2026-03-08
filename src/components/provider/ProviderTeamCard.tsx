import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useProviderTeam, useInviteTeamMember, useRemoveTeamMember } from "@/hooks/useProviderTeam";
import { useSpecialtyStaffRoles } from "@/hooks/useClinicSpecialties";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Users, Trash2, Loader2, Mail, CheckCircle, Clock } from "lucide-react";

interface ProviderTeamCardProps {
  specialtyIds?: string[];
}

export const ProviderTeamCard = ({ specialtyIds = [] }: ProviderTeamCardProps) => {
  const { data: team, isLoading } = useProviderTeam();
  const { data: roles } = useSpecialtyStaffRoles(specialtyIds);
  const invite = useInviteTeamMember();
  const remove = useRemoveTeamMember();
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [roleTitle, setRoleTitle] = useState("");
  const [roleId, setRoleId] = useState<string>();

  const handleInvite = async () => {
    if (!email || !roleTitle) return;
    await invite.mutateAsync({ email, role_title: roleTitle, specialty_role_id: roleId });
    setOpen(false);
    setEmail("");
    setRoleTitle("");
    setRoleId(undefined);
  };

  const statusIcon = (status: string) => {
    switch (status) {
      case 'active': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'invited': return <Clock className="h-4 w-4 text-yellow-500" />;
      default: return null;
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="flex items-center gap-2"><Users className="h-5 w-5" /> My Team</CardTitle>
          <CardDescription>Manage your practice team members</CardDescription>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm"><Plus className="h-4 w-4 mr-1" /> Add Member</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Invite Team Member</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Email</Label>
                <Input type="email" placeholder="team@example.com" value={email} onChange={e => setEmail(e.target.value)} />
              </div>
              {roles && roles.length > 0 ? (
                <div>
                  <Label>Specialty Role</Label>
                  <Select value={roleId} onValueChange={v => { setRoleId(v); const r = roles.find(r => r.id === v); if (r) setRoleTitle(r.role_name); }}>
                    <SelectTrigger><SelectValue placeholder="Select role" /></SelectTrigger>
                    <SelectContent>
                      {roles.map(r => (
                        <SelectItem key={r.id} value={r.id}>{r.role_name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ) : (
                <div>
                  <Label>Role Title</Label>
                  <Input placeholder="e.g. Dental Assistant" value={roleTitle} onChange={e => setRoleTitle(e.target.value)} />
                </div>
              )}
              <Button onClick={handleInvite} disabled={invite.isPending} className="w-full">
                {invite.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Mail className="h-4 w-4 mr-2" />}
                Send Invite
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
        ) : !team?.length ? (
          <p className="text-center text-muted-foreground py-6">No team members yet. Invite your first team member to get started.</p>
        ) : (
          <div className="space-y-3">
            {team.map(m => (
              <div key={m.id} className="flex items-center justify-between p-3 rounded-lg border">
                <div className="flex items-center gap-3">
                  {statusIcon(m.status)}
                  <div>
                    <p className="text-sm font-medium">{m.member_email}</p>
                    <p className="text-xs text-muted-foreground">{m.role_title}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={m.status === 'active' ? 'default' : 'outline'} className="text-xs capitalize">{m.status}</Badge>
                  <Button variant="ghost" size="icon" onClick={() => remove.mutate(m.id)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
