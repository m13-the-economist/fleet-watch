"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import {
  Car,
  Bike,
  Truck,
  AlertTriangle,
  CheckCircle2,
  Wrench,
  MoreVertical,
  ChevronRight,
} from "lucide-react";
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

interface Alert {
  id: string;
  vehicle_id: string;
  alert_type: string;
  severity: string;
  message: string;
  created_at: string;
  vehicles?: {
    plate_number: string;
  };
}

const getStatusDot = (status: string) => {
  const color = status === "online" ? "text-[#22C55E]" : "text-[#EF4444]";
  return <span className={`inline-block w-2 h-2 rounded-full ${color} mr-2`}></span>;
};

const getTempBadge = (temp: number) => {
  if (!temp) return "text-[#6B7280] bg-[#1A1A1A]";
  if (temp > 105) return "text-[#EF4444] bg-[#EF4444]/10";
  if (temp > 95) return "text-[#FACC15] bg-[#FACC15]/10";
  return "text-[#22C55E] bg-[#22C55E]/10";
};

const getVoltageBadge = (voltage: number) => {
  if (!voltage) return "text-[#6B7280] bg-[#1A1A1A]";
  if (voltage < 11.8) return "text-[#EF4444] bg-[#EF4444]/10";
  if (voltage < 12.2) return "text-[#FACC15] bg-[#FACC15]/10";
  return "text-[#22C55E] bg-[#22C55E]/10";
};

const getVehicleIcon = (type: string) => {
  switch (type) {
    case "car": return <Car className="w-5 h-5 text-[#6B7280]" />;
    case "bike": return <Bike className="w-5 h-5 text-[#6B7280]" />;
    case "truck": return <Truck className="w-5 h-5 text-[#6B7280]" />;
    default: return <Car className="w-5 h-5 text-[#6B7280]" />;
  }
};

