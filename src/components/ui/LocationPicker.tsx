import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MapPin, Search, Loader2, Navigation } from 'lucide-react';
import { toast } from 'sonner';

interface LocationData {
  address: string;
  city: string;
  country: string;
  latitude: number;
  longitude: number;
}

interface LocationPickerProps {
  onLocationSelect: (location: LocationData) => void;
  initialLocation?: Partial<LocationData>;
  className?: string;
}

export const LocationPicker: React.FC<LocationPickerProps> = ({
  onLocationSelect,
  initialLocation,
  className = ''
}) => {
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentLocation, setCurrentLocation] = useState<LocationData | null>(
    initialLocation ? initialLocation as LocationData : null
  );
  const [searchResults, setSearchResults] = useState<LocationData[]>([]);

  // Get current GPS location
  const getCurrentLocation = useCallback(async () => {
    setLoading(true);
    try {
      if (!navigator.geolocation) {
        throw new Error('Geolocation is not supported by this browser');
      }

      if (!window.isSecureContext) {
        throw new Error('Geolocation requires a secure context (HTTPS)');
      }

      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(
          resolve,
          reject,
          {
            enableHighAccuracy: true,
            timeout: 15000,
            maximumAge: 300000
          }
        );
      });

      const { latitude, longitude } = position.coords;

      // Reverse geocoding using a free service
      try {
        const response = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&addressdetails=1`
        );
        const data = await response.json();

        if (data && data.display_name) {
          const locationData: LocationData = {
            address: data.display_name,
            city: data.address?.city || data.address?.town || data.address?.village || '',
            country: data.address?.country || '',
            latitude,
            longitude
          };

          setCurrentLocation(locationData);
          onLocationSelect(locationData);
          toast.success('Location detected successfully');
        } else {
          throw new Error('Could not get address details');
        }
      } catch (geocodeError) {
        // Fallback with just coordinates
        const locationData: LocationData = {
          address: `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`,
          city: '',
          country: '',
          latitude,
          longitude
        };

        setCurrentLocation(locationData);
        onLocationSelect(locationData);
        toast.info('Location detected. Please fill in address details manually.');
      }
    } catch (error: any) {
      console.error('Location detection failed:', error);
      toast.error(error.message || 'Failed to detect location. Please search or enter manually.');
    } finally {
      setLoading(false);
    }
  }, [onLocationSelect]);

  // Search for locations
  const searchLocations = useCallback(async (query: string) => {
    if (!query.trim()) return;

    setLoading(true);
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&addressdetails=1&limit=5`
      );
      const data = await response.json();

      const results: LocationData[] = data.map((item: any) => ({
        address: item.display_name,
        city: item.address?.city || item.address?.town || item.address?.village || '',
        country: item.address?.country || '',
        latitude: parseFloat(item.lat),
        longitude: parseFloat(item.lon)
      }));

      setSearchResults(results);
    } catch (error) {
      console.error('Search failed:', error);
      toast.error('Search failed. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    searchLocations(searchQuery);
  };

  const selectLocation = (location: LocationData) => {
    setCurrentLocation(location);
    onLocationSelect(location);
    setSearchResults([]);
    setSearchQuery('');
    toast.success('Location selected');
  };

  return (
    <div className={`space-y-4 ${className}`}>
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <MapPin className="w-5 h-5" />
            Select Location
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Current Location Button */}
          <Button
            type="button"
            variant="outline"
            onClick={getCurrentLocation}
            disabled={loading}
            className="w-full flex items-center gap-2"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Navigation className="w-4 h-4" />
            )}
            {loading ? 'Detecting Location...' : 'Use Current Location'}
          </Button>

          {/* Search Form */}
          <form onSubmit={handleSearch} className="space-y-2">
            <Label htmlFor="location-search">Search for a location</Label>
            <div className="flex gap-2">
              <Input
                id="location-search"
                type="text"
                placeholder="Enter city, address, or landmark"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1"
              />
              <Button type="submit" disabled={loading || !searchQuery.trim()}>
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Search className="w-4 h-4" />
                )}
              </Button>
            </div>
          </form>

          {/* Search Results */}
          {searchResults.length > 0 && (
            <div className="space-y-2">
              <Label>Search Results</Label>
              <div className="max-h-48 overflow-y-auto space-y-1">
                {searchResults.map((result, index) => (
                  <Button
                    key={index}
                    variant="ghost"
                    className="w-full justify-start text-left h-auto p-3"
                    onClick={() => selectLocation(result)}
                  >
                    <div className="space-y-1">
                      <div className="font-medium text-sm">{result.city || 'Unknown City'}</div>
                      <div className="text-xs text-muted-foreground line-clamp-2">
                        {result.address}
                      </div>
                    </div>
                  </Button>
                ))}
              </div>
            </div>
          )}

          {/* Selected Location Display */}
          {currentLocation && (
            <div className="bg-muted/50 p-3 rounded-lg space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium">
                <MapPin className="w-4 h-4 text-primary" />
                Selected Location
              </div>
              <div className="text-sm space-y-1">
                <div><strong>City:</strong> {currentLocation.city || 'Not specified'}</div>
                <div><strong>Country:</strong> {currentLocation.country || 'Not specified'}</div>
                <div className="text-xs text-muted-foreground">
                  <strong>Address:</strong> {currentLocation.address}
                </div>
                <div className="text-xs text-muted-foreground">
                  <strong>Coordinates:</strong> {currentLocation.latitude.toFixed(6)}, {currentLocation.longitude.toFixed(6)}
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default LocationPicker;
