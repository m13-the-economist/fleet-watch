"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { createClient } from "@/lib/supabase/client";
import {
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  Bell,
  Battery,
  Thermometer,
  Car,
  Info,
  AlertCircle,
} from "lucide-react";
import { useMediaQuery } from "@/hooks/useMediaQuery";

interface Alert {
  id: string;
  vehicle_id: string;
  alert_type: string;
  severity: string;
  message: string;
  action: string;
  is_resolved: boolean;
  resolved_at: string;
  created_at: string;
  vehicles?: {
    plate_number: string;
    vehicle_type: string;
  };
}

const getSeverityIcon = (severity: string) => {
  switch (severity) {
    case "critical":
      return <AlertCircle className="w-4 h-4 text-[#EF4444]" />;
    case "warning":
      return <AlertTriangle className="w-4 h-4 text-[#FACC15]" />;
    case "info":
      return <Info className="w-4 h-4 text-[#3B82F6]" />;
    default:
      return <AlertTriangle className="w-4 h-4 text-[#6B7280]" />;
  }
};

const getSeverityBadge = (severity: string) => {
  switch (severity) {
    case "critical":
      return <Badge className="bg-[#EF4444]/10 text-[#EF4444] border-none text-xs">Critical</Badge>;
    case "warning":
      return <Badge className="bg-[#FACC15]/10 text-[#FACC15] border-none text-xs">Warning</Badge>;
    case "info":
      return <Badge className="bg-[#3B82F6]/10 text-[#3B82F6] border-none text-xs">Info</Badge>;
    default:
      return <Badge className="bg-[#6B7280]/10 text-[#6B7280] border-none text-xs">Info</Badge>;
  }
};

const getTypeIcon = (type: string) => {
  switch (type) {
    case "temperature":
      return <Thermometer className="w-3 h-3" />;
    case "voltage":
    case "battery":
      return <Battery className="w-3 h-3" />;
    case "check_engine":
      return <Car className="w-3 h-3" />;
    case "speed":
      return <AlertTriangle className="w-3 h-3" />;
    default:
      return <AlertTriangle className="w-3 h-3" />;
  }
};

