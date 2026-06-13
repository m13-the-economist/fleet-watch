export const dynamic = "force-dynamic";
"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Car, Bike, Truck, ChevronLeft, MapPin, Navigation, Plus, Edit2, Trash2, Search } from "lucide-react";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import MapComponent from "@/components/MapComponent";

interface Vehicle {
  id: string;
  plate_number: string;
  vehicle_type: string;
  last_location_lat: number;
  last_location_lng: number;
  last_temperature: number;
  last_voltage: number;
  status: string;
  last_seen: string;
}

interface Geofence {
  id: string;
  vehicle_id: string;
  name: string;
  latitude?: number;
  longitude?: number;
  radius_meters?: number;
  polygon?: {
    type: string;
    coordinates: number[][][];
  };
  is_active: boolean;
  created_at: string;
  vehicles?: { plate_number: string };
}

interface LocationInfo {
  [key: string]: string;
}

const getVehicleIcon = (type: string) => {
  switch (type) {
    case "car": return <Car className="w-4 h-4" />;
    case "bike": return <Bike className="w-4 h-4" />;
    case "truck": return <Truck className="w-4 h-4" />;
    default: return <Car className="w-4 h-4" />;
  }
};

const getStatusDot = (status: string) => {
  const color = status === "online" ? "bg-[#22C55E]" : "bg-[#EF4444]";
  return <span className={`inline-block w-2 h-2 rounded-full ${color} mr-2`}></span>;
};

const vehicleColors = [
  "#D4AF37", "#22C55E", "#3B82F6", "#8B5CF6", 
  "#F97316", "#EC4899", "#06B6D4", "#84CC16", "#F59E0B", "#EF4444"
];

// Function to search and get boundary polygon - calls our own API
async function searchBoundary(query: string): Promise<{ polygon: number[][]; displayName: string } | null> {
  if (!query.trim()) return null;
  
  try {
    // Call your own API endpoint instead of Nominatim directly
    const response = await fetch(`/api/geocode/boundary?q=${encodeURIComponent(query)}`);
    const data = await response.json();
    
    if (data.success && data.boundary) {
      return { polygon: data.boundary, displayName: data.displayName || query };
    }
    
    return null;
  } catch (error) {
    console.error('Search error:', error);
    return null;
  }
}

