// lib/geocoding/cascade.ts
import { createClient } from '@/lib/supabase/client';

interface GeocodeResult {
  streetAddress: string;
  provider: string;
  lat: number;
  lng: number;
}

// Round coordinates to ~100m precision (3 decimal places)
function roundCoordinates(lat: number, lng: number): { roundedLat: number; roundedLng: number } {
  return {
    roundedLat: Math.round(lat * 1000) / 1000,
    roundedLng: Math.round(lng * 1000) / 1000,
  };
}

// Check cache in Supabase
async function checkCache(lat: number, lng: number): Promise<string | null> {
  const { roundedLat, roundedLng } = roundCoordinates(lat, lng);
  const supabase = createClient();
  
  const { data } = await supabase
    .from('geocode_cache')
    .select('street_address')
    .eq('rounded_lat', roundedLat)
    .eq('rounded_lng', roundedLng)
    .single();
  
  return data?.street_address || null;
}

// Save to cache
async function saveToCache(lat: number, lng: number, streetAddress: string, provider: string): Promise<void> {
  const { roundedLat, roundedLng } = roundCoordinates(lat, lng);
  const supabase = createClient();
  
  await supabase
    .from('geocode_cache')
    .upsert({
      rounded_lat: roundedLat,
      rounded_lng: roundedLng,
      street_address: streetAddress,
      provider: provider,
      created_at: new Date().toISOString(),
    }, {
      onConflict: 'rounded_lat,rounded_lng',
    });
}

// OpenStreetMap Nominatim (Free, rate-limited)
async function reverseGeocodeOSM(lat: number, lng: number): Promise<GeocodeResult | null> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
      {
        headers: { 'User-Agent': 'FleetWatch/1.0 (https://fleet-watch.vercel.app)' },
        signal: controller.signal
      }
    );
    clearTimeout(timeoutId);
    
    if (!response.ok) return null;
    
    const data = await response.json();
    const road = data.address?.road || data.address?.street;
    const suburb = data.address?.suburb || data.address?.neighbourhood;
    const city = data.address?.city || data.address?.town;
    
    if (road) {
      return { streetAddress: `${road}, ${city || suburb || ''}`, provider: 'OSM', lat, lng };
    }
    if (suburb) {
      return { streetAddress: `${suburb}, ${city || ''}`, provider: 'OSM', lat, lng };
    }
    if (city) {
      return { streetAddress: city, provider: 'OSM', lat, lng };
    }
    
    return null;
  } catch (error) {
    console.error('OSM geocoding error:', error);
    return null;
  }
}

// Mapbox Geocoding (100k free/month, then $0.75/1k)
async function reverseGeocodeMapbox(lat: number, lng: number): Promise<GeocodeResult | null> {
  try {
    const token = process.env.MAPBOX_ACCESS_TOKEN;
    if (!token) return null;
    
    const response = await fetch(
      `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?access_token=${token}&types=address,poi&limit=1`
    );
    
    if (!response.ok) return null;
    
    const data = await response.json();
    const place = data.features?.[0];
    
    if (place?.place_name) {
      return { streetAddress: place.place_name, provider: 'Mapbox', lat, lng };
    }
    return null;
  } catch (error) {
    console.error('Mapbox geocoding error:', error);
    return null;
  }
}

// Main cascade function
export async function getStreetName(lat: number, lng: number): Promise<string | null> {
  // 1. Check cache first
  const cached = await checkCache(lat, lng);
  if (cached) {
    console.log('Cache hit for:', lat, lng);
    return cached;
  }
  
  console.log('Cache miss, trying geocoding providers...');
  
  // 2. Try OpenStreetMap (free, unlimited)
  const osmResult = await reverseGeocodeOSM(lat, lng);
  if (osmResult) {
    await saveToCache(lat, lng, osmResult.streetAddress, osmResult.provider);
    return osmResult.streetAddress;
  }
  
  // 3. Try Mapbox (100k free/month)
  const mapboxResult = await reverseGeocodeMapbox(lat, lng);
  if (mapboxResult) {
    await saveToCache(lat, lng, mapboxResult.streetAddress, mapboxResult.provider);
    return mapboxResult.streetAddress;
  }
  
  // 4. Fallback to coordinates
  return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
}