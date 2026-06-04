"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { createClient } from "@/lib/supabase/client";
import {
  Download,
  Car,
  Battery,
  Thermometer,
  Wrench,
  AlertCircle,
  CheckCircle2,
  AlertTriangle,
  Eye,
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
  last_fault_code: string;
}

interface Alert {
  id: string;
  vehicle_id: string;
  alert_type: string;
  severity: string;
  message: string;
  created_at: string;
  is_resolved: boolean;
}

export default function ReportsPage() {
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
    const { data: vehiclesData } = await supabase.from("vehicles").select("*");
    const { data: alertsData } = await supabase
      .from("alerts")
      .select("*")
      .eq("is_resolved", false);

    if (vehiclesData) setVehicles(vehiclesData);
    if (alertsData) setAlerts(alertsData);
    setLoading(false);
  }

  const getVehicleCriticalAlerts = (vehicleId: string) => {
    return alerts.filter(a => a.vehicle_id === vehicleId && a.severity === "critical");
  };

  const getVehicleStatus = (vehicle: Vehicle) => {
    const criticalAlerts = getVehicleCriticalAlerts(vehicle.id);
    const hasHighTemp = vehicle.last_temperature > 95;
    const hasLowVoltage = vehicle.last_voltage < 12.0;
    const hasFaultCode = vehicle.last_fault_code;
    
    if (criticalAlerts.length > 0 || hasFaultCode) {
      return { type: "repair", label: "Repair Needed", color: "bg-[#EF4444]/20 text-[#EF4444]" };
    }
    if (hasHighTemp || hasLowVoltage) {
      return { type: "service", label: "Service Needed", color: "bg-[#FACC15]/20 text-[#FACC15]" };
    }
    return { type: "good", label: "All Good", color: "bg-[#22C55E]/20 text-[#22C55E]" };
  };

  const onlineCount = vehicles.filter(v => v.status === "online").length;
  const totalAlerts = alerts.length;
  const criticalAlerts = alerts.filter(a => a.severity === "critical").length;
  
  const temps = vehicles.filter(v => v.last_temperature).map(v => v.last_temperature);
  const avgTemp = temps.length > 0 ? temps.reduce((a, b) => a + b, 0) / temps.length : 0;
  
  const voltages = vehicles.filter(v => v.last_voltage).map(v => v.last_voltage);
  const avgVoltage = voltages.length > 0 ? voltages.reduce((a, b) => a + b, 0) / voltages.length : 0;

  const needsService = vehicles.filter(v => {
    const status = getVehicleStatus(v);
    return status.type === "service";
  }).length;

  const needsRepair = vehicles.filter(v => {
    const status = getVehicleStatus(v);
    return status.type === "repair";
  }).length;

  const alertsByType: Record<string, number> = {};
  alerts.forEach(alert => {
    alertsByType[alert.alert_type] = (alertsByType[alert.alert_type] || 0) + 1;
  });

  function exportCSV() {
    const csvData = [
      ["Report Generated", new Date().toLocaleString()],
      [],
      ["FLEET SUMMARY"],
      ["Metric", "Value"],
      ["Total Vehicles", vehicles.length],
      ["Active Vehicles", onlineCount],
      ["Total Active Alerts", totalAlerts],
      ["Critical Alerts", criticalAlerts],
      ["Average Temperature (°C)", avgTemp.toFixed(1)],
      ["Average Voltage (V)", avgVoltage.toFixed(1)],
      ["Needs Service", needsService],
      ["Needs Repair", needsRepair],
      [],
      ["ALL VEHICLES"],
      ["Plate Number", "Temperature", "Voltage", "Status", "Service Status", "Issues"],
      ...vehicles.map(v => {
        const status = getVehicleStatus(v);
        const issues = [];
        if (v.last_temperature > 95) issues.push("High Temp");
        if (v.last_voltage < 12.0) issues.push("Low Voltage");
        if (v.last_fault_code) issues.push(`Fault: ${v.last_fault_code}`);
        if (getVehicleCriticalAlerts(v.id).length > 0) issues.push("Critical Alert");
        
        return [
          v.plate_number,
          v.last_temperature ? `${v.last_temperature}°C` : "--",
          v.last_voltage ? `${v.last_voltage}V` : "--",
          v.status,
          status.label,
          issues.join(", ") || "None"
        ];
      })
    ];

    const csvContent = csvData.map(row => row.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `fleet-report-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-white">Loading reports...</div>
      </div>
    );
  }

  // MOBILE VIEW - Compact
  if (isMobile) {
    return (
      <div>
        <div className="flex justify-between items-center mb-4">
          <div>
            <h1 className="text-lg font-bold text-white">Reports</h1>
            <p className="text-[10px] text-[#6B7280]">Fleet analytics</p>
          </div>
          <Button onClick={exportCSV} size="sm" className="bg-[#D4AF37] hover:bg-[#E5C86B] text-black h-8">
            <Download className="w-3 h-3 mr-1" />
            Export
          </Button>
        </div>

        {/* Summary Cards - 2x2 grid smaller */}
        <div className="grid grid-cols-2 gap-2 mb-4">
          <Card className="bg-[#0A0A0A] border-[#1A1A1A] rounded-xl p-3">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-[9px] font-bold text-[#6B7280] uppercase">Total Vehicles</p>
                <p className="text-xl font-extrabold text-white">{vehicles.length}</p>
                <p className="text-[8px] text-[#22C55E]">{onlineCount} active</p>
              </div>
              <Car className="w-4 h-4 text-[#D4AF37]" />
            </div>
          </Card>

          <Card className="bg-[#0A0A0A] border-[#1A1A1A] rounded-xl p-3">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-[9px] font-bold text-[#6B7280] uppercase">Active Alerts</p>
                <p className="text-xl font-extrabold text-[#EF4444]">{totalAlerts}</p>
                <p className="text-[8px] text-[#6B7280]">{criticalAlerts} critical</p>
              </div>
              <AlertTriangle className="w-4 h-4 text-[#EF4444]" />
            </div>
          </Card>

          <Card className="bg-[#0A0A0A] border-[#1A1A1A] rounded-xl p-3">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-[9px] font-bold text-[#6B7280] uppercase">Avg Temp</p>
                <p className="text-xl font-extrabold text-white">{avgTemp.toFixed(1)}°</p>
              </div>
              <Thermometer className="w-4 h-4 text-[#FACC15]" />
            </div>
          </Card>

          <Card className="bg-[#0A0A0A] border-[#1A1A1A] rounded-xl p-3">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-[9px] font-bold text-[#6B7280] uppercase">Avg Voltage</p>
                <p className="text-xl font-extrabold text-white">{avgVoltage.toFixed(1)}V</p>
              </div>
              <Battery className="w-4 h-4 text-[#22C55E]" />
            </div>
          </Card>
        </div>

        {/* Service & Repair Cards - 2 columns */}
        <div className="grid grid-cols-2 gap-2 mb-4">
          <Card className="bg-[#0A0A0A] border-[#1A1A1A] rounded-xl p-3">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-[9px] font-bold text-[#6B7280] uppercase">Needs Service</p>
                <p className="text-xl font-extrabold text-[#FACC15]">{needsService}</p>
              </div>
              <Wrench className="w-4 h-4 text-[#FACC15]" />
            </div>
          </Card>

          <Card className="bg-[#0A0A0A] border-[#1A1A1A] rounded-xl p-3">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-[9px] font-bold text-[#6B7280] uppercase">Needs Repair</p>
                <p className="text-xl font-extrabold text-[#EF4444]">{needsRepair}</p>
              </div>
              <AlertCircle className="w-4 h-4 text-[#EF4444]" />
            </div>
          </Card>
        </div>

        {/* Alerts by Type - Compact */}
        <Card className="bg-[#0A0A0A] border-[#1A1A1A] rounded-xl p-3 mb-4">
          <h3 className="text-xs font-bold text-white mb-2">Alerts by Type</h3>
          <div className="space-y-2">
            {Object.entries(alertsByType).map(([type, count]) => (
              <div key={type} className="flex justify-between items-center">
                <span className="text-[10px] text-[#6B7280] capitalize">{type.replace("_", " ")}</span>
                <div className="flex items-center gap-2">
                  <div className="w-24 bg-[#1A1A1A] rounded-full h-1.5">
                    <div
                      className="bg-[#EF4444] h-1.5 rounded-full"
                      style={{ width: `${(count / totalAlerts) * 100}%` }}
                    />
                  </div>
                  <span className="text-white font-semibold text-[10px]">{count}</span>
                </div>
              </div>
            ))}
            {totalAlerts === 0 && (
              <p className="text-center text-[#6B7280] text-[10px] py-2">No active alerts</p>
            )}
          </div>
        </Card>

        {/* Vehicles Table - Compact */}
        <Card className="bg-[#0A0A0A] border-[#1A1A1A] rounded-xl overflow-hidden">
          <div className="px-3 py-2 border-b border-[#1A1A1A]">
            <h3 className="text-xs font-bold text-white">All Vehicles</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-[10px]">
              <thead className="bg-[#0F0F0F]">
                <tr className="text-left text-[9px] font-bold text-[#6B7280] uppercase">
                  <th className="px-2 py-2">Vehicle</th>
                  <th className="px-2 py-2">Temp</th>
                  <th className="px-2 py-2">Voltage</th>
                  <th className="px-2 py-2">Status</th>
                  <th className="px-2 py-2"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1A1A1A]">
                {vehicles.map((vehicle) => {
                  const status = getVehicleStatus(vehicle);
                  return (
                    <tr 
                      key={vehicle.id} 
                      className="hover:bg-[#1A1A1A] cursor-pointer"
                      onClick={() => router.push(`/dashboard/vehicles/${vehicle.id}`)}
                    >
                      <td className="px-2 py-2 font-bold text-white text-[10px]">{vehicle.plate_number}</td>
                      <td className="px-2 py-2">
                        <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-bold ${
                          vehicle.last_temperature > 95 ? "bg-[#EF4444]/20 text-[#EF4444]" : 
                          vehicle.last_temperature > 85 ? "bg-[#FACC15]/20 text-[#FACC15]" : "text-[#6B7280]"
                        }`}>
                          {vehicle.last_temperature ? `${vehicle.last_temperature}°` : "--"}
                        </span>
                      </td>
                      <td className="px-2 py-2">
                        <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-bold ${
                          vehicle.last_voltage < 11.8 ? "bg-[#EF4444]/20 text-[#EF4444]" :
                          vehicle.last_voltage < 12.2 ? "bg-[#FACC15]/20 text-[#FACC15]" : "text-[#6B7280]"
                        }`}>
                          {vehicle.last_voltage ? `${vehicle.last_voltage}V` : "--"}
                        </span>
                      </td>
                      <td className="px-2 py-2">
                        <Badge className={status.color} style={{ fontSize: "8px", padding: "2px 6px" }}>
                          {status.label === "All Good" ? "Good" : status.label === "Service Needed" ? "Service" : "Repair"}
                        </Badge>
                      </td>
                      <td className="px-2 py-2">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-6 w-6"
                          onClick={(e) => {
                            e.stopPropagation();
                            router.push(`/dashboard/vehicles/${vehicle.id}`);
                          }}
                        >
                          <Eye className="w-3 h-3" />
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    );
  }

  // DESKTOP VIEW - Original untouched
  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Fleet Reports</h1>
          <p className="text-sm text-[#6B7280] mt-1">Comprehensive fleet analytics and insights</p>
        </div>
        <Button onClick={exportCSV} className="bg-[#D4AF37] hover:bg-[#E5C86B] text-black">
          <Download className="w-4 h-4 mr-2" />
          Export CSV
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card className="bg-[#0A0A0A] border-[#1A1A1A] rounded-2xl p-6">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-bold text-[#6B7280] mb-2 uppercase tracking-wider">Total Vehicles</p>
              <p className="text-3xl font-extrabold text-white">{vehicles.length}</p>
              <p className="text-xs text-[#22C55E] mt-2">{onlineCount} active</p>
            </div>
            <Car className="w-5 h-5 text-[#D4AF37]" />
          </div>
        </Card>

        <Card className="bg-[#0A0A0A] border-[#1A1A1A] rounded-2xl p-6">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-bold text-[#6B7280] mb-2 uppercase tracking-wider">Active Alerts</p>
              <p className="text-3xl font-extrabold text-[#EF4444]">{totalAlerts}</p>
              <p className="text-xs text-[#6B7280] mt-2">{criticalAlerts} critical</p>
            </div>
            <AlertTriangle className="w-5 h-5 text-[#EF4444]" />
          </div>
        </Card>

        <Card className="bg-[#0A0A0A] border-[#1A1A1A] rounded-2xl p-6">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-bold text-[#6B7280] mb-2 uppercase tracking-wider">Avg Temperature</p>
              <p className="text-3xl font-extrabold text-white">{avgTemp.toFixed(1)}°C</p>
              <p className="text-xs text-[#6B7280] mt-2">Fleet average</p>
            </div>
            <Thermometer className="w-5 h-5 text-[#FACC15]" />
          </div>
        </Card>

        <Card className="bg-[#0A0A0A] border-[#1A1A1A] rounded-2xl p-6">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-bold text-[#6B7280] mb-2 uppercase tracking-wider">Avg Voltage</p>
              <p className="text-3xl font-extrabold text-white">{avgVoltage.toFixed(1)}V</p>
              <p className="text-xs text-[#6B7280] mt-2">Fleet average</p>
            </div>
            <Battery className="w-5 h-5 text-[#22C55E]" />
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <Card className="bg-[#0A0A0A] border-[#1A1A1A] rounded-2xl p-6">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-bold text-[#6B7280] mb-2 uppercase tracking-wider">Needs Service</p>
              <p className="text-4xl font-extrabold text-[#FACC15]">{needsService}</p>
              <p className="text-xs text-[#6B7280] mt-2">High temp or low voltage</p>
            </div>
            <Wrench className="w-5 h-5 text-[#FACC15]" />
          </div>
        </Card>

        <Card className="bg-[#0A0A0A] border-[#1A1A1A] rounded-2xl p-6">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-bold text-[#6B7280] mb-2 uppercase tracking-wider">Needs Repair</p>
              <p className="text-4xl font-extrabold text-[#EF4444]">{needsRepair}</p>
              <p className="text-xs text-[#6B7280] mt-2">Critical alerts or fault codes</p>
            </div>
            <AlertCircle className="w-5 h-5 text-[#EF4444]" />
          </div>
        </Card>
      </div>

      <Card className="bg-[#0A0A0A] border-[#1A1A1A] rounded-2xl p-6 mb-8">
        <h3 className="text-lg font-bold text-white mb-4">Alerts by Type</h3>
        <div className="space-y-3">
          {Object.entries(alertsByType).map(([type, count]) => (
            <div key={type} className="flex justify-between items-center">
              <span className="text-[#6B7280] capitalize">{type.replace("_", " ")}</span>
              <div className="flex items-center gap-3">
                <div className="w-48 bg-[#1A1A1A] rounded-full h-2">
                  <div
                    className="bg-[#EF4444] h-2 rounded-full"
                    style={{ width: `${(count / totalAlerts) * 100}%` }}
                  />
                </div>
                <span className="text-white font-semibold">{count}</span>
              </div>
            </div>
          ))}
          {totalAlerts === 0 && (
            <p className="text-center text-[#6B7280] py-4">No active alerts</p>
          )}
        </div>
      </Card>

      <Card className="bg-[#0A0A0A] border-[#1A1A1A] rounded-2xl overflow-hidden">
        <div className="p-6 border-b border-[#1A1A1A]">
          <h3 className="text-lg font-bold text-white">All Fleet Vehicles</h3>
          <p className="text-sm text-[#6B7280] mt-1">Click any vehicle to view detailed history</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-[#0F0F0F]">
              <tr className="text-left text-xs font-bold text-[#6B7280] uppercase tracking-wider">
                <th className="px-6 py-4">Vehicle</th>
                <th className="px-6 py-4">Temperature</th>
                <th className="px-6 py-4">Voltage</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Service Status</th>
                <th className="px-6 py-4">Issues</th>
                <th className="px-6 py-4"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1A1A1A]">
              {vehicles.map((vehicle) => {
                const status = getVehicleStatus(vehicle);
                const criticalAlerts = getVehicleCriticalAlerts(vehicle.id);
                const issues = [];
                if (vehicle.last_temperature > 95) issues.push("High Temp");
                if (vehicle.last_voltage < 12.0) issues.push("Low Voltage");
                if (vehicle.last_fault_code) issues.push(`Fault: ${vehicle.last_fault_code}`);
                criticalAlerts.forEach(alert => issues.push(alert.alert_type.replace("_", " ")));
                
                return (
                  <tr 
                    key={vehicle.id} 
                    className="hover:bg-[#1A1A1A] transition-colors cursor-pointer"
                    onClick={() => router.push(`/dashboard/vehicles/${vehicle.id}`)}
                  >
                    <td className="px-6 py-4 font-bold text-white">{vehicle.plate_number}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                        vehicle.last_temperature > 95 ? "bg-[#EF4444]/20 text-[#EF4444]" : 
                        vehicle.last_temperature > 85 ? "bg-[#FACC15]/20 text-[#FACC15]" :
                        "text-[#6B7280]"
                      }`}>
                        {vehicle.last_temperature ? `${vehicle.last_temperature}°C` : "--"}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                        vehicle.last_voltage < 11.8 ? "bg-[#EF4444]/20 text-[#EF4444]" :
                        vehicle.last_voltage < 12.2 ? "bg-[#FACC15]/20 text-[#FACC15]" :
                        "text-[#6B7280]"
                      }`}>
                        {vehicle.last_voltage ? `${vehicle.last_voltage}V` : "--"}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="capitalize text-[#6B7280]">{vehicle.status}</span>
                    </td>
                    <td className="px-6 py-4">
                      <Badge className={status.color}>
                        {status.label}
                      </Badge>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex gap-1 flex-wrap">
                        {issues.slice(0, 2).map((issue, i) => (
                          <span key={i} className="text-xs bg-[#1A1A1A] text-[#6B7280] px-2 py-1 rounded-full">
                            {issue}
                          </span>
                        ))}
                        {issues.length > 2 && (
                          <span className="text-xs bg-[#1A1A1A] text-[#6B7280] px-2 py-1 rounded-full">
                            +{issues.length - 2}
                          </span>
                        )}
                      </div>
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
                        <Eye className="w-4 h-4" />
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
