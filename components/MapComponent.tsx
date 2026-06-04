"use client";

import { useEffect, useRef, useState } from "react";
import { Maximize2, Minimize2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Vehicle {
  id: string;
  plate_number: string;
  vehicle_type: string;
  last_location_lat: number;
  last_location_lng: number;
  last_temperature: number;
  last_voltage: number;
  status: string;
}

interface MapComponentProps {
  vehicles: Vehicle[];
  isMobile?: boolean;
}

export default function MapComponent({ vehicles, isMobile = false }: MapComponentProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isMounted, setIsMounted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const mapInstanceRef = useRef<any>(null);
  const markersRef = useRef<{ [key: string]: any }>({});
  const initializedRef = useRef(false);

  const mapHeight = isFullscreen ? "100vh" : (isMobile ? "350px" : "500px");

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    
    if (!isFullscreen) {
      if (containerRef.current.requestFullscreen) {
        containerRef.current.requestFullscreen();
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
      // Force map resize when fullscreen changes
      setTimeout(() => {
        if (mapInstanceRef.current) {
          mapInstanceRef.current.invalidateSize();
        }
      }, 200);
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  useEffect(() => {
    setIsMounted(true);
    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Initialize map once
  useEffect(() => {
    if (!isMounted || !mapRef.current || initializedRef.current) return;

    const timer = setTimeout(async () => {
      const L = await import("leaflet");
      await import("leaflet/dist/leaflet.css");

      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
        iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
        shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
      });

      const map = L.map(mapRef.current).setView([6.5244, 3.3792], 13);
      
      L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>',
        subdomains: "abcd",
        maxZoom: 19,
        minZoom: 3,
      }).addTo(map);

      mapInstanceRef.current = map;
      initializedRef.current = true;
      
      setTimeout(() => {
        if (mapInstanceRef.current) {
          mapInstanceRef.current.invalidateSize();
        }
      }, 100);
    }, 500);

    return () => clearTimeout(timer);
  }, [isMounted]);

  // Update markers when vehicles change
  useEffect(() => {
    if (!isMounted || !mapInstanceRef.current || !initializedRef.current) return;

    const updateMarkers = async () => {
      const L = await import("leaflet");
      
      // Clear all existing markers
      Object.values(markersRef.current).forEach((marker) => {
        if (marker && marker.remove) marker.remove();
      });
      markersRef.current = {};

      // Add markers for current vehicles
      vehicles.forEach((vehicle) => {
        if (vehicle.last_location_lat && vehicle.last_location_lng) {
          let markerColor = "#D4AF37";
          if (vehicle.status === "offline") markerColor = "#6B7280";
          if (vehicle.last_temperature > 95) markerColor = "#EF4444";
          
          const markerSize = isFullscreen ? 16 : (isMobile ? 10 : 14);
          
          const customIcon = L.divIcon({
            className: "custom-marker",
            html: `<div style="
              background-color: ${markerColor};
              width: ${markerSize}px;
              height: ${markerSize}px;
              border-radius: 50%;
              border: 2px solid ${markerColor === "#D4AF37" ? "#F5D76E" : "white"};
              box-shadow: 0 2px 8px rgba(0,0,0,0.5);
              cursor: pointer;
            "></div>`,
            iconSize: [markerSize, markerSize],
            iconAnchor: [markerSize / 2, markerSize / 2],
          });

          const marker = L.marker([vehicle.last_location_lat, vehicle.last_location_lng], {
            icon: customIcon,
            zIndexOffset: 1000,
          }).addTo(mapInstanceRef.current);

          const popupContent = isFullscreen
            ? `<div style="background: #0A0A0A; color: white; padding: 12px; border-radius: 12px; min-width: 200px; font-size: 14px; border-top: 3px solid #D4AF37;">
                <strong style="color: #D4AF37; font-size: 16px;">✨ ${vehicle.plate_number}</strong><br/>
                🌡️ Temp: ${vehicle.last_temperature || "--"}°C<br/>
                ⚡ Voltage: ${vehicle.last_voltage || "--"}V<br/>
                📡 Status: ${vehicle.status || "unknown"}
              </div>`
            : isMobile
            ? `<div style="background: #0A0A0A; color: white; padding: 8px; border-radius: 10px; font-size: 11px; max-width: 150px; border-top: 2px solid #D4AF37;">
                <strong style="color: #D4AF37;">✨ ${vehicle.plate_number}</strong><br/>
                🌡️ ${vehicle.last_temperature || "--"}°C<br/>
                ⚡ ${vehicle.last_voltage || "--"}V
              </div>`
            : `<div style="background: #0A0A0A; color: white; padding: 10px; border-radius: 12px; min-width: 160px; border-top: 3px solid #D4AF37;">
                <strong style="color: #D4AF37;">✨ ${vehicle.plate_number}</strong><br/>
                🌡️ Temp: ${vehicle.last_temperature || "--"}°C<br/>
                ⚡ Voltage: ${vehicle.last_voltage || "--"}V<br/>
                �� Status: ${vehicle.status || "unknown"}
              </div>`;

          marker.bindPopup(popupContent);
          markersRef.current[vehicle.id] = marker;
        }
      });

      // Fit bounds to show all markers
      const validVehicles = vehicles.filter(v => v.last_location_lat && v.last_location_lng);
      if (validVehicles.length > 0 && mapInstanceRef.current) {
        const bounds = (L as any).latLngBounds(
          validVehicles.map((v) => [v.last_location_lat, v.last_location_lng])
        );
        mapInstanceRef.current.fitBounds(bounds, { padding: [50, 50] });
      }
    };

    updateMarkers();
  }, [vehicles, isMounted, isMobile, isFullscreen]);

  if (!isMounted) {
    return (
      <div style={{ height: mapHeight }} className="bg-[#1A1A1A] rounded-xl flex items-center justify-center relative">
        <div className="text-white text-sm">Loading map...</div>
      </div>
    );
  }

  return (
    <div 
      ref={containerRef} 
      className={`relative rounded-xl overflow-hidden ${isFullscreen ? "fixed inset-0 z-[9999] rounded-none" : ""}`}
      style={{ height: mapHeight, width: "100%" }}
    >
      <div ref={mapRef} style={{ height: "100%", width: "100%", backgroundColor: "#1A1A1A" }} />
      
      {/* Fullscreen Button - Always visible */}
      <Button
        onClick={toggleFullscreen}
        size={isMobile ? "sm" : "default"}
        className={`absolute bottom-4 right-4 z-[10000] bg-black/90 backdrop-blur-md border border-[#D4AF37] text-[#D4AF37] hover:bg-black hover:border-[#D4AF37]/70 shadow-lg ${
          isFullscreen ? "fixed" : ""
        }`}
        style={{ fontWeight: "bold" }}
      >
        {isFullscreen ? (
          <>
            <Minimize2 className="w-4 h-4 mr-2" />
            Exit Fullscreen
          </>
        ) : (
          <>
            <Maximize2 className="w-4 h-4 mr-2" />
            Fullscreen
          </>
        )}
      </Button>
    </div>
  );
}
