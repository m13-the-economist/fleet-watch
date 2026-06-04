import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { device_id, plate_number, vehicle_type, temperature, voltage, rpm, speed, fault_code, location } = body

    if (!device_id) {
      return NextResponse.json({ error: 'device_id is required' }, { status: 400 })
    }

    const supabase = await createClient()

    // STEP 1: Validate device is registered
    const { data: device, error: deviceError } = await supabase
      .from('devices')
      .select('id, customer_id, is_active, plate_number')
      .eq('device_id', device_id)
      .single()

    if (deviceError || !device) {
      console.error('Device not found:', device_id)
      return NextResponse.json({ error: 'Device not registered. Please register first.' }, { status: 401 })
    }

    if (!device.is_active) {
      return NextResponse.json({ error: 'Device is deactivated' }, { status: 403 })
    }

    const customerId = device.customer_id
    const finalPlateNumber = plate_number || device.plate_number

    if (!finalPlateNumber) {
      return NextResponse.json({ error: 'plate_number is required for new devices' }, { status: 400 })
    }

    // STEP 2: Find or create vehicle record
    let { data: vehicle } = await supabase
      .from('vehicles')
      .select('id')
      .eq('device_id', device_id)
      .single()

    if (!vehicle) {
      const { data: newVehicle, error: createError } = await supabase
        .from('vehicles')
        .insert({
          device_id,
          plate_number: finalPlateNumber,
          vehicle_type: vehicle_type || 'car',
          customer_id: customerId,
          last_temperature: temperature,
          last_voltage: voltage,
          last_rpm: rpm,
          last_speed: speed,
          last_seen: new Date().toISOString(),
          status: 'online'
        })
        .select('id')
        .single()

      if (createError) throw createError
      vehicle = newVehicle
    } else {
      await supabase
        .from('vehicles')
        .update({
          last_temperature: temperature,
          last_voltage: voltage,
          last_rpm: rpm,
          last_speed: speed,
          last_seen: new Date().toISOString(),
          status: 'online'
        })
        .eq('id', vehicle.id)
    }

    // STEP 3: Update device last_seen
    await supabase
      .from('devices')
      .update({ last_seen: new Date().toISOString() })
      .eq('device_id', device_id)

    // STEP 4: Save reading
    await supabase
      .from('readings')
      .insert({
        vehicle_id: vehicle.id,
        temperature,
        voltage,
        rpm,
        speed,
        fault_code,
        location_lat: location?.lat,
        location_lng: location?.lng,
        created_at: new Date().toISOString()
      })

    // STEP 5: Check for alerts
    const alerts = []
    
    // Temperature alerts
    if (temperature > 105) {
      alerts.push({ type: 'overheat', severity: 'critical', message: `Engine overheating: ${temperature}°C` })
    } else if (temperature > 95) {
      alerts.push({ type: 'overheat', severity: 'warning', message: `High engine temperature: ${temperature}°C` })
    }

    // Voltage alerts
    if (voltage < 11.8) {
      alerts.push({ type: 'low_battery', severity: 'critical', message: `Battery critically low: ${voltage}V` })
    } else if (voltage < 12.2) {
      alerts.push({ type: 'low_battery', severity: 'warning', message: `Low battery: ${voltage}V` })
    }

    // Speed alerts
    if (speed) {
      if (speed > 100) {
        alerts.push({ type: 'speeding', severity: 'critical', message: `Excessive speeding: ${speed} km/h` })
      } else if (speed > 80) {
        alerts.push({ type: 'speeding', severity: 'warning', message: `Speed limit exceeded: ${speed} km/h` })
      }
    }

    // Fault code alerts
    if (fault_code) {
      alerts.push({ type: 'check_engine', severity: 'critical', message: `Check engine code: ${fault_code}` })
    }

    // STEP 6: Save alerts and send notifications
    for (const alert of alerts) {
      const { data: newAlert } = await supabase
        .from('alerts')
        .insert({
          vehicle_id: vehicle.id,
          alert_type: alert.type,
          severity: alert.severity,
          message: alert.message,
          is_resolved: false
        })
        .select()
        .single()

      // Send Telegram notification
      if (newAlert && customerId) {
        const { data: telegramSubs } = await supabase
          .from('telegram_subscriptions')
          .select('chat_id')
          .eq('customer_id', customerId)

        if (telegramSubs && telegramSubs.length > 0) {
          const botToken = process.env.TELEGRAM_BOT_TOKEN
          if (botToken) {
            for (const sub of telegramSubs) {
              const message = `🚨 *FLEETWATCH ALERT* 🚨\n\nVehicle: ${finalPlateNumber}\n${alert.message}\nTime: ${new Date().toLocaleString()}`
              await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ chat_id: sub.chat_id, text: message, parse_mode: 'Markdown' })
              }).catch(console.error)
            }
          }
        }
      }
    }

    return NextResponse.json({ success: true, alerts, device_verified: true })
  } catch (error) {
    console.error('Telemetry error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
