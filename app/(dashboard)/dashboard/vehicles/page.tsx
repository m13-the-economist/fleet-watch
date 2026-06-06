"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { createClient } from "@/lib/supabase/client";
import { Car, Bike, Truck, Search, Plus, Eye, Thermometer, Battery, MapPin, Copy, Trash2 } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

interface Vehicle {
  id: string;
  plate_number: string | null;
  vehicle_name: string | null;
  device_id: string | null;
  vehicle_type: string;
  last_temperature: number | null;
  last_voltage: number | null;
  last_speed: number | null;
  status: string;
  last_seen: string | null;
}

const getVehicleIcon = (type: string) => {
  switch (type) {
    case "car": return <Car className="w-5 h-5" />;
    case "bike": return <Bike className="w-5 h-5" />;
    case "truck": return <Truck className="w-5 h-5" />;
    default: return <Car className="w-5 h-5" />;
  }
};

export default function VehiclesPage() {
  const router = useRouter();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [vehicleToDelete, setVehicleToDelete] = useState<Vehicle | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [newVehicleName, setNewVehicleName] = useState("");
  const [newPlateNumber, setNewPlateNumber] = useState("");
  const [newDeviceId, setNewDeviceId] = useState("");
  const [newVehicleType, setNewVehicleType] = useState("car");
  const [adding, setAdding] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    fetchVehicles();
  }, []);

  async function fetchVehicles() {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/signin');
        return;
      }

      const { data, error } = await supabase
        .from("vehicles")
        .select("*")
        .eq("profile_id", session.user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      if (data) {
        setVehicles(data as Vehicle[]);
      }
    } catch (error) {
      console.error("Error fetching vehicles:", error);
      toast.error("Failed to load vehicles");
    } finally {
      setLoading(false);
    }
  }

  async function addVehicle() {
    if (!newVehicleName) {
      toast.error("Vehicle name is required");
      return;
    }
    if (!newPlateNumber) {
      toast.error("Plate number is required");
      return;
    }
    if (!newDeviceId) {
      toast.error("Device ID is required");
      return;
    }

    setAdding(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error("Please sign in again");
        router.push('/signin');
        return;
      }

      // Add the vehicle directly with profile_id
      const { error: vehicleError } = await supabase
        .from("vehicles")
        .insert({
          vehicle_name: newVehicleName,
          plate_number: newPlateNumber,
          device_id: newDeviceId,
          vehicle_type: newVehicleType,
          profile_id: session.user.id,
          status: "offline",
        });

      if (vehicleError) {
        console.error("Vehicle insert error:", vehicleError);
        toast.error("Failed to add vehicle: " + vehicleError.message);
        return;
      }

      toast.success("Vehicle added successfully!");
      setAddModalOpen(false);
      setNewVehicleName("");
      setNewPlateNumber("");
      setNewDeviceId("");
      setNewVehicleType("car");
      fetchVehicles();
    } catch (error: any) {
      console.error("Add vehicle error:", error);
      toast.error(error.message || "Failed to add vehicle");
    } finally {
      setAdding(false);
    }
  }

  async function deleteVehicle() {
    if (!vehicleToDelete) return;
    
    setDeleting(true);
    
    try {
      // Delete readings first
      await supabase
        .from("readings")
        .delete()
        .eq("vehicle_id", vehicleToDelete.id);
      
      // Delete alerts
      await supabase
        .from("alerts")
        .delete()
        .eq("vehicle_id", vehicleToDelete.id);
      
      // Delete the vehicle
      const { error: vehicleError } = await supabase
        .from("vehicles")
        .delete()
        .eq("id", vehicleToDelete.id);
      
      if (vehicleError) throw vehicleError;
      
      toast.success("Vehicle deleted successfully");
      setDeleteModalOpen(false);
      setVehicleToDelete(null);
      fetchVehicles();
    } catch (error: any) {
      console.error("Delete error:", error);
      toast.error(error.message || "Failed to delete vehicle");
    } finally {
      setDeleting(false);
    }
  }

  function copyDeviceId(deviceId: string) {
    navigator.clipboard.writeText(deviceId);
    toast.success("Device ID copied");
  }

  function openDeleteModal(vehicle: Vehicle) {
    setVehicleToDelete(vehicle);
    setDeleteModalOpen(true);
  }

  const filteredVehicles = vehicles.filter(v => {
    const name = v.vehicle_name?.toLowerCase() || "";
    const plate = v.plate_number?.toLowerCase() || "";
    const searchTerm = search.toLowerCase();
    return name.includes(searchTerm) || plate.includes(searchTerm);
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-white">Loading vehicles...</div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Vehicles</h1>
          <p className="text-sm text-[#6B7280] mt-1">Manage your fleet</p>
        </div>
        <Button onClick={() => setAddModalOpen(true)} className="bg-[#D4AF37] hover:bg-[#E5C86B] text-black font-semibold">
          <Plus className="w-4 h-4 mr-2" />
          Add Vehicle
        </Button>
      </div>

      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[#6B7280]" />
        <Input
          placeholder="Search by vehicle name or plate number..."
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
                    <h3 className="font-bold text-white">{vehicle.vehicle_name || "Unnamed"}</h3>
                    <p className="text-xs text-[#6B7280]">{vehicle.plate_number || "No plate"}</p>
                    {vehicle.device_id && (
                      <div className="flex items-center gap-1 mt-1">
                        <p className="text-[9px] text-[#D4AF37] font-mono">{vehicle.device_id}</p>
                        <button onClick={() => copyDeviceId(vehicle.device_id!)} className="text-gray-500 hover:text-[#D4AF37]">
                          <Copy className="w-3 h-3" />
                        </button>
                      </div>
                    )}
                    <div className="flex items-center mt-1">
                      <span className={`inline-block w-2 h-2 rounded-full ${vehicle.status === "online" ? "bg-[#22C55E]" : "bg-[#EF4444]"} mr-2 animate-pulse`}></span>
                      <span className="text-xs text-[#6B7280] capitalize">{vehicle.status || "offline"}</span>
                    </div>
                  </div>
                </div>
                <div className="flex gap-1">
                  <Link href={`/dashboard/vehicles/${vehicle.id}`}>
                    <Button variant="ghost" size="icon" className="text-[#6B7280] hover:text-white">
                      <Eye className="w-4 h-4" />
                    </Button>
                  </Link>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="text-red-500 hover:text-red-400 hover:bg-red-500/10"
                    onClick={() => openDeleteModal(vehicle)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              <div className="space-y-3 mb-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-[#6B7280]">Temperature</span>
                  <span className={`font-semibold ${
                    (vehicle.last_temperature || 0) > 95 ? "text-[#EF4444]" :
                    (vehicle.last_temperature || 0) > 85 ? "text-[#FACC15]" : "text-[#22C55E]"
                  }`}>
                    {vehicle.last_temperature ? `${vehicle.last_temperature}°C` : "--"}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-[#6B7280]">Voltage</span>
                  <span className={`font-semibold ${
                    (vehicle.last_voltage || 0) < 11.8 ? "text-[#EF4444]" :
                    (vehicle.last_voltage || 0) < 12.2 ? "text-[#FACC15]" : "text-[#22C55E]"
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
          <Button onClick={() => setAddModalOpen(true)} variant="outline" className="mt-4">
            Add your first vehicle
          </Button>
        </div>
      )}

      {/* Add Vehicle Modal */}
      <Dialog open={addModalOpen} onOpenChange={setAddModalOpen}>
        <DialogContent className="bg-[#0A0A0A] border-[#1A1A1A] text-white">
          <DialogHeader>
            <DialogTitle>Add New Vehicle</DialogTitle>
            <p className="text-sm text-gray-400 mt-1">
              Enter the Device ID printed on the sticker of your ESP32 device.
            </p>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-gray-300">Vehicle Name *</Label>
              <Input
                placeholder="e.g., My Toyota Camry, Delivery Bike 1"
                value={newVehicleName}
                onChange={(e) => setNewVehicleName(e.target.value)}
                className="mt-1.5 bg-[#1A1A1A] border-[#2A2A2A] text-white"
              />
            </div>
            <div>
              <Label className="text-gray-300">Plate Number *</Label>
              <Input
                placeholder="LAGOS-123-ABC"
                value={newPlateNumber}
                onChange={(e) => setNewPlateNumber(e.target.value)}
                className="mt-1.5 bg-[#1A1A1A] border-[#2A2A2A] text-white"
              />
            </div>
            <div>
              <Label className="text-gray-300">Device ID *</Label>
              <Input
                placeholder="ESP32_XXXXX (from sticker on device)"
                value={newDeviceId}
                onChange={(e) => setNewDeviceId(e.target.value)}
                className="mt-1.5 bg-[#1A1A1A] border-[#2A2A2A] text-white"
              />
              <p className="text-xs text-gray-500 mt-1">
                Find this on the sticker attached to your Fleet Watch device.
              </p>
            </div>
            <div>
              <Label className="text-gray-300">Vehicle Type</Label>
              <select
                value={newVehicleType}
                onChange={(e) => setNewVehicleType(e.target.value)}
                className="w-full mt-1.5 px-3 py-2 bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg text-white"
              >
                <option value="car">Car</option>
                <option value="bike">Bike</option>
                <option value="truck">Truck</option>
              </select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddModalOpen(false)} className="border-[#2A2A2A] text-gray-400">
              Cancel
            </Button>
            <Button onClick={addVehicle} disabled={adding} className="bg-[#D4AF37] hover:bg-[#E5C86B] text-black">
              {adding ? "Adding..." : "Add Vehicle"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Modal */}
      <Dialog open={deleteModalOpen} onOpenChange={setDeleteModalOpen}>
        <DialogContent className="bg-[#0A0A0A] border-[#1A1A1A] text-white">
          <DialogHeader>
            <DialogTitle>Delete Vehicle</DialogTitle>
            <DialogDescription className="text-gray-400">
              Are you sure you want to delete <span className="text-white font-semibold">{vehicleToDelete?.vehicle_name || vehicleToDelete?.plate_number}</span>?
              <br />
              <br />
              This action cannot be undone. All readings and alerts for this vehicle will be permanently deleted.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setDeleteModalOpen(false)}
              className="border-[#2A2A2A] text-gray-400"
            >
              Cancel
            </Button>
            <Button
              onClick={deleteVehicle}
              disabled={deleting}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {deleting ? "Deleting..." : "Delete Vehicle"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
