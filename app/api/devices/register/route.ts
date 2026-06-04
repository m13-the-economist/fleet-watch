import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { device_id, plate_number, vehicle_type, customer_id } = body

    if (!device_id || !plate_number) {
      return NextResponse.json({ error: 'device_id and plate_number are required' }, { status: 400 })
    }

    const supabase = await createClient()

    // Check if device already exists
    const { data: existingDevice } = await supabase
      .from('devices')
      .select('id')
      .eq('device_id', device_id)
      .single()

    if (existingDevice) {
      return NextResponse.json({ error: 'Device already registered', device_id }, { status: 409 })
    }

    // Register device
    const { data: device, error } = await supabase
      .from('devices')
      .insert({
        device_id,
        plate_number,
        vehicle_type: vehicle_type || 'car',
        customer_id: customer_id || null,
        is_active: true,
        last_seen: new Date().toISOString()
      })
      .select()
      .single()

    if (error) throw error

    // Also create vehicle record
    await supabase
      .from('vehicles')
      .insert({
        device_id,
        plate_number,
        vehicle_type: vehicle_type || 'car',
        customer_id: customer_id || null,
        status: 'pending',
        created_at: new Date().toISOString()
      })

    return NextResponse.json({ success: true, device })
  } catch (error) {
    console.error('Registration error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
