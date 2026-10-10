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

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

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
  return position ? <Marker position={position} /> : null;
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

  useEffect(() => {
    const load = async () => {
      try {
        if (institutionId) {
          const { data } = await (supabase as any)
            .from("healthcare_institutions")
            .select("latitude, longitude, list_in_marketplace")
            .eq("id", institutionId)
            .maybeSingle();
          if (data?.latitude && data?.longitude) {
            setPosition([Number(data.latitude), Number(data.longitude)]);
          }
          setListInMarketplace(!!data?.list_in_marketplace);
          setShareLocation(!!(data?.latitude && data?.longitude));
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
      toast.error("Geolocation not supported");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setPosition([pos.coords.latitude, pos.coords.longitude]);
        toast.success("Location captured");
      },
      () => toast.error("Could not get your location"),
      { timeout: 10000 }
    );
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
            list_in_marketplace: listInMarketplace,
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
      toast.error(e.message || "Failed to save");
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
          <div className="flex items-center justify-between">
            <Label htmlFor="list-market">List on marketplace</Label>
            <Switch
              id="list-market"
              checked={listInMarketplace}
              onCheckedChange={setListInMarketplace}
            />
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