export default function DashboardHomePage() {
  const router = useRouter();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();
  const isMobile = !useMediaQuery("(min-width: 768px)");

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    const { data: vehiclesData } = await supabase
      .from("vehicles")
      .select("*")
      .order("created_at", { ascending: false });

    if (vehiclesData) {
      setVehicles(vehiclesData);
    }

    const { data: alertsData } = await supabase
      .from("alerts")
      .select(`
        *,
        vehicles (
          plate_number
        )
      `)
      .eq("is_resolved", false)
      .order("created_at", { ascending: false })
      .limit(5);

    if (alertsData) {
      setAlerts(alertsData);
    }

    setLoading(false);
  }

  const onlineCount = vehicles.filter(v => v.status === "online").length;
  const alertCount = alerts.filter(a => a.severity === "critical").length;
  const warningCount = alerts.filter(a => a.severity === "warning").length;
  const onlinePercent = vehicles.length > 0 ? Math.round((onlineCount / vehicles.length) * 100) : 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-white">Loading fleet data...</div>
      </div>
    );
  }

  // MOBILE VIEW - Slightly larger
  if (isMobile) {
    return (
      <div>
        {/* KPI Cards */}
        <div className="grid grid-cols-2 gap-3 mb-5">
          <Card 
            className="bg-[#0A0A0A] border-[#1A1A1A] rounded-xl p-4 cursor-pointer"
            onClick={() => router.push("/dashboard/vehicles")}
          >
            <div className="flex justify-between items-start">
              <div>
                <p className="text-[11px] font-bold text-[#6B7280] mb-1">Active Vehicles</p>
                <p className="text-2xl font-extrabold text-white">{onlineCount}</p>
                <p className="text-[10px] text-[#4B5563] mt-0.5">Total: {vehicles.length}</p>
              </div>
              <Car className="w-5 h-5 text-[#D4AF37]" />
            </div>
          </Card>

          <Card 
            className="bg-[#0A0A0A] border-[#1A1A1A] rounded-xl p-4 cursor-pointer"
            onClick={() => router.push("/dashboard/alerts")}
          >
            <div className="flex justify-between items-start">
              <div>
                <p className="text-[11px] font-bold text-[#6B7280] mb-1">Active Alerts</p>
                <p className="text-2xl font-extrabold text-[#EF4444]">{alertCount}</p>
                <p className="text-[10px] text-[#4B5563] mt-0.5">{warningCount} warnings</p>
              </div>
              <AlertTriangle className="w-5 h-5 text-[#EF4444]" />
            </div>
          </Card>

          <Card 
            className="bg-[#0A0A0A] border-[#1A1A1A] rounded-xl p-4 cursor-pointer"
            onClick={() => router.push("/dashboard/reports")}
          >
            <div className="flex justify-between items-start">
              <div>
                <p className="text-[11px] font-bold text-[#6B7280] mb-1">Online Today</p>
                <p className="text-2xl font-extrabold text-white">{onlinePercent}%</p>
                <p className="text-[10px] text-[#22C55E] mt-0.5">Fleet uptime</p>
              </div>
              <CheckCircle2 className="w-5 h-5 text-[#22C55E]" />
            </div>
          </Card>

          <Card 
            className="bg-[#0A0A0A] border-[#1A1A1A] rounded-xl p-4 cursor-pointer"
            onClick={() => router.push("/dashboard/reports")}
          >
            <div className="flex justify-between items-start">
              <div>
                <p className="text-[11px] font-bold text-[#6B7280] mb-1">Needs Service</p>
                <p className="text-2xl font-extrabold text-[#FACC15]">0</p>
                <p className="text-[10px] text-[#4B5563] mt-0.5">Maintenance</p>
              </div>
              <Wrench className="w-5 h-5 text-[#FACC15]" />
            </div>
          </Card>
        </div>

        {/* Fleet Vehicles Table */}
        <div className="bg-[#0A0A0A] rounded-xl border border-[#1A1A1A] overflow-hidden mb-5">
          <div className="px-4 py-3 border-b border-[#1A1A1A]">
            <div className="flex justify-between items-center">
              <h3 className="text-sm font-bold text-white">Fleet Vehicles</h3>
              <Button 
                variant="ghost" 
                size="sm"
                className="text-[#D4AF37] text-xs h-8 px-2"
                onClick={() => router.push("/dashboard/vehicles")}
              >
                View All
                <ChevronRight className="w-3 h-3 ml-0.5" />
              </Button>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-[#0F0F0F]">
                <tr className="text-left text-[10px] font-bold text-[#6B7280] uppercase">
                  <th className="px-3 py-2">Vehicle</th>
                  <th className="px-3 py-2">Temp</th>
                  <th className="px-3 py-2">Voltage</th>
                  <th className="px-3 py-2">Status</th>
                  <th className="px-3 py-2"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1A1A1A]">
                {vehicles.map((vehicle) => (
                  <tr 
                    key={vehicle.id} 
                    className="hover:bg-[#1A1A1A] cursor-pointer"
                    onClick={() => router.push(`/dashboard/vehicles/${vehicle.id}`)}
                  >
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-2">
                        {getVehicleIcon(vehicle.vehicle_type)}
                        <span className="font-bold text-white text-xs">{vehicle.plate_number}</span>
                      </div>
                    </td>
                    <td className="px-3 py-2">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${getTempBadge(vehicle.last_temperature)}`}>
                        {vehicle.last_temperature ? `${vehicle.last_temperature}°` : '--'}
                      </span>
                    </td>
                    <td className="px-3 py-2">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${getVoltageBadge(vehicle.last_voltage)}`}>
                        {vehicle.last_voltage ? `${vehicle.last_voltage}V` : '--'}
                      </span>
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex items-center">
                        {getStatusDot(vehicle.status)}
                        <span className="text-[11px] font-semibold text-white">{vehicle.status === "online" ? "Online" : "Offline"}</span>
                      </div>
                    </td>
                    <td className="px-3 py-2">
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-7 w-7"
                        onClick={(e) => {
                          e.stopPropagation();
                          router.push(`/dashboard/vehicles/${vehicle.id}`);
                        }}
                      >
                        <MoreVertical className="w-3.5 h-3.5" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Alerts Panel */}
        <div className="bg-[#0A0A0A] rounded-xl border border-[#1A1A1A] p-4">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-sm font-bold text-white">Real-Time Alerts</h3>
            <Button 
              variant="ghost" 
              className="text-[#D4AF37] text-xs p-0"
              onClick={() => router.push("/dashboard/alerts")}
            >
              View All
              <ChevronRight className="w-3 h-3 ml-0.5" />
            </Button>
          </div>
          <div className="space-y-2">
            {alerts.length === 0 ? (
              <div className="text-center py-6 text-[#6B7280]">
                <CheckCircle2 className="w-6 h-6 mx-auto mb-2 opacity-50" />
                <p className="text-xs">No active alerts</p>
              </div>
            ) : (
              alerts.map((alert) => (
                <div
                  key={alert.id}
                  className="p-3 rounded-lg bg-[#1A1A1A] border-l-4 border-l-[#EF4444] cursor-pointer"
                  onClick={() => router.push("/dashboard/alerts")}
                >
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 mt-0.5 text-[#EF4444]" />
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-white text-xs">{alert.message}</p>
                      <p className="text-[10px] text-[#6B7280] mt-0.5">{alert.vehicles?.plate_number || alert.vehicle_id}</p>
                      <div className="flex justify-between items-center mt-1">
                        <span className="text-[9px] font-bold text-[#D4AF37] uppercase">{alert.alert_type?.replace("_", " ")}</span>
                        <span className="text-[9px] text-[#4B5563]">{new Date(alert.created_at).toLocaleTimeString()}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    );
  }

  // DESKTOP VIEW
  return (
    <div>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <Card 
          className="bg-[#0A0A0A] border-[#1A1A1A] rounded-2xl p-6 premium-card cursor-pointer hover:border-[#D4AF37]/30 transition-all"
          onClick={() => router.push("/dashboard/vehicles")}
        >
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-bold text-[#6B7280] mb-2 uppercase tracking-wider">Active Vehicles</p>
              <p className="text-4xl font-extrabold text-white tracking-tight">{onlineCount}</p>
              <p className="text-xs font-medium text-[#4B5563] mt-2">Total: {vehicles.length}</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-[#1A1A1A] flex items-center justify-center">
              <Car className="w-5 h-5 text-[#D4AF37]" />
            </div>
          </div>
        </Card>

        <Card 
          className="bg-[#0A0A0A] border-[#1A1A1A] rounded-2xl p-6 premium-card cursor-pointer hover:border-[#D4AF37]/30 transition-all"
          onClick={() => router.push("/dashboard/alerts")}
        >
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-bold text-[#6B7280] mb-2 uppercase tracking-wider">Active Alerts</p>
              <p className="text-4xl font-extrabold text-[#EF4444] tracking-tight">{alertCount}</p>
              <p className="text-xs font-medium text-[#4B5563] mt-2">{warningCount} warnings</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-[#1A1A1A] flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-[#EF4444]" />
            </div>
          </div>
        </Card>

        <Card 
          className="bg-[#0A0A0A] border-[#1A1A1A] rounded-2xl p-6 premium-card cursor-pointer hover:border-[#D4AF37]/30 transition-all"
          onClick={() => router.push("/dashboard/reports")}
        >
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-bold text-[#6B7280] mb-2 uppercase tracking-wider">Online Today</p>
              <p className="text-4xl font-extrabold text-white tracking-tight">{onlinePercent}%</p>
              <p className="text-xs font-medium text-[#22C55E] mt-2">Fleet uptime</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-[#1A1A1A] flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5 text-[#22C55E]" />
            </div>
          </div>
        </Card>

        <Card 
          className="bg-[#0A0A0A] border-[#1A1A1A] rounded-2xl p-6 premium-card cursor-pointer hover:border-[#D4AF37]/30 transition-all"
          onClick={() => router.push("/dashboard/reports")}
        >
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-bold text-[#6B7280] mb-2 uppercase tracking-wider">Needs Service</p>
              <p className="text-4xl font-extrabold text-[#FACC15] tracking-tight">0</p>
              <p className="text-xs font-medium text-[#4B5563] mt-2">Maintenance</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-[#1A1A1A] flex items-center justify-center">
              <Wrench className="w-5 h-5 text-[#FACC15]" />
            </div>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <div className="bg-[#0A0A0A] rounded-2xl border border-[#1A1A1A] overflow-hidden">
            <div className="p-6 border-b border-[#1A1A1A]">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-bold text-white tracking-tight">Fleet Vehicles</h3>
                <Button 
                  variant="ghost" 
                  className="text-[#D4AF37] font-semibold hover:text-[#E5C86B] hover:bg-[#1A1A1A]"
                  onClick={() => router.push("/dashboard/vehicles")}
                >
                  View All
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-[#0F0F0F]">
                  <tr className="text-left text-xs font-bold text-[#6B7280] uppercase tracking-wider">
                    <th className="px-6 py-4">Vehicle</th>
                    <th className="px-6 py-4">Temperature</th>
                    <th className="px-6 py-4">Voltage</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4">Last Seen</th>
                    <th className="px-6 py-4"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1A1A1A]">
                  {vehicles.map((vehicle) => (
                    <tr 
                      key={vehicle.id} 
                      className="hover:bg-[#1A1A1A] transition-colors cursor-pointer"
                      onClick={() => router.push(`/dashboard/vehicles/${vehicle.id}`)}
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          {getVehicleIcon(vehicle.vehicle_type)}
                          <span className="font-bold text-white">{vehicle.plate_number}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-3 py-1 rounded-full text-sm font-bold ${getTempBadge(vehicle.last_temperature)}`}>
                          {vehicle.last_temperature ? `${vehicle.last_temperature}°C` : '--'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-3 py-1 rounded-full text-sm font-bold ${getVoltageBadge(vehicle.last_voltage)}`}>
                          {vehicle.last_voltage ? `${vehicle.last_voltage}V` : '--'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center">
                          {getStatusDot(vehicle.status)}
                          <span className="text-sm font-semibold capitalize text-white">{vehicle.status || 'offline'}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm font-medium text-[#6B7280]">
                        {vehicle.last_seen ? new Date(vehicle.last_seen).toLocaleTimeString() : '--'}
                      </td>
                      <td className="px-6 py-4">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="text-[#6B7280] hover:text-white"
                          onClick={(e) => {
                            e.stopPropagation();
                            router.push(`/dashboard/vehicles/${vehicle.id}`);
                          }}
                        >
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div>
          <div className="bg-[#0A0A0A] rounded-2xl border border-[#1A1A1A] p-6">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-bold text-white tracking-tight">Real-Time Alerts</h3>
              <Button 
                variant="ghost" 
                className="text-[#D4AF37] font-semibold hover:text-[#E5C86B] text-sm p-0 h-auto"
                onClick={() => router.push("/dashboard/alerts")}
              >
                View All
                <ChevronRight className="w-3 h-3 ml-1" />
              </Button>
            </div>
            <div className="space-y-3">
              {alerts.length === 0 ? (
                <div className="text-center py-8 text-[#6B7280]">
                  <CheckCircle2 className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  No active alerts
                </div>
              ) : (
                alerts.map((alert) => (
                  <div
                    key={alert.id}
                    className="p-4 rounded-xl bg-[#1A1A1A] border-l-4 border-l-[#EF4444] hover:bg-[#222222] transition-colors cursor-pointer"
                    onClick={() => router.push("/dashboard/alerts")}
                  >
                    <div className="flex items-start gap-3">
                      <AlertTriangle className="w-5 h-5 mt-0.5 text-[#EF4444]" />
                      <div className="flex-1">
                        <p className="font-bold text-white text-sm">{alert.message}</p>
                        <p className="text-xs font-medium text-[#6B7280] mt-1">
                          {alert.vehicles?.plate_number || alert.vehicle_id}
                        </p>
                        <div className="flex justify-between items-center mt-2">
                          <span className="text-xs font-bold text-[#D4AF37] uppercase">{alert.alert_type?.replace("_", " ")}</span>
                          <span className="text-xs font-medium text-[#4B5563]">
                            {new Date(alert.created_at).toLocaleTimeString()}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
