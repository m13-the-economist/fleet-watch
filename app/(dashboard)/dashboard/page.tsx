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
  ChevronRight,
  Activity,
  Fuel,
} from "lucide-react";
import { useMediaQuery } from "@/hooks/useMediaQuery";

interface Vehicle {
  id: string;
  plate_number: string;
  vehicle_type: string;
  last_temperature: number;
  last_voltage: number;
  last_fuel_level: number;
  last_fault_code: string;
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
  is_resolved: boolean;
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

const getFuelBadge = (fuel: number) => {
  if (!fuel && fuel !== 0) return "text-[#6B7280] bg-[#1A1A1A]";
  if (fuel < 5) return "text-[#EF4444] bg-[#EF4444]/10";
  if (fuel <= 15) return "text-[#FACC15] bg-[#FACC15]/10";
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

const getHealthColor = (percent: number) => {
  if (percent >= 80) return "text-[#22C55E]";
  if (percent >= 50) return "text-[#FACC15]";
  return "text-[#EF4444]";
};

// Helper functions to match Reports page logic
const getVehicleWarningAlerts = (alerts: Alert[], vehicleId: string) => {
  return alerts.filter(a => a.vehicle_id === vehicleId && a.severity === "warning");
};

const getVehicleCriticalAlerts = (alerts: Alert[], vehicleId: string) => {
  return alerts.filter(a => a.vehicle_id === vehicleId && a.severity === "critical");
};

export default function DashboardHomePage() {
  const router = useRouter();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const supabase = createClient();
  const isMobile = !useMediaQuery("(min-width: 768px)");

  async function fetchData() {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/signin');
        return;
      }

      const { data: vehiclesData } = await supabase
        .from("vehicles")
        .select("*")
        .eq("profile_id", session.user.id)
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
        .order("created_at", { ascending: false });

      if (alertsData) {
        setAlerts(alertsData);
      }
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  // Auto-refresh every 30 seconds
  useEffect(() => {
    fetchData();
    
    const interval = setInterval(() => {
      setRefreshing(true);
      fetchData();
    }, 30000);
    
    return () => clearInterval(interval);
  }, []);

  const onlineCount = vehicles.filter(v => v.status === "online").length;
  const totalActiveAlerts = alerts.length;
  const criticalCount = alerts.filter(a => a.severity === "critical").length;
  const warningCount = alerts.filter(a => a.severity === "warning").length;
  
  // FIXED: NEEDS SERVICE - Same logic as Reports page (Warning level)
  // Includes: temp warning, voltage warning, fuel warning, warning alerts, fault codes
  const needsService = vehicles.filter(v => {
    const hasHighTempWarning = (v.last_temperature || 0) > 95 && (v.last_temperature || 0) <= 105;
    const hasLowVoltageWarning = (v.last_voltage || 0) >= 11.8 && (v.last_voltage || 0) < 12.2;
    const hasLowFuelWarning = (v.last_fuel_level || 0) >= 5 && (v.last_fuel_level || 0) <= 15;
    const hasWarningAlert = getVehicleWarningAlerts(alerts, v.id).length > 0;
    const hasFaultCode = v.last_fault_code;
    return hasHighTempWarning || hasLowVoltageWarning || hasLowFuelWarning || hasWarningAlert || hasFaultCode;
  }).length;
  
  // FIXED: NEEDS REPAIR - Same logic as Reports page (Critical level)
  // Includes: temp critical, voltage critical, fuel critical, critical alerts
  const needsRepair = vehicles.filter(v => {
    const hasCriticalTemp = (v.last_temperature || 0) > 105;
    const hasCriticalVoltage = (v.last_voltage || 0) < 11.8;
    const hasCriticalFuel = (v.last_fuel_level || 0) < 5;
    const hasCriticalAlert = getVehicleCriticalAlerts(alerts, v.id).length > 0;
    return hasCriticalTemp || hasCriticalVoltage || hasCriticalFuel || hasCriticalAlert;
  }).length;

  // FIXED: Healthy vehicles - vehicles with NO critical issues AND NO warning issues
  const healthyVehicles = vehicles.filter(v => {
    const hasNoCriticalTemp = (v.last_temperature || 0) <= 105;
    const hasNoCriticalVoltage = (v.last_voltage || 0) >= 11.8;
    const hasNoCriticalFuel = (v.last_fuel_level || 0) >= 5;
    const hasNoCriticalAlert = getVehicleCriticalAlerts(alerts, v.id).length === 0;
    const hasNoWarningTemp = (v.last_temperature || 0) <= 95;
    const hasNoWarningVoltage = (v.last_voltage || 0) >= 12.2;
    const hasNoWarningFuel = (v.last_fuel_level || 0) > 15;
    const hasNoWarningAlert = getVehicleWarningAlerts(alerts, v.id).length === 0;
    const hasNoFaultCode = !v.last_fault_code;
    const isOnline = v.status === "online";
    return hasNoCriticalTemp && hasNoCriticalVoltage && hasNoCriticalFuel && hasNoCriticalAlert &&
           hasNoWarningTemp && hasNoWarningVoltage && hasNoWarningFuel && hasNoWarningAlert && 
           hasNoFaultCode && isOnline;
  }).length;
  
  const fleetHealthPercent = vehicles.length > 0 ? Math.round((healthyVehicles / vehicles.length) * 100) : 100;
  const healthColor = getHealthColor(fleetHealthPercent);

  const recentVehicles = vehicles.slice(0, 5);
  const recentAlerts = alerts.slice(0, 5);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-white text-base">Loading fleet data...</div>
      </div>
    );
  }