export default function AlertsPage() {
  const router = useRouter();
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [filter, setFilter] = useState<"all" | "active" | "resolved" | "critical" | "warning" | "info">("all");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const supabase = createClient();
  const isMobile = !useMediaQuery("(min-width: 768px)");

  async function fetchAlerts() {
    try {
      const { data } = await supabase
        .from("alerts")
        .select(`
          *,
          vehicles (
            plate_number,
            vehicle_type
          )
        `)
        .order("created_at", { ascending: false });

      if (data) {
        setAlerts(data);
      }
    } catch (error) {
      console.error("Error fetching alerts:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  // Auto-refresh every 30 seconds
  useEffect(() => {
    fetchAlerts();
    
    const interval = setInterval(() => {
      setRefreshing(true);
      fetchAlerts();
    }, 30000);
    
    return () => clearInterval(interval);
  }, []);

  async function resolveAlert(alertId: string) {
    try {
      const { error } = await supabase
        .from("alerts")
        .update({
          is_resolved: true,
          resolved_at: new Date().toISOString(),
        })
        .eq("id", alertId);

      if (error) {
        console.error("Error resolving alert:", error);
      } else {
        // Refresh alerts after resolving
        fetchAlerts();
      }
    } catch (error) {
      console.error("Error:", error);
    }
  }

  const filteredAlerts = alerts.filter((alert) => {
    switch (filter) {
      case "all":
        return true;
      case "active":
        return !alert.is_resolved;
      case "resolved":
        return alert.is_resolved;
      case "critical":
        return !alert.is_resolved && alert.severity === "critical";
      case "warning":
        return !alert.is_resolved && alert.severity === "warning";
      case "info":
        return !alert.is_resolved && alert.severity === "info";
      default:
        return true;
    }
  });

  const activeCount = alerts.filter((a) => !a.is_resolved).length;
  const criticalCount = alerts.filter((a) => !a.is_resolved && a.severity === "critical").length;
  const warningCount = alerts.filter((a) => !a.is_resolved && a.severity === "warning").length;
  const infoCount = alerts.filter((a) => !a.is_resolved && a.severity === "info").length;
  const resolvedCount = alerts.filter((a) => a.is_resolved).length;

  const filterButtons = [
    { id: "all", label: "All", count: alerts.length, color: "default" },
    { id: "active", label: "Active", count: activeCount, color: "default" },
    { id: "critical", label: "Critical", count: criticalCount, color: "critical" },
    { id: "warning", label: "Warning", count: warningCount, color: "warning" },
    { id: "info", label: "Info", count: infoCount, color: "info" },
    { id: "resolved", label: "Resolved", count: resolvedCount, color: "default" },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-white text-sm">Loading alerts...</div>
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
            <h1 className="text-base font-bold text-white">Alerts</h1>
            <p className="text-xs text-[#6B7280] mt-0.5">
              {activeCount} active • {criticalCount} critical
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={fetchAlerts}
            className="border-[#1A1A1A] text-[#6B7280] hover:text-white h-8"
          >
            <RefreshCw className="w-3 h-3" />
          </Button>
        </div>

        {/* Filter Buttons */}
        <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
          {filterButtons.map((item) => {
            const isActive = filter === item.id;
            let buttonClass = "shrink-0 text-xs px-3 py-1 h-auto ";
            if (isActive) {
              if (item.id === "critical") buttonClass += "bg-[#EF4444] text-white";
              else if (item.id === "warning") buttonClass += "bg-[#FACC15] text-black";
              else if (item.id === "info") buttonClass += "bg-[#3B82F6] text-white";
              else buttonClass += "bg-[#D4AF37] text-black";
            } else {
              buttonClass += "border-[#1A1A1A] text-[#6B7280]";
            }
            return (
              <Button
                key={item.id}
                variant={isActive ? "default" : "outline"}
                onClick={() => setFilter(item.id as any)}
                className={buttonClass}
                size="sm"
              >
                {item.label}
                <span className="ml-1 text-[10px] opacity-70">({item.count})</span>
              </Button>
            );
          })}
        </div>

        <div className="space-y-2">
          {filteredAlerts.map((alert) => (
            <Card
              key={alert.id}
              className={`bg-[#0A0A0A] border-[#1A1A1A] rounded-lg overflow-hidden cursor-pointer hover:border-[#D4AF37]/30 transition-all ${
                !alert.is_resolved ? "border-l-3 border-l-[#EF4444]" : "opacity-50"
              }`}
              onClick={() => router.push(`/dashboard/vehicles/${alert.vehicle_id}`)}
            >
              <div className="p-3">
                <div className="flex justify-between items-start gap-2">
                  <div className="flex gap-2 flex-1">
                    {getSeverityIcon(alert.severity)}
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        {getSeverityBadge(alert.severity)}
                        <div className="flex items-center gap-1 text-[9px] text-[#6B7280]">
                          {getTypeIcon(alert.alert_type)}
                          <span className="uppercase text-[9px]">{alert.alert_type?.replace("_", " ")}</span>
                        </div>
                      </div>
                      <p className="font-medium text-white text-xs mb-1">{alert.message}</p>
                      <p className="text-[9px] text-[#4B5563] mb-1">Action: {alert.action}</p>
                      <div className="flex flex-wrap gap-2 text-[9px] text-[#6B7280]">
                        <span>
                          Vehicle:{" "}
                          <span className="text-white font-medium">
                            {alert.vehicles?.plate_number || alert.vehicle_id.slice(0, 6)}
                          </span>
                        </span>
                        <span>
                          {new Date(alert.created_at).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </div>
                  {!alert.is_resolved && (
                    <Button
                      onClick={(e) => {
                        e.stopPropagation();
                        resolveAlert(alert.id);
                      }}
                      className="bg-[#22C55E] hover:bg-[#16A34A] text-white h-7 px-2"
                      size="sm"
                    >
                      <CheckCircle2 className="w-3 h-3" />
                    </Button>
                  )}
                </div>
              </div>
            </Card>
          ))}

          {filteredAlerts.length === 0 && (
            <div className="text-center py-8">
              <CheckCircle2 className="w-8 h-8 text-[#1A1A1A] mx-auto mb-2" />
              <p className="text-[#6B7280] text-xs">No alerts found</p>
            </div>
          )}
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

      <div className="flex justify-between items-center mb-5">
        <div>
          <h1 className="text-base font-bold text-white">Alerts</h1>
          <p className="text-xs text-[#6B7280] mt-1">
            {activeCount} active • {criticalCount} critical • {warningCount} warning • {infoCount} info • {resolvedCount} resolved
          </p>
        </div>
        <Button
          variant="outline"
          onClick={fetchAlerts}
          className="border-[#1A1A1A] text-[#6B7280] hover:text-white h-8 text-xs"
        >
          <RefreshCw className="w-3 h-3 mr-1" />
          Refresh
        </Button>
      </div>

      {/* Filter Buttons */}
      <div className="flex flex-wrap gap-2 mb-5">
        {filterButtons.map((item) => {
          const isActive = filter === item.id;
          let buttonClass = "text-xs px-3 py-1 h-auto ";
          if (isActive) {
            if (item.id === "critical") buttonClass += "bg-[#EF4444] text-white";
            else if (item.id === "warning") buttonClass += "bg-[#FACC15] text-black";
            else if (item.id === "info") buttonClass += "bg-[#3B82F6] text-white";
            else buttonClass += "bg-[#D4AF37] text-black";
          } else {
            buttonClass += "border-[#1A1A1A] text-[#6B7280]";
          }
          return (
            <Button
              key={item.id}
              variant={isActive ? "default" : "outline"}
              onClick={() => setFilter(item.id as any)}
              className={buttonClass}
              size="sm"
            >
              {item.label}
              <span className="ml-1 text-[10px] opacity-70">({item.count})</span>
            </Button>
          );
        })}
      </div>

      <div className="space-y-2">
        {filteredAlerts.map((alert) => (
          <Card
            key={alert.id}
            className={`bg-[#0A0A0A] border-[#1A1A1A] rounded-lg overflow-hidden transition-all cursor-pointer hover:border-[#D4AF37]/30 ${
              !alert.is_resolved ? "border-l-3 border-l-[#EF4444]" : "opacity-50"
            }`}
            onClick={() => router.push(`/dashboard/vehicles/${alert.vehicle_id}`)}
          >
            <div className="p-3">
              <div className="flex justify-between items-start gap-3">
                <div className="flex gap-3 flex-1">
                  {getSeverityIcon(alert.severity)}
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      {getSeverityBadge(alert.severity)}
                      <div className="flex items-center gap-1 text-[10px] text-[#6B7280]">
                        {getTypeIcon(alert.alert_type)}
                        <span className="uppercase text-[9px]">{alert.alert_type?.replace("_", " ")}</span>
                      </div>
                      {alert.resolved_at && (
                        <span className="text-[9px] text-[#22C55E] bg-[#22C55E]/10 px-1.5 py-0.5 rounded-full">
                          Resolved
                        </span>
                      )}
                    </div>
                    <p className="font-medium text-white text-sm mb-1">{alert.message}</p>
                    <p className="text-[10px] text-[#4B5563] mb-1">Action: {alert.action}</p>
                    <div className="flex flex-wrap gap-3 text-[10px] text-[#6B7280]">
                      <span>
                        Vehicle:{" "}
                        <span className="text-white font-medium">
                          {alert.vehicles?.plate_number || alert.vehicle_id.slice(0, 8)}
                        </span>
                      </span>
                      <span>Created: {new Date(alert.created_at).toLocaleString()}</span>
                      {alert.resolved_at && (
                        <span>Resolved: {new Date(alert.resolved_at).toLocaleString()}</span>
                      )}
                    </div>
                  </div>
                </div>
                {!alert.is_resolved && (
                  <Button
                    onClick={(e) => {
                      e.stopPropagation();
                      resolveAlert(alert.id);
                    }}
                    className="bg-[#22C55E] hover:bg-[#16A34A] text-white h-7 px-3 text-xs"
                    size="sm"
                  >
                    <CheckCircle2 className="w-3 h-3 mr-1" />
                    Resolve
                  </Button>
                )}
              </div>
            </div>
          </Card>
        ))}

        {filteredAlerts.length === 0 && (
          <div className="text-center py-10">
            <CheckCircle2 className="w-8 h-8 text-[#1A1A1A] mx-auto mb-2" />
            <p className="text-[#6B7280] text-sm">No alerts found</p>
          </div>
        )}
      </div>
    </div>
  );
}
