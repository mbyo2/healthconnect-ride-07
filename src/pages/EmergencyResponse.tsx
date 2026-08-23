import { useState, useEffect } from "react";
import { AlertTriangle, Phone, MapPin, User, FileText, Navigation, Clock, Shield, Flame, Activity } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

const EmergencyResponse = () => {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [locationSharing, setLocationSharing] = useState(false);
  const [emergencyContacts, setEmergencyContacts] = useState<any[]>([]);
  const [nearbyHospitals, setNearbyHospitals] = useState<any[]>([]);
  const [medicalInfo, setMedicalInfo] = useState({
    bloodType: profile?.blood_type || "Unknown",
    allergies: profile?.allergies || [],
    conditions: profile?.medical_conditions || [],
    medications: profile?.current_medications || [],
  });

  useEffect(() => {
    if (user) {
      fetchEmergencyContacts();
      fetchNearbyHospitals();
    }
  }, [user]);

  const fetchEmergencyContacts = async () => {
    try {
      const { data, error } = await supabase
        .from("emergency_contacts" as any)
        .select("*")
        .eq("patient_id", user?.id)
        .order("is_primary", { ascending: false });

      if (error) throw error;
      setEmergencyContacts((data as any[]) || []);
    } catch (error) {
      console.error("Error fetching emergency contacts:", error);
    }
  };

  const fetchNearbyHospitals = async () => {
    try {
      const { data, error } = await supabase
        .from("healthcare_institutions")
        .select("*")
        .eq("type", "hospital")
        .limit(3);

      if (error) throw error;
      setNearbyHospitals((data || []).map((h) => ({
        id: h.id,
        name: h.name,
        address: h.address,
        phone: h.phone,
        distance: "Nearby",
        time: "Calculating...",
        emergency: true,
      })));
    } catch (error) {
      console.error("Error fetching nearby hospitals:", error);
    }
  };

  const getCurrentPosition = () => new Promise<GeolocationPosition>((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("Location is not available on this device."));
      return;
    }
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: true,
      timeout: 10_000,
      maximumAge: 60_000,
    });
  });

  const handleEmergencyCall = async () => {
    if (!user) return;

    let latitude: number | null = null;
    let longitude: number | null = null;
    try {
      const position = await getCurrentPosition();
      latitude = position.coords.latitude;
      longitude = position.coords.longitude;
    } catch {
      toast.info("Location was unavailable. Your call will continue without it.");
    }

    const { error } = await supabase.from("emergency_events" as any).insert({
      patient_id: user.id,
      latitude,
      longitude,
      message: "Emergency call initiated from HealthConnect Ride.",
      status: "active",
    });
    if (error) {
      console.error("Unable to record emergency event:", error);
      toast.error("We could not save the emergency event, but you can still place the call.");
    }

    const phoneNumber = (import.meta.env.VITE_EMERGENCY_NUMBER || "112").replace(/[^\d+]/g, "");
    window.location.assign(`tel:${phoneNumber}`);
  };

  const handleShareLocation = async () => {
    if (locationSharing) {
      setLocationSharing(false);
      toast.success("Location sharing stopped.");
      return;
    }

    try {
      await getCurrentPosition();
      setLocationSharing(true);
      toast.success("Location sharing is active while this page remains open.");
    } catch (error: any) {
      toast.error(error?.message || "Allow location access to share your location.");
    }
  };

  const callNumber = (phone?: string) => {
    if (!phone) {
      toast.error("No phone number is available for this contact.");
      return;
    }
    window.location.assign(`tel:${phone.replace(/[^\d+]/g, "")}`);
  };

  const openDirections = (hospital: any) => {
    const destination = encodeURIComponent(hospital.address || hospital.name);
    window.open(`https://www.google.com/maps/dir/?api=1&destination=${destination}`, "_blank", "noopener,noreferrer");
  };

  return (
    <div className="min-h-screen bg-[#f5f6f8] dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans transition-colors pb-16">
      {/* Sticky Monday Top Header */}
      <div className="bg-white dark:bg-slate-900 border-b border-[#e6e9ef] dark:border-slate-800 px-4 sm:px-6 py-4 sticky top-0 z-30 shadow-xs">
        <div className="max-w-[1500px] mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-[#e2445c] text-white flex items-center justify-center font-black text-sm shadow-xs">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xl font-extrabold tracking-tight flex items-center gap-2">
                24/7 Emergency Dispatch & Triage Board
                <span className="w-2 h-2 rounded-full bg-[#e2445c] animate-ping" />
              </h1>
              <p className="text-xs text-[#676879] dark:text-slate-400 font-medium">
                Immediate medical dispatch, live GPS location sharing, and critical profile access
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="inline-block px-3 py-1 rounded-full text-xs font-bold text-white bg-[#00c875] flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" /> 24/7 Response Active
            </span>
          </div>
        </div>
      </div>

      <div className="max-w-[1500px] mx-auto px-4 sm:px-6 pt-6 space-y-6">
        {/* Big SOS Action Panel */}
        <div className="rounded-2xl border-2 border-[#e2445c] bg-white dark:bg-slate-900 p-8 shadow-md text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-[#ffeef0] dark:bg-red-950/40 text-[#e2445c] flex items-center justify-center mx-auto">
            <Phone className="w-8 h-8 animate-pulse" />
          </div>
          <div>
            <h2 className="text-2xl font-black text-slate-900 dark:text-slate-100">Need Immediate Emergency Assistance?</h2>
            <p className="text-xs text-[#676879] dark:text-slate-400 font-medium mt-1">
              Click below to dispatch emergency response and share live GPS telemetry with medical teams.
            </p>
          </div>
          <button
            onClick={handleEmergencyCall}
            className="px-10 py-4 rounded-xl bg-[#e2445c] hover:bg-[#c9334a] text-white font-black text-lg shadow-lg flex items-center justify-center gap-3 mx-auto transition-all active:scale-95"
          >
            <Phone className="w-6 h-6" />
            <span>CALL EMERGENCY SERVICES</span>
          </button>
          <p className="text-[11px] text-[#676879]">
            Automatically transmits blood type, critical allergies, and GPS coordinates to hospital dispatch.
          </p>
        </div>

        {/* Contacts & Medical Info Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Emergency Contacts */}
          <div className="rounded-2xl border border-[#e6e9ef] dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-xs">
            <div className="flex items-center justify-between border-b border-[#e6e9ef] dark:border-slate-800 pb-3 mb-4">
              <h2 className="font-extrabold text-sm flex items-center gap-2">
                <User className="w-4 h-4 text-[#0073ea]" />
                Primary Emergency Contacts
              </h2>
              <button onClick={() => navigate('/profile')} className="text-xs font-bold text-[#0073ea] hover:underline">
                Manage Contacts
              </button>
            </div>

            <div className="space-y-3">
              {emergencyContacts.map((contact) => (
                <div key={contact.id} className="flex items-center justify-between p-3.5 rounded-xl border border-[#e6e9ef] dark:border-slate-800 bg-[#f5f6f8] dark:bg-slate-950">
                  <div>
                    <h4 className="font-extrabold text-xs text-slate-900 dark:text-slate-100">{contact.name}</h4>
                    <p className="text-[11px] text-[#676879]">{contact.relationship || contact.relation}</p>
                    <p className="text-xs font-mono font-bold text-[#0073ea] mt-0.5">{contact.phone}</p>
                  </div>
                  <button
                    onClick={() => callNumber(contact.phone)}
                    className="px-3 py-1.5 rounded-md bg-[#00c875] text-white text-xs font-extrabold flex items-center gap-1"
                  >
                    <Phone className="w-3.5 h-3.5" /> Call
                  </button>
                </div>
              ))}
              {emergencyContacts.length === 0 && (
                <div className="text-center py-6 text-xs text-[#676879]">
                  No emergency contacts configured yet.
                </div>
              )}
            </div>
          </div>

          {/* Critical Medical Info */}
          <div className="rounded-2xl border border-[#e6e9ef] dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-xs">
            <div className="flex items-center justify-between border-b border-[#e6e9ef] dark:border-slate-800 pb-3 mb-4">
              <h2 className="font-extrabold text-sm flex items-center gap-2">
                <FileText className="w-4 h-4 text-[#e2445c]" />
                Critical Telemetry & Medical Profile
              </h2>
              <button onClick={() => navigate('/profile')} className="text-xs font-bold text-[#0073ea] hover:underline">
                Update Info
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-xl bg-[#ffeef0] border border-[#e2445c]/30">
                  <p className="text-[10px] font-extrabold uppercase text-[#676879]">Blood Type</p>
                  <p className="text-2xl font-black font-mono text-[#e2445c] mt-0.5">{medicalInfo.bloodType}</p>
                </div>
                <div className="p-3 rounded-xl bg-[#f5f6f8] border border-[#e6e9ef]">
                  <p className="text-[10px] font-extrabold uppercase text-[#676879]">Known Allergies</p>
                  <p className="text-xs font-bold text-slate-900 mt-1">{medicalInfo.allergies.join(', ') || 'None recorded'}</p>
                </div>
              </div>

              <div className="space-y-2 text-xs">
                <div>
                  <p className="font-extrabold text-[#676879] uppercase text-[10px] mb-1">Medical Conditions</p>
                  <div className="flex flex-wrap gap-1.5">
                    {medicalInfo.conditions.map((condition, index) => (
                      <span key={index} className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold text-white bg-[#a25ddc]">{condition}</span>
                    ))}
                    {medicalInfo.conditions.length === 0 && <span className="text-[#676879]">None listed</span>}
                  </div>
                </div>

                <div>
                  <p className="font-extrabold text-[#676879] uppercase text-[10px] mb-1">Current Medications</p>
                  <div className="flex flex-wrap gap-1.5">
                    {medicalInfo.medications.map((med, index) => (
                      <span key={index} className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold text-white bg-[#0073ea]">{med}</span>
                    ))}
                    {medicalInfo.medications.length === 0 && <span className="text-[#676879]">None listed</span>}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Nearby Hospitals Board */}
        <div className="rounded-2xl border border-[#e6e9ef] dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-xs">
          <div className="flex items-center justify-between border-b border-[#e6e9ef] dark:border-slate-800 pb-3 mb-4">
            <h2 className="font-extrabold text-sm flex items-center gap-2">
              <MapPin className="w-4 h-4 text-[#0073ea]" />
              Nearest Trauma Centers & Hospitals
            </h2>
          </div>

          <div className="space-y-3">
            {nearbyHospitals.map((h) => (
              <div key={h.id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 rounded-xl border border-[#e6e9ef] bg-[#f5f6f8] gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="font-extrabold text-sm text-slate-900">{h.name}</h4>
                    <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold text-white bg-[#e2445c]">24/7 Emergency</span>
                  </div>
                  <p className="text-xs text-[#676879] mt-0.5">{h.address || "Lusaka Medical District"}</p>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => openDirections(h)} className="px-3 py-1.5 rounded-md border border-[#c3c6d4] bg-white text-xs font-bold flex items-center gap-1">
                    <Navigation className="w-3.5 h-3.5" /> Directions
                  </button>
                  <button onClick={() => callNumber(h.phone)} className="px-3 py-1.5 rounded-md bg-[#0073ea] text-white text-xs font-bold flex items-center gap-1">
                    <Phone className="w-3.5 h-3.5" /> Call
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Live Location Telemetry Panel */}
        <div className="rounded-2xl border border-[#0073ea]/30 bg-[#e5f0ff] dark:bg-blue-950/20 p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-[#0073ea] text-white">
              <Shield className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm text-[#0073ea]">Live GPS Location Telemetry</h3>
              <p className="text-xs text-[#676879] font-medium">Broadcast precise GPS positioning to responding dispatchers and emergency contacts.</p>
            </div>
          </div>
          <button
            onClick={handleShareLocation}
            className={`px-5 py-2.5 rounded-xl font-extrabold text-xs text-white shadow-xs transition-all ${locationSharing ? "bg-[#e2445c]" : "bg-[#0073ea]"}`}
          >
            {locationSharing ? "Stop Location Telemetry" : "Activate GPS Telemetry Broadcast"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default EmergencyResponse;
