export async function searchBoundary(query: string): Promise<number[][] | null> {
    if (!query.trim()) return null;
    
    try {
      // Use OpenStreetMap Nominatim first (better for polygon boundaries)
      const osmResponse = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&polygon_geojson=1&limit=1`,
        { 
          headers: { 'User-Agent': 'FleetWatch/1.0' }
        }
      );
      
      if (!osmResponse.ok) {
        return null;
      }
      
      const osmData = await osmResponse.json();
      
      if (osmData && osmData[0] && osmData[0].geojson) {
        const geojson = osmData[0].geojson;
        if (geojson.type === 'Polygon' && geojson.coordinates && geojson.coordinates[0]) {
          // Convert [lng, lat] to [lat, lng] for Leaflet
          return geojson.coordinates[0].map((coord: number[]) => [coord[1], coord[0]]);
        }
      }
      
      // Use bounding box from OSM as fallback
      if (osmData && osmData[0] && osmData[0].boundingbox) {
        const [south, north, west, east] = osmData[0].boundingbox.map(Number);
        return [
          [south, west],
          [south, east],
          [north, east],
          [north, west],
          [south, west]
        ];
      }
      
      return null;
    } catch (error) {
      console.error('Boundary search error:', error);
      return null;
    }
  }