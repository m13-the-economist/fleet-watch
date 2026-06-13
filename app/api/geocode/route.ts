// app/api/geocode/route.ts
import { NextResponse } from 'next/server';
import { getStreetName } from '@/lib/geocoding/cascade';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const lat = parseFloat(searchParams.get('lat') || '');
  const lng = parseFloat(searchParams.get('lng') || '');
  
  if (isNaN(lat) || isNaN(lng)) {
    return NextResponse.json({ error: 'Invalid coordinates' }, { status: 400 });
  }
  
  const streetName = await getStreetName(lat, lng);
  
  return NextResponse.json({ streetName, lat, lng });
}