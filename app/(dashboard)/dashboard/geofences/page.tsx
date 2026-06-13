"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { MapPin, Plus, Trash2, Pencil, ToggleLeft, ToggleRight } from "lucide-react";

interface Geofence {
  id: string;
  vehicle_id: string;
  name: string;
  latitude: number;
  longitude: number;
  radius_meters: number;
  is_active: boolean;
  created_at: string;
}

interface Vehicle {
  id: string;
  plate_number: string;
}

export default function GeofencesPage() {
  const router = useRouter();
  const [geofences, setGeofences] = useState<Geofence[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingGeofence, setEditingGeofence] = useState<Geofence | null>(null);
  const [formData, setFormData] = useState({
    vehicle_id: "",
    name: "",
    latitude: "",
    longitude: "",
    radius_meters: "500",
  });
  const [saving, setSaving] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      router.push('/signin');
      return;
    }

    // Fetch vehicles
    const { data: vehiclesData } = await supabase
      .from("vehicles")
      .select("id, plate_number")
      .eq("profile_id", session.user.id);

    if (vehiclesData) setVehicles(vehiclesData);

    // Fetch geofences with vehicle info
    const { data: geofencesData } = await supabase
      .from("geofences")
      .select(`
        *,
        vehicles (
          plate_number
        )
      `)
      .eq("vehicles.profile_id", session.user.id);

    if (geofencesData) setGeofences(geofencesData);

    setLoading(false);
  }

  async function saveGeofence() {
    if (!formData.vehicle_id || !formData.name || !formData.latitude || !formData.longitude) {
      alert("Please fill all required fields");
      return;
    }

    setSaving(true);

    const geofenceData = {
      vehicle_id: formData.vehicle_id,
      name: formData.name,
      latitude: parseFloat(formData.latitude),
      longitude: parseFloat(formData.longitude),
      radius_meters: parseInt(formData.radius_meters),
      is_active: true,
    };

    let error;
    if (editingGeofence) {
      const { error: updateError } = await supabase
        .from("geofences")
        .update(geofenceData)
        .eq("id", editingGeofence.id);
      error = updateError;
    } else {
      const { error: insertError } = await supabase
        .from("geofences")
        .insert(geofenceData);
      error = insertError;
    }

    if (error) {
      alert("Failed to save geofence");
    } else {
      setModalOpen(false);
      setEditingGeofence(null);
      setFormData({
        vehicle_id: "",
        name: "",
        latitude: "",
        longitude: "",
        radius_meters: "500",
      });
      fetchData();
    }

    setSaving(false);
  }

  async function toggleGeofence(geofence: Geofence) {
    const { error } = await supabase
      .from("geofences")
      .update({ is_active: !geofence.is_active })
      .eq("id", geofence.id);

    if (!error) fetchData();
  }

  async function deleteGeofence(id: string) {
    if (confirm("Delete this geofence?")) {
      const { error } = await supabase
        .from("geofences")
        .delete()
        .eq("id", id);
      if (!error) fetchData();
    }
  }

  function editGeofence(geofence: Geofence) {
    setEditingGeofence(geofence);
    setFormData({
      vehicle_id: geofence.vehicle_id,
      name: geofence.name,
      latitude: geofence.latitude.toString(),
      longitude: geofence.longitude.toString(),
      radius_meters: geofence.radius_meters.toString(),
    });
    setModalOpen(true);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-white">Loading...</div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-5">
        <div>
          <h1 className="text-xl font-bold text-white">Geofences</h1>
          <p className="text-xs text-[#6B7280] mt-1">Set virtual boundaries for your vehicles</p>
        </div>
        <Button
          onClick={() => {
            setEditingGeofence(null);
            setFormData({
              vehicle_id: "",
              name: "",
              latitude: "",
              longitude: "",
              radius_meters: "500",
            });
            setModalOpen(true);
          }}
          className="bg-[#D4AF37] hover:bg-[#E5C86B] text-black h-8 text-xs"
        >
          <Plus className="w-3 h-3 mr-1" />
          Add Geofence
        </Button>
      </div>

      {geofences.length === 0 ? (
        <Card className="bg-[#0A0A0A] border-[#1A1A1A] rounded-xl p-8 text-center">
          <MapPin className="w-12 h-12 text-[#1A1A1A] mx-auto mb-3" />
          <p className="text-[#6B7280]">No geofences yet</p>
          <p className="text-xs text-[#4B5563] mt-1">Create geofences to get alerts when vehicles leave designated areas</p>
          <Button
            onClick={() => setModalOpen(true)}
            variant="outline"
            className="mt-4"
          >
            Create your first geofence
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {geofences.map((geofence: any) => (
            <Card
              key={geofence.id}
              className={`bg-[#0A0A0A] border rounded-xl p-4 transition-all ${
                geofence.is_active ? "border-[#1A1A1A]" : "border-[#1A1A1A] opacity-50"
              }`}
            >
              <div className="flex justify-between items-start mb-3">
                <div>
                  <h3 className="font-bold text-white">{geofence.name}</h3>
                  <p className="text-xs text-[#6B7280]">{geofence.vehicles?.plate_number}</p>
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={() => toggleGeofence(geofence)}
                    className="p-1 text-gray-500 hover:text-[#D4AF37]"
                  >
                    {geofence.is_active ? (
                      <ToggleRight className="w-5 h-5 text-[#22C55E]" />
                    ) : (
                      <ToggleLeft className="w-5 h-5" />
                    )}
                  </button>
                  <button
                    onClick={() => editGeofence(geofence)}
                    className="p-1 text-gray-500 hover:text-[#D4AF37]"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => deleteGeofence(geofence.id)}
                    className="p-1 text-gray-500 hover:text-red-500"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="space-y-2 text-xs text-[#6B7280]">
                <div className="flex justify-between">
                  <span>Center:</span>
                  <span className="text-white font-mono">
                    {geofence.latitude.toFixed(4)}, {geofence.longitude.toFixed(4)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Radius:</span>
                  <span className="text-white">{geofence.radius_meters}m</span>
                </div>
                <div className="flex justify-between">
                  <span>Status:</span>
                  <span className={geofence.is_active ? "text-[#22C55E]" : "text-[#6B7280]"}>
                    {geofence.is_active ? "Active" : "Inactive"}
                  </span>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Add/Edit Geofence Modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="bg-[#0A0A0A] border-[#1A1A1A] text-white">
          <DialogHeader>
            <DialogTitle>{editingGeofence ? "Edit Geofence" : "Add Geofence"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-gray-300">Vehicle *</Label>
              <select
                value={formData.vehicle_id}
                onChange={(e) => setFormData({ ...formData, vehicle_id: e.target.value })}
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
                placeholder="e.g., Home Base, Warehouse, Office"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="mt-1.5 bg-[#1A1A1A] border-[#2A2A2A] text-white"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-gray-300">Latitude *</Label>
                <Input
                  placeholder="6.5244"
                  value={formData.latitude}
                  onChange={(e) => setFormData({ ...formData, latitude: e.target.value })}
                  className="mt-1.5 bg-[#1A1A1A] border-[#2A2A2A] text-white"
                />
              </div>
              <div>
                <Label className="text-gray-300">Longitude *</Label>
                <Input
                  placeholder="3.3792"
                  value={formData.longitude}
                  onChange={(e) => setFormData({ ...formData, longitude: e.target.value })}
                  className="mt-1.5 bg-[#1A1A1A] border-[#2A2A2A] text-white"
                />
              </div>
            </div>
            <div>
              <Label className="text-gray-300">Radius (meters) *</Label>
              <Input
                type="number"
                placeholder="500"
                value={formData.radius_meters}
                onChange={(e) => setFormData({ ...formData, radius_meters: e.target.value })}
                className="mt-1.5 bg-[#1A1A1A] border-[#2A2A2A] text-white"
              />
              <p className="text-xs text-gray-500 mt-1">Recommended: 500-1000 meters for delivery zones</p>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setModalOpen(false)}
              className="border-[#2A2A2A] text-gray-400"
            >
              Cancel
            </Button>
            <Button
              onClick={saveGeofence}
              disabled={saving}
              className="bg-[#D4AF37] hover:bg-[#E5C86B] text-black"
            >
              {saving ? "Saving..." : editingGeofence ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}