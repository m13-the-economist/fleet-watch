// lib/geofencing/service.ts
import { createClient } from '@/lib/supabase/client';

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

interface BreachResult {
  breached: boolean;
  geofence_id?: string;
  distance?: number;
}

// Check if point is inside polygon (Ray casting algorithm)
function isPointInPolygon(lat: number, lng: number, polygon: number[][]): boolean {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i][0];
    const yi = polygon[i][1];
    const xj = polygon[j][0];
    const yj = polygon[j][1];
    
    const intersect = ((yi > lat) != (yj > lat)) &&
      (lng < (xj - xi) * (lat - yi) / (yj - yi) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
}

// Calculate distance between two points in meters
function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Get active geofences for a vehicle
export async function getVehicleGeofences(vehicleId: string): Promise<Geofence[]> {
  const supabase = createClient();
  
  const { data } = await supabase
    .from('geofences')
    .select('*')
    .eq('vehicle_id', vehicleId)
    .eq('is_active', true);
  
  return data || [];
}

// Check if a vehicle has breached any geofence
export async function checkGeofenceBreach(
  vehicleId: string,
  currentLat: number,
  currentLng: number
): Promise<BreachResult | null> {
  const geofences = await getVehicleGeofences(vehicleId);
  
  if (geofences.length === 0) {
    return null;
  }
  
  for (const geofence of geofences) {
    let isInside = false;
    
    // Check POLYGON geofence
    if (geofence.polygon && geofence.polygon.coordinates) {
      const polygonCoords = geofence.polygon.coordinates[0];
      isInside = isPointInPolygon(currentLat, currentLng, polygonCoords);
      
      if (!isInside) {
        await logBreach(geofence.id, vehicleId, currentLat, currentLng, geofence.name);
        return {
          breached: true,
          geofence_id: geofence.id,
        };
      }
    }
    // Check CIRCLE geofence
    else if (geofence.latitude && geofence.longitude && geofence.radius_meters) {
      const distance = calculateDistance(
        currentLat, currentLng,
        geofence.latitude, geofence.longitude
      );
      
      if (distance > geofence.radius_meters) {
        await logBreach(geofence.id, vehicleId, currentLat, currentLng, geofence.name);
        return {
          breached: true,
          geofence_id: geofence.id,
          distance: distance,
        };
      }
    }
  }
  
  return { breached: false };
}

// Log a geofence breach
async function logBreach(
  geofenceId: string,
  vehicleId: string,
  lat: number,
  lng: number,
  geofenceName: string
): Promise<void> {
  const supabase = createClient();
  
  // Check if this breach was already logged recently (avoid duplicates)
  const { data: existing } = await supabase
    .from('geofence_breaches')
    .select('id')
    .eq('geofence_id', geofenceId)
    .eq('vehicle_id', vehicleId)
    .eq('is_resolved', false)
    .gt('breached_at', new Date(Date.now() - 60 * 60 * 1000).toISOString())
    .maybeSingle();
  
  if (existing) {
    return;
  }
  
  await supabase
    .from('geofence_breaches')
    .insert({
      geofence_id: geofenceId,
      vehicle_id: vehicleId,
      latitude: lat,
      longitude: lng,
      breached_at: new Date().toISOString(),
      is_resolved: false,
    });
  
  // Create alert for dashboard
  const { data: vehicle } = await supabase
    .from('vehicles')
    .select('plate_number, profile_id')
    .eq('id', vehicleId)
    .single();
  
  if (vehicle) {
    await supabase
      .from('alerts')
      .insert({
        vehicle_id: vehicleId,
        alert_type: 'geofence_breach',
        severity: 'warning',
        message: `${vehicle.plate_number} left geofence: ${geofenceName}`,
        action: 'Check vehicle location',
        is_resolved: false,
      });
  }
}

// Resolve a breach (when vehicle returns to zone)
export async function resolveBreach(breachId: number): Promise<void> {
  const supabase = createClient();
  
  await supabase
    .from('geofence_breaches')
    .update({ is_resolved: true })
    .eq('id', breachId);
}

// Create a new geofence (circle)
export async function createGeofence(
  vehicleId: string,
  name: string,
  latitude: number,
  longitude: number,
  radiusMeters: number = 500
): Promise<Geofence | null> {
  const supabase = createClient();
  
  const { data } = await supabase
    .from('geofences')
    .insert({
      vehicle_id: vehicleId,
      name,
      latitude,
      longitude,
      radius_meters: radiusMeters,
      is_active: true,
    })
    .select()
    .single();
  
  return data;
}

// Update geofence status (active/inactive)
export async function toggleGeofence(geofenceId: string, isActive: boolean): Promise<void> {
  const supabase = createClient();
  
  await supabase
    .from('geofences')
    .update({ is_active: isActive })
    .eq('id', geofenceId);
}

// Delete geofence
export async function deleteGeofence(geofenceId: string): Promise<void> {
  const supabase = createClient();
  
  await supabase
    .from('geofences')
    .delete()
    .eq('id', geofenceId);
}