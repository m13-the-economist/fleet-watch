"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Car, Bike, Truck, ChevronLeft } from "lucide-react";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { Button } from "@/components/ui/button";

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

import dynamic from "next/dynamic";

const MapComponent = dynamic(() => import("@/components/MapComponent"), {
  ssr: false,
  loading: () => (
    <div className="h-[300px] md:h-[500px] bg-[#1A1A1A] rounded-xl flex items-center justify-center">
      <div className="text-white text-sm">Loading map...</div>
    </div>
  ),
});

const getVehicleIcon = (type: string) => {
  switch (type) {
    case "car": return <Car className="w-3 h-3" />;
    case "bike": return <Bike className="w-3 h-3" />;
    case "truck": return <Truck className="w-3 h-3" />;
    default: return <Car className="w-3 h-3" />;
  }
};

function MapContent() {
  const searchParams = useSearchParams();
  const vehicleId = searchParams.get("vehicle");
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();
  const isMobile = !useMediaQuery("(min-width: 768px)");

  useEffect(() => {
    fetchVehicles();
  }, []);

  useEffect(() => {
    if (vehicleId && vehicles.length > 0) {
      const vehicle = vehicles.find(v => v.id === vehicleId);
      if (vehicle) {
        setSelectedVehicle(vehicle);
      }
    }
  }, [vehicleId, vehicles]);

  async function fetchVehicles() {
    let query = supabase
      .from("vehicles")
      .select("*")
      .not("last_location_lat", "is", null);

    if (vehicleId) {
      query = query.eq("id", vehicleId);
    }

    const { data } = await query;

    if (data) {
      setVehicles(data);
      if (vehicleId && data.length === 1) {
        setSelectedVehicle(data[0]);
      }
    }
    setLoading(false);
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
      <div className="flex flex-col h-full">
        <div className="flex justify-between items-center mb-3">
          <div>
            <h1 className="text-lg font-bold text-white">
              {selectedVehicle ? selectedVehicle.plate_number : "Fleet Map"}
            </h1>
            <p className="text-[10px] text-[#6B7280]">
              {selectedVehicle ? "Single vehicle location" : `${vehiclesWithLocation.length} vehicles on map`}
            </p>
          </div>
          {selectedVehicle && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => setSelectedVehicle(null)}
              className="border-[#1A1A1A] text-[#D4AF37] text-[10px] h-7"
            >
              <ChevronLeft className="w-3 h-3 mr-1" />
              Back
            </Button>
          )}
        </div>

        <div className="relative z-0 rounded-xl overflow-hidden mb-3">
          <MapComponent vehicles={displayVehicles} isMobile={true} />
        </div>

        {!selectedVehicle && vehiclesWithLocation.length > 0 && (
          <div className="bg-[#0A0A0A] rounded-xl border border-[#1A1A1A] p-2">
            <h3 className="text-[10px] font-bold text-[#6B7280] uppercase mb-2 px-1">Vehicles</h3>
            <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}>
              {vehiclesWithLocation.map((vehicle) => (
                <button
                  key={vehicle.id}
                  onClick={() => setSelectedVehicle(vehicle)}
                  className="shrink-0 bg-[#1A1A1A] rounded-lg px-3 py-1.5 flex items-center gap-2 hover:bg-[#222222] transition-colors"
                >
                  {getVehicleIcon(vehicle.vehicle_type)}
                  <span className="text-white text-[11px] font-medium">{vehicle.plate_number}</span>
                  <span className={`w-1.5 h-1.5 rounded-full ${vehicle.status === "online" ? "bg-[#22C55E]" : "bg-[#6B7280]"}`} />
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  // DESKTOP VIEW
  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">
            {selectedVehicle ? `Locating: ${selectedVehicle.plate_number}` : "Fleet Map"}
          </h1>
          <p className="text-sm text-[#6B7280] mt-1">
            {selectedVehicle ? "Showing selected vehicle" : `${vehiclesWithLocation.length} vehicles with live location`}
          </p>
        </div>
        {selectedVehicle && (
          <Badge className="bg-[#D4AF37]/20 text-[#D4AF37]">
            Single Vehicle Mode
          </Badge>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {!selectedVehicle && (
          <Card className="bg-[#0A0A0A] border-[#1A1A1A] rounded-2xl p-4 lg:col-span-1 max-h-[500px] overflow-y-auto">
            <h3 className="text-sm font-bold text-white mb-3 px-2">Vehicles on Map</h3>
            <div className="space-y-2">
              {vehiclesWithLocation.map((vehicle) => (
                <div
                  key={vehicle.id}
                  className="p-3 rounded-xl bg-[#1A1A1A] hover:bg-[#222222] cursor-pointer transition-all"
                  onClick={() => setSelectedVehicle(vehicle)}
                >
                  <div className="flex items-center gap-2">
                    {getVehicleIcon(vehicle.vehicle_type)}
                    <span className="font-bold text-white text-sm">{vehicle.plate_number}</span>
                    <Badge className={vehicle.status === "online" ? "bg-[#22C55E]/20 text-[#22C55E]" : "bg-[#6B7280]/20 text-[#6B7280]"}>
                      {vehicle.status}
                    </Badge>
                  </div>
                  <div className="flex gap-3 mt-2 text-xs text-[#6B7280]">
                    <span>{vehicle.last_temperature ? `${vehicle.last_temperature}°C` : "--"}</span>
                    <span>{vehicle.last_voltage ? `${vehicle.last_voltage}V` : "--"}</span>
                  </div>
                </div>
              ))}
              {vehiclesWithLocation.length === 0 && (
                <p className="text-center text-[#6B7280] py-8">No vehicles with location data</p>
              )}
            </div>
          </Card>
        )}

        <div className={selectedVehicle ? "lg:col-span-4" : "lg:col-span-3"}>
          <MapComponent vehicles={displayVehicles} isMobile={false} />
        </div>
      </div>

      {selectedVehicle && (
        <div className="mt-4 text-center">
          <button
            onClick={() => setSelectedVehicle(null)}
            className="text-[#D4AF37] hover:text-[#E5C86B] text-sm"
          >
            ← Back to all vehicles
          </button>
        </div>
      )}
    </div>
  );
}

export default function MapPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center h-64">
        <div className="text-white">Loading map...</div>
      </div>
    }>
      <MapContent />
    </Suspense>
  );
}
