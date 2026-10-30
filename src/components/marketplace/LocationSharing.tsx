// @ts-nocheck -- pre-existing loose Supabase typings; tracked for cleanup
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { MapContainer, TileLayer, Marker, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { MapPin, Loader2 } from "lucide-react";
import { friendlyErrorMessage } from "@/utils/friendly-error";

function LocationPicker({
  position,
  onChange,
}: {
  position: [number, number] | null;
  onChange: (lat: number, lng: number) => void;
}) {
  useMapEvents({
    click(e) {
      onChange(e.latlng.lat, e.latlng.lng);
    },
  });
  if (!position) return null;
  const pinIcon = L.divIcon({
    className: "dococlock-pin-marker",
    html: `<div style="
      width: 36px; height: 36px; border-radius: 50% 50% 50% 0;
      transform: rotate(-45deg);
      background: #2563eb; border: 3px solid white;
      box-shadow: 0 2px 8px rgba(0,0,0,0.3);"></div>`,
    iconSize: [36, 36],
    iconAnchor: [18, 32],
  });
  return <Marker position={position} icon={pinIcon} />;
}

interface Props {
  // For institutions: pass institutionId. For providers: pass userId.
  institutionId?: string;
  userId?: string;
}

export const LocationSharing = ({ institutionId, userId }: Props) => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [position, setPosition] = useState<[number, number] | null>(null);
  const [shareLocation, setShareLocation] = useState(false);
  const [listInMarketplace, setListInMarketplace] = useState(false);
  const [institutionName, setInstitutionName] = useState<string>("");
  const [institutionPaymentMode, setInstitutionPaymentMode] = useState<string | null>(null);
  const [pendingListingRequest, setPendingListingRequest] = useState<{ to_listed: boolean; created_at: string } | null>(null);
  const [requestingListing, setRequestingListing] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        if (institutionId) {
          const { data } = await (supabase as any)
            .from("healthcare_institutions")
            .select("latitude, longitude, list_in_marketplace, name, payment_mode")
            .eq("id", institutionId)
            .maybeSingle();
          if (data?.latitude && data?.longitude) {
            setPosition([Number(data.latitude), Number(data.longitude)]);
          }
          setListInMarketplace(!!data?.list_in_marketplace);
          setInstitutionName(data?.name || "");
          setInstitutionPaymentMode(data?.payment_mode || null);
          setShareLocation(!!(data?.latitude && data?.longitude));
          // Pending listing request check
          try {
            const [{ data: reqs }, { data: decs }] = await Promise.all([
              (supabase as any)
                .from("security_audit_log")
                .select("id, created_at, event_data")
                .eq("event_type", "marketplace_listing_requested")
                .filter("event_data->>institution_id", "eq", institutionId)
                .order("created_at", { ascending: false })
                .limit(20),
              (supabase as any)
                .from("security_audit_log")
                .select("event_data")
                .eq("event_type", "marketplace_listing_decided")
                .filter("event_data->>institution_id", "eq", institutionId)
                .limit(100),
            ]);
            const decidedIds = new Set((decs || []).map((d: any) => d.event_data?.request_log_id));
            const pending = (reqs || []).find((r: any) => !decidedIds.has(r.id));
            if (pending) {
              setPendingListingRequest({ to_listed: !!pending.event_data?.to_listed, created_at: pending.created_at });
            }
          } catch { /* non-fatal */ }
        } else if (userId) {
          const { data } = await (supabase as any)
            .from("profiles")
            .select("latitude, longitude, share_location")
            .eq("id", userId)
            .maybeSingle();
          if (data?.latitude && data?.longitude) {
            setPosition([Number(data.latitude), Number(data.longitude)]);
          }
          setShareLocation(!!data?.share_location);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [institutionId, userId]);

  const useMyLocation = () => {
    if (!navigator.geolocation) {
      toast.error("Location not supported on this device", {
        description: "Please tap the map to set your location manually.",
      });
      return;
    }
    // Geolocation requires HTTPS or localhost — warn if insecure
    if (!window.isSecureContext) {
      toast.error("Location needs a secure connection (HTTPS)", {
        description: "Please tap the map to set your location manually.",
      });
      return;
    }
    toast.info("Getting your location…");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setPosition([pos.coords.latitude, pos.coords.longitude]);
        toast.success("Location captured");
      },
      (err) => {
        // Give the user an actionable message, not a generic failure
        if (err.code === err.PERMISSION_DENIED) {
          toast.error("Location permission denied", {
            description:
              "Allow location access in your browser/app settings, then try again — or tap the map to set your pin manually.",
            duration: 6000,
          });
        } else if (err.code === err.POSITION_UNAVAILABLE) {
          toast.error("Location unavailable", {
            description:
              "Your device couldn't determine its position. Make sure location services are on — or tap the map to set your pin manually.",
            duration: 6000,
          });
        } else if (err.code === err.TIMEOUT) {
          toast.error("Location timed out", {
            description:
              "Taking too long — try again, or tap the map to set your pin manually.",
            duration: 6000,
          });
        } else {
          toast.error("Could not get your location", {
            description: "Tap the map to set your pin manually.",
          });
        }
      },
      { timeout: 15000, maximumAge: 60000, enableHighAccuracy: true }
    );
  };

  const requestListingChange = async (desired: boolean) => {
    if (!institutionId || requestingListing) return;
    if (desired && institutionPaymentMode === 'own') {
      toast.error("Marketplace listing requires platform payments.", {
        description: "Listing requires platform payment mode approved by an admin. Your institution is in HMS-only (own) mode, so it cannot be listed until an admin approves a switch to platform payments.",
        duration: 6000,
      });
      return;
    }
    setRequestingListing(true);
    try {
      const { data: { user: me } } = await supabase.auth.getUser();
      const { error } = await (supabase as any).from("security_audit_log").insert({
        event_type: "marketplace_listing_requested",
        user_id: me?.id,
        event_data: {
          institution_id: institutionId,
          institution_name: institutionName,
          from_listed: listInMarketplace,
          to_listed: desired,
          requested_by: me?.id,
        },
      });
      if (error) throw error;
      setPendingListingRequest({ to_listed: desired, created_at: new Date().toISOString() });
      toast.success("Listing change requested.", {
        description: "The change takes effect only after admin approval. Your current listing status stays in effect until then.",
        duration: 6000,
      });
    } catch (e: any) {
      toast.error(friendlyErrorMessage(e, "Could not send the listing request. Please try again."));
    } finally {
      setRequestingListing(false);
    }
  };

  const handleSave = async () => {
    if (shareLocation && !position) {
      toast.error("Please set a location on the map or use your current location");
      return;
    }
    setSaving(true);
    try {
      if (institutionId) {
        const { error } = await (supabase as any)
          .from("healthcare_institutions")
          .update({
            latitude: shareLocation ? position![0] : null,
            longitude: shareLocation ? position![1] : null,
          })
          .eq("id", institutionId);
        if (error) throw error;
      } else if (userId) {
        const { error } = await (supabase as any)
          .from("profiles")
          .update({
            latitude: shareLocation ? position![0] : null,
            longitude: shareLocation ? position![1] : null,
            share_location: shareLocation,
          })
          .eq("id", userId);
        if (error) throw error;
      }
      toast.success("Location settings saved");
    } catch (e: any) {
      toast.error(friendlyErrorMessage(e, "Failed to save"));
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <p className="text-sm text-muted-foreground">Loading…</p>;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MapPin className="h-5 w-5" />
          Location Sharing
        </CardTitle>
        <CardDescription>
          Share your location so patients can find you on the marketplace map. Tap the map to set your pin.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <Label htmlFor="share-loc">Share my location publicly</Label>
          <Switch
            id="share-loc"
            checked={shareLocation}
            onCheckedChange={setShareLocation}
          />
        </div>

        {institutionId && (
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <Label htmlFor="list-market">List on marketplace</Label>
              <Switch
                id="list-market"
                checked={listInMarketplace}
                disabled={!!pendingListingRequest || requestingListing}
                onCheckedChange={(checked) => { void requestListingChange(checked); }}
              />
            </div>
            {pendingListingRequest && (
              <p className="text-xs font-medium text-amber-600">
                Listing change requested{pendingListingRequest.created_at ? ` on ${new Date(pendingListingRequest.created_at).toLocaleDateString()}` : ''} — awaiting admin review
              </p>
            )}
          </div>
        )}

        {shareLocation && (
          <>
            <div className="h-[250px] rounded-lg overflow-hidden border">
              <MapContainer
                center={position || [-15.3875, 28.3228]}
                zoom={13}
                style={{ height: "100%", width: "100%" }}
              >
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                <LocationPicker position={position} onChange={(lat, lng) => setPosition([lat, lng])} />
              </MapContainer>
            </div>
            <Button variant="outline" onClick={useMyLocation} className="w-full">
              <MapPin className="h-4 w-4 mr-2" />
              Use my current location
            </Button>
            {position && (
              <p className="text-xs text-muted-foreground text-center">
                {position[0].toFixed(6)}, {position[1].toFixed(6)}
              </p>
            )}
          </>
        )}

        <Button onClick={handleSave} disabled={saving} className="w-full">
          {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          Save Location Settings
        </Button>
      </CardContent>
    </Card>
  );
};
