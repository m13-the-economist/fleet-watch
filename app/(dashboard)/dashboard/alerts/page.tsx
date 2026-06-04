"use client";

import { useEffect, useState } from "react";
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
} from "lucide-react";
import { useMediaQuery } from "@/hooks/useMediaQuery";

interface Alert {
  id: string;
  vehicle_id: string;
  alert_type: string;
  severity: string;
  message: string;
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
      return <AlertTriangle className="w-5 h-5 text-[#EF4444]" />;
    case "warning":
      return <AlertTriangle className="w-5 h-5 text-[#FACC15]" />;
    default:
      return <AlertTriangle className="w-5 h-5 text-[#6B7280]" />;
  }
};

const getSeverityBadge = (severity: string) => {
  switch (severity) {
    case "critical":
      return <Badge className="bg-[#EF4444]/10 text-[#EF4444] border-none">Critical</Badge>;
    case "warning":
      return <Badge className="bg-[#FACC15]/10 text-[#FACC15] border-none">Warning</Badge>;
    default:
      return <Badge className="bg-[#6B7280]/10 text-[#6B7280] border-none">Info</Badge>;
  }
};

const getTypeIcon = (type: string) => {
  switch (type) {
    case "overheat":
      return <Thermometer className="w-4 h-4" />;
    case "low_battery":
      return <Battery className="w-4 h-4" />;
    case "check_engine":
      return <Car className="w-4 h-4" />;
    default:
      return <AlertTriangle className="w-4 h-4" />;
  }
};