  // MOBILE VIEW
  if (isMobile) {
    return (
      <div>
        {/* Auto-refresh indicator */}
        {refreshing && (
          <div className="fixed top-2 right-2 z-50 bg-black/80 text-[#D4AF37] text-[8px] px-2 py-1 rounded-full">
            Refreshing...
          </div>
        )}

        <div className="grid grid-cols-2 gap-3 mb-5">
          <Card 
            className="bg-[#0A0A0A] border-[#1A1A1A] rounded-xl p-3 cursor-pointer"
            onClick={() => router.push("/dashboard/vehicles")}
          >
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs font-bold text-[#6B7280] mb-1">Active Vehicles</p>
                <p className="text-2xl font-extrabold text-white">{onlineCount}</p>
                <p className="text-xs text-[#4B5563] mt-0.5">Total: {vehicles.length}</p>
              </div>
              <Car className="w-5 h-5 text-[#D4AF37]" />
            </div>
          </Card>

          <Card 
            className="bg-[#0A0A0A] border-[#1A1A1A] rounded-xl p-3 cursor-pointer"
            onClick={() => router.push("/dashboard/alerts")}
          >
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs font-bold text-[#6B7280] mb-1">Active Alerts</p>
                <p className="text-2xl font-extrabold text-[#EF4444]">{totalActiveAlerts}</p>
                <p className="text-xs text-[#4B5563] mt-0.5">{criticalCount} critical, {warningCount} warnings</p>
              </div>
              <AlertTriangle className="w-5 h-5 text-[#EF4444]" />
            </div>
          </Card>

          <Card 
            className="bg-[#0A0A0A] border-[#1A1A1A] rounded-xl p-3 cursor-pointer"
            onClick={() => router.push("/dashboard/reports")}
          >
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs font-bold text-[#6B7280] mb-1">Needs Service</p>
                <p className="text-2xl font-extrabold text-[#FACC15]">{needsService}</p>
                <p className="text-xs text-[#4B5563] mt-0.5">Warning level</p>
              </div>
              <Wrench className="w-5 h-5 text-[#FACC15]" />
            </div>
          </Card>

          <Card 
            className="bg-[#0A0A0A] border-red-500/30 rounded-xl p-3 cursor-pointer"
            onClick={() => router.push("/dashboard/alerts")}
          >
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs font-bold text-red-400 mb-1">Needs Repair</p>
                <p className="text-2xl font-extrabold text-[#EF4444]">{needsRepair}</p>
                <p className="text-xs text-[#4B5563] mt-0.5">Critical issues</p>
              </div>
              <AlertTriangle className="w-5 h-5 text-[#EF4444]" />
            </div>
          </Card>
        </div>

        {/* Fleet Health Card */}
        <div className="mb-5">
          <Card 
            className="bg-[#0A0A0A] border-[#1A1A1A] rounded-xl p-3 cursor-pointer hover:border-[#D4AF37]/30 transition-all"
            onClick={() => router.push("/dashboard/reports")}
          >
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <p className="text-xs font-bold text-[#6B7280] mb-1 uppercase tracking-wider">Fleet Health</p>
                <div className="flex items-baseline gap-2">
                  <p className={`text-2xl font-extrabold ${healthColor}`}>{fleetHealthPercent}%</p>
                  <p className="text-xs text-[#4B5563]">{healthyVehicles} of {vehicles.length} vehicles healthy</p>
                </div>
                <div className="mt-2 w-full bg-[#1A1A1A] rounded-full h-1.5">
                  <div 
                    className={`h-1.5 rounded-full ${
                      fleetHealthPercent >= 80 ? "bg-[#22C55E]" : 
                      fleetHealthPercent >= 50 ? "bg-[#FACC15]" : "bg-[#EF4444]"
                    }`}
                    style={{ width: `${fleetHealthPercent}%` }}
                  />
                </div>
              </div>
              <div className="w-8 h-8 rounded-xl bg-[#1A1A1A] flex items-center justify-center">
                <Activity className="w-4 h-4 text-[#D4AF37]" />
              </div>
            </div>
          </Card>
        </div>

        <div className="bg-[#0A0A0A] rounded-xl border border-[#1A1A1A] overflow-hidden mb-5">
          <div className="px-4 py-3 border-b border-[#1A1A1A]">
            <div className="flex justify-between items-center">
              <h3 className="text-sm font-bold text-white">Recent Vehicles</h3>
              <Button 
                variant="ghost" 
                size="sm"
                className="text-[#D4AF37] text-xs h-7 px-2"
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
                  <th className="px-3 py-2">Fuel</th>
                  <th className="px-3 py-2">Status</th>
                 </tr>
              </thead>
              <tbody className="divide-y divide-[#1A1A1A]">
                {recentVehicles.map((vehicle) => (
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
                      <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-bold ${getTempBadge(vehicle.last_temperature)}`}>
                        {vehicle.last_temperature ? `${vehicle.last_temperature}°` : '--'}
                      </span>
                    </td>
                    <td className="px-3 py-2">
                      <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-bold ${getVoltageBadge(vehicle.last_voltage)}`}>
                        {vehicle.last_voltage ? `${vehicle.last_voltage}V` : '--'}
                      </span>
                    </td>
                    <td className="px-3 py-2">
                      <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-bold ${getFuelBadge(vehicle.last_fuel_level)}`}>
                        {vehicle.last_fuel_level !== undefined && vehicle.last_fuel_level !== null ? `${vehicle.last_fuel_level}%` : '--'}
                      </span>
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex items-center">
                        {getStatusDot(vehicle.status)}
                        <span className="text-[10px] font-semibold text-white">{vehicle.status === "online" ? "Online" : "Offline"}</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {vehicles.length === 0 && (
            <div className="text-center py-6 text-[#6B7280]">
              <p className="text-xs">No vehicles yet. Add your first vehicle.</p>
            </div>
          )}
        </div>

        <div className="bg-[#0A0A0A] rounded-xl border border-[#1A1A1A] p-3">
          <div className="flex justify-between items-center mb-2">
            <h3 className="text-sm font-bold text-white">Recent Alerts</h3>
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
            {recentAlerts.length === 0 ? (
              <div className="text-center py-4 text-[#6B7280]">
                <CheckCircle2 className="w-6 h-6 mx-auto mb-1 opacity-50" />
                <p className="text-xs">No active alerts</p>
              </div>
            ) : (
              recentAlerts.map((alert) => (
                <div
                  key={alert.id}
                  className="p-2 rounded-lg bg-[#1A1A1A] border-l-3 border-l-[#EF4444] cursor-pointer"
                  onClick={() => router.push("/dashboard/alerts")}
                >
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 mt-0.5 text-[#EF4444]" />
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-white text-[11px]">{alert.message}</p>
                      <p className="text-[9px] text-[#6B7280] mt-0.5">{alert.vehicles?.plate_number || alert.vehicle_id}</p>
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
      {/* Auto-refresh indicator */}
      {refreshing && (
        <div className="fixed top-20 right-4 z-50 bg-black/80 text-[#D4AF37] text-[10px] px-2 py-1 rounded-full">
          Refreshing...
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-5 gap-5 mb-6">
        <Card 
          className="bg-[#0A0A0A] border-[#1A1A1A] rounded-xl p-4 cursor-pointer hover:border-[#D4AF37]/30 transition-all"
          onClick={() => router.push("/dashboard/vehicles")}
        >
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-bold text-[#6B7280] mb-1 uppercase tracking-wider">Active Vehicles</p>
              <p className="text-2xl font-extrabold text-white tracking-tight">{onlineCount}</p>
              <p className="text-xs font-medium text-[#4B5563] mt-1">Total: {vehicles.length}</p>
            </div>
            <div className="w-8 h-8 rounded-lg bg-[#1A1A1A] flex items-center justify-center">
              <Car className="w-4 h-4 text-[#D4AF37]" />
            </div>
          </div>
        </Card>

        <Card 
          className="bg-[#0A0A0A] border-[#1A1A1A] rounded-xl p-4 cursor-pointer hover:border-[#D4AF37]/30 transition-all"
          onClick={() => router.push("/dashboard/alerts")}
        >
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-bold text-[#6B7280] mb-1 uppercase tracking-wider">Active Alerts</p>
              <p className="text-2xl font-extrabold text-[#EF4444] tracking-tight">{totalActiveAlerts}</p>
              <p className="text-xs font-medium text-[#4B5563] mt-1">{criticalCount} critical, {warningCount} warnings</p>
            </div>
            <div className="w-8 h-8 rounded-lg bg-[#1A1A1A] flex items-center justify-center">
              <AlertTriangle className="w-4 h-4 text-[#EF4444]" />
            </div>
          </div>
        </Card>

        <Card 
          className="bg-[#0A0A0A] border-[#1A1A1A] rounded-xl p-4 cursor-pointer hover:border-[#D4AF37]/30 transition-all"
          onClick={() => router.push("/dashboard/reports")}
        >
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-bold text-[#6B7280] mb-1 uppercase tracking-wider">Needs Service</p>
              <p className="text-2xl font-extrabold text-[#FACC15] tracking-tight">{needsService}</p>
              <p className="text-xs font-medium text-[#4B5563] mt-1">Warning level</p>
            </div>
            <div className="w-8 h-8 rounded-lg bg-[#1A1A1A] flex items-center justify-center">
              <Wrench className="w-4 h-4 text-[#FACC15]" />
            </div>
          </div>
        </Card>

        <Card 
          className="bg-[#0A0A0A] border-red-500/30 rounded-xl p-4 cursor-pointer hover:border-red-500/50 transition-all"
          onClick={() => router.push("/dashboard/alerts")}
        >
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-bold text-red-400 mb-1 uppercase tracking-wider">Needs Repair</p>
              <p className="text-2xl font-extrabold text-[#EF4444] tracking-tight">{needsRepair}</p>
              <p className="text-xs font-medium text-[#4B5563] mt-1">Critical issues</p>
            </div>
            <div className="w-8 h-8 rounded-lg bg-red-500/10 flex items-center justify-center">
              <AlertTriangle className="w-4 h-4 text-[#EF4444]" />
            </div>
          </div>
        </Card>

        <Card 
          className="bg-[#0A0A0A] border-[#1A1A1A] rounded-xl p-4 cursor-pointer hover:border-[#D4AF37]/30 transition-all"
          onClick={() => router.push("/dashboard/reports")}
        >
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-bold text-[#6B7280] mb-1 uppercase tracking-wider">Fleet Health</p>
              <p className={`text-2xl font-extrabold tracking-tight ${healthColor}`}>{fleetHealthPercent}%</p>
              <p className="text-xs font-medium text-[#4B5563] mt-1">{healthyVehicles} of {vehicles.length} healthy</p>
            </div>
            <div className="w-8 h-8 rounded-lg bg-[#1A1A1A] flex items-center justify-center">
              <Activity className="w-4 h-4 text-[#D4AF37]" />
            </div>
          </div>
          <div className="mt-2 w-full bg-[#1A1A1A] rounded-full h-1.5">
            <div 
              className={`h-1.5 rounded-full ${
                fleetHealthPercent >= 80 ? "bg-[#22C55E]" : 
                fleetHealthPercent >= 50 ? "bg-[#FACC15]" : "bg-[#EF4444]"
              }`}
              style={{ width: `${fleetHealthPercent}%` }}
            />
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2">
          <div className="bg-[#0A0A0A] rounded-xl border border-[#1A1A1A] overflow-hidden">
            <div className="p-4 border-b border-[#1A1A1A]">
              <div className="flex justify-between items-center">
                <h3 className="text-base font-bold text-white tracking-tight">Recent Vehicles</h3>
                <Button 
                  variant="ghost" 
                  className="text-[#D4AF37] font-semibold hover:text-[#E5C86B] hover:bg-[#1A1A1A] text-sm"
                  onClick={() => router.push("/dashboard/vehicles")}
                >
                  View All
                  <ChevronRight className="w-3 h-3 ml-1" />
                </Button>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-[#0F0F0F]">
                  <tr className="text-left text-[10px] font-bold text-[#6B7280] uppercase tracking-wider">
                    <th className="px-4 py-3">Vehicle</th>
                    <th className="px-4 py-3">Temperature</th>
                    <th className="px-4 py-3">Voltage</th>
                    <th className="px-4 py-3">Fuel</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Last Seen</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1A1A1A]">
                  {recentVehicles.map((vehicle) => (
                    <tr 
                      key={vehicle.id} 
                      className="hover:bg-[#1A1A1A] transition-colors cursor-pointer"
                      onClick={() => router.push(`/dashboard/vehicles/${vehicle.id}`)}
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          {getVehicleIcon(vehicle.vehicle_type)}
                          <span className="font-bold text-white text-sm">{vehicle.plate_number}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${getTempBadge(vehicle.last_temperature)}`}>
                          {vehicle.last_temperature ? `${vehicle.last_temperature}°C` : '--'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${getVoltageBadge(vehicle.last_voltage)}`}>
                          {vehicle.last_voltage ? `${vehicle.last_voltage}V` : '--'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${getFuelBadge(vehicle.last_fuel_level)}`}>
                          {vehicle.last_fuel_level !== undefined && vehicle.last_fuel_level !== null ? `${vehicle.last_fuel_level}%` : '--'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center">
                          {getStatusDot(vehicle.status)}
                          <span className="text-xs font-semibold capitalize text-white">{vehicle.status || 'offline'}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs font-medium text-[#6B7280]">
                        {vehicle.last_seen ? new Date(vehicle.last_seen).toLocaleTimeString() : '--'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {vehicles.length === 0 && (
              <div className="text-center py-10 text-[#6B7280]">
                <Car className="w-10 h-10 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No vehicles yet. Click "Add Vehicle" to get started.</p>
              </div>
            )}
          </div>
        </div>

        <div>
          <div className="bg-[#0A0A0A] rounded-xl border border-[#1A1A1A] p-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-base font-bold text-white tracking-tight">Recent Alerts</h3>
              <Button 
                variant="ghost" 
                className="text-[#D4AF37] font-semibold hover:text-[#E5C86B] text-sm p-0 h-auto"
                onClick={() => router.push("/dashboard/alerts")}
              >
                View All
                <ChevronRight className="w-3 h-3 ml-1" />
              </Button>
            </div>
            <div className="space-y-2">
              {recentAlerts.length === 0 ? (
                <div className="text-center py-6 text-[#6B7280]">
                  <CheckCircle2 className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No active alerts</p>
                </div>
              ) : (
                recentAlerts.map((alert) => (
                  <div
                    key={alert.id}
                    className="p-3 rounded-lg bg-[#1A1A1A] border-l-3 border-l-[#EF4444] hover:bg-[#222222] transition-colors cursor-pointer"
                    onClick={() => router.push("/dashboard/alerts")}
                  >
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="w-4 h-4 mt-0.5 text-[#EF4444]" />
                      <div className="flex-1">
                        <p className="font-bold text-white text-xs">{alert.message}</p>
                        <p className="text-[10px] font-medium text-[#6B7280] mt-1">
                          {alert.vehicles?.plate_number || alert.vehicle_id}
                        </p>
                        <div className="flex justify-between items-center mt-1">
                          <span className="text-[10px] font-bold text-[#D4AF37] uppercase">{alert.alert_type?.replace("_", " ")}</span>
                          <span className="text-[10px] font-medium text-[#4B5563]">
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
