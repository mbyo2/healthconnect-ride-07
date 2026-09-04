import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import {
  Building2, Network, Plus, Settings, Users, DollarSign,
  TrendingUp, Globe, MapPin, Phone, Mail, CheckCircle, XCircle,
  Clock, AlertTriangle, ArrowRight, Edit, Trash2, Eye
} from "lucide-react";
import { LoadingScreen } from "@/components/LoadingScreen";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";

interface InstitutionNetwork {
  id: string;
  network_name: string;
  network_type: string;
  headquarters_id?: string;
  shared_services: any;
  centralized_pricing: boolean;
  centralized_inventory: boolean;
  cross_billing_enabled: boolean;
  created_at: string;
}

interface NetworkMember {
  id: string;
  network_id: string;
  institution_id: string;
  member_type: string;
  billing_code?: string;
  commission_rate: number;
  is_active: boolean;
  joined_at: string;
  institution?: {
    id: string;
    name: string;
    type: string;
    city: string;
    country: string;
    is_verified: boolean;
  };
}

interface Country {
  id: string;
  code: string;
  name: string;
  currency_code: string;
  currency_symbol: string;
  phone_prefix: string;
  tax_rate: number;
  is_active: boolean;
}

export const MultiCenterManagement = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [networks, setNetworks] = useState<InstitutionNetwork[]>([]);
  const [members, setMembers] = useState<NetworkMember[]>([]);
  const [countries, setCountries] = useState<Country[]>([]);
  const [selectedNetwork, setSelectedNetwork] = useState<InstitutionNetwork | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showMemberDialog, setShowMemberDialog] = useState(false);

  // Form states
  const [networkForm, setNetworkForm] = useState({
    network_name: "",
    network_type: "hospital_chain",
    centralized_pricing: false,
    centralized_inventory: false,
    cross_billing_enabled: false,
  });

  const [memberForm, setMemberForm] = useState({
    network_id: "",
    institution_id: "",
    member_type: "branch",
    billing_code: "",
    commission_rate: 0,
  });

  useEffect(() => {
    fetchMultiCenterData();
  }, []);

  const fetchMultiCenterData = async () => {
    try {
      const [networksRes, membersRes, countriesRes] = await Promise.all([
        supabase.from("institution_networks").select("*").order("created_at", { ascending: false }),
        supabase.from("institution_network_members").select(`
          *,
          institution:healthcare_institutions(id, name, type, city, country, is_verified)
        `).order("joined_at", { ascending: false }),
        supabase.from("countries").select("*").eq("is_active", true).order("name"),
      ]);

      if (networksRes.data) setNetworks(networksRes.data);
      if (membersRes.data) setMembers(membersRes.data);
      if (countriesRes.data) setCountries(countriesRes.data);
    } catch (error) {
      console.error("Error fetching multi-center data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateNetwork = async () => {
    try {
      const { error } = await supabase.from("institution_networks").insert({
        network_name: networkForm.network_name,
        network_type: networkForm.network_type,
        shared_services: {},
        centralized_pricing: networkForm.centralized_pricing,
        centralized_inventory: networkForm.centralized_inventory,
        cross_billing_enabled: networkForm.cross_billing_enabled,
      });

      if (error) throw error;
      setShowCreateDialog(false);
      fetchMultiCenterData();
    } catch (error) {
      console.error("Error creating network:", error);
    }
  };

  const handleAddMember = async () => {
    try {
      const { error } = await supabase.from("institution_network_members").insert({
        network_id: memberForm.network_id,
        institution_id: memberForm.institution_id,
        member_type: memberForm.member_type,
        billing_code: memberForm.billing_code,
        commission_rate: memberForm.commission_rate,
      });

      if (error) throw error;
      setShowMemberDialog(false);
      fetchMultiCenterData();
    } catch (error) {
      console.error("Error adding member:", error);
    }
  };

  const networkTypeLabels: Record<string, string> = {
    hospital_chain: "Hospital Chain",
    clinic_network: "Clinic Network",
    integrated_system: "Integrated System",
  };

  const memberTypeLabels: Record<string, string> = {
    headquarters: "Headquarters",
    branch: "Branch",
    affiliate: "Affiliate",
    partner: "Partner",
  };

  if (loading) return <LoadingScreen />;

  return (
    <div className="min-h-screen bg-[#f5f6f8] dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans pb-16">
      {/* Header */}
      <div className="bg-white dark:bg-slate-900 border-b border-[#e6e9ef] dark:border-slate-800 px-4 sm:px-6 py-4 sticky top-0 z-30 shadow-xs">
        <div className="max-w-[1600px] mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-[#0073ea] text-white flex items-center justify-center shadow-xs">
              <Network className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xl font-extrabold">Multi-Center Management</h1>
              <p className="text-xs text-[#676879] font-medium">Network Administration & Cross-Institution Operations</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
              <DialogTrigger asChild>
                <Button className="bg-[#0073ea] hover:bg-[#0056b3] text-white font-bold text-xs flex items-center gap-2">
                  <Plus className="h-4 w-4" /> Create Network
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                  <DialogTitle className="text-lg font-extrabold">Create New Network</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div>
                    <Label className="text-xs font-bold">Network Name</Label>
                    <Input
                      value={networkForm.network_name}
                      onChange={(e) => setNetworkForm({ ...networkForm, network_name: e.target.value })}
                      placeholder="e.g., Regional Health Network"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-xs font-bold">Network Type</Label>
                    <Select value={networkForm.network_type} onValueChange={(value) => setNetworkForm({ ...networkForm, network_type: value })}>
                      <SelectTrigger className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="hospital_chain">Hospital Chain</SelectItem>
                        <SelectItem value="clinic_network">Clinic Network</SelectItem>
                        <SelectItem value="integrated_system">Integrated System</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-bold">Centralized Pricing</Label>
                      <Switch
                        checked={networkForm.centralized_pricing}
                        onCheckedChange={(checked) => setNetworkForm({ ...networkForm, centralized_pricing: checked })}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-bold">Centralized Inventory</Label>
                      <Switch
                        checked={networkForm.centralized_inventory}
                        onCheckedChange={(checked) => setNetworkForm({ ...networkForm, centralized_inventory: checked })}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-bold">Cross-Billing Enabled</Label>
                      <Switch
                        checked={networkForm.cross_billing_enabled}
                        onCheckedChange={(checked) => setNetworkForm({ ...networkForm, cross_billing_enabled: checked })}
                      />
                    </div>
                  </div>
                  <Button onClick={handleCreateNetwork} className="w-full bg-[#0073ea] hover:bg-[#0056b3] text-white font-bold">
                    Create Network
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </div>

      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 pt-6">
        <Tabs defaultValue="networks" className="space-y-6">
          <TabsList className="bg-white dark:bg-slate-900 border border-[#e6e9ef] dark:border-slate-800 p-1">
            <TabsTrigger value="networks" className="data-[state=active]:bg-[#0073ea] data-[state=active]:text-white">
              <Network className="h-4 w-4 mr-2" /> Networks
            </TabsTrigger>
            <TabsTrigger value="members" className="data-[state=active]:bg-[#0073ea] data-[state=active]:text-white">
              <Users className="h-4 w-4 mr-2" /> Members
            </TabsTrigger>
            <TabsTrigger value="countries" className="data-[state=active]:bg-[#0073ea] data-[state=active]:text-white">
              <Globe className="h-4 w-4 mr-2" /> Countries
            </TabsTrigger>
            <TabsTrigger value="billing" className="data-[state=active]:bg-[#0073ea] data-[state=active]:text-white">
              <DollarSign className="h-4 w-4 mr-2" /> Cross-Billing
            </TabsTrigger>
          </TabsList>

          {/* Networks Tab */}
          <TabsContent value="networks" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {networks.map((network) => (
                <Card key={network.id} className="border-[#e6e9ef] dark:border-slate-800 shadow-xs hover:shadow-md transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-xl bg-[#0073ea] text-white flex items-center justify-center">
                          <Building2 className="h-5 w-5" />
                        </div>
                        <div>
                          <CardTitle className="text-sm font-extrabold">{network.network_name}</CardTitle>
                          <Badge variant="outline" className="text-[10px] mt-1">
                            {networkTypeLabels[network.network_type] || network.network_type}
                          </Badge>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedNetwork(network)}
                        className="h-8 w-8 p-0"
                      >
                        <Settings className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-[#676879]">Institutions</span>
                      <span className="font-bold">
                        {members.filter((m) => m.network_id === network.id).length}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-xs">
                      {network.centralized_pricing && (
                        <Badge className="bg-[#00c875] text-white">Central Pricing</Badge>
                      )}
                      {network.centralized_inventory && (
                        <Badge className="bg-[#a25ddc] text-white">Central Inventory</Badge>
                      )}
                      {network.cross_billing_enabled && (
                        <Badge className="bg-[#fdab3d] text-white">Cross-Billing</Badge>
                      )}
                    </div>
                    <div className="pt-2 border-t border-[#e6e9ef] dark:border-slate-800">
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full text-xs font-bold"
                        onClick={() => {
                          setSelectedNetwork(network);
                          setShowMemberDialog(true);
                        }}
                      >
                        <Plus className="h-3 w-3 mr-1" /> Add Institution
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Members Tab */}
          <TabsContent value="members" className="space-y-4">
            <div className="rounded-2xl border border-[#e6e9ef] dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
              <table className="w-full">
                <thead className="bg-[#f0f2f7] dark:bg-slate-800">
                  <tr>
                    <th className="text-left text-xs font-extrabold px-4 py-3">Institution</th>
                    <th className="text-left text-xs font-extrabold px-4 py-3">Network</th>
                    <th className="text-left text-xs font-extrabold px-4 py-3">Role</th>
                    <th className="text-left text-xs font-extrabold px-4 py-3">Commission</th>
                    <th className="text-left text-xs font-extrabold px-4 py-3">Status</th>
                    <th className="text-left text-xs font-extrabold px-4 py-3">Joined</th>
                    <th className="text-left text-xs font-extrabold px-4 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {members.map((member) => (
                    <tr key={member.id} className="border-t border-[#e6e9ef] dark:border-slate-800 hover:bg-[#f8f9fa] dark:hover:bg-slate-800">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-lg bg-[#0073ea] text-white flex items-center justify-center">
                            <Building2 className="h-4 w-4" />
                          </div>
                          <div>
                            <div className="text-xs font-bold">{member.institution?.name}</div>
                            <div className="text-[10px] text-[#676879]">{member.institution?.type}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs">
                        {networks.find((n) => n.id === member.network_id)?.network_name}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant="outline" className="text-[10px]">
                          {memberTypeLabels[member.member_type] || member.member_type}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-xs font-bold">{member.commission_rate}%</td>
                      <td className="px-4 py-3">
                        {member.is_active ? (
                          <Badge className="bg-[#00c875] text-white text-[10px]">Active</Badge>
                        ) : (
                          <Badge className="bg-[#e44258] text-white text-[10px]">Inactive</Badge>
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs text-[#676879]">
                        {new Date(member.joined_at).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                            <Eye className="h-3 w-3" />
                          </Button>
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                            <Edit className="h-3 w-3" />
                          </Button>
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-red-500">
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </TabsContent>

          {/* Countries Tab */}
          <TabsContent value="countries" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {countries.map((country) => (
                <Card key={country.id} className="border-[#e6e9ef] dark:border-slate-800 shadow-xs">
                  <CardHeader className="pb-3">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-xl bg-[#0073ea] text-white flex items-center justify-center">
                        <Globe className="h-5 w-5" />
                      </div>
                      <div>
                        <CardTitle className="text-sm font-extrabold">{country.name}</CardTitle>
                        <div className="text-[10px] text-[#676879]">{country.code}</div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-[#676879]">Currency</span>
                      <span className="font-bold">{country.currency_code} ({country.currency_symbol})</span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-[#676879]">Tax Rate</span>
                      <span className="font-bold">{(country.tax_rate * 100).toFixed(0)}%</span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-[#676879]">Phone Prefix</span>
                      <span className="font-bold">{country.phone_prefix}</span>
                    </div>
                    <div className="pt-2 border-t border-[#e6e9ef] dark:border-slate-800">
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full text-xs font-bold"
                        onClick={() => navigate(`/country-settings/${country.id}`)}
                      >
                        <Settings className="h-3 w-3 mr-1" /> Configure
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Cross-Billing Tab */}
          <TabsContent value="billing" className="space-y-4">
            <Card className="border-[#e6e9ef] dark:border-slate-800 shadow-xs">
              <CardHeader>
                <CardTitle className="text-sm font-extrabold flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-[#0073ea]" /> Cross-Institution Billing
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="rounded-xl bg-[#f0f2f7] dark:bg-slate-800 p-4">
                  <h4 className="text-xs font-extrabold mb-3">Active Cross-Billing Networks</h4>
                  <div className="space-y-2">
                    {networks.filter((n) => n.cross_billing_enabled).map((network) => (
                      <div key={network.id} className="flex items-center justify-between p-3 bg-white dark:bg-slate-900 rounded-lg">
                        <div className="flex items-center gap-3">
                          <CheckCircle className="h-4 w-4 text-[#00c875]" />
                          <div>
                            <div className="text-xs font-bold">{network.network_name}</div>
                            <div className="text-[10px] text-[#676879]">
                              {members.filter((m) => m.network_id === network.id).length} institutions
                            </div>
                          </div>
                        </div>
                        <Button variant="outline" size="sm" className="text-xs">
                          Configure
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-xl bg-[#f0f2f7] dark:bg-slate-800 p-4">
                  <h4 className="text-xs font-extrabold mb-3">Billing Rules</h4>
                  <div className="space-y-2 text-xs">
                    <div className="flex items-center gap-2 text-[#676879]">
                      <ArrowRight className="h-3 w-3" />
                      <span>Commission rates apply per network member</span>
                    </div>
                    <div className="flex items-center gap-2 text-[#676879]">
                      <ArrowRight className="h-3 w-3" />
                      <span>Cross-currency conversion handled automatically</span>
                    </div>
                    <div className="flex items-center gap-2 text-[#676879]">
                      <ArrowRight className="h-3 w-3" />
                      <span>Tax compliance per country regulations</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Add Member Dialog */}
      <Dialog open={showMemberDialog} onOpenChange={setShowMemberDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="text-lg font-extrabold">Add Institution to Network</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label className="text-xs font-bold">Network</Label>
              <Select
                value={memberForm.network_id}
                onValueChange={(value) => setMemberForm({ ...memberForm, network_id: value })}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select network" />
                </SelectTrigger>
                <SelectContent>
                  {networks.map((network) => (
                    <SelectItem key={network.id} value={network.id}>
                      {network.network_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs font-bold">Institution</Label>
              <Select
                value={memberForm.institution_id}
                onValueChange={(value) => setMemberForm({ ...memberForm, institution_id: value })}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select institution" />
                </SelectTrigger>
                <SelectContent>
                  {/* This would be populated with available institutions */}
                  <SelectItem value="placeholder">Select institution</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs font-bold">Member Type</Label>
              <Select
                value={memberForm.member_type}
                onValueChange={(value) => setMemberForm({ ...memberForm, member_type: value })}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="headquarters">Headquarters</SelectItem>
                  <SelectItem value="branch">Branch</SelectItem>
                  <SelectItem value="affiliate">Affiliate</SelectItem>
                  <SelectItem value="partner">Partner</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs font-bold">Billing Code (Optional)</Label>
              <Input
                value={memberForm.billing_code}
                onChange={(e) => setMemberForm({ ...memberForm, billing_code: e.target.value })}
                placeholder="e.g., HQ-001"
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-xs font-bold">Commission Rate (%)</Label>
              <Input
                type="number"
                value={memberForm.commission_rate}
                onChange={(e) => setMemberForm({ ...memberForm, commission_rate: parseFloat(e.target.value) })}
                placeholder="0"
                className="mt-1"
              />
            </div>
            <Button onClick={handleAddMember} className="w-full bg-[#0073ea] hover:bg-[#0056b3] text-white font-bold">
              Add Institution
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MultiCenterManagement;