export default function AlertsPage() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [filter, setFilter] = useState<"active" | "critical" | "warning" | "resolved" | "all">("active");
  const [loading, setLoading] = useState(true);
  const supabase = createClient();
  const isMobile = !useMediaQuery("(min-width: 768px)");

  useEffect(() => {
    fetchAlerts();
  }, []);

  async function fetchAlerts() {
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
    setLoading(false);
  }

  async function resolveAlert(alertId: string) {
    const { error } = await supabase
      .from("alerts")
      .update({
        is_resolved: true,
        resolved_at: new Date().toISOString(),
      })
      .eq("id", alertId);

    if (!error) {
      fetchAlerts();
    }
  }

  // Single unified filter
  const filteredAlerts = alerts.filter((alert) => {
    switch (filter) {
      case "active":
        return !alert.is_resolved;
      case "critical":
        return !alert.is_resolved && alert.severity === "critical";
      case "warning":
        return !alert.is_resolved && alert.severity === "warning";
      case "resolved":
        return alert.is_resolved;
      case "all":
        return true;
      default:
        return true;
    }
  });

  const activeCount = alerts.filter((a) => !a.is_resolved).length;
  const criticalCount = alerts.filter((a) => !a.is_resolved && a.severity === "critical").length;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-white">Loading alerts...</div>
      </div>
    );
  }

  // Filter buttons
  const filterButtons = [
    { id: "active", label: "Active", icon: Bell, color: "default" },
    { id: "critical", label: "Critical", icon: AlertTriangle, color: "critical" },
    { id: "warning", label: "Warning", icon: AlertTriangle, color: "warning" },
    { id: "resolved", label: "Resolved", icon: CheckCircle2, color: "default" },
    { id: "all", label: "All", icon: AlertTriangle, color: "default" },
  ];

  // MOBILE VIEW
  if (isMobile) {
    return (
      <div>
        <div className="flex justify-between items-center mb-5">
          <div>
            <h1 className="text-xl font-bold text-white tracking-tight">Alerts</h1>
            <p className="text-xs text-[#6B7280] mt-0.5">
              {activeCount} active • {criticalCount} critical
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={fetchAlerts}
            className="border-[#1A1A1A] text-[#6B7280] hover:text-white"
          >
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>

        {/* Mobile Carousel Filters - Single row */}
        <div className="mb-4 overflow-x-auto pb-2" style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}>
          <div className="flex gap-2">
            {filterButtons.map((item) => {
              const isActive = filter === item.id;
              let buttonClass = "shrink-0";
              if (isActive) {
                if (item.id === "critical") buttonClass += " bg-[#EF4444] text-white";
                else if (item.id === "warning") buttonClass += " bg-[#FACC15] text-black";
                else buttonClass += " bg-[#D4AF37] text-black";
              } else {
                buttonClass += " border-[#1A1A1A] text-[#6B7280]";
              }
              return (
                <Button
                  key={item.id}
                  variant={isActive ? "default" : "outline"}
                  onClick={() => setFilter(item.id as any)}
                  className={buttonClass}
                  size="sm"
                >
                  <item.icon className="w-4 h-4 mr-2" />
                  {item.label}
                </Button>
              );
            })}
          </div>
        </div>

        <div className="space-y-3">
          {filteredAlerts.map((alert) => (
            <Card
              key={alert.id}
              className={`bg-[#0A0A0A] border-[#1A1A1A] rounded-xl overflow-hidden ${
                !alert.is_resolved ? "border-l-4 border-l-[#EF4444]" : "opacity-60"
              }`}
            >
              <div className="p-4">
                <div className="flex justify-between items-start">
                  <div className="flex gap-3 flex-1">
                    {getSeverityIcon(alert.severity)}
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        {getSeverityBadge(alert.severity)}
                        <div className="flex items-center gap-1 text-[10px] text-[#6B7280]">
                          {getTypeIcon(alert.alert_type)}
                          <span className="uppercase text-[9px]">{alert.alert_type?.replace("_", " ")}</span>
                        </div>
                      </div>
                      <p className="font-semibold text-white text-sm mb-1">{alert.message}</p>
                      <div className="flex flex-wrap gap-3 text-[11px] text-[#6B7280]">
                        <span>
                          Vehicle:{" "}
                          <span className="text-white font-medium">
                            {alert.vehicles?.plate_number || alert.vehicle_id.slice(0, 8)}
                          </span>
                        </span>
                        <span className="text-[10px]">
                          {new Date(alert.created_at).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </div>
                  {!alert.is_resolved && (
                    <Button
                      onClick={() => resolveAlert(alert.id)}
                      className="bg-[#22C55E] hover:bg-[#16A34A] text-white shrink-0 ml-2"
                      size="sm"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </div>
            </Card>
          ))}

          {filteredAlerts.length === 0 && (
            <div className="text-center py-10">
              <CheckCircle2 className="w-10 h-10 text-[#1A1A1A] mx-auto mb-3" />
              <p className="text-[#6B7280] text-sm">No alerts found</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  // DESKTOP VIEW
  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Alerts</h1>
          <p className="text-sm text-[#6B7280] mt-1">
            {activeCount} active alerts • {criticalCount} critical
          </p>
        </div>
        <Button
          variant="outline"
          onClick={fetchAlerts}
          className="border-[#1A1A1A] text-[#6B7280] hover:text-white"
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>

      <div className="flex flex-wrap gap-3 mb-6">
        {filterButtons.map((item) => {
          const isActive = filter === item.id;
          let buttonClass = "";
          if (isActive) {
            if (item.id === "critical") buttonClass = "bg-[#EF4444] text-white";
            else if (item.id === "warning") buttonClass = "bg-[#FACC15] text-black";
            else buttonClass = "bg-[#D4AF37] text-black";
          } else {
            buttonClass = "border-[#1A1A1A] text-[#6B7280]";
          }
          return (
            <Button
              key={item.id}
              variant={isActive ? "default" : "outline"}
              onClick={() => setFilter(item.id as any)}
              className={buttonClass}
            >
              <item.icon className="w-4 h-4 mr-2" />
              {item.label}
            </Button>
          );
        })}
      </div>

      <div className="space-y-4">
        {filteredAlerts.map((alert) => (
          <Card
            key={alert.id}
            className={`bg-[#0A0A0A] border-[#1A1A1A] rounded-2xl overflow-hidden transition-all ${
              !alert.is_resolved ? "border-l-4 border-l-[#EF4444]" : "opacity-60"
            }`}
          >
            <div className="p-6">
              <div className="flex justify-between items-start">
                <div className="flex gap-4">
                  {getSeverityIcon(alert.severity)}
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      {getSeverityBadge(alert.severity)}
                      <div className="flex items-center gap-1 text-xs text-[#6B7280]">
                        {getTypeIcon(alert.alert_type)}
                        <span className="uppercase">{alert.alert_type?.replace("_", " ")}</span>
                      </div>
                    </div>
                    <h3 className="text-lg font-semibold text-white mb-1">{alert.message}</h3>
                    <div className="flex flex-wrap gap-4 text-sm text-[#6B7280]">
                      <span>
                        Vehicle:{" "}
                        <span className="text-white font-medium">
                          {alert.vehicles?.plate_number || alert.vehicle_id}
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
                    onClick={() => resolveAlert(alert.id)}
                    className="bg-[#22C55E] hover:bg-[#16A34A] text-white"
                    size="sm"
                  >
                    <CheckCircle2 className="w-4 h-4 mr-2" />
                    Resolve
                  </Button>
                )}
              </div>
            </div>
          </Card>
        ))}

        {filteredAlerts.length === 0 && (
          <div className="text-center py-12">
            <CheckCircle2 className="w-12 h-12 text-[#1A1A1A] mx-auto mb-4" />
            <p className="text-[#6B7280]">No alerts found</p>
          </div>
        )}
      </div>
    </div>
  );
}
