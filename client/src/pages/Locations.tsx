import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { locationsApi } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { MapPin, Navigation, Clock, Plus, Loader2 } from 'lucide-react';

export default function Locations() {
  const [showForm, setShowForm] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    context: '',
    lat: 0,
    lng: 0,
  });
  const [locationAddresses, setLocationAddresses] = useState<{ [key: string]: string }>({});
  const [loadingAddresses, setLoadingAddresses] = useState<{ [key: string]: boolean }>({});
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Function to geocode an address to coordinates
  const geocodeAddress = async (address: string): Promise<{ lat: number; lng: number }> => {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1`
      );
      const data = await response.json();
      
      if (data && data.length > 0) {
        const result = data[0];
        return {
          lat: parseFloat(result.lat),
          lng: parseFloat(result.lon),
        };
      }
      
      throw new Error('Address not found');
    } catch (error) {
      console.error('Failed to geocode address:', error);
      throw error;
    }
  };

  // Function to get descriptive address from coordinates
  const getAddressFromCoordinates = async (lat: number, lng: number): Promise<string> => {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`
      );
      const data = await response.json();
      
      if (data.display_name) {
        // Extract meaningful parts of the address
        const address = data.address || {};
        const parts = [];
        
        if (address.house_number && address.road) {
          parts.push(`${address.house_number} ${address.road}`);
        } else if (address.road) {
          parts.push(address.road);
        }
        
        if (address.neighbourhood || address.suburb || address.hamlet) {
          parts.push(address.neighbourhood || address.suburb || address.hamlet);
        }
        
        if (address.city || address.town || address.village) {
          parts.push(address.city || address.town || address.village);
        }
        
        if (address.state) {
          parts.push(address.state);
        }
        
        return parts.length > 0 ? parts.join(', ') : data.display_name;
      }
      
      return `Lat: ${lat.toFixed(4)}, Lng: ${lng.toFixed(4)}`;
    } catch (error) {
      console.error('Failed to get address:', error);
      return `Lat: ${lat.toFixed(4)}, Lng: ${lng.toFixed(4)}`;
    }
  };

  // Function to load address for a coordinate
  const loadAddressForLocation = async (id: string, lat: number, lng: number) => {
    if (locationAddresses[id] || loadingAddresses[id]) return;
    
    setLoadingAddresses(prev => ({ ...prev, [id]: true }));
    
    try {
      const address = await getAddressFromCoordinates(lat, lng);
      setLocationAddresses(prev => ({ ...prev, [id]: address }));
    } finally {
      setLoadingAddresses(prev => ({ ...prev, [id]: false }));
    }
  };

  const { data: locations = [], isLoading: locationsLoading } = useQuery({
    queryKey: ['locations'],
    queryFn: locationsApi.list,
  });

  const { data: locationLogs = [], isLoading: logsLoading } = useQuery({
    queryKey: ['location-logs'],
    queryFn: locationsApi.logs,
  });

  const createLocationMutation = useMutation({
    mutationFn: (data: { name: string; address: string; context?: string; lat: number; lng: number }) => 
      locationsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['locations'] });
      setShowForm(false);
      setFormData({ name: '', address: '', context: '', lat: 0, lng: 0 });
      toast({ title: 'Location saved successfully' });
    },
    onError: () => {
      toast({ 
        title: 'Failed to save location', 
        description: 'Please try again',
        variant: 'destructive' 
      });
    },
  });

  const logLocationMutation = useMutation({
    mutationFn: ({ lat, lng }: { lat: number; lng: number }) =>
      locationsApi.logLocation(lat, lng),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['location-logs'] });
      toast({ title: 'Current location recorded' });
    },
  });

  const shareLocationMutation = useMutation({
    mutationFn: ({ lat, lng, message }: { lat: number; lng: number; message?: string }) =>
      locationsApi.shareLocation(lat, lng, message),
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['location-logs'] });
      toast({ 
        title: 'Location shared successfully', 
        description: `Shared with ${data.contacts_notified} contact(s)`,
      });
    },
    onError: () => {
      toast({ 
        title: 'Failed to share location', 
        description: 'Please try again',
        variant: 'destructive' 
      });
    },
  });

  const getCurrentLocation = () => {
    setIsLocating(true);
    if (!navigator.geolocation) {
      toast({
        title: 'Location not available',
        description: 'Your browser does not support location services',
        variant: 'destructive',
      });
      setIsLocating(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        logLocationMutation.mutate({ lat: latitude, lng: longitude });
        setIsLocating(false);
      },
      (error) => {
        toast({
          title: 'Location error',
          description: 'Could not get your current location',
          variant: 'destructive',
        });
        setIsLocating(false);
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  };

  const shareCurrentLocation = () => {
    setIsLocating(true);
    if (!navigator.geolocation) {
      toast({
        title: 'Location not available',
        description: 'Your browser does not support location services',
        variant: 'destructive',
      });
      setIsLocating(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        shareLocationMutation.mutate({ 
          lat: latitude, 
          lng: longitude,
          message: `I'm currently at: ${latitude.toFixed(4)}, ${longitude.toFixed(4)}`
        });
        setIsLocating(false);
      },
      (error) => {
        toast({
          title: 'Location error',
          description: 'Could not get your current location to share',
          variant: 'destructive',
        });
        setIsLocating(false);
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.address) return;
    
    // Try to geocode the address to get coordinates
    try {
      const coordinates = await geocodeAddress(formData.address);
      createLocationMutation.mutate({
        ...formData,
        lat: coordinates.lat,
        lng: coordinates.lng,
      });
    } catch (error) {
      // If geocoding fails, use default coordinates but still save the location
      toast({
        title: 'Address not found',
        description: 'Using default coordinates. You can still view this location.',
        variant: 'default',
      });
      createLocationMutation.mutate({
        ...formData,
        lat: 0,
        lng: 0,
      });
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  if (locationsLoading || logsLoading) {
    return <div className="p-8">Loading locations...</div>;
  }

  return (
    <div className="p-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h2 className="text-4xl font-semibold text-foreground mb-2" data-testid="locations-title">
            Locations
          </h2>
          <p className="text-xl text-muted-foreground">
            Track important places and your location history
          </p>
        </div>
        <div className="flex space-x-4">
          <Button 
            onClick={shareCurrentLocation}
            disabled={isLocating || shareLocationMutation.isPending}
            className="bg-blue-600 hover:bg-blue-700 text-white"
            data-testid="button-share-location"
          >
            <MapPin className="w-4 h-4 mr-2" />
            {isLocating ? 'Getting Location...' : 'Share My Location'}
          </Button>
          <Button 
            onClick={getCurrentLocation}
            disabled={isLocating || logLocationMutation.isPending}
            variant="outline"
            data-testid="button-record-location"
          >
            <Navigation className="w-4 h-4 mr-2" />
            {isLocating ? 'Getting Location...' : 'Record Current Location'}
          </Button>
          <Button 
            onClick={() => setShowForm(!showForm)}
            variant="outline"
            data-testid="button-add-location"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Place
          </Button>
        </div>
      </div>

      {/* Add Location Form */}
      {showForm && (
        <Card className="mb-8" data-testid="card-add-location">
          <CardHeader>
            <CardTitle>Add Important Place</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name">Place Name</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                    placeholder="Home, Doctor's Office, etc."
                    required
                    data-testid="input-location-name"
                  />
                </div>
                <div>
                  <Label htmlFor="address">Address</Label>
                  <Input
                    id="address"
                    value={formData.address}
                    onChange={(e) => handleInputChange('address', e.target.value)}
                    placeholder="123 Main St, City, State"
                    required
                    data-testid="input-location-address"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="context">Notes</Label>
                <Textarea
                  id="context"
                  value={formData.context}
                  onChange={(e) => handleInputChange('context', e.target.value)}
                  placeholder="Additional details about this place"
                  data-testid="textarea-location-context"
                />
              </div>
              <div className="flex space-x-2">
                <Button 
                  type="submit" 
                  disabled={createLocationMutation.isPending}
                  data-testid="button-save-location"
                >
                  {createLocationMutation.isPending ? 'Saving...' : 'Save Place'}
                </Button>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setShowForm(false)}
                  data-testid="button-cancel-location"
                >
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Important Places */}
        <Card data-testid="card-important-places">
          <CardHeader>
            <CardTitle className="text-2xl">Important Places</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {locations.length === 0 ? (
                <div className="text-center py-8" data-testid="empty-locations">
                  <MapPin className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-xl font-semibold mb-2">No places saved</h3>
                  <p className="text-muted-foreground mb-4">
                    Add important places to remember them easily
                  </p>
                  <Button onClick={() => setShowForm(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    Add Place
                  </Button>
                </div>
              ) : (
                locations.map((location: any) => (
                  <div key={location.id} className="p-4 border border-border rounded-lg" data-testid={`location-${location.id}`}>
                    <div className="flex items-start space-x-3">
                      <MapPin className="w-5 h-5 text-primary mt-1" />
                      <div className="flex-1">
                        <h4 className="font-semibold text-card-foreground">{location.name}</h4>
                        <p className="text-sm text-muted-foreground">{location.address}</p>
                        {location.context && (
                          <p className="text-sm text-muted-foreground mt-1">{location.context}</p>
                        )}
                      </div>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => window.open(`https://www.openstreetmap.org/?mlat=${location.lat}&mlon=${location.lng}&zoom=15`)}
                        data-testid={`button-view-map-${location.id}`}
                      >
                        View Map
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Location History */}
        <Card data-testid="card-location-history">
          <CardHeader>
            <CardTitle className="text-2xl">Location History</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {locationLogs.length === 0 ? (
                <div className="text-center py-8" data-testid="empty-location-logs">
                  <Clock className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-xl font-semibold mb-2">No location history</h3>
                  <p className="text-muted-foreground mb-4">
                    Record your current location to start tracking
                  </p>
                  <Button onClick={getCurrentLocation} disabled={isLocating}>
                    <Navigation className="w-4 h-4 mr-2" />
                    Record Location
                  </Button>
                </div>
              ) : (
                locationLogs.slice(0, 10).map((log: any) => {
                  const logId = `log-${log.id}`;
                  const hasAddress = locationAddresses[logId];
                  const isLoading = loadingAddresses[logId];
                  
                  // Load address if not already loaded
                  if (!hasAddress && !isLoading) {
                    loadAddressForLocation(logId, log.lat, log.lng);
                  }
                  
                  return (
                    <div key={log.id} className="p-4 bg-muted rounded-lg" data-testid={`location-log-${log.id}`}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <Navigation className="w-4 h-4 text-secondary" />
                          <div className="flex-1">
                            <div className="flex items-center space-x-2">
                              {isLoading && <Loader2 className="w-3 h-3 animate-spin" />}
                              <p className="text-sm font-medium">
                                {hasAddress || `${log.lat.toFixed(4)}, ${log.lng.toFixed(4)}`}
                              </p>
                            </div>
                            <p className="text-xs text-muted-foreground">
                              {new Date(log.recorded_at).toLocaleString([], { 
                                year: 'numeric', 
                                month: 'short', 
                                day: 'numeric',
                                hour: '2-digit', 
                                minute: '2-digit',
                                hour12: false 
                              })}
                            </p>
                            {hasAddress && (
                              <p className="text-xs text-muted-foreground">
                                {log.lat.toFixed(6)}, {log.lng.toFixed(6)}
                              </p>
                            )}
                          </div>
                        </div>
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => window.open(`https://www.openstreetmap.org/?mlat=${log.lat}&mlon=${log.lng}&zoom=15`)}
                          data-testid={`button-view-log-map-${log.id}`}
                        >
                          View
                        </Button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
