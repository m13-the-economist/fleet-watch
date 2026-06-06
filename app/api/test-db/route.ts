import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'

export async function GET() {
  const supabase = createAdminClient()
  
  const { data, error } = await supabase
    .from('vehicles')
    .select('id, device_id, plate_number')
    .limit(5)
  
  return NextResponse.json({ data, error })
}