import { NextRequest, NextResponse } from 'next/server';
import { searchBoundary } from '@/lib/geocoding/boundary';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const query = searchParams.get('q');
  
  if (!query) {
    return NextResponse.json({ error: 'Missing query parameter. Use ?q=Lagos' }, { status: 400 });
  }
  
  try {
    const boundary = await searchBoundary(query);
    
    if (boundary && boundary.length >= 3) {
      return NextResponse.json({ 
        success: true, 
        query: query,
        boundary: boundary,
        pointCount: boundary.length 
      });
    } else {
      return NextResponse.json({ 
        success: false, 
        error: 'No boundary found for this location' 
      }, { status: 404 });
    }
  } catch (error) {
    console.error('Boundary API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}