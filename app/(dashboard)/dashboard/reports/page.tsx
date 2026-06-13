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
  Info,
  ListChecks,
} from "lucide-react";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

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
  last_speed?: number;
}

interface Alert {
  id: string;
  vehicle_id: string;
  alert_type: string;
  severity: string;
  message: string;
  created_at: string;
  is_resolved: boolean;
  action?: string;
}

export default function ReportsPage() {
  const router = useRouter();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [activeTab, setActiveTab] = useState<"service" | "repair">("service");
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
        .eq("profile_id", session.user.id);

      const { data: alertsData } = await supabase
        .from("alerts")
        .select("*")
        .eq("is_resolved", false);

      if (vehiclesData) setVehicles(vehiclesData);
      if (alertsData) setAlerts(alertsData);
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

  const getVehicleCriticalAlerts = (vehicleId: string) => {
    return alerts.filter(a => a.vehicle_id === vehicleId && a.severity === "critical");
  };

  const getVehicleWarningAlerts = (vehicleId: string) => {
    return alerts.filter(a => a.vehicle_id === vehicleId && a.severity === "warning");
  };

  const getVehicleInfoAlerts = (vehicleId: string) => {
    return alerts.filter(a => a.vehicle_id === vehicleId && a.severity === "info");
  };

  const getVehicleStatus = (vehicle: Vehicle) => {
    const criticalAlerts = getVehicleCriticalAlerts(vehicle.id);
    const warningAlerts = getVehicleWarningAlerts(vehicle.id);
    const hasHighTempWarning = vehicle.last_temperature > 95 && vehicle.last_temperature <= 105;
    const hasLowVoltageWarning = vehicle.last_voltage >= 11.8 && vehicle.last_voltage < 12.2;
    const hasLowFuelWarning = (vehicle.last_fuel_level || 0) >= 5 && (vehicle.last_fuel_level || 0) <= 15;
    const hasFaultCode = vehicle.last_fault_code;
    
    if (criticalAlerts.length > 0 || (vehicle.last_temperature || 0) > 105 || (vehicle.last_voltage || 0) < 11.8 || (vehicle.last_fuel_level || 0) < 5) {
      return { type: "critical", label: "Critical", color: "bg-[#EF4444]/20 text-[#EF4444]" };
    }
    if (warningAlerts.length > 0 || hasHighTempWarning || hasLowVoltageWarning || hasLowFuelWarning || hasFaultCode) {
      return { type: "warning", label: "Warning", color: "bg-[#FACC15]/20 text-[#FACC15]" };
    }
    if (getVehicleInfoAlerts(vehicle.id).length > 0) {
      return { type: "info", label: "Info", color: "bg-[#3B82F6]/20 text-[#3B82F6]" };
    }
    return { type: "good", label: "All Good", color: "bg-[#22C55E]/20 text-[#22C55E]" };
  };

  const getServiceReason = (vehicle: Vehicle): string | null => {
    const warningAlerts = getVehicleWarningAlerts(vehicle.id);
    const hasHighTempWarning = vehicle.last_temperature > 95 && vehicle.last_temperature <= 105;
    const hasLowVoltageWarning = vehicle.last_voltage >= 11.8 && vehicle.last_voltage < 12.2;
    const hasLowFuelWarning = (vehicle.last_fuel_level || 0) >= 5 && (vehicle.last_fuel_level || 0) <= 15;
    
    if (warningAlerts.length > 0) return warningAlerts[0].message;
    if (hasHighTempWarning) return `High temperature: ${vehicle.last_temperature}°C`;
    if (hasLowVoltageWarning) return `Low voltage: ${vehicle.last_voltage}V`;
    if (hasLowFuelWarning) return `Low fuel: ${vehicle.last_fuel_level}%`;
    if (vehicle.last_fault_code) return `Fault code: ${vehicle.last_fault_code}`;
    return null;
  };

  const getRepairReason = (vehicle: Vehicle): string | null => {
    const criticalAlerts = getVehicleCriticalAlerts(vehicle.id);
    const hasCriticalTemp = (vehicle.last_temperature || 0) > 105;
    const hasCriticalVoltage = (vehicle.last_voltage || 0) < 11.8;
    const hasCriticalFuel = (vehicle.last_fuel_level || 0) < 5;
    
    if (criticalAlerts.length > 0) return criticalAlerts[0].message;
    if (hasCriticalTemp) return `Critical overheat: ${vehicle.last_temperature}°C`;
    if (hasCriticalVoltage) return `Critical battery: ${vehicle.last_voltage}V`;
    if (hasCriticalFuel) return `Critical fuel: ${vehicle.last_fuel_level}%`;
    return null;
  };

  const onlineCount = vehicles.filter(v => v.status === "online").length;
  const totalAlerts = alerts.length;
  
  const vehiclesWithAlert = new Set(alerts.map(a => a.vehicle_id)).size;
  
  const temps = vehicles.filter(v => v.last_temperature).map(v => v.last_temperature);
  const avgTemp = temps.length > 0 ? temps.reduce((a, b) => a + b, 0) / temps.length : 0;
  
  const voltages = vehicles.filter(v => v.last_voltage).map(v => v.last_voltage);
  const avgVoltage = voltages.length > 0 ? voltages.reduce((a, b) => a + b, 0) / voltages.length : 0;

  const speeds = vehicles.filter(v => v.last_speed).map(v => v.last_speed || 0);
  const avgSpeed = speeds.length > 0 ? speeds.reduce((a, b) => a + b, 0) / speeds.length : 0;

  const fuels = vehicles.filter(v => v.last_fuel_level).map(v => v.last_fuel_level || 0);
  const avgFuel = fuels.length > 0 ? fuels.reduce((a, b) => a + b, 0) / fuels.length : 0;

  // NEEDS SERVICE - Same logic as Dashboard (Warning level)
  const needsService = vehicles.filter(v => {
    const hasHighTempWarning = (v.last_temperature || 0) > 95 && (v.last_temperature || 0) <= 105;
    const hasLowVoltageWarning = (v.last_voltage || 0) >= 11.8 && (v.last_voltage || 0) < 12.2;
    const hasLowFuelWarning = (v.last_fuel_level || 0) >= 5 && (v.last_fuel_level || 0) <= 15;
    const hasWarningAlert = getVehicleWarningAlerts(v.id).length > 0;
    const hasFaultCode = v.last_fault_code;
    return hasHighTempWarning || hasLowVoltageWarning || hasLowFuelWarning || hasWarningAlert || hasFaultCode;
  }).length;
  
  // NEEDS REPAIR - Same logic as Dashboard (Critical level)
  const needsRepair = vehicles.filter(v => {
    const hasCriticalTemp = (v.last_temperature || 0) > 105;
    const hasCriticalVoltage = (v.last_voltage || 0) < 11.8;
    const hasCriticalFuel = (v.last_fuel_level || 0) < 5;
    const hasCriticalAlert = getVehicleCriticalAlerts(v.id).length > 0;
    return hasCriticalTemp || hasCriticalVoltage || hasCriticalFuel || hasCriticalAlert;
  }).length;

  const alertsByType: Record<string, number> = {};
  alerts.forEach(alert => {
    alertsByType[alert.alert_type] = (alertsByType[alert.alert_type] || 0) + 1;
  });

  // SERVICE VEHICLES LIST - Same as needsService
  const serviceVehicles = vehicles.filter(v => {
    const hasHighTempWarning = (v.last_temperature || 0) > 95 && (v.last_temperature || 0) <= 105;
    const hasLowVoltageWarning = (v.last_voltage || 0) >= 11.8 && (v.last_voltage || 0) < 12.2;
    const hasLowFuelWarning = (v.last_fuel_level || 0) >= 5 && (v.last_fuel_level || 0) <= 15;
    const hasWarningAlert = getVehicleWarningAlerts(v.id).length > 0;
    const hasFaultCode = v.last_fault_code;
    return hasHighTempWarning || hasLowVoltageWarning || hasLowFuelWarning || hasWarningAlert || hasFaultCode;
  });
  
  // REPAIR VEHICLES LIST - Same as needsRepair
  const repairVehicles = vehicles.filter(v => {
    const hasCriticalTemp = (v.last_temperature || 0) > 105;
    const hasCriticalVoltage = (v.last_voltage || 0) < 11.8;
    const hasCriticalFuel = (v.last_fuel_level || 0) < 5;
    const hasCriticalAlert = getVehicleCriticalAlerts(v.id).length > 0;
    return hasCriticalTemp || hasCriticalVoltage || hasCriticalFuel || hasCriticalAlert;
  });

  const healthyVehicles = vehicles.filter(v => {
    const hasNoCriticalTemp = (v.last_temperature || 0) <= 105;
    const hasNoCriticalVoltage = (v.last_voltage || 0) >= 11.8;
    const hasNoCriticalFuel = (v.last_fuel_level || 0) >= 5;
    const hasNoCriticalAlert = getVehicleCriticalAlerts(v.id).length === 0;
    const hasNoWarningTemp = (v.last_temperature || 0) <= 95;
    const hasNoWarningVoltage = (v.last_voltage || 0) >= 12.2;
    const hasNoWarningFuel = (v.last_fuel_level || 0) > 15;
    const hasNoWarningAlert = getVehicleWarningAlerts(v.id).length === 0;
    const hasNoFaultCode = !v.last_fault_code;
    const isOnline = v.status === "online";
    return hasNoCriticalTemp && hasNoCriticalVoltage && hasNoCriticalFuel && hasNoCriticalAlert &&
           hasNoWarningTemp && hasNoWarningVoltage && hasNoWarningFuel && hasNoWarningAlert && 
           hasNoFaultCode && isOnline;
  }).length;
  
  const fleetHealthPercent = vehicles.length > 0 ? Math.round((healthyVehicles / vehicles.length) * 100) : 100;

  function exportCSV() {
    const csvData = [
      ["Report Generated", new Date().toLocaleString()],
      [],
      ["FLEET SUMMARY"],
      ["Metric", "Value"],
      ["Total Vehicles", vehicles.length],
      ["Active Vehicles", onlineCount],
      ["Vehicles with Alerts", vehiclesWithAlert],
      ["Average Temperature (°C)", avgTemp.toFixed(1)],
      ["Average Voltage (V)", avgVoltage.toFixed(1)],
      ["Average Speed (km/h)", avgSpeed.toFixed(1)],
      ["Average Fuel (%)", avgFuel.toFixed(1)],
      ["Needs Service", needsService],
      ["Needs Repair", needsRepair],
      ["Fleet Health (%)", fleetHealthPercent],
      [],
      ["ALL VEHICLES"],
      ["Plate Number", "Temperature", "Voltage", "Fuel", "Status", "Alert Level", "Issues"],
      ...vehicles.map(v => {
        const status = getVehicleStatus(v);
        const issues = [];
        if ((v.last_temperature || 0) > 105) issues.push("Critical Overheat");
        else if ((v.last_temperature || 0) > 95) issues.push("High Temp");
        if ((v.last_voltage || 0) < 11.8) issues.push("Critical Battery");
        else if ((v.last_voltage || 0) < 12.2) issues.push("Low Voltage");
        if ((v.last_fuel_level || 0) < 5) issues.push("Critical Fuel");
        else if ((v.last_fuel_level || 0) <= 15) issues.push("Low Fuel");
        if (v.last_fault_code) issues.push(`Fault: ${v.last_fault_code}`);
        getVehicleCriticalAlerts(v.id).forEach(alert => issues.push(`Critical: ${alert.message.substring(0, 30)}`));
        getVehicleWarningAlerts(v.id).forEach(alert => issues.push(`Warning: ${alert.message.substring(0, 30)}`));
        
        return [
          v.plate_number,
          v.last_temperature ? `${v.last_temperature}°C` : "--",
          v.last_voltage ? `${v.last_voltage}V` : "--",
          v.last_fuel_level ? `${v.last_fuel_level}%` : "--",
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

  function exportPDF() {
    const doc = new jsPDF();
    
    doc.setFontSize(18);
    doc.setTextColor(0, 0, 0);
    doc.text('Fleet Watch Report', 14, 20);
    
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 28);
    
    doc.setFontSize(12);
    doc.setTextColor(0, 0, 0);
    doc.text('Fleet Summary', 14, 40);
    
    const summaryData = [
      ['Metric', 'Value'],
      ['Total Vehicles', vehicles.length.toString()],
      ['Active Vehicles', onlineCount.toString()],
      ['Vehicles with Alerts', vehiclesWithAlert.toString()],
      ['Needs Service', needsService.toString()],
      ['Needs Repair', needsRepair.toString()],
      ['Average Temperature', `${avgTemp.toFixed(1)}°C`],
      ['Average Voltage', `${avgVoltage.toFixed(1)}V`],
      ['Average Speed', `${avgSpeed.toFixed(1)} km/h`],
      ['Average Fuel', `${avgFuel.toFixed(1)}%`],
      ['Fleet Health', `${fleetHealthPercent}%`],
    ];
    
    autoTable(doc, {
      startY: 45,
      head: [['Metric', 'Value']],
      body: summaryData.slice(1),
      theme: 'striped',
      headStyles: { fillColor: [212, 175, 55], textColor: [0, 0, 0], fontStyle: 'bold' },
      styles: { fontSize: 10, cellPadding: 3 },
      margin: { left: 14, right: 14 },
    });
    
    const finalY = (doc as any).lastAutoTable.finalY + 10;
    
    doc.setFontSize(12);
    doc.setTextColor(0, 0, 0);
    doc.text('All Vehicles', 14, finalY);
    
    const vehicleData = vehicles.map(v => {
      const status = getVehicleStatus(v);
      return [
        v.plate_number,
        v.last_temperature ? `${v.last_temperature}°C` : '--',
        v.last_voltage ? `${v.last_voltage}V` : '--',
        v.last_fuel_level ? `${v.last_fuel_level}%` : '--',
        v.status,
        status.label,
      ];
    });
    
    autoTable(doc, {
      startY: finalY + 5,
      head: [['Vehicle', 'Temperature', 'Voltage', 'Fuel', 'Status', 'Alert Level']],
      body: vehicleData,
      theme: 'striped',
      headStyles: { fillColor: [212, 175, 55], textColor: [0, 0, 0], fontStyle: 'bold' },
      styles: { fontSize: 9, cellPadding: 3 },
      margin: { left: 14, right: 14 },
    });
    
    doc.save(`fleet-report-${new Date().toISOString().split('T')[0]}.pdf`);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-white text-sm">Loading reports...</div>
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

        <div className="flex justify-between items-center mb-4">
          <div>
            <h1 className="text-base font-bold text-white">Reports</h1>
            <p className="text-xs text-[#6B7280]">Fleet analytics</p>
          </div>
          <div className="flex gap-2">
            <Button onClick={exportCSV} size="sm" className="bg-[#D4AF37] hover:bg-[#E5C86B] text-black h-8 text-xs">
              <Download className="w-3 h-3 mr-1" />
              CSV
            </Button>
            <Button onClick={exportPDF} size="sm" className="bg-[#D4AF37] hover:bg-[#E5C86B] text-black h-8 text-xs">
              <Download className="w-3 h-3 mr-1" />
              PDF
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 mb-3">
          <Card className="bg-[#0A0A0A] border-[#1A1A1A] rounded-lg p-3">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-[10px] font-bold text-[#6B7280] uppercase">Total Vehicles</p>
                <p className="text-base font-extrabold text-white">{vehicles.length}</p>
                <p className="text-[9px] text-[#22C55E]">{onlineCount} active</p>
              </div>
              <Car className="w-4 h-4 text-[#D4AF37]" />
            </div>
          </Card>

          <Card className="bg-[#0A0A0A] border-[#1A1A1A] rounded-lg p-3">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-[10px] font-bold text-[#6B7280] uppercase">Vehicles with Alerts</p>
                <p className="text-base font-extrabold text-[#EF4444]">{vehiclesWithAlert}</p>
              </div>
              <AlertTriangle className="w-4 h-4 text-[#EF4444]" />
            </div>
          </Card>

          <Card className="bg-[#0A0A0A] border-[#1A1A1A] rounded-lg p-3">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-[10px] font-bold text-[#6B7280] uppercase">Needs Service</p>
                <p className="text-base font-extrabold text-[#FACC15]">{needsService}</p>
                <p className="text-[9px] text-[#6B7280]">Warning level</p>
              </div>
              <Wrench className="w-4 h-4 text-[#FACC15]" />
            </div>
          </Card>

          <Card className="bg-[#0A0A0A] border-red-500/30 rounded-lg p-3">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-[10px] font-bold text-red-400 uppercase">Needs Repair</p>
                <p className="text-base font-extrabold text-[#EF4444]">{needsRepair}</p>
                <p className="text-[9px] text-[#6B7280]">Critical issues</p>
              </div>
              <AlertCircle className="w-4 h-4 text-[#EF4444]" />
            </div>
          </Card>
        </div>

        <Card className="bg-[#0A0A0A] border-[#1A1A1A] rounded-lg p-3 mb-3">
          <h3 className="text-xs font-bold text-white mb-2">Fleet Averages</h3>
          <div className="grid grid-cols-4 gap-1">
            <div>
              <p className="text-[8px] text-[#6B7280]">Temp</p>
              <p className="text-sm font-bold text-white">{avgTemp.toFixed(0)}°</p>
            </div>
            <div>
              <p className="text-[8px] text-[#6B7280]">Voltage</p>
              <p className="text-sm font-bold text-white">{avgVoltage.toFixed(1)}V</p>
            </div>
            <div>
              <p className="text-[8px] text-[#6B7280]">Speed</p>
              <p className="text-sm font-bold text-white">{avgSpeed.toFixed(0)}</p>
            </div>
            <div>
              <p className="text-[8px] text-[#6B7280]">Fuel</p>
              <p className="text-sm font-bold text-white">{avgFuel.toFixed(0)}%</p>
            </div>
          </div>
        </Card>

        {(serviceVehicles.length > 0 || repairVehicles.length > 0) && (
          <Card className="bg-[#0A0A0A] border-[#1A1A1A] rounded-lg p-3 mb-3">
            <div className="flex items-center gap-2 mb-2">
              <ListChecks className="w-4 h-4 text-[#D4AF37]" />
              <h3 className="text-xs font-bold text-white">Service & Repair Summary</h3>
            </div>
            
            <div className="flex gap-2 mb-3">
              <button
                onClick={() => setActiveTab("service")}
                className={`flex-1 py-1.5 text-xs rounded-lg transition-colors ${
                  activeTab === "service" 
                    ? "bg-[#FACC15] text-black font-bold" 
                    : "bg-[#1A1A1A] text-[#6B7280] hover:bg-[#2A2A2A]"
                }`}
              >
                Service ({serviceVehicles.length})
              </button>
              <button
                onClick={() => setActiveTab("repair")}
                className={`flex-1 py-1.5 text-xs rounded-lg transition-colors ${
                  activeTab === "repair" 
                    ? "bg-[#EF4444] text-white font-bold" 
                    : "bg-[#1A1A1A] text-[#6B7280] hover:bg-[#2A2A2A]"
                }`}
              >
                Repair ({repairVehicles.length})
              </button>
            </div>

            {activeTab === "service" && (
              <div>
                {serviceVehicles.length === 0 ? (
                  <p className="text-[10px] text-[#6B7280] text-center py-2">No vehicles need service</p>
                ) : (
                  serviceVehicles.map(v => (
                    <div 
                      key={v.id} 
                      className="bg-[#FACC15]/10 rounded-lg p-2 mb-2 cursor-pointer hover:bg-[#FACC15]/20"
                      onClick={() => router.push(`/dashboard/vehicles/${v.id}`)}
                    >
                      <div className="flex justify-between items-center">
                        <span className="text-white text-xs font-bold">{v.plate_number}</span>
                        <Badge className="bg-[#FACC15]/20 text-[#FACC15] text-[8px]">Warning</Badge>
                      </div>
                      <p className="text-[9px] text-[#6B7280] mt-1">{getServiceReason(v)}</p>
                    </div>
                  ))
                )}
              </div>
            )}

            {activeTab === "repair" && (
              <div>
                {repairVehicles.length === 0 ? (
                  <p className="text-[10px] text-[#6B7280] text-center py-2">No vehicles need repair</p>
                ) : (
                  repairVehicles.map(v => (
                    <div 
                      key={v.id} 
                      className="bg-[#EF4444]/10 rounded-lg p-2 mb-2 cursor-pointer hover:bg-[#EF4444]/20"
                      onClick={() => router.push(`/dashboard/vehicles/${v.id}`)}
                    >
                      <div className="flex justify-between items-center">
                        <span className="text-white text-xs font-bold">{v.plate_number}</span>
                        <Badge className="bg-[#EF4444]/20 text-[#EF4444] text-[8px]">Critical</Badge>
                      </div>
                      <p className="text-[9px] text-[#6B7280] mt-1">{getRepairReason(v)}</p>
                    </div>
                  ))
                )}
              </div>
            )}
          </Card>
        )}

        <div className="space-y-2 mb-3">
          {needsRepair > 0 && (
            <div className="bg-[#EF4444]/10 border-l-3 border-l-[#EF4444] rounded-lg p-2">
              <p className="text-[10px] font-bold text-[#EF4444]">CRITICAL: Stop Immediately</p>
              <p className="text-[9px] text-[#6B7280]">{needsRepair} {needsRepair === 1 ? 'vehicle' : 'vehicles'} require immediate attention</p>
            </div>
          )}
          {needsService > 0 && (
            <div className="bg-[#FACC15]/10 border-l-3 border-l-[#FACC15] rounded-lg p-2">
              <p className="text-[10px] font-bold text-[#FACC15]">WARNING: Schedule Repair This Week</p>
              <p className="text-[9px] text-[#6B7280]">{needsService} {needsService === 1 ? 'vehicle' : 'vehicles'} need service this week</p>
            </div>
          )}
        </div>

        <Card className="bg-[#0A0A0A] border-[#1A1A1A] rounded-lg overflow-hidden">
          <div className="px-3 py-2 border-b border-[#1A1A1A]">
            <h3 className="text-xs font-bold text-white">All Vehicles</h3>
          </div>
          <div className="overflow-x-auto">
  <table className="w-full text-[10px]">
    <thead className="bg-[#0F0F0F]">
      <tr className="text-left text-[9px] font-bold text-[#6B7280] uppercase">
        <th className="px-2 py-2">Vehicle</th>
        <th className="px-2 py-2">Status</th> 
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
              <Badge className={status.color} style={{ fontSize: "8px", padding: "2px 6px" }}>
                {status.label}
              </Badge>
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

  // DESKTOP VIEW
  return (
    <div>
      {/* Auto-refresh indicator */}
      {refreshing && (
        <div className="fixed top-20 right-4 z-50 bg-black/80 text-[#D4AF37] text-[10px] px-2 py-1 rounded-full">
          Refreshing...
        </div>
      )}

      <div className="flex justify-between items-center mb-5">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight">Fleet Reports</h1>
          <p className="text-xs text-[#6B7280] mt-1">Fleet analytics and alerts categorized by severity</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={exportCSV} className="bg-[#D4AF37] hover:bg-[#E5C86B] text-black h-8 text-xs">
            <Download className="w-3 h-3 mr-1" />
            CSV
          </Button>
          <Button onClick={exportPDF} className="bg-[#D4AF37] hover:bg-[#E5C86B] text-black h-8 text-xs">
            <Download className="w-3 h-3 mr-1" />
            PDF
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card className="bg-[#0A0A0A] border-[#1A1A1A] rounded-xl p-4">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-[10px] font-bold text-[#6B7280] mb-1 uppercase tracking-wider">Total Vehicles</p>
              <p className="text-2xl font-extrabold text-white">{vehicles.length}</p>
              <p className="text-[10px] text-[#22C55E] mt-1">{onlineCount} active</p>
            </div>
            <Car className="w-4 h-4 text-[#D4AF37]" />
          </div>
        </Card>

        <Card className="bg-[#0A0A0A] border-[#1A1A1A] rounded-xl p-4">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-[10px] font-bold text-[#6B7280] mb-1 uppercase tracking-wider">Vehicles with Alerts</p>
              <p className="text-2xl font-extrabold text-[#EF4444]">{vehiclesWithAlert}</p>
            </div>
            <AlertTriangle className="w-4 h-4 text-[#EF4444]" />
          </div>
        </Card>

        <Card className="bg-[#0A0A0A] border-[#1A1A1A] rounded-xl p-4">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-[10px] font-bold text-[#6B7280] mb-1 uppercase tracking-wider">Needs Service</p>
              <p className="text-2xl font-extrabold text-[#FACC15]">{needsService}</p>
              <p className="text-[10px] text-[#6B7280] mt-1">Warning level</p>
            </div>
            <Wrench className="w-4 h-4 text-[#FACC15]" />
          </div>
        </Card>

        <Card className="bg-[#0A0A0A] border-red-500/30 rounded-xl p-4">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-[10px] font-bold text-red-400 mb-1 uppercase tracking-wider">Needs Repair</p>
              <p className="text-2xl font-extrabold text-[#EF4444]">{needsRepair}</p>
              <p className="text-[10px] text-[#6B7280] mt-1">Critical issues</p>
            </div>
            <AlertCircle className="w-4 h-4 text-[#EF4444]" />
          </div>
        </Card>
      </div>

      <Card className="bg-[#0A0A0A] border-[#1A1A1A] rounded-xl p-4 mb-6">
        <h3 className="text-sm font-bold text-white mb-3">Fleet Averages</h3>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div>
            <p className="text-[10px] text-[#6B7280] uppercase mb-1">Avg Temperature</p>
            <p className="text-xl font-extrabold text-white">{avgTemp.toFixed(1)}°C</p>
            <p className="text-[9px] text-[#6B7280] mt-1">Normal: 85-95°C</p>
          </div>
          <div>
            <p className="text-[10px] text-[#6B7280] uppercase mb-1">Avg Voltage</p>
            <p className="text-xl font-extrabold text-white">{avgVoltage.toFixed(1)}V</p>
            <p className="text-[9px] text-[#6B7280] mt-1">Normal: 12.2-14.5V</p>
          </div>
          <div>
            <p className="text-[10px] text-[#6B7280] uppercase mb-1">Avg Speed</p>
            <p className="text-xl font-extrabold text-white">{avgSpeed.toFixed(1)} km/h</p>
            <p className="text-[9px] text-[#6B7280] mt-1">Fleet average</p>
          </div>
          <div>
            <p className="text-[10px] text-[#6B7280] uppercase mb-1">Avg Fuel</p>
            <p className="text-xl font-extrabold text-white">{avgFuel.toFixed(1)}%</p>
            <p className="text-[9px] text-[#6B7280] mt-1">Fleet average</p>
          </div>
          <div>
            <p className="text-[10px] text-[#6B7280] uppercase mb-1">Fleet Health</p>
            <p className="text-xl font-extrabold text-white">{fleetHealthPercent}%</p>
            <p className="text-[9px] text-[#6B7280] mt-1">{healthyVehicles} of {vehicles.length} healthy</p>
          </div>
        </div>
      </Card>

      {(serviceVehicles.length > 0 || repairVehicles.length > 0) && (
        <Card className="bg-[#0A0A0A] border-[#1A1A1A] rounded-xl p-4 mb-6">
          <div className="flex items-center gap-2 mb-3">
            <ListChecks className="w-4 h-4 text-[#D4AF37]" />
            <h3 className="text-sm font-bold text-white">Service & Repair Summary</h3>
          </div>
          
          <div className="flex gap-2 mb-4">
            <button
              onClick={() => setActiveTab("service")}
              className={`flex-1 py-2 text-sm rounded-lg transition-colors ${
                activeTab === "service" 
                  ? "bg-[#FACC15] text-black font-bold" 
                  : "bg-[#1A1A1A] text-[#6B7280] hover:bg-[#2A2A2A]"
              }`}
            >
              Service Needed ({serviceVehicles.length})
            </button>
            <button
              onClick={() => setActiveTab("repair")}
              className={`flex-1 py-2 text-sm rounded-lg transition-colors ${
                activeTab === "repair" 
                  ? "bg-[#EF4444] text-white font-bold" 
                  : "bg-[#1A1A1A] text-[#6B7280] hover:bg-[#2A2A2A]"
              }`}
            >
              Repair Needed ({repairVehicles.length})
            </button>
          </div>

          {activeTab === "service" && (
            <div>
              {serviceVehicles.length === 0 ? (
                <p className="text-sm text-[#6B7280] text-center py-4">No vehicles need service</p>
              ) : (
                <div className="space-y-2">
                  {serviceVehicles.map(v => (
                    <div 
                      key={v.id} 
                      className="bg-[#FACC15]/5 border border-[#FACC15]/20 rounded-lg p-3 cursor-pointer hover:bg-[#FACC15]/10 transition-colors"
                      onClick={() => router.push(`/dashboard/vehicles/${v.id}`)}
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="text-white font-bold text-sm">{v.plate_number}</p>
                          <p className="text-xs text-[#6B7280] mt-1">{getServiceReason(v)}</p>
                        </div>
                        <Badge className="bg-[#FACC15]/20 text-[#FACC15] text-[9px]">Warning</Badge>
                      </div>
                      <div className="flex gap-3 mt-2 text-[9px] text-[#6B7280]">
                        <span>Temp: {v.last_temperature ? `${v.last_temperature}°C` : "--"}</span>
                        <span>Voltage: {v.last_voltage ? `${v.last_voltage}V` : "--"}</span>
                        <span>Fuel: {v.last_fuel_level ? `${v.last_fuel_level}%` : "--"}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === "repair" && (
            <div>
              {repairVehicles.length === 0 ? (
                <p className="text-sm text-[#6B7280] text-center py-4">No vehicles need repair</p>
              ) : (
                <div className="space-y-2">
                  {repairVehicles.map(v => (
                    <div 
                      key={v.id} 
                      className="bg-[#EF4444]/5 border border-[#EF4444]/20 rounded-lg p-3 cursor-pointer hover:bg-[#EF4444]/10 transition-colors"
                      onClick={() => router.push(`/dashboard/vehicles/${v.id}`)}
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="text-white font-bold text-sm">{v.plate_number}</p>
                          <p className="text-xs text-[#6B7280] mt-1">{getRepairReason(v)}</p>
                        </div>
                        <Badge className="bg-[#EF4444]/20 text-[#EF4444] text-[9px]">Critical</Badge>
                      </div>
                      <div className="flex gap-3 mt-2 text-[9px] text-[#6B7280]">
                        <span>Temp: {v.last_temperature ? `${v.last_temperature}°C` : "--"}</span>
                        <span>Voltage: {v.last_voltage ? `${v.last_voltage}V` : "--"}</span>
                        <span>Fuel: {v.last_fuel_level ? `${v.last_fuel_level}%` : "--"}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        {needsRepair > 0 && (
          <Card className="bg-[#EF4444]/5 border-[#EF4444]/30 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-1">
              <AlertCircle className="w-4 h-4 text-[#EF4444]" />
              <p className="text-xs font-bold text-[#EF4444]">CRITICAL - Stop Immediately</p>
            </div>
            <p className="text-[10px] text-[#6B7280]">{needsRepair} {needsRepair === 1 ? 'vehicle' : 'vehicles'} require immediate attention</p>
          </Card>
        )}
        {needsService > 0 && (
          <Card className="bg-[#FACC15]/5 border-[#FACC15]/30 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-1">
              <AlertTriangle className="w-4 h-4 text-[#FACC15]" />
              <p className="text-xs font-bold text-[#FACC15]">WARNING - Schedule Repair</p>
            </div>
            <p className="text-[10px] text-[#6B7280]">{needsService} {needsService === 1 ? 'vehicle' : 'vehicles'} need service this week</p>
          </Card>
        )}
      </div>

      {Object.keys(alertsByType).length > 0 && (
        <Card className="bg-[#0A0A0A] border-[#1A1A1A] rounded-xl p-4 mb-6">
          <h3 className="text-sm font-bold text-white mb-3">Alerts by Type</h3>
          <div className="space-y-2">
            {Object.entries(alertsByType).map(([type, count]) => (
              <div key={type} className="flex justify-between items-center">
                <span className="text-[10px] text-[#6B7280] capitalize">{type.replace("_", " ")}</span>
                <div className="flex items-center gap-2">
                  <div className="w-32 bg-[#1A1A1A] rounded-full h-1.5">
                    <div
                      className="bg-[#EF4444] h-1.5 rounded-full"
                      style={{ width: `${(count / totalAlerts) * 100}%` }}
                    />
                  </div>
                  <span className="text-white font-semibold text-[10px]">{count}</span>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      <Card className="bg-[#0A0A0A] border-[#1A1A1A] rounded-xl overflow-hidden">
        <div className="p-4 border-b border-[#1A1A1A]">
          <h3 className="text-sm font-bold text-white">All Fleet Vehicles</h3>
          <p className="text-[10px] text-[#6B7280] mt-1">Click any vehicle to view detailed history</p>
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
                <th className="px-4 py-3">Alert Level</th>
                <th className="px-4 py-3">Issues</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1A1A1A]">
              {vehicles.map((vehicle) => {
                const status = getVehicleStatus(vehicle);
                const criticalAlerts = getVehicleCriticalAlerts(vehicle.id);
                const warningAlerts = getVehicleWarningAlerts(vehicle.id);
                const issues = [];
                if ((vehicle.last_temperature || 0) > 105) issues.push("Critical Overheat");
                else if ((vehicle.last_temperature || 0) > 95) issues.push("High Temp");
                if ((vehicle.last_voltage || 0) < 11.8) issues.push("Critical Battery");
                else if ((vehicle.last_voltage || 0) < 12.2) issues.push("Low Voltage");
                if ((vehicle.last_fuel_level || 0) < 5) issues.push("Critical Fuel");
                else if ((vehicle.last_fuel_level || 0) <= 15) issues.push("Low Fuel");
                if (vehicle.last_fault_code) {
                  const faultMsg = vehicle.last_fault_code.startsWith('P') ? `OBD2: ${vehicle.last_fault_code}` : `Fault: ${vehicle.last_fault_code}`;
                  issues.push(faultMsg);
                }
                criticalAlerts.slice(0, 1).forEach(alert => issues.push(alert.message.substring(0, 30)));
                warningAlerts.slice(0, 1).forEach(alert => issues.push(alert.message.substring(0, 30)));
                
                return (
                  <tr 
                    key={vehicle.id} 
                    className="hover:bg-[#1A1A1A] transition-colors cursor-pointer"
                    onClick={() => router.push(`/dashboard/vehicles/${vehicle.id}`)}
                  >
                    <td className="px-4 py-3 font-bold text-white text-sm">{vehicle.plate_number}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        (vehicle.last_temperature || 0) > 105 ? "bg-[#EF4444]/20 text-[#EF4444]" : 
                        (vehicle.last_temperature || 0) > 95 ? "bg-[#FACC15]/20 text-[#FACC15]" :
                        "text-[#6B7280] bg-[#1A1A1A]"
                      }`}>
                        {vehicle.last_temperature ? `${vehicle.last_temperature}°C` : "--"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        (vehicle.last_voltage || 0) < 11.8 ? "bg-[#EF4444]/20 text-[#EF4444]" :
                        (vehicle.last_voltage || 0) < 12.2 ? "bg-[#FACC15]/20 text-[#FACC15]" :
                        "text-[#6B7280] bg-[#1A1A1A]"
                      }`}>
                        {vehicle.last_voltage ? `${vehicle.last_voltage}V` : "--"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        (vehicle.last_fuel_level || 0) < 5 ? "bg-[#EF4444]/20 text-[#EF4444]" :
                        (vehicle.last_fuel_level || 0) <= 15 ? "bg-[#FACC15]/20 text-[#FACC15]" :
                        "text-[#6B7280] bg-[#1A1A1A]"
                      }`}>
                        {vehicle.last_fuel_level ? `${vehicle.last_fuel_level}%` : "--"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="capitalize text-[10px] text-[#6B7280]">{vehicle.status}</span>
                    </td>
                    <td className="px-4 py-3">
                      <Badge className={status.color}>
                        {status.label}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1 flex-wrap">
                        {issues.slice(0, 2).map((issue, i) => (
                          <span key={i} className="text-[9px] bg-[#1A1A1A] text-[#6B7280] px-1.5 py-0.5 rounded-full">
                            {issue}
                          </span>
                        ))}
                        {issues.length > 2 && (
                          <span className="text-[9px] bg-[#1A1A1A] text-[#6B7280] px-1.5 py-0.5 rounded-full">
                            +{issues.length - 2}
                          </span>
                        )}
                      </div>
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
