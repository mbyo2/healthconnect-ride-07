import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import {
  Plus, Loader2, Wifi, WifiOff, Activity, Heart,
  Thermometer, Microscope, MonitorSpeaker, Pill, AlertTriangle,
  RefreshCw, Settings, Zap, Radio
} from "lucide-react";

interface InstitutionDevice {
  id: string;
  device_name: string;
  device_type: string;
  manufacturer: string | null;
  model_number: string | null;
  serial_number: string | null;
  department_id: string | null;
  location_description: string | null;
  connection_protocol: string | null;
  ip_address: string | null;
  is_active: boolean;
  last_heartbeat: string | null;
  battery_level: number | null;
  firmware_version: string | null;
  status: string;
  created_at: string;
}

interface DeviceFeed {
  id: string;
  device_id: string;
  data_type: string;
  data_value: any;
  unit: string | null;
  is_critical: boolean;
  recorded_at: string;
  patient_id: string | null;
}

const DEVICE_TYPES = [
  { value: 'vital_monitor', label: 'Vital Signs Monitor', icon: Heart },
  { value: 'lab_analyzer', label: 'Lab Analyzer (LIS)', icon: Microscope },
  { value: 'imaging_machine', label: 'Imaging Machine (RIS/PACS)', icon: MonitorSpeaker },
  { value: 'pharmacy_dispenser', label: 'Pharmacy Dispenser', icon: Pill },
  { value: 'ecg_machine', label: 'ECG Machine', icon: Activity },
  { value: 'ventilator', label: 'Ventilator', icon: Zap },
  { value: 'infusion_pump', label: 'Infusion Pump', icon: Activity },
  { value: 'pulse_oximeter', label: 'Pulse Oximeter', icon: Heart },
  { value: 'blood_pressure_monitor', label: 'Blood Pressure Monitor', icon: Thermometer },
  { value: 'glucometer', label: 'Glucometer', icon: Activity },
  { value: 'defibrillator', label: 'Defibrillator', icon: Zap },
  { value: 'other', label: 'Other Device', icon: Settings },
];

const CONNECTION_PROTOCOLS = [
  { value: 'hl7', label: 'HL7 v2' },
  { value: 'fhir', label: 'FHIR R4' },
  { value: 'dicom', label: 'DICOM' },
  { value: 'astm', label: 'ASTM' },
  { value: 'api', label: 'REST API' },
  { value: 'mqtt', label: 'MQTT' },
  { value: 'bluetooth', label: 'Bluetooth' },
  { value: 'wifi', label: 'Wi-Fi Direct' },
];

const getStatusColor = (status: string) => {
  switch (status) {
    case 'online': return 'bg-green-500';
    case 'offline': return 'bg-muted-foreground';
    case 'error': return 'bg-destructive';
    case 'maintenance': return 'bg-amber-500';
    case 'calibrating': return 'bg-blue-500';
    default: return 'bg-muted-foreground';
  }
};

const getDeviceIcon = (type: string) => {
  const dt = DEVICE_TYPES.find(d => d.value === type);
  return dt ? dt.icon : Settings;
};

export const DeviceManagement = ({ institutionId }: { institutionId: string }) => {
  const [devices, setDevices] = useState<InstitutionDevice[]>([]);
  const [feeds, setFeeds] = useState<DeviceFeed[]>([]);
  const [departments, setDepartments] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("devices");

  // Add device form
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deviceName, setDeviceName] = useState("");
  const [deviceType, setDeviceType] = useState("vital_monitor");
  const [manufacturer, setManufacturer] = useState("");
  const [modelNumber, setModelNumber] = useState("");
  const [serialNumber, setSerialNumber] = useState("");
  const [deptId, setDeptId] = useState("");
  const [locationDesc, setLocationDesc] = useState("");
  const [protocol, setProtocol] = useState("api");
  const [ipAddress, setIpAddress] = useState("");
  const [isRegistering, setIsRegistering] = useState(false);

  useEffect(() => {
    if (institutionId) fetchAll();
  }, [institutionId]);

  // Subscribe to real-time device feeds
  useEffect(() => {
    if (!institutionId) return;
    const channel = supabase
      .channel('device-feeds')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'device_data_feeds',
          filter: `institution_id=eq.${institutionId}`,
        },
        (payload) => {
          const newFeed = payload.new as DeviceFeed;
          setFeeds(prev => [newFeed, ...prev].slice(0, 100));
          if (newFeed.is_critical) {
            toast.error(`⚠️ Critical alert from device: ${newFeed.data_type}`, { duration: 10000 });
          }
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [institutionId]);

  const fetchAll = async () => {
    setLoading(true);
    await Promise.all([fetchDevices(), fetchFeeds(), fetchDepartments()]);
    setLoading(false);
  };

  const fetchDevices = async () => {
    try {
      const { data, error } = await supabase
        .from('institution_devices')
        .select('*')
        .eq('institution_id', institutionId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setDevices((data as any) || []);
    } catch (error) {
      console.error("Error fetching devices:", error);
    }
  };

  const fetchFeeds = async () => {
    try {
      const { data, error } = await supabase
        .from('device_data_feeds')
        .select('*')
        .eq('institution_id', institutionId)
        .order('recorded_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      setFeeds((data as any) || []);
    } catch (error) {
      console.error("Error fetching feeds:", error);
    }
  };

  const fetchDepartments = async () => {
    try {
      const { data } = await supabase
        .from('hospital_departments')
        .select('id, name')
        .eq('hospital_id', institutionId)
        .eq('is_active', true);
      setDepartments(data || []);
    } catch {}
  };

  const handleRegisterDevice = async () => {
    if (!deviceName || !deviceType) return;
    setIsRegistering(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase
        .from('institution_devices')
        .insert({
          institution_id: institutionId,
          device_name: deviceName,
          device_type: deviceType,
          manufacturer: manufacturer || null,
          model_number: modelNumber || null,
          serial_number: serialNumber || null,
          department_id: deptId || null,
          location_description: locationDesc || null,
          connection_protocol: protocol,
          ip_address: ipAddress || null,
          registered_by: user?.id,
          status: 'offline',
          is_active: true,
        } as any);

      if (error) throw error;
      toast.success(`${deviceName} registered successfully`);
      setDialogOpen(false);
      resetForm();
      fetchDevices();
    } catch (error: any) {
      toast.error(error.message || "Failed to register device");
    } finally {
      setIsRegistering(false);
    }
  };

  const resetForm = () => {
    setDeviceName("");
    setDeviceType("vital_monitor");
    setManufacturer("");
    setModelNumber("");
    setSerialNumber("");
    setDeptId("");
    setLocationDesc("");
    setProtocol("api");
    setIpAddress("");
  };

  const handleToggleDevice = async (id: string, currentActive: boolean) => {
    try {
      const { error } = await supabase
        .from('institution_devices')
        .update({ is_active: !currentActive, status: !currentActive ? 'offline' : 'offline' } as any)
        .eq('id', id);

      if (error) throw error;
      toast.success(currentActive ? "Device deactivated" : "Device activated");
      fetchDevices();
    } catch (error) {
      toast.error("Failed to update device");
    }
  };

  const onlineDevices = devices.filter(d => d.status === 'online');
  const criticalFeeds = feeds.filter(f => f.is_critical);

  if (loading) {
    return <div className="flex justify-center p-8"><Loader2 className="animate-spin h-8 w-8 text-muted-foreground" /></div>;
  }

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card><CardContent className="p-4 text-center">
          <Radio className="h-5 w-5 mx-auto mb-1 text-primary" />
          <div className="text-2xl font-bold">{devices.length}</div>
          <div className="text-xs text-muted-foreground">Total Devices</div>
        </CardContent></Card>
        <Card><CardContent className="p-4 text-center">
          <Wifi className="h-5 w-5 mx-auto mb-1 text-green-500" />
          <div className="text-2xl font-bold">{onlineDevices.length}</div>
          <div className="text-xs text-muted-foreground">Online</div>
        </CardContent></Card>
        <Card><CardContent className="p-4 text-center">
          <Activity className="h-5 w-5 mx-auto mb-1 text-blue-500" />
          <div className="text-2xl font-bold">{feeds.length}</div>
          <div className="text-xs text-muted-foreground">Data Points</div>
        </CardContent></Card>
        <Card><CardContent className="p-4 text-center">
          <AlertTriangle className="h-5 w-5 mx-auto mb-1 text-destructive" />
          <div className="text-2xl font-bold">{criticalFeeds.length}</div>
          <div className="text-xs text-muted-foreground">Critical Alerts</div>
        </CardContent></Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="w-full grid grid-cols-2">
          <TabsTrigger value="devices">Connected Devices</TabsTrigger>
          <TabsTrigger value="feeds">Live Data Feed</TabsTrigger>
        </TabsList>

        {/* ─── Devices ─── */}
        <TabsContent value="devices" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Registered Devices</h3>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={fetchDevices}><RefreshCw className="h-4 w-4 mr-1" /> Refresh</Button>
              <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="sm"><Plus className="h-4 w-4 mr-1" /> Register Device</Button>
                </DialogTrigger>
                <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
                  <DialogHeader><DialogTitle>Register New Device</DialogTitle></DialogHeader>
                  <div className="space-y-3 py-2">
                    <div><Label>Device Name *</Label><Input placeholder="e.g. ICU Vital Monitor #1" value={deviceName} onChange={e => setDeviceName(e.target.value)} /></div>
                    <div><Label>Device Type *</Label>
                      <Select value={deviceType} onValueChange={setDeviceType}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>{DEVICE_TYPES.map(d => <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div><Label>Manufacturer</Label><Input placeholder="e.g. Philips" value={manufacturer} onChange={e => setManufacturer(e.target.value)} /></div>
                      <div><Label>Model</Label><Input placeholder="e.g. MX800" value={modelNumber} onChange={e => setModelNumber(e.target.value)} /></div>
                    </div>
                    <div><Label>Serial Number</Label><Input placeholder="Serial number" value={serialNumber} onChange={e => setSerialNumber(e.target.value)} /></div>
                    <div className="grid grid-cols-2 gap-3">
                      <div><Label>Protocol</Label>
                        <Select value={protocol} onValueChange={setProtocol}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>{CONNECTION_PROTOCOLS.map(p => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}</SelectContent>
                        </Select>
                      </div>
                      <div><Label>IP Address</Label><Input placeholder="192.168.1.x" value={ipAddress} onChange={e => setIpAddress(e.target.value)} /></div>
                    </div>
                    {departments.length > 0 && (
                      <div><Label>Department</Label>
                        <Select value={deptId} onValueChange={setDeptId}>
                          <SelectTrigger><SelectValue placeholder="Select department" /></SelectTrigger>
                          <SelectContent>{departments.map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}</SelectContent>
                        </Select>
                      </div>
                    )}
                    <div><Label>Location</Label><Input placeholder="e.g. ICU Room 3, Bed 2" value={locationDesc} onChange={e => setLocationDesc(e.target.value)} /></div>
                    <Button onClick={handleRegisterDevice} disabled={isRegistering || !deviceName} className="w-full">
                      {isRegistering && <Loader2 className="animate-spin mr-2 h-4 w-4" />} Register Device
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>

          <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            {devices.map(device => {
              const DeviceIcon = getDeviceIcon(device.device_type);
              const timeSinceHeartbeat = device.last_heartbeat
                ? Math.round((Date.now() - new Date(device.last_heartbeat).getTime()) / 60000)
                : null;

              return (
                <Card key={device.id} className="relative overflow-hidden">
                  <div className={`absolute top-0 left-0 w-1 h-full ${getStatusColor(device.status)}`} />
                  <CardContent className="p-4 pl-5">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <DeviceIcon className="h-5 w-5 text-muted-foreground" />
                        <div>
                          <h4 className="text-sm font-semibold">{device.device_name}</h4>
                          <p className="text-xs text-muted-foreground capitalize">{device.device_type.replace(/_/g, ' ')}</p>
                        </div>
                      </div>
                      <Badge variant={device.status === 'online' ? 'default' : 'secondary'} className="text-xs capitalize">
                        {device.status === 'online' ? <Wifi className="h-3 w-3 mr-1" /> : <WifiOff className="h-3 w-3 mr-1" />}
                        {device.status}
                      </Badge>
                    </div>

                    <div className="space-y-1 text-xs text-muted-foreground">
                      {device.manufacturer && <div>{device.manufacturer} {device.model_number}</div>}
                      {device.location_description && <div>📍 {device.location_description}</div>}
                      {device.connection_protocol && <div>Protocol: <span className="uppercase font-medium">{device.connection_protocol}</span></div>}
                      {device.battery_level != null && (
                        <div>🔋 {device.battery_level}%</div>
                      )}
                      {timeSinceHeartbeat != null && (
                        <div>Last signal: {timeSinceHeartbeat < 60 ? `${timeSinceHeartbeat}m ago` : `${Math.round(timeSinceHeartbeat / 60)}h ago`}</div>
                      )}
                    </div>

                    <div className="mt-3 flex gap-2">
                      <Button size="sm" variant="outline" className="flex-1 text-xs" onClick={() => handleToggleDevice(device.id, device.is_active)}>
                        {device.is_active ? 'Deactivate' : 'Activate'}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
            {devices.length === 0 && (
              <Card className="col-span-full">
                <CardContent className="py-12 text-center text-muted-foreground">
                  <Radio className="h-10 w-10 mx-auto mb-3 opacity-40" />
                  <p className="font-medium">No devices registered</p>
                  <p className="text-xs mt-1">Register medical devices to start receiving real-time data</p>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        {/* ─── Live Feeds ─── */}
        <TabsContent value="feeds" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg">Live Data Feed</CardTitle>
                  <CardDescription>Real-time readings from connected devices</CardDescription>
                </div>
                <Button size="sm" variant="outline" onClick={fetchFeeds}><RefreshCw className="h-4 w-4 mr-1" /> Refresh</Button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {feeds.length > 0 ? (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Time</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Value</TableHead>
                        <TableHead>Unit</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {feeds.map(feed => (
                        <TableRow key={feed.id} className={feed.is_critical ? 'bg-destructive/5' : ''}>
                          <TableCell className="text-xs">{new Date(feed.recorded_at).toLocaleTimeString()}</TableCell>
                          <TableCell className="text-sm capitalize">{feed.data_type.replace(/_/g, ' ')}</TableCell>
                          <TableCell className="text-sm font-mono">
                            {typeof feed.data_value === 'object' ? JSON.stringify(feed.data_value) : String(feed.data_value)}
                          </TableCell>
                          <TableCell className="text-xs">{feed.unit || '—'}</TableCell>
                          <TableCell>
                            {feed.is_critical ? (
                              <Badge variant="destructive" className="text-xs"><AlertTriangle className="h-3 w-3 mr-1" /> Critical</Badge>
                            ) : (
                              <Badge variant="secondary" className="text-xs">Normal</Badge>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="py-12 text-center text-muted-foreground">
                  <Activity className="h-10 w-10 mx-auto mb-3 opacity-40" />
                  <p className="font-medium">No data feeds yet</p>
                  <p className="text-xs mt-1">Data will appear here when connected devices start sending readings</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
