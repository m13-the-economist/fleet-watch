"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { createClient } from "@/lib/supabase/client";
import {
  ArrowLeft,
  Car,
  Bike,
  Truck,
  Thermometer,
  Battery,
  Activity,
  AlertTriangle,
  Clock,
  Gauge,
  Wifi,
  WifiOff,
  MapPin,
  Zap,
  Fuel,
} from "lucide-react";
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  AreaChart,
} from "recharts";
import { useMediaQuery } from "@/hooks/useMediaQuery";

interface Vehicle {
  id: string;
  plate_number: string;
  vehicle_type: string;
  last_temperature: number;
  last_voltage: number;
  last_rpm: number;
  last_speed: number;
  last_fuel_level: number;
  last_fault_code: string;
  status: string;
  last_seen: string;
  last_location_lat: number;
  last_location_lng: number;
  created_at: string;
}

interface Reading {
  id: string;
  temperature: number;
  voltage: number;
  rpm: number;
  speed: number;
  fuel_level: number;
  created_at: string;
}

interface Alert {
  id: string;
  alert_type: string;
  severity: string;
  message: string;
  created_at: string;
  is_resolved: boolean;
}

const getVehicleIcon = (type: string) => {
  switch (type) {
    case "car": return <Car className="w-5 h-5" />;
    case "bike": return <Bike className="w-5 h-5" />;
    case "truck": return <Truck className="w-5 h-5" />;
    default: return <Car className="w-5 h-5" />;
  }
};

const getStatusBadge = (status: string) => {
  switch (status) {
    case "online":
      return <Badge className="bg-[#22C55E]/10 text-[#22C55E] border-none"><Wifi className="w-3 h-3 mr-1" /> Online</Badge>;
    case "offline":
      return <Badge className="bg-[#6B7280]/10 text-[#6B7280] border-none"><WifiOff className="w-3 h-3 mr-1" /> Offline</Badge>;
    default:
      return <Badge variant="outline" className="border-[#1A1A1A]">{status}</Badge>;
  }
};