function MapContent() {
  const searchParams = useSearchParams();
  const vehicleId = searchParams.get("vehicle");
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [geofences, setGeofences] = useState<Geofence[]>([]);
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const [locationInfo, setLocationInfo] = useState<LocationInfo>({});
  const [loading, setLoading] = useState(true);
  const [infoBox, setInfoBox] = useState<Vehicle | null>(null);
  
  // Modal states
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [selectedGeofence, setSelectedGeofence] = useState<Geofence | null>(null);
  
  const [searchQuery, setSearchQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [geofenceForm, setGeofenceForm] = useState({
    vehicle_id: "",
    name: "",
    polygon: null as { type: string; coordinates: number[][][] } | null,
  });
  const [savingGeofence, setSavingGeofence] = useState(false);
  
  const supabase = createClient();
  const isMobile = !useMediaQuery("(min-width: 768px)");

  // Function to fetch street name for a vehicle
  async function fetchStreetName(vehicleId: string, lat: number, lng: number) {
    try {
      const response = await fetch(`/api/geocode?lat=${lat}&lng=${lng}`);
      const data = await response.json();
      if (data.streetName) {
        setLocationInfo(prev => ({ ...prev, [vehicleId]: data.streetName }));
      }
    } catch (error) {
      console.error('Failed to fetch street name:', error);
    }
  }

  // Fetch street names when vehicles load
  useEffect(() => {
    vehicles.forEach(vehicle => {
      if (vehicle.last_location_lat && vehicle.last_location_lng) {
        fetchStreetName(vehicle.id, vehicle.last_location_lat, vehicle.last_location_lng);
      }
    });
  }, [vehicles]);

  const handleMarkerClick = (vehicle: Vehicle) => {
    setInfoBox(infoBox?.id === vehicle.id ? null : vehicle);
  };

  useEffect(() => {
    fetchVehicles();
    fetchGeofences();
  }, []);

  useEffect(() => {
    if (vehicleId && vehicles.length > 0) {
      const vehicle = vehicles.find(v => v.id === vehicleId);
      if (vehicle) {
        setSelectedVehicle(vehicle);
        setInfoBox(null);
      }
    }
  }, [vehicleId, vehicles]);

  async function fetchVehicles() {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const { data } = await supabase
      .from("vehicles")
      .select("*")
      .eq("profile_id", session.user.id);

    if (data) setVehicles(data);
    setLoading(false);
  }

  async function fetchGeofences() {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const { data } = await supabase
      .from("geofences")
      .select(`
        *,
        vehicles (
          plate_number
        )
      `)
      .eq("vehicles.profile_id", session.user.id);

    if (data) setGeofences(data);
  }

  async function handleSearchLocation() {
    if (!searchQuery.trim()) {
      toast.error("Please enter a location to search");
      return;
    }
    setSearching(true);
    
    try {
      const result = await searchBoundary(searchQuery);
      
      if (result && result.polygon && result.polygon.length >= 3) {
        setGeofenceForm(prev => ({
          ...prev,
          polygon: {
            type: "Polygon",
            coordinates: [result.polygon]
          }
        }));
        toast.success(`Boundary found for ${result.displayName.substring(0, 50)}`);
      } else {
        toast.error("No boundary found for this location. Try a different search term.");
      }
    } catch (error) {
      console.error('Search error:', error);
      toast.error("Search failed. Please try again.");
    }
    
    setSearching(false);
  }

  function openCreateGeofence() {
    setSelectedGeofence(null);
    setSearchQuery("");
    setGeofenceForm({
      vehicle_id: selectedVehicle?.id || vehicles[0]?.id || "",
      name: "",
      polygon: null,
    });
    setCreateModalOpen(true);
  }

  function editGeofence(geofence: Geofence) {
    setSelectedGeofence(geofence);
    setGeofenceForm({
      vehicle_id: geofence.vehicle_id,
      name: geofence.name,
      polygon: geofence.polygon || null,
    });
    setSearchQuery("");
    setEditModalOpen(true);
  }

  async function saveGeofence(isEdit: boolean = false) {
    if (!geofenceForm.vehicle_id) {
      toast.error("Please select a vehicle");
      return;
    }
    if (!geofenceForm.name) {
      toast.error("Please enter a geofence name");
      return;
    }
    
    if (!geofenceForm.polygon) {
      toast.error("Please search for a location first");
      return;
    }
  
    setSavingGeofence(true);
  
    const geofenceData = {
      vehicle_id: geofenceForm.vehicle_id,
      name: geofenceForm.name,
      polygon: geofenceForm.polygon,
      is_active: true,
    };
  
    let error;
    if (isEdit && selectedGeofence) {
      const { error: updateError } = await supabase
        .from("geofences")
        .update(geofenceData)
        .eq("id", selectedGeofence.id);
      error = updateError;
    } else {
      const { error: insertError } = await supabase
        .from("geofences")
        .insert(geofenceData);
      error = insertError;
    }
  
    if (error) {
      toast.error("Failed to save geofence");
      console.error("Save error:", error);
    } else {
      toast.success(isEdit ? "Geofence updated" : "Geofence created");
      
      // Get the vehicle's device_id and current location to trigger geofence check
      const { data: vehicle } = await supabase
        .from("vehicles")
        .select("device_id, last_location_lat, last_location_lng")
        .eq("id", geofenceForm.vehicle_id)
        .single();
      
      if (vehicle && vehicle.device_id && vehicle.last_location_lat && vehicle.last_location_lng) {
        // Trigger telemetry to check geofence immediately
        await fetch("/api/devices/telemetry", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            device_id: vehicle.device_id,
            latitude: vehicle.last_location_lat,
            longitude: vehicle.last_location_lng,
            temperature: 0,
            voltage: 0,
            speed: 0,
            fuel_level: 0,
            fault_code: null
          })
        });
      }
      
      setCreateModalOpen(false);
      setEditModalOpen(false);
      setSelectedGeofence(null);
      setSearchQuery("");
      setGeofenceForm({
        vehicle_id: "",
        name: "",
        polygon: null,
      });
      fetchGeofences();
    }
    setSavingGeofence(false);
  }

  async function deleteGeofence(id: string) {
    if (confirm("Delete this geofence?")) {
      const { error } = await supabase
        .from("geofences")
        .delete()
        .eq("id", id);
      if (!error) {
        toast.success("Geofence deleted");
        fetchGeofences();
      }
    }
  }

  function handleShowAll() {
    setSelectedVehicle(null);
    setInfoBox(null);
  }

  const vehiclesWithLocation = vehicles.filter(v => v.last_location_lat && v.last_location_lng);
  const displayVehicles = selectedVehicle ? [selectedVehicle] : vehiclesWithLocation;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-white">Loading map data...</div>
      </div>
    );
  }

  // MOBILE VIEW
  if (isMobile) {
    return (
      <div>
        <div className="flex justify-between items-center mb-3">
          <div>
            <h1 className="text-base font-bold text-white">
              {selectedVehicle ? selectedVehicle.plate_number : "Fleet Map"}
            </h1>
            <p className="text-[10px] text-[#6B7280]">
              {selectedVehicle ? "Single vehicle" : `${vehiclesWithLocation.length} vehicles on map`}
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={openCreateGeofence}
              className="border-[#1A1A1A] text-[#D4AF37] text-[10px] h-7"
            >
              <Plus className="w-3 h-3 mr-1" />
              Geofence
            </Button>
            {selectedVehicle && (
              <Button
                size="sm"
                variant="outline"
                onClick={handleShowAll}
                className="border-[#1A1A1A] text-[#D4AF37] text-[10px] h-7"
              >
                <Navigation className="w-3 h-3 mr-1" />
                All
              </Button>
            )}
          </div>
        </div>

        <div className="relative z-0 rounded-xl overflow-hidden mb-3">
          <MapComponent 
            vehicles={displayVehicles.map((v, idx) => ({ ...v, color: vehicleColors[idx % vehicleColors.length] }))} 
            geofences={geofences}
            isMobile={true} 
            onMarkerClick={handleMarkerClick}
            locationInfo={locationInfo}
            isDrawingMode={false}
            drawingModeActive={false}
            onPolygonComplete={() => {}}
            onDrawingModeToggle={() => {}}
            onDrawingConfirm={() => {}}
            onDrawingCancel={() => {}}
            pendingLocation={null}
            selectedVehicleForGeofence={null}
          />
        </div>

        {/* Geofences List - Mobile */}
        <div className="bg-[#0A0A0A] rounded-xl border border-[#1A1A1A] p-3 mb-3">
          <div className="flex justify-between items-center mb-2">
            <h3 className="text-xs font-bold text-white">Geofences</h3>
          </div>
          {geofences.length === 0 ? (
            <p className="text-[10px] text-[#6B7280] text-center py-2">No geofences</p>
          ) : (
            <div className="space-y-2">
              {geofences.map((gf) => (
                <div key={gf.id} className="flex justify-between items-center p-2 bg-[#1A1A1A] rounded-lg">
                  <div>
                    <p className="text-white text-xs font-bold">{gf.name}</p>
                    <p className="text-[9px] text-[#6B7280]">{gf.vehicles?.plate_number}</p>
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => editGeofence(gf)} className="text-gray-500 hover:text-[#D4AF37]">
                      <Edit2 className="w-3 h-3" />
                    </button>
                    <button onClick={() => deleteGeofence(gf.id)} className="text-gray-500 hover:text-red-500">
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Fleet Vehicles List - Mobile */}
        <div className="bg-[#0A0A0A] rounded-xl border border-[#1A1A1A] p-3">
          <div className="flex justify-between items-center mb-2">
            <h3 className="text-xs font-bold text-white">Fleet Vehicles</h3>
            {selectedVehicle && (
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={handleShowAll} 
                className="text-[#D4AF37] text-[10px] h-6 p-1"
              >
                Show All
              </Button>
            )}
          </div>
          <div className="space-y-2">
            {vehicles.map((vehicle) => {
              const isSelected = selectedVehicle?.id === vehicle.id;
              const hasLocation = vehicle.last_location_lat && vehicle.last_location_lng;
              return (
                <div 
                  key={vehicle.id}
                  className={`p-2 rounded-lg cursor-pointer transition-all ${
                    isSelected ? 'bg-[#D4AF37]/10 border border-[#D4AF37]/30' : 'bg-[#1A1A1A]'
                  }`}
                  onClick={() => {
                    if (hasLocation) {
                      setSelectedVehicle(isSelected ? null : vehicle);
                      setInfoBox(isSelected ? null : vehicle);
                    } else {
                      toast.error("Vehicle has no location data yet");
                    }
                  }}
                >
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-[#0A0A0A] flex items-center justify-center">
                        {getVehicleIcon(vehicle.vehicle_type)}
                      </div>
                      <div>
                        <p className="text-white text-xs font-bold">{vehicle.plate_number}</p>
                        {hasLocation && locationInfo[vehicle.id] && (
                          <p className="text-[9px] text-[#D4AF37] truncate max-w-[150px]">
                            📍 {locationInfo[vehicle.id]}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="text-right">
                        <p className="text-[9px] text-[#6B7280]">Temp</p>
                        <p className={`text-xs font-bold ${
                          (vehicle.last_temperature || 0) > 95 ? "text-[#EF4444]" : 
                          (vehicle.last_temperature || 0) > 85 ? "text-[#FACC15]" : "text-white"
                        }`}>
                          {vehicle.last_temperature ? `${vehicle.last_temperature}°C` : "--"}
                        </p>
                      </div>
                      <div className={`w-2 h-2 rounded-full ${vehicle.status === "online" ? "bg-[#22C55E]" : "bg-[#EF4444]"}`}></div>
                    </div>
                  </div>
                </div>
              );
            })}
            {vehicles.length === 0 && (
              <p className="text-[10px] text-[#6B7280] text-center py-2">No vehicles added yet</p>
            )}
          </div>
        </div>

        {/* CREATE GEOFENCE MODAL - Mobile */}
        <Dialog open={createModalOpen} onOpenChange={(open) => {
          setCreateModalOpen(open);
        }}>
          <DialogContent className="bg-[#0A0A0A] border-[#1A1A1A] text-white max-w-md rounded-2xl">
            <DialogHeader>
              <DialogTitle>Create Geofence</DialogTitle>
              <DialogDescription className="text-gray-400">
                Search for a location to auto-draw its boundary
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label className="text-gray-300">Vehicle *</Label>
                <select
                  value={geofenceForm.vehicle_id}
                  onChange={(e) => setGeofenceForm({ ...geofenceForm, vehicle_id: e.target.value })}
                  className="w-full mt-1.5 px-3 py-2 bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg text-white"
                >
                  <option value="">Select a vehicle</option>
                  {vehicles.map((v) => (
                    <option key={v.id} value={v.id}>{v.plate_number}</option>
                  ))}
                </select>
              </div>
              <div>
                <Label className="text-gray-300">Geofence Name *</Label>
                <Input
                  placeholder="e.g., Ikeja Boundary, Lagos Area"
                  value={geofenceForm.name}
                  onChange={(e) => setGeofenceForm({ ...geofenceForm, name: e.target.value })}
                  className="mt-1.5 bg-[#1A1A1A] border-[#2A2A2A] text-white"
                />
              </div>

              <div>
                <Label className="text-gray-300">Search Location</Label>
                <div className="flex gap-2 mt-1.5">
                  <Input
                    placeholder="e.g., Ikeja, Lagos, Nigeria"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="flex-1 bg-[#1A1A1A] border-[#2A2A2A] text-white"
                    onKeyDown={(e) => e.key === 'Enter' && handleSearchLocation()}
                  />
                  <Button
                    onClick={handleSearchLocation}
                    disabled={searching}
                    className="bg-[#D4AF37] hover:bg-[#E5C86B] text-black"
                    size="sm"
                  >
                    <Search className="w-3 h-3 mr-1" />
                    Go
                  </Button>
                </div>
                <p className="text-[10px] text-gray-500 mt-1">
                  Search for a city or area to automatically draw its boundary
                </p>
              </div>

              {geofenceForm.polygon && (
                <div className="bg-[#22C55E]/20 rounded-lg p-3 border border-[#22C55E]">
                  <p className="text-xs text-[#22C55E] text-center">
                    ✓ Boundary loaded! Ready to save.
                  </p>
                </div>
              )}
            </div>
            <DialogFooter className="gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setCreateModalOpen(false);
                }}
                className="border-[#2A2A2A] text-gray-400"
              >
                Cancel
              </Button>
              <Button
                onClick={() => saveGeofence(false)}
                disabled={savingGeofence || !geofenceForm.polygon}
                className="bg-[#D4AF37] hover:bg-[#E5C86B] text-black"
              >
                {savingGeofence ? "Saving..." : "Create Geofence"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* EDIT GEOFENCE MODAL - Mobile */}
        <Dialog open={editModalOpen} onOpenChange={(open) => {
          setEditModalOpen(open);
        }}>
          <DialogContent className="bg-[#0A0A0A] border-[#1A1A1A] text-white max-w-md rounded-2xl">
            <DialogHeader>
              <DialogTitle>Edit Geofence</DialogTitle>
              <DialogDescription className="text-gray-400">
                Update the geofence settings
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label className="text-gray-300">Vehicle *</Label>
                <select
                  value={geofenceForm.vehicle_id}
                  onChange={(e) => setGeofenceForm({ ...geofenceForm, vehicle_id: e.target.value })}
                  className="w-full mt-1.5 px-3 py-2 bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg text-white"
                >
                  {vehicles.map((v) => (
                    <option key={v.id} value={v.id}>{v.plate_number}</option>
                  ))}
                </select>
              </div>
              <div>
                <Label className="text-gray-300">Geofence Name *</Label>
                <Input
                  value={geofenceForm.name}
                  onChange={(e) => setGeofenceForm({ ...geofenceForm, name: e.target.value })}
                  className="mt-1.5 bg-[#1A1A1A] border-[#2A2A2A] text-white"
                />
              </div>

              {geofenceForm.polygon && (
                <div className="bg-[#22C55E]/20 rounded-lg p-3 border border-[#22C55E]">
                  <p className="text-xs text-[#22C55E] text-center">
                    ✓ Polygon geofence
                  </p>
                </div>
              )}
            </div>
            <DialogFooter className="gap-2">
              <Button
                variant="outline"
                onClick={() => setEditModalOpen(false)}
                className="border-[#2A2A2A] text-gray-400"
              >
                Cancel
              </Button>
              <Button
                onClick={() => saveGeofence(true)}
                disabled={savingGeofence}
                className="bg-[#D4AF37] hover:bg-[#E5C86B] text-black"
              >
                {savingGeofence ? "Saving..." : "Update"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  // DESKTOP VIEW
  return (
    <div>
      <div className="flex justify-between items-center mb-5">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight">
            {selectedVehicle ? `Locating: ${selectedVehicle.plate_number}` : "Fleet Map"}
          </h1>
          <p className="text-xs text-[#6B7280] mt-1">
            {selectedVehicle ? "Showing selected vehicle" : `${vehiclesWithLocation.length} vehicles on live location`}
          </p>
        </div>
        <div className="flex gap-2">
          <Button 
            onClick={openCreateGeofence} 
            className="bg-[#D4AF37] hover:bg-[#E5C86B] text-black h-8 text-xs"
          >
            <Plus className="w-3 h-3 mr-1" />
            Add Geofence
          </Button>
          {selectedVehicle && (
            <Button onClick={handleShowAll} className="bg-[#D4AF37] hover:bg-[#E5C86B] text-black h-8 text-xs">
              <Navigation className="w-3 h-3 mr-1" />
              Show All
            </Button>
          )}
        </div>
      </div>

      <div className="mb-6">
        <MapComponent 
          vehicles={displayVehicles.map((v, idx) => ({ ...v, color: vehicleColors[idx % vehicleColors.length] }))} 
          geofences={geofences}
          isMobile={false} 
          onMarkerClick={handleMarkerClick}
          locationInfo={locationInfo}
          isDrawingMode={false}
          drawingModeActive={false}
          onPolygonComplete={() => {}}
          onDrawingModeToggle={() => {}}
          onDrawingConfirm={() => {}}
          onDrawingCancel={() => {}}
          pendingLocation={null}
          selectedVehicleForGeofence={null}
        />
      </div>

      <div className="mb-6">
        <div className="flex justify-between items-center mb-3">
          <h3 className="text-sm font-bold text-white">Geofences</h3>
        </div>
        {geofences.length === 0 ? (
          <Card className="bg-[#0A0A0A] border-[#1A1A1A] rounded-xl p-6 text-center">
            <MapPin className="w-8 h-8 text-[#1A1A1A] mx-auto mb-2" />
            <p className="text-[#6B7280] text-sm">No geofences yet</p>
            <Button onClick={openCreateGeofence} variant="outline" size="sm" className="mt-3">
              Create your first geofence
            </Button>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {geofences.map((gf) => (
              <Card key={gf.id} className={`bg-[#0A0A0A] border rounded-xl p-4 ${gf.is_active ? "border-[#1A1A1A]" : "border-[#1A1A1A] opacity-50"}`}>
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h4 className="font-bold text-white">{gf.name}</h4>
                    <p className="text-xs text-[#6B7280]">{gf.vehicles?.plate_number}</p>
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => editGeofence(gf)} className="text-gray-500 hover:text-[#D4AF37]">
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button onClick={() => deleteGeofence(gf.id)} className="text-gray-500 hover:text-red-500">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                <div className="space-y-1 text-xs text-[#6B7280]">
                  {gf.polygon ? (
                    <p className="text-[#22C55E]">📍 Polygon Boundary</p>
                  ) : (
                    <>
                      <p>📍 {gf.latitude?.toFixed(4)}, {gf.longitude?.toFixed(4)}</p>
                      <p>📏 Radius: {gf.radius_meters}m</p>
                    </>
                  )}
                  <p className={gf.is_active ? "text-[#22C55E]" : "text-[#6B7280]"}>
                    {gf.is_active ? "Active" : "Inactive"}
                  </p>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      <div>
        <div className="flex justify-between items-center mb-3">
          <h3 className="text-sm font-bold text-white">Fleet Vehicles</h3>
          {selectedVehicle && (
            <Button variant="ghost" size="sm" onClick={handleShowAll} className="text-[#D4AF37] text-xs">
              <ChevronLeft className="w-3 h-3 mr-1" />
              Show All
            </Button>
          )}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {vehicles.map((vehicle, idx) => {
            const isSelected = selectedVehicle?.id === vehicle.id;
            const hasLocation = vehicle.last_location_lat && vehicle.last_location_lng;
            const vehicleColor = vehicleColors[idx % vehicleColors.length];
            return (
              <Card 
                key={vehicle.id}
                className={`bg-[#0A0A0A] border rounded-xl p-4 cursor-pointer transition-all ${
                  isSelected 
                    ? "border-[#D4AF37] bg-[#D4AF37]/5" 
                    : "border-[#1A1A1A] hover:border-[#D4AF37]/30"
                }`}
                onClick={() => {
                  if (hasLocation) {
                    setSelectedVehicle(isSelected ? null : vehicle);
                    setInfoBox(isSelected ? null : vehicle);
                  }
                }}
              >
                <div className="flex justify-between items-start mb-2">
                  <div className="flex items-center gap-2">
                    <div 
                      className="w-10 h-10 rounded-xl flex items-center justify-center"
                      style={{ backgroundColor: `${vehicleColor}20`, border: `1px solid ${vehicleColor}` }}
                    >
                      {getVehicleIcon(vehicle.vehicle_type)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white">{vehicle.plate_number}</span>
                        <Badge className={vehicle.status === "online" ? "bg-[#22C55E]/20 text-[#22C55E]" : "bg-[#6B7280]/20 text-[#6B7280]"}>
                          {vehicle.status || "offline"}
                        </Badge>
                      </div>
                      {hasLocation && locationInfo[vehicle.id] && (
                        <p className="text-[10px] text-[#D4AF37] mt-1 truncate">
                          📍 {locationInfo[vehicle.id]}
                        </p>
                      )}
                    </div>
                  </div>
                  {hasLocation && (
                    <Navigation className={`w-4 h-4 ${isSelected ? "text-[#D4AF37]" : "text-[#6B7280]"}`} />
                  )}
                </div>
                <div className="flex gap-3 mt-3 pt-2 border-t border-[#1A1A1A]">
                  <div className="flex-1 text-center">
                    <p className="text-[9px] text-[#6B7280]">Temp</p>
                    <p className={`text-sm font-bold ${(vehicle.last_temperature || 0) > 95 ? "text-[#EF4444]" : (vehicle.last_temperature || 0) > 85 ? "text-[#FACC15]" : "text-white"}`}>
                      {vehicle.last_temperature ? `${vehicle.last_temperature}°C` : "--"}
                    </p>
                  </div>
                  <div className="flex-1 text-center">
                    <p className="text-[9px] text-[#6B7280]">Voltage</p>
                    <p className={`text-sm font-bold ${(vehicle.last_voltage || 0) < 11.8 ? "text-[#EF4444]" : (vehicle.last_voltage || 0) < 12.2 ? "text-[#FACC15]" : "text-white"}`}>
                      {vehicle.last_voltage ? `${vehicle.last_voltage}V` : "--"}
                    </p>
                  </div>
                  <div className="flex-1 text-center">
                    <p className="text-[9px] text-[#6B7280]">Status</p>
                    <div className="flex items-center justify-center">
                      {getStatusDot(vehicle.status)}
                      <span className="text-xs capitalize text-white">{vehicle.status || "offline"}</span>
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      </div>

      {/* CREATE GEOFENCE MODAL - Desktop */}
      <Dialog open={createModalOpen} onOpenChange={(open) => {
        setCreateModalOpen(open);
      }}>
        <DialogContent className="bg-[#0A0A0A] border-[#1A1A1A] text-white max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle>Create Geofence</DialogTitle>
            <DialogDescription className="text-gray-400">
              Search for a location to auto-draw its boundary
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-gray-300">Vehicle *</Label>
              <select
                value={geofenceForm.vehicle_id}
                onChange={(e) => setGeofenceForm({ ...geofenceForm, vehicle_id: e.target.value })}
                className="w-full mt-1.5 px-3 py-2 bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg text-white"
              >
                <option value="">Select a vehicle</option>
                {vehicles.map((v) => (
                  <option key={v.id} value={v.id}>{v.plate_number}</option>
                ))}
              </select>
            </div>
            <div>
              <Label className="text-gray-300">Geofence Name *</Label>
              <Input
                placeholder="e.g., Ikeja Boundary, Lagos Area"
                value={geofenceForm.name}
                onChange={(e) => setGeofenceForm({ ...geofenceForm, name: e.target.value })}
                className="mt-1.5 bg-[#1A1A1A] border-[#2A2A2A] text-white"
              />
            </div>

            <div>
              <Label className="text-gray-300">Search Location</Label>
              <div className="flex gap-2 mt-1.5">
                <Input
                  placeholder="e.g., Ikeja, Lagos, Nigeria"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="flex-1 bg-[#1A1A1A] border-[#2A2A2A] text-white"
                  onKeyDown={(e) => e.key === 'Enter' && handleSearchLocation()}
                />
                <Button
                  onClick={handleSearchLocation}
                  disabled={searching}
                  className="bg-[#D4AF37] hover:bg-[#E5C86B] text-black"
                  size="sm"
                >
                  <Search className="w-3 h-3 mr-1" />
                  Go
                </Button>
              </div>
              <p className="text-[10px] text-gray-500 mt-1">
                Search for a city or area to automatically draw its boundary
              </p>
            </div>

            {geofenceForm.polygon && (
              <div className="bg-[#22C55E]/20 rounded-lg p-3 border border-[#22C55E]">
                <p className="text-xs text-[#22C55E] text-center">
                  ✓ Boundary loaded! Ready to save.
                </p>
              </div>
            )}
          </div>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setCreateModalOpen(false);
              }}
              className="border-[#2A2A2A] text-gray-400"
            >
              Cancel
            </Button>
            <Button
              onClick={() => saveGeofence(false)}
              disabled={savingGeofence || !geofenceForm.polygon}
              className="bg-[#D4AF37] hover:bg-[#E5C86B] text-black"
            >
              {savingGeofence ? "Saving..." : "Create Geofence"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* EDIT GEOFENCE MODAL - Desktop */}
      <Dialog open={editModalOpen} onOpenChange={(open) => {
        setEditModalOpen(open);
      }}>
        <DialogContent className="bg-[#0A0A0A] border-[#1A1A1A] text-white max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle>Edit Geofence</DialogTitle>
            <DialogDescription className="text-gray-400">
              Update the geofence settings
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-gray-300">Vehicle *</Label>
              <select
                value={geofenceForm.vehicle_id}
                onChange={(e) => setGeofenceForm({ ...geofenceForm, vehicle_id: e.target.value })}
                className="w-full mt-1.5 px-3 py-2 bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg text-white"
              >
                {vehicles.map((v) => (
                  <option key={v.id} value={v.id}>{v.plate_number}</option>
                ))}
              </select>
            </div>
            <div>
              <Label className="text-gray-300">Geofence Name *</Label>
              <Input
                value={geofenceForm.name}
                onChange={(e) => setGeofenceForm({ ...geofenceForm, name: e.target.value })}
                className="mt-1.5 bg-[#1A1A1A] border-[#2A2A2A] text-white"
              />
            </div>

            {geofenceForm.polygon && (
              <div className="bg-[#22C55E]/20 rounded-lg p-3 border border-[#22C55E]">
                <p className="text-xs text-[#22C55E] text-center">
                  ✓ Polygon geofence
                </p>
              </div>
            )}
          </div>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setEditModalOpen(false)}
              className="border-[#2A2A2A] text-gray-400"
            >
              Cancel
            </Button>
            <Button
              onClick={() => saveGeofence(true)}
              disabled={savingGeofence}
              className="bg-[#D4AF37] hover:bg-[#E5C86B] text-black"
            >
              {savingGeofence ? "Saving..." : "Update"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function MapPage() {
  return <MapContent />;
}
