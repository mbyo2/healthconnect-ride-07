
import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Loader2, Save, ShieldCheck } from "lucide-react";
import { InsuranceProvider } from "@/types/healthcare";
import { Checkbox } from "@/components/ui/checkbox";

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

const InstitutionSettings = () => {
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [institution, setInstitution] = useState<any>(null);
    const [formData, setFormData] = useState({
        name: "",
        address: "",
        phone: "",
        email: "",
        currency: "ZMW",
        operating_hours: {} as any,
        accepted_insurance_providers: [] as string[]
    });

    useEffect(() => {
        fetchInstitution();
    }, [user]);

    const fetchInstitution = async () => {
        if (!user) return;
        try {
            const { data, error } = await supabase
                .from('healthcare_institutions')
                .select('*')
                .eq('admin_id', user.id)
                .single();

            if (error) throw error;
            setInstitution(data);

            // Initialize operating hours if empty
            const hours = data.operating_hours || {};
            DAYS.forEach(day => {
                if (!hours[day]) {
                    hours[day] = { open: "09:00", close: "17:00", closed: false };
                }
            });

            setFormData({
                name: data.name,
                address: data.address || "",
                phone: data.phone || "",
                email: data.email || "",
                currency: data.currency || "ZMW",
                operating_hours: hours,
                accepted_insurance_providers: data.accepted_insurance_providers || []
            });
        } catch (error) {
            console.error("Error fetching institution:", error);
            toast.error("Failed to load institution details");
        } finally {
            setLoading(false);
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        setFormData({ ...formData, [e.target.id]: e.target.value });
    };

    const handleHoursChange = (day: string, field: 'open' | 'close' | 'closed', value: any) => {
        setFormData(prev => ({
            ...prev,
            operating_hours: {
                ...prev.operating_hours,
                [day]: {
                    ...prev.operating_hours[day],
                    [field]: value
                }
            }
        }));
    };

    const handleInsuranceToggle = (provider: string) => {
        setFormData(prev => {
            const current = prev.accepted_insurance_providers || [];
            const updated = current.includes(provider)
                ? current.filter(p => p !== provider)
                : [...current, provider];
            return { ...prev, accepted_insurance_providers: updated };
        });
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        try {
            const { error } = await supabase
                .from('healthcare_institutions')
                .update({
                    name: formData.name,
                    address: formData.address,
                    phone: formData.phone,
                    email: formData.email,
                    currency: formData.currency,
                    operating_hours: formData.operating_hours,
                    accepted_insurance_providers: formData.accepted_insurance_providers
                })
                .eq('id', institution.id);

            if (error) throw error;
            toast.success("Settings saved successfully");
        } catch (error) {
            console.error("Error saving settings:", error);
            toast.error("Failed to save settings");
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div className="flex justify-center p-8"><Loader2 className="animate-spin" /></div>;

    return (
        <div className="container mx-auto p-6 max-w-4xl">
            <h1 className="text-3xl font-bold mb-6">Institution Settings</h1>

            <form onSubmit={handleSave} className="space-y-6">
                <Card>
                    <CardHeader>
                        <CardTitle>General Information</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="name">Institution Name</Label>
                                <Input id="name" value={formData.name} onChange={handleChange} required />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="phone">Phone</Label>
                                <Input id="phone" value={formData.phone} onChange={handleChange} required />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="email">Email</Label>
                                <Input id="email" type="email" value={formData.email} onChange={handleChange} required />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="currency">Preferred Currency</Label>
                                <select
                                    id="currency"
                                    value={formData.currency}
                                    onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                    <option value="ZMW">Zambian Kwacha (ZMW)</option>
                                    <option value="USD">US Dollar (USD)</option>
                                </select>
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="address">Address</Label>
                            <Textarea id="address" value={formData.address} onChange={handleChange} required />
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Operating Hours</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {DAYS.map(day => (
                                <div key={day} className="flex flex-col sm:flex-row sm:items-center gap-4 p-2 rounded-lg hover:bg-accent/50">
                                    <div className="w-24 font-medium">{day}</div>
                                    <div className="flex items-center gap-2">
                                        <Switch
                                            checked={!formData.operating_hours[day]?.closed}
                                            onCheckedChange={(checked) => handleHoursChange(day, 'closed', !checked)}
                                        />
                                        <span className="text-sm text-muted-foreground w-16">
                                            {formData.operating_hours[day]?.closed ? 'Closed' : 'Open'}
                                        </span>
                                    </div>
                                    {!formData.operating_hours[day]?.closed && (
                                        <div className="flex items-center gap-2">
                                            <Input
                                                type="time"
                                                value={formData.operating_hours[day]?.open || "09:00"}
                                                onChange={(e) => handleHoursChange(day, 'open', e.target.value)}
                                                className="w-32"
                                            />
                                            <span className="text-sm text-muted-foreground">to</span>
                                            <Input
                                                type="time"
                                                value={formData.operating_hours[day]?.close || "17:00"}
                                                onChange={(e) => handleHoursChange(day, 'close', e.target.value)}
                                                className="w-32"
                                            />
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>

                <Button type="submit" disabled={saving}>
                    {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                    Save Changes
                </Button>
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <ShieldCheck className="h-5 w-5 text-primary" />
                            Accepted Insurance Providers
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {Object.values(InsuranceProvider).filter(p => p !== InsuranceProvider.NONE).map((provider) => (
                                <div key={provider} className="flex items-center space-x-2 p-2 border rounded-md hover:bg-accent/50 transition-colors">
                                    <Checkbox
                                        id={`provider-${provider}`}
                                        checked={formData.accepted_insurance_providers.includes(provider)}
                                        onCheckedChange={() => handleInsuranceToggle(provider)}
                                    />
                                    <Label
                                        htmlFor={`provider-${provider}`}
                                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                                    >
                                        {provider}
                                    </Label>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            </form>
        </div>
    );
};

export default InstitutionSettings;