export default function VehicleDetailPage() {
  const params = useParams();
  const router = useRouter();
  const vehicleId = params.id as string;
  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [readings, setReadings] = useState<Reading[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();
  const isMobile = !useMediaQuery("(min-width: 768px)");

  useEffect(() => {
    fetchVehicleData();
    fetchReadings();
    fetchAlerts();
  }, [vehicleId]);

  async function fetchVehicleData() {
    const { data } = await supabase
      .from("vehicles")
      .select("*")
      .eq("id", vehicleId)
      .single();

    if (data) {
      setVehicle(data);
    }
  }

  async function fetchReadings() {
    const { data } = await supabase
      .from("readings")
      .select("*")
      .eq("vehicle_id", vehicleId)
      .order("created_at", { ascending: false })
      .limit(50);

    if (data) {
      setReadings(data.reverse());
    }
  }

  async function fetchAlerts() {
    const { data } = await supabase
      .from("alerts")
      .select("*")
      .eq("vehicle_id", vehicleId)
      .order("created_at", { ascending: false })
      .limit(20);

    if (data) {
      setAlerts(data);
    }
    setLoading(false);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-white">Loading vehicle data...</div>
      </div>
    );
  }

  if (!vehicle) {
    return (
      <div className="text-center py-12">
        <p className="text-[#6B7280]">Vehicle not found</p>
        <Button onClick={() => router.back()} className="mt-4">
          Go Back
        </Button>
      </div>
    );
  }

  const tempColor = vehicle.last_temperature > 95 ? "#EF4444" : vehicle.last_temperature > 85 ? "#FACC15" : "#22C55E";
  const voltageColor = vehicle.last_voltage < 11.8 ? "#EF4444" : vehicle.last_voltage < 12.2 ? "#FACC15" : "#22C55E";
  const speedColor = vehicle.last_speed ? (vehicle.last_speed > 100 ? "#EF4444" : vehicle.last_speed > 80 ? "#FACC15" : "#22C55E") : "#6B7280";
  const rpmColor = vehicle.last_rpm ? (vehicle.last_rpm > 6000 ? "#EF4444" : vehicle.last_rpm > 4000 ? "#FACC15" : "#22C55E") : "#6B7280";
  const fuelColor = vehicle.last_fuel_level ? (vehicle.last_fuel_level < 15 ? "#EF4444" : vehicle.last_fuel_level < 30 ? "#FACC15" : "#22C55E") : "#6B7280";

  const hasLocation = vehicle.last_location_lat && vehicle.last_location_lng;

  // MOBILE VIEW
  if (isMobile) {
    return (
      <div>
        <div className="flex items-center gap-3 mb-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.back()}
            className="text-[#6B7280] hover:text-white h-8 w-8"
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[#1A1A1A] flex items-center justify-center">
              {getVehicleIcon(vehicle.vehicle_type)}
            </div>
            <div>
              <h1 className="text-base font-bold text-white">{vehicle.plate_number}</h1>
              <div className="flex items-center gap-1 mt-0.5">
                {getStatusBadge(vehicle.status)}
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-4">
          <Card className="bg-[#0A0A0A] border-[#1A1A1A] rounded-xl p-3">
            <div className="flex justify-between items-center">
              <p className="text-xs font-bold text-[#6B7280] uppercase">Live Temp</p>
              <Thermometer className="w-4 h-4" style={{ color: tempColor }} />
            </div>
            <p className="text-base font-bold text-white">
              {vehicle.last_temperature ? `${vehicle.last_temperature}°` : "--"}
            </p>
          </Card>

          <Card className="bg-[#0A0A0A] border-[#1A1A1A] rounded-xl p-3">
            <div className="flex justify-between items-center">
              <p className="text-xs font-bold text-[#6B7280] uppercase">Live Volt</p>
              <Battery className="w-4 h-4" style={{ color: voltageColor }} />
            </div>
            <p className="text-base font-bold text-white">
              {vehicle.last_voltage ? `${vehicle.last_voltage}V` : "--"}
            </p>
          </Card>

          <Card className="bg-[#0A0A0A] border-[#1A1A1A] rounded-xl p-3">
            <div className="flex justify-between items-center">
              <p className="text-xs font-bold text-[#6B7280] uppercase">Live RPM</p>
              <Gauge className="w-4 h-4" style={{ color: rpmColor }} />
            </div>
            <p className="text-base font-bold text-white">{vehicle.last_rpm || "--"}</p>
          </Card>

          <Card className="bg-[#0A0A0A] border-[#1A1A1A] rounded-xl p-3">
            <div className="flex justify-between items-center">
              <p className="text-xs font-bold text-[#6B7280] uppercase">Live Speed</p>
              <Zap className="w-4 h-4" style={{ color: speedColor }} />
            </div>
            <p className="text-base font-bold text-white">
              {vehicle.last_speed ? `${vehicle.last_speed} km/h` : "--"}
            </p>
          </Card>

          <Card className="bg-[#0A0A0A] border-[#1A1A1A] rounded-xl p-3">
            <div className="flex justify-between items-center">
              <p className="text-xs font-bold text-[#6B7280] uppercase">Fuel</p>
              <Fuel className="w-4 h-4" style={{ color: fuelColor }} />
            </div>
            <p className="text-base font-bold text-white">
              {vehicle.last_fuel_level !== null ? `${Math.round(vehicle.last_fuel_level)}%` : "--"}
            </p>
          </Card>

          <Card 
            className="bg-[#0A0A0A] border-[#1A1A1A] rounded-xl p-3 cursor-pointer hover:border-[#D4AF37]/30 transition-all"
            onClick={() => hasLocation && router.push(`/dashboard/map?vehicle=${vehicle.id}`)}
          >
            <div className="flex justify-between items-center">
              <p className="text-xs font-bold text-[#6B7280] uppercase">GPS</p>
              <MapPin className="w-4 h-4 text-[#D4AF37]" />
            </div>
            <p className="text-xs font-medium text-white mt-1">
              {hasLocation ? "Tap to view" : "No location"}
            </p>
          </Card>

          <Card className="bg-[#0A0A0A] border-[#1A1A1A] rounded-xl p-3">
            <div className="flex justify-between items-center">
              <p className="text-xs font-bold text-[#6B7280] uppercase">Last Seen</p>
              <Clock className="w-4 h-4 text-[#6B7280]" />
            </div>
            <p className="text-xs font-medium text-white mt-1">
              {vehicle.last_seen ? new Date(vehicle.last_seen).toLocaleString() : "--"}
            </p>
          </Card>
        </div>

        <div className="space-y-4 mb-4">
          <Card className="bg-[#0A0A0A] border-[#1A1A1A] rounded-xl p-3">
            <h3 className="text-sm font-bold text-white mb-1">Temperature History</h3>
            <p className="text-xs text-[#6B7280] mb-2">Normal: 85-95°C</p>
            <div className="h-40 w-full">
              <ResponsiveContainer width="100%" height="100%" minHeight={150}>
                <AreaChart data={readings}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1A1A1A" />
                  <XAxis dataKey="created_at" tickFormatter={(v) => new Date(v).toLocaleTimeString()} stroke="#6B7280" tick={{ fontSize: 10 }} />
                  <YAxis stroke="#6B7280" tick={{ fontSize: 10 }} domain={[0, 120]} />
                  <Tooltip contentStyle={{ backgroundColor: "#0A0A0A", border: "1px solid #1A1A1A", fontSize: "12px" }} />
                  <Area type="monotone" dataKey="temperature" stroke="#EF4444" fill="#EF4444" fillOpacity={0.1} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <Card className="bg-[#0A0A0A] border-[#1A1A1A] rounded-xl p-3">
            <h3 className="text-sm font-bold text-white mb-1">Voltage History</h3>
            <p className="text-xs text-[#6B7280] mb-2">Normal: 12.2-14.5V</p>
            <div className="h-40 w-full">
              <ResponsiveContainer width="100%" height="100%" minHeight={150}>
                <AreaChart data={readings}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1A1A1A" />
                  <XAxis dataKey="created_at" tickFormatter={(v) => new Date(v).toLocaleTimeString()} stroke="#6B7280" tick={{ fontSize: 10 }} />
                  <YAxis stroke="#6B7280" tick={{ fontSize: 10 }} domain={[10, 15]} />
                  <Tooltip contentStyle={{ backgroundColor: "#0A0A0A", border: "1px solid #1A1A1A", fontSize: "12px" }} />
                  <Area type="monotone" dataKey="voltage" stroke="#22C55E" fill="#22C55E" fillOpacity={0.1} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <Card className="bg-[#0A0A0A] border-[#1A1A1A] rounded-xl p-3">
            <h3 className="text-sm font-bold text-white mb-1">Speed History</h3>
            <p className="text-xs text-[#6B7280] mb-2">Normal city: 40-60 km/h</p>
            <div className="h-40 w-full">
              <ResponsiveContainer width="100%" height="100%" minHeight={150}>
                <AreaChart data={readings}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1A1A1A" />
                  <XAxis dataKey="created_at" tickFormatter={(v) => new Date(v).toLocaleTimeString()} stroke="#6B7280" tick={{ fontSize: 10 }} />
                  <YAxis stroke="#6B7280" tick={{ fontSize: 10 }} />
                  <Tooltip contentStyle={{ backgroundColor: "#0A0A0A", border: "1px solid #1A1A1A", fontSize: "12px" }} />
                  <Area type="monotone" dataKey="speed" stroke="#D4AF37" fill="#D4AF37" fillOpacity={0.1} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <Card className="bg-[#0A0A0A] border-[#1A1A1A] rounded-xl p-3">
            <h3 className="text-sm font-bold text-white mb-1">RPM History</h3>
            <p className="text-xs text-[#6B7280] mb-2">Normal: 1500-3000 RPM</p>
            <div className="h-40 w-full">
              <ResponsiveContainer width="100%" height="100%" minHeight={150}>
                <AreaChart data={readings}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1A1A1A" />
                  <XAxis dataKey="created_at" tickFormatter={(v) => new Date(v).toLocaleTimeString()} stroke="#6B7280" tick={{ fontSize: 10 }} />
                  <YAxis stroke="#6B7280" tick={{ fontSize: 10 }} />
                  <Tooltip contentStyle={{ backgroundColor: "#0A0A0A", border: "1px solid #1A1A1A", fontSize: "12px" }} />
                  <Area type="monotone" dataKey="rpm" stroke="#8B5CF6" fill="#8B5CF6" fillOpacity={0.1} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </div>

        <Card className="bg-[#0A0A0A] border-[#1A1A1A] rounded-xl p-3">
          <h3 className="text-sm font-bold text-white mb-2">Alert History</h3>
          <div className="space-y-2">
            {alerts.length === 0 ? (
              <div className="text-center py-4 text-[#6B7280]">
                <Activity className="w-5 h-5 mx-auto mb-1 opacity-50" />
                <p className="text-xs">No alerts recorded</p>
              </div>
            ) : (
              alerts.map((alert) => (
                <div key={alert.id} className={`p-2 rounded-lg ${alert.severity === "critical" ? "bg-[#EF4444]/10 border-l-3 border-l-[#EF4444]" : "bg-[#FACC15]/10 border-l-3 border-l-[#FACC15]"}`}>
                  <div className="flex items-start gap-2">
                    <AlertTriangle className={`w-4 h-4 mt-0.5 ${alert.severity === "critical" ? "text-[#EF4444]" : "text-[#FACC15]"}`} />
                    <div className="flex-1">
                      <p className="font-semibold text-white text-sm">{alert.message}</p>
                      <div className="flex gap-2 mt-1">
                        <Badge className={alert.severity === "critical" ? "bg-[#EF4444]/20 text-[#EF4444] text-xs px-1" : "bg-[#FACC15]/20 text-[#FACC15] text-xs px-1"}>
                          {alert.severity}
                        </Badge>
                        <span className="text-xs text-[#6B7280]">{new Date(alert.created_at).toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>
      </div>
    );
  }

  // DESKTOP VIEW
  return (
    <div>
      <div className="flex items-center gap-4 mb-6">
        <Button variant="ghost" size="icon" onClick={() => router.back()} className="text-[#6B7280] hover:text-white">
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-[#1A1A1A] flex items-center justify-center">
            {getVehicleIcon(vehicle.vehicle_type)}
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">{vehicle.plate_number}</h1>
            <div className="flex items-center gap-2 mt-1">
              {getStatusBadge(vehicle.status)}
              <span className="text-xs text-[#6B7280] capitalize">{vehicle.vehicle_type}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-7 gap-4 mb-8">
        <Card className="bg-[#0A0A0A] border-[#1A1A1A] rounded-2xl p-4">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-bold text-[#6B7280] mb-1 uppercase tracking-wider">Live Temp</p>
              <p className="text-lg font-bold text-white">{vehicle.last_temperature ? `${vehicle.last_temperature}°C` : "--"}</p>
            </div>
            <Thermometer className="w-4 h-4" style={{ color: tempColor }} />
          </div>
        </Card>

        <Card className="bg-[#0A0A0A] border-[#1A1A1A] rounded-2xl p-4">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-bold text-[#6B7280] mb-1 uppercase tracking-wider">Live Volt</p>
              <p className="text-lg font-bold text-white">{vehicle.last_voltage ? `${vehicle.last_voltage}V` : "--"}</p>
            </div>
            <Battery className="w-4 h-4" style={{ color: voltageColor }} />
          </div>
        </Card>

        <Card className="bg-[#0A0A0A] border-[#1A1A1A] rounded-2xl p-4">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-bold text-[#6B7280] mb-1 uppercase tracking-wider">Live RPM</p>
              <p className="text-lg font-bold text-white">{vehicle.last_rpm || "--"}</p>
            </div>
            <Gauge className="w-4 h-4" style={{ color: rpmColor }} />
          </div>
        </Card>

        <Card className="bg-[#0A0A0A] border-[#1A1A1A] rounded-2xl p-4">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-bold text-[#6B7280] mb-1 uppercase tracking-wider">Live Speed</p>
              <p className="text-lg font-bold text-white">{vehicle.last_speed ? `${vehicle.last_speed} km/h` : "--"}</p>
            </div>
            <Zap className="w-4 h-4" style={{ color: speedColor }} />
          </div>
        </Card>

        <Card className="bg-[#0A0A0A] border-[#1A1A1A] rounded-2xl p-4">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-bold text-[#6B7280] mb-1 uppercase tracking-wider">Fuel</p>
              <p className="text-lg font-bold text-white">{vehicle.last_fuel_level !== null ? `${Math.round(vehicle.last_fuel_level)}%` : "--"}</p>
            </div>
            <Fuel className="w-4 h-4" style={{ color: fuelColor }} />
          </div>
        </Card>

        <Card 
          className="bg-[#0A0A0A] border-[#1A1A1A] rounded-2xl p-4 cursor-pointer hover:border-[#D4AF37]/30 transition-all"
          onClick={() => hasLocation && router.push(`/dashboard/map?vehicle=${vehicle.id}`)}
        >
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-bold text-[#6B7280] mb-1 uppercase tracking-wider">GPS</p>
              <p className="text-xs font-medium text-white mt-1">{hasLocation ? "Click to view" : "No location"}</p>
            </div>
            <MapPin className="w-4 h-4 text-[#D4AF37]" />
          </div>
        </Card>

        <Card className="bg-[#0A0A0A] border-[#1A1A1A] rounded-2xl p-4">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-bold text-[#6B7280] mb-1 uppercase tracking-wider">Last Seen</p>
              <p className="text-xs font-medium text-white mt-1">{vehicle.last_seen ? new Date(vehicle.last_seen).toLocaleString() : "--"}</p>
            </div>
            <Clock className="w-4 h-4 text-[#6B7280]" />
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <Card className="bg-[#0A0A0A] border-[#1A1A1A] rounded-2xl p-6">
          <h3 className="text-base font-bold text-white mb-4">Temperature History</h3>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%" minHeight={250}>
              <AreaChart data={readings}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1A1A1A" />
                <XAxis dataKey="created_at" tickFormatter={(v) => new Date(v).toLocaleTimeString()} stroke="#6B7280" />
                <YAxis stroke="#6B7280" domain={[0, 120]} />
                <Tooltip contentStyle={{ backgroundColor: "#0A0A0A", border: "1px solid #1A1A1A" }} labelFormatter={(v) => new Date(v).toLocaleString()} />
                <Area type="monotone" dataKey="temperature" stroke="#EF4444" fill="#EF4444" fillOpacity={0.1} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="bg-[#0A0A0A] border-[#1A1A1A] rounded-2xl p-6">
          <h3 className="text-base font-bold text-white mb-4">Voltage History</h3>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%" minHeight={250}>
              <AreaChart data={readings}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1A1A1A" />
                <XAxis dataKey="created_at" tickFormatter={(v) => new Date(v).toLocaleTimeString()} stroke="#6B7280" />
                <YAxis stroke="#6B7280" domain={[10, 15]} />
                <Tooltip contentStyle={{ backgroundColor: "#0A0A0A", border: "1px solid #1A1A1A" }} labelFormatter={(v) => new Date(v).toLocaleString()} />
                <Area type="monotone" dataKey="voltage" stroke="#22C55E" fill="#22C55E" fillOpacity={0.1} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="bg-[#0A0A0A] border-[#1A1A1A] rounded-2xl p-6">
          <h3 className="text-base font-bold text-white mb-4">Speed History</h3>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%" minHeight={250}>
              <AreaChart data={readings}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1A1A1A" />
                <XAxis dataKey="created_at" tickFormatter={(v) => new Date(v).toLocaleTimeString()} stroke="#6B7280" />
                <YAxis stroke="#6B7280" />
                <Tooltip contentStyle={{ backgroundColor: "#0A0A0A", border: "1px solid #1A1A1A" }} labelFormatter={(v) => new Date(v).toLocaleString()} />
                <Area type="monotone" dataKey="speed" stroke="#D4AF37" fill="#D4AF37" fillOpacity={0.1} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="bg-[#0A0A0A] border-[#1A1A1A] rounded-2xl p-6">
          <h3 className="text-base font-bold text-white mb-4">RPM History</h3>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%" minHeight={250}>
              <AreaChart data={readings}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1A1A1A" />
                <XAxis dataKey="created_at" tickFormatter={(v) => new Date(v).toLocaleTimeString()} stroke="#6B7280" />
                <YAxis stroke="#6B7280" />
                <Tooltip contentStyle={{ backgroundColor: "#0A0A0A", border: "1px solid #1A1A1A" }} labelFormatter={(v) => new Date(v).toLocaleString()} />
                <Area type="monotone" dataKey="rpm" stroke="#8B5CF6" fill="#8B5CF6" fillOpacity={0.1} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      <Card className="bg-[#0A0A0A] border-[#1A1A1A] rounded-2xl p-6">
        <h3 className="text-base font-bold text-white mb-4">Alert History</h3>
        <div className="space-y-3">
          {alerts.length === 0 ? (
            <div className="text-center py-8 text-[#6B7280]">
              <Activity className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No alerts recorded for this vehicle</p>
            </div>
          ) : (
            alerts.map((alert) => (
              <div key={alert.id} className={`p-4 rounded-xl ${alert.severity === "critical" ? "bg-[#EF4444]/10 border-l-4 border-l-[#EF4444]" : "bg-[#FACC15]/10 border-l-4 border-l-[#FACC15]"}`}>
                <div className="flex items-start gap-3">
                  <AlertTriangle className={`w-4 h-4 mt-0.5 ${alert.severity === "critical" ? "text-[#EF4444]" : "text-[#FACC15]"}`} />
                  <div className="flex-1">
                    <p className="font-semibold text-white text-sm">{alert.message}</p>
                    <div className="flex gap-3 mt-1">
                      <Badge className={alert.severity === "critical" ? "bg-[#EF4444]/20 text-[#EF4444]" : "bg-[#FACC15]/20 text-[#FACC15]"}>
                        {alert.severity}
                      </Badge>
                      <span className="text-xs text-[#6B7280]">{new Date(alert.created_at).toLocaleString()}</span>
                      {alert.is_resolved && <Badge className="bg-[#22C55E]/20 text-[#22C55E]">Resolved</Badge>}
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </Card>
    </div>
  );
}