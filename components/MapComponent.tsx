"use client";

import { useEffect, useRef, useState } from "react";
import { Maximize2, Minimize2, Pen, Check, X, Trash2, Undo2, Expand } from "lucide-react";
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
  last_seen: string;
  color?: string;
}

interface Geofence {
  id: string;
  vehicle_id: string;
  name: string;
  latitude?: number;
  longitude?: number;
  radius_meters?: number;
  polygon?: {
    type: string;
    coordinates: number[][][];
  };
  is_active: boolean;
}

interface MapComponentProps {
  vehicles: Vehicle[];
  geofences?: Geofence[];
  isMobile?: boolean;
  onMarkerClick?: (vehicle: Vehicle) => void;
  locationInfo?: { [key: string]: string };
  isDrawingMode?: boolean;
  onPolygonComplete?: (coordinates: number[][]) => void;
  onDrawingModeToggle?: () => void;
  onDrawingConfirm?: () => void;
  onDrawingCancel?: () => void;
  drawingModeActive?: boolean;
  selectedVehicleForGeofence?: { id: string; name: string } | null;
  pendingLocation?: { lat: number; lng: number } | null;
}

export default function MapComponent({ 
  vehicles, 
  geofences = [], 
  isMobile = false, 
  onMarkerClick, 
  locationInfo = {},
  isDrawingMode = false,
  onPolygonComplete,
  onDrawingModeToggle,
  onDrawingConfirm,
  onDrawingCancel,
  drawingModeActive = false,
  selectedVehicleForGeofence = null,
  pendingLocation = null
}: MapComponentProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isMounted, setIsMounted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const mapInstanceRef = useRef<any>(null);
  const markersRef = useRef<{ [key: string]: any }>({});
  const polygonsRef = useRef<{ [key: string]: any }>({});
  
  // Drawing state - using [number, number] tuple type
  const [drawingPoints, setDrawingPoints] = useState<[number, number][]>([]);
  const drawingPolygonRef = useRef<any>(null);
  const drawingMarkersRef = useRef<any[]>([]);
  const tempCircleRef = useRef<any>(null);

  const mapHeight = isFullscreen ? "100vh" : (isMobile ? "350px" : "550px");

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!isFullscreen) {
      containerRef.current.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
  };

  // Auto-fullscreen on mobile when drawing mode activates
  useEffect(() => {
    if (isMobile && drawingModeActive && containerRef.current && !isFullscreen) {
      containerRef.current.requestFullscreen();
    }
  }, [drawingModeActive, isMobile, isFullscreen]);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
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

  // Initialize map
  useEffect(() => {
    if (!isMounted || !mapRef.current || mapInstanceRef.current) return;

    const initMap = async () => {
      const L = await import("leaflet");
      await import("leaflet/dist/leaflet.css");

      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
        iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
        shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
      });

      if (!mapRef.current) return;
      
      // Center map on Nigeria (Lagos area)
      const map = L.map(mapRef.current).setView([8.0, 8.0], 6);
      
      L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>',
        subdomains: "abcd",
        maxZoom: 19,
        minZoom: 3,
      }).addTo(map);

      mapInstanceRef.current = map;
      
      // Handle map clicks for polygon drawing
      map.on('click', (e: any) => {
        if (drawingModeActive) {
          const { lat, lng } = e.latlng;
          addPolygonPoint(lat, lng);
        }
      });
      
      setTimeout(() => {
        if (mapInstanceRef.current) {
          mapInstanceRef.current.invalidateSize();
        }
      }, 100);
    };

    initMap();
  }, [isMounted]);

  // Add polygon point
  const addPolygonPoint = async (lat: number, lng: number) => {
    const L = await import("leaflet");
    
    const newPoint: [number, number] = [lat, lng];
    const newPoints = [...drawingPoints, newPoint];
    setDrawingPoints(newPoints);
    
    // Add marker at point
    const marker = L.marker([lat, lng], {
      draggable: true,
      icon: L.divIcon({
        className: "drawing-marker",
        html: `<div style="
          background-color: #D4AF37;
          width: 14px;
          height: 14px;
          border-radius: 50%;
          border: 2px solid white;
          box-shadow: 0 0 0 2px #D4AF37;
        "></div>`,
        iconSize: [14, 14],
        iconAnchor: [7, 7],
      })
    }).addTo(mapInstanceRef.current);
    
    marker.on('dragend', (e: any) => {
      const newLatLng = e.target.getLatLng();
      const index = drawingMarkersRef.current.findIndex(m => m === marker);
      if (index !== -1) {
        const updatedPoints = [...drawingPoints];
        updatedPoints[index] = [newLatLng.lat, newLatLng.lng];
        setDrawingPoints(updatedPoints);
        updateDrawingPolygon(updatedPoints);
      }
    });
    
    drawingMarkersRef.current.push(marker);
    
    // Update or create polygon
    updateDrawingPolygon(newPoints);
  };
  
  const updateDrawingPolygon = async (points: [number, number][]) => {
    const L = await import("leaflet");
    
    if (drawingPolygonRef.current) {
      drawingPolygonRef.current.remove();
      drawingPolygonRef.current = null;
    }
    
    if (points.length >= 3) {
      // Close the polygon by adding first point at end for display
      const displayPoints = [...points];
      if (displayPoints[0][0] !== displayPoints[displayPoints.length-1][0] || 
          displayPoints[0][1] !== displayPoints[displayPoints.length-1][1]) {
        displayPoints.push(displayPoints[0]);
      }
      
      drawingPolygonRef.current = L.polygon(displayPoints, {
        color: "#D4AF37",
        fillColor: "#D4AF37",
        fillOpacity: 0.3,
        weight: 3,
        dashArray: "5, 5"
      }).addTo(mapInstanceRef.current);
    }
  };
  
  const undoLastPoint = () => {
    if (drawingPoints.length > 0) {
      const lastMarker = drawingMarkersRef.current.pop();
      if (lastMarker) lastMarker.remove();
      const newPoints = drawingPoints.slice(0, -1);
      setDrawingPoints(newPoints);
      updateDrawingPolygon(newPoints);
    }
  };
  
  const clearDrawing = () => {
    drawingMarkersRef.current.forEach(marker => marker.remove());
    drawingMarkersRef.current = [];
    setDrawingPoints([]);
    if (drawingPolygonRef.current) {
      drawingPolygonRef.current.remove();
      drawingPolygonRef.current = null;
    }
  };
  
  const finishDrawing = () => {
    if (drawingPoints.length >= 3) {
      // Close polygon for storage - convert to lat,lng format
      const closedPoints = drawingPoints.map(point => [point[0], point[1]]);
      closedPoints.push(closedPoints[0]);
      onPolygonComplete?.(closedPoints);
      clearDrawing();
    }
  };

  // Draw saved polygons and geofences
  useEffect(() => {
    if (!isMounted || !mapInstanceRef.current) return;

    const updateMapElements = async () => {
      const L = await import("leaflet");
      
      // Clear existing markers
      Object.values(markersRef.current).forEach((marker) => marker.remove());
      markersRef.current = {};
      
      // Clear existing polygons
      Object.values(polygonsRef.current).forEach((polygon) => polygon.remove());
      polygonsRef.current = {};

      // Store all points for bounds fitting
      const allPoints: [number, number][] = [];

      // Draw saved geofence polygons
      geofences.forEach((geofence) => {
        if (geofence.polygon && geofence.polygon.coordinates && mapInstanceRef.current) {
          try {
            const coords = geofence.polygon.coordinates[0];
            // IMPORTANT: Database stores [lat, lng] (from our save function)
            // So we use [c[0], c[1]] directly without swapping
            const polygonPoints = coords.map((c: number[]) => {
              const point: [number, number] = [c[0], c[1]];
              allPoints.push(point);
              return point;
            });
            
            console.log("Polygon points (first 3):", polygonPoints.slice(0, 3));
            
            const polygon = L.polygon(polygonPoints, {
              color: geofence.is_active ? "#22C55E" : "#6B7280",
              fillColor: geofence.is_active ? "#22C55E" : "#6B7280",
              fillOpacity: 0.25,
              weight: 3,
            }).addTo(mapInstanceRef.current);
            
            polygon.bindPopup(`
              <div style="background: #0A0A0A; color: white; padding: 8px 12px; border-radius: 8px;">
                <strong style="color: #22C55E;">📍 ${geofence.name}</strong><br/>
                Type: Polygon<br/>
                Points: ${coords.length}<br/>
                Status: ${geofence.is_active ? "Active ✅" : "Inactive"}
              </div>
            `);
            
            polygonsRef.current[geofence.id] = polygon;
          } catch (err) {
            console.error("Error drawing polygon:", err);
          }
        }
      });

      // Draw vehicle markers and collect their points
      vehicles.forEach((vehicle, index) => {
        if (vehicle.last_location_lat && vehicle.last_location_lng && mapInstanceRef.current) {
          allPoints.push([vehicle.last_location_lat, vehicle.last_location_lng]);
          
          const vehicleColor = vehicle.color || `hsl(${(index * 37) % 360}, 70%, 55%)`;
          
          let markerColor = vehicleColor;
          if (vehicle.status === "offline") markerColor = "#6B7280";
          if ((vehicle.last_temperature || 0) > 95) markerColor = "#EF4444";
          if ((vehicle.last_temperature || 0) > 85 && (vehicle.last_temperature || 0) <= 95) markerColor = "#FACC15";

          const markerSize = isFullscreen ? 14 : (isMobile ? 12 : 14);
          
          const customIcon = L.divIcon({
            className: "custom-marker",
            html: `<div style="
              background-color: ${markerColor};
              width: ${markerSize}px;
              height: ${markerSize}px;
              border-radius: 50%;
              border: 2px solid white;
              box-shadow: 0 1px 4px rgba(0,0,0,0.3);
              cursor: pointer;
            "></div>`,
            iconSize: [markerSize, markerSize],
            iconAnchor: [markerSize / 2, markerSize / 2],
          });

          const marker = L.marker([vehicle.last_location_lat, vehicle.last_location_lng], {
            icon: customIcon,
          }).addTo(mapInstanceRef.current);

          const streetName = locationInfo[vehicle.id] || "";
          
          const popupContent = `
            <div style="background: #0A0A0A; color: white; padding: 8px 12px; border-radius: 8px; border-left: 3px solid ${markerColor};">
              <strong>🚗 ${vehicle.plate_number}</strong>
              ${streetName ? `<br/>📍 ${streetName}` : ''}
              <br/>🌡️ ${vehicle.last_temperature || "--"}°C
              <br/>🔋 ${vehicle.last_voltage || "--"}V
              <br/><button onclick="window.location.href='/dashboard/vehicles/${vehicle.id}'" style="background: ${markerColor}; color: black; border: none; padding: 4px 8px; border-radius: 4px; margin-top: 6px; cursor: pointer; font-size: 11px;">View Details</button>
            </div>
          `;

          marker.bindPopup(popupContent);
          
          marker.on('click', () => {
            if (onMarkerClick) {
              onMarkerClick(vehicle);
            }
          });
          
          markersRef.current[vehicle.id] = marker;
        }
      });

      // Fit bounds to show all polygons and vehicles
      if (allPoints.length > 0 && mapInstanceRef.current) {
        const bounds = L.latLngBounds(allPoints);
        mapInstanceRef.current.fitBounds(bounds, { padding: [50, 50] });
      }
    };

    updateMapElements();
  }, [vehicles, geofences, isMounted, isMobile, isFullscreen, onMarkerClick, locationInfo]);

  if (!isMounted) {
    return (
      <div style={{ height: mapHeight }} className="bg-[#1A1A1A] rounded-xl flex items-center justify-center">
        <div className="text-white">Loading map...</div>
      </div>
    );
  }

  return (
    <div 
      ref={containerRef} 
      className={`relative rounded-xl overflow-hidden ${isFullscreen ? "fixed inset-0 z-[9999] rounded-none" : "z-10"}`}
      style={{ height: mapHeight, width: "100%" }}
    >
      <div ref={mapRef} style={{ height: "100%", width: "100%", backgroundColor: "#1A1A1A" }} />
      
      {/* Floating Buttons */}
      <div className="absolute bottom-3 right-3 z-[10000] flex flex-col gap-2">
        <Button
          onClick={toggleFullscreen}
          variant="outline"
          size={isMobile ? "sm" : "default"}
          className="bg-black/80 backdrop-blur-sm border-[#D4AF37]/30 text-[#D4AF37]"
        >
          {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          <span className="ml-1 text-xs">{isFullscreen ? "Exit" : "Fullscreen"}</span>
        </Button>

        {/* Draw Polygon Button */}
        {isDrawingMode && !drawingModeActive && (
          <Button
            onClick={onDrawingModeToggle}
            variant="outline"
            size={isMobile ? "sm" : "default"}
            className="bg-[#D4AF37] text-black hover:bg-[#E5C86B] animate-pulse"
          >
            <Pen className="w-4 h-4 mr-1" />
            Draw Polygon
          </Button>
        )}
      </div>

      {/* Polygon Drawing Toolbar */}
      {drawingModeActive && (
        <div className="absolute bottom-20 left-1/2 transform -translate-x-1/2 z-[10000] bg-black/90 backdrop-blur-md border-2 border-[#D4AF37] rounded-xl p-3 min-w-[280px]">
          <div className="text-center mb-2">
            <p className="text-[#D4AF37] text-sm font-bold">✏️ DRAW POLYGON</p>
            <p className="text-white text-xs">
              {selectedVehicleForGeofence?.name && `Vehicle: ${selectedVehicleForGeofence.name}`}
            </p>
            <p className="text-gray-400 text-[10px] mt-1">
              Click on map to add points. {drawingPoints.length} points added.
              {drawingPoints.length >= 3 && " Ready to complete!"}
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={undoLastPoint}
              disabled={drawingPoints.length === 0}
              size="sm"
              variant="outline"
              className="flex-1 border-[#D4AF37] text-[#D4AF37]"
            >
              <Undo2 className="w-3 h-3 mr-1" /> Undo
            </Button>
            <Button
              onClick={clearDrawing}
              size="sm"
              variant="outline"
              className="flex-1 border-red-500 text-red-500"
            >
              <Trash2 className="w-3 h-3 mr-1" /> Clear
            </Button>
            <Button
              onClick={finishDrawing}
              disabled={drawingPoints.length < 3}
              size="sm"
              className={`flex-1 ${drawingPoints.length >= 3 ? 'bg-[#22C55E] hover:bg-[#16a34a]' : 'bg-gray-600'}`}
            >
              <Check className="w-3 h-3 mr-1" /> Done
            </Button>
          </div>
        </div>
      )}

      {/* Info message */}
      {isDrawingMode && !drawingModeActive && selectedVehicleForGeofence && (
        <div className="absolute top-3 left-1/2 transform -translate-x-1/2 z-[10000] bg-black/80 backdrop-blur-sm border border-[#D4AF37] rounded-xl p-2 px-4">
          <p className="text-[#D4AF37] text-xs flex items-center gap-1">
            <Expand className="w-3 h-3" />
            Click the <Pen className="w-3 h-3 inline mx-1" /> button to start drawing your polygon
          </p>
        </div>
      )}
    </div>
  );
}
