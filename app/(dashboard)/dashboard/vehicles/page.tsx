"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/client";
import { Car, Bike, Truck, Search, Plus, Eye, Thermometer, Battery, MapPin } from "lucide-react";
import Link from "next/link";
import { useMediaQuery } from "@/hooks/useMediaQuery";

interface Vehicle {
  id: string;
  plate_number: string;
  vehicle_type: string;
  last_temperature: number;
  last_voltage: number;
  status: string;
  last_seen: string;
}

const getVehicleIcon = (type: string) => {
  switch (type) {
    case "car": return <Car className="w-4 h-4" />;
    case "bike": return <Bike className="w-4 h-4" />;
    case "truck": return <Truck className="w-4 h-4" />;
    default: return <Car className="w-4 h-4" />;
  }
};

export default function VehiclesPage() {
  const router = useRouter();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const supabase = createClient();
  const isMobile = !useMediaQuery("(min-width: 768px)");

  useEffect(() => {
    fetchVehicles();
  }, []);

  async function fetchVehicles() {
    const { data } = await supabase
      .from("vehicles")
      .select("*")
      .order("created_at", { ascending: false });

    if (data) {
      setVehicles(data);
    }
    setLoading(false);
  }

  const filteredVehicles = vehicles.filter(v =>
    v.plate_number.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-white">Loading vehicles...</div>
      </div>
    );
  }

  // MOBILE VIEW - Compact
  if (isMobile) {
    return (
      <div>
        <div className="flex justify-between items-center mb-4">
          <div>
            <h1 className="text-lg font-bold text-white">Vehicles</h1>
            <p className="text-[10px] text-[#6B7280]">Manage your fleet</p>
          </div>
          <Button size="sm" className="bg-[#D4AF37] hover:bg-[#E5C86B] text-black h-8">
            <Plus className="w-3 h-3 mr-1" />
            Add
          </Button>
        </div>

        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-3 h-3 text-[#6B7280]" />
          <Input
            placeholder="Search plate..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 py-1.5 text-sm bg-[#0A0A0A] border-[#1A1A1A] text-white placeholder:text-[#6B7280] h-9"
          />
        </div>

        <div className="grid grid-cols-1 gap-3">
          {filteredVehicles.map((vehicle) => (
            <Card key={vehicle.id} className="bg-[#0A0A0A] border-[#1A1A1A] rounded-xl overflow-hidden">
              <div className="p-3">
                <div className="flex justify-between items-start mb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-[#1A1A1A] flex items-center justify-center">
                      {getVehicleIcon(vehicle.vehicle_type)}
                    </div>
                    <div>
                      <h3 className="font-bold text-white text-sm">{vehicle.plate_number}</h3>
                      <div className="flex items-center mt-0.5">
                        <span className={`inline-block w-1.5 h-1.5 rounded-full ${vehicle.status === "online" ? "bg-[#22C55E]" : "bg-[#EF4444]"} mr-1 animate-pulse`}></span>
                        <span className="text-[9px] text-[#6B7280] capitalize">{vehicle.status || "offline"}</span>
                      </div>
                    </div>
                  </div>
                  <Link href={`/dashboard/vehicles/${vehicle.id}`}>
                    <Button variant="ghost" size="icon" className="h-7 w-7">
                      <Eye className="w-3 h-3" />
                    </Button>
                  </Link>
                </div>

                <div className="flex justify-between items-center mb-2 text-[11px]">
                  <span className="text-[#6B7280]">Temp</span>
                  <span className={`font-semibold ${
                    vehicle.last_temperature > 95 ? "text-[#EF4444]" :
                    vehicle.last_temperature > 85 ? "text-[#FACC15]" : "text-[#22C55E]"
                  }`}>
                    {vehicle.last_temperature ? `${vehicle.last_temperature}°` : "--"}
                  </span>
                </div>
                <div className="flex justify-between items-center mb-2 text-[11px]">
                  <span className="text-[#6B7280]">Voltage</span>
                  <span className={`font-semibold ${
                    vehicle.last_voltage < 11.8 ? "text-[#EF4444]" :
                    vehicle.last_voltage < 12.2 ? "text-[#FACC15]" : "text-[#22C55E]"
                  }`}>
                    {vehicle.last_voltage ? `${vehicle.last_voltage}V` : "--"}
                  </span>
                </div>
                <div className="flex justify-between items-center mb-3 text-[10px]">
                  <span className="text-[#6B7280]">Last Seen</span>
                  <span className="text-white">
                    {vehicle.last_seen ? new Date(vehicle.last_seen).toLocaleTimeString() : "--"}
                  </span>
                </div>

                <div className="flex gap-2 pt-2 border-t border-[#1A1A1A]">
                  <Link href={`/dashboard/vehicles/${vehicle.id}`} className="flex-1">
                    <Button variant="outline" size="sm" className="w-full border-[#1A1A1A] text-[#6B7280] hover:text-white h-7 text-[10px]">
                      <Thermometer className="w-3 h-3 mr-1" />
                      History
                    </Button>
                  </Link>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="flex-1 border-[#1A1A1A] text-[#6B7280] hover:text-white h-7 text-[10px]"
                    onClick={() => router.push(`/dashboard/map?vehicle=${vehicle.id}`)}
                  >
                    <MapPin className="w-3 h-3 mr-1" />
                    Locate
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>

        {filteredVehicles.length === 0 && (
          <div className="text-center py-8">
            <Car className="w-8 h-8 text-[#1A1A1A] mx-auto mb-2" />
            <p className="text-[#6B7280] text-sm">No vehicles found</p>
          </div>
        )}
      </div>
    );
  }

  // DESKTOP VIEW - Original untouched
  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Vehicles</h1>
          <p className="text-sm text-[#6B7280] mt-1">Manage your fleet</p>
        </div>
        <Button className="bg-[#D4AF37] hover:bg-[#E5C86B] text-black font-semibold">
          <Plus className="w-4 h-4 mr-2" />
          Add Vehicle
        </Button>
      </div>

      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[#6B7280]" />
        <Input
          placeholder="Search by plate number..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10 bg-[#0A0A0A] border-[#1A1A1A] text-white placeholder:text-[#6B7280]"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredVehicles.map((vehicle) => (
          <Card key={vehicle.id} className="bg-[#0A0A0A] border-[#1A1A1A] rounded-2xl overflow-hidden hover:border-[#D4AF37]/30 transition-all">
            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#1A1A1A] flex items-center justify-center">
                    {getVehicleIcon(vehicle.vehicle_type)}
                  </div>
                  <div>
                    <h3 className="font-bold text-white">{vehicle.plate_number}</h3>
                    <div className="flex items-center mt-1">
                      <span className={`inline-block w-2 h-2 rounded-full ${vehicle.status === "online" ? "bg-[#22C55E]" : "bg-[#EF4444]"} mr-2 animate-pulse`}></span>
                      <span className="text-xs text-[#6B7280] capitalize">{vehicle.status || "offline"}</span>
                    </div>
                  </div>
                </div>
                <Link href={`/dashboard/vehicles/${vehicle.id}`}>
                  <Button variant="ghost" size="icon" className="text-[#6B7280] hover:text-white">
                    <Eye className="w-4 h-4" />
                  </Button>
                </Link>
              </div>

              <div className="space-y-3 mb-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-[#6B7280]">Temperature</span>
                  <span className={`font-semibold ${
                    vehicle.last_temperature > 95 ? "text-[#EF4444]" :
                    vehicle.last_temperature > 85 ? "text-[#FACC15]" : "text-[#22C55E]"
                  }`}>
                    {vehicle.last_temperature ? `${vehicle.last_temperature}°C` : "--"}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-[#6B7280]">Voltage</span>
                  <span className={`font-semibold ${
                    vehicle.last_voltage < 11.8 ? "text-[#EF4444]" :
                    vehicle.last_voltage < 12.2 ? "text-[#FACC15]" : "text-[#22C55E]"
                  }`}>
                    {vehicle.last_voltage ? `${vehicle.last_voltage}V` : "--"}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-[#6B7280]">Last Seen</span>
                  <span className="text-sm text-white">
                    {vehicle.last_seen ? new Date(vehicle.last_seen).toLocaleString() : "--"}
                  </span>
                </div>
              </div>

              <div className="flex gap-2 pt-4 border-t border-[#1A1A1A]">
                <Link href={`/dashboard/vehicles/${vehicle.id}`} className="flex-1">
                  <Button variant="outline" size="sm" className="w-full border-[#1A1A1A] text-[#6B7280] hover:text-white">
                    <Thermometer className="w-3 h-3 mr-2" />
                    History
                  </Button>
                </Link>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="flex-1 border-[#1A1A1A] text-[#6B7280] hover:text-white"
                  onClick={() => router.push(`/dashboard/map?vehicle=${vehicle.id}`)}
                >
                  <MapPin className="w-3 h-3 mr-2" />
                  Locate
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {filteredVehicles.length === 0 && (
        <div className="text-center py-12">
          <Car className="w-12 h-12 text-[#1A1A1A] mx-auto mb-4" />
          <p className="text-[#6B7280]">No vehicles found</p>
        </div>
      )}
    </div>
  );
}