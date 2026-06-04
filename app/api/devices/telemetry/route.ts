import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { device_id, temperature, voltage, rpm, speed, fault_code, location } = body

    if (!device_id) {
      return NextResponse.json({ error: 'device_id is required' }, { status: 400 })
    }

    const supabase = await createClient()

    // Find device and its customer
    const { data: device, error: deviceError } = await supabase
      .from('devices')
      .select('id, customer_id, plate_number, is_active')
      .eq('device_id', device_id)
      .single()

    if (deviceError || !device) {
      return NextResponse.json({ error: 'Device not registered' }, { status: 401 })
    }

    if (!device.is_active) {
      return NextResponse.json({ error: 'Device is deactivated' }, { status: 403 })
    }

    const customerId = device.customer_id

    // Find or create vehicle
    let { data: vehicle } = await supabase
      .from('vehicles')
      .select('id, vehicle_name, plate_number')
      .eq('device_id', device_id)
      .single()

    if (!vehicle) {
      const { data: newVehicle, error: createError } = await supabase
        .from('vehicles')
        .insert({
          device_id,
          plate_number: device.plate_number,
          vehicle_name: device.plate_number,
          customer_id: customerId,
          status: 'online'
        })
        .select()
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

    // Save reading - vehicle is guaranteed to exist here
    if (vehicle && vehicle.id) {
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
    }

    // Check for alerts
    const alerts = []
    
    if (temperature > 95) {
      const severity = temperature > 105 ? 'critical' : 'warning'
      alerts.push({
        type: 'overheat',
        severity,
        message: `Engine ${severity === 'critical' ? 'CRITICAL' : 'warning'}: ${temperature}°C`
      })
    }

    if (voltage < 12.2) {
      const severity = voltage < 11.8 ? 'critical' : 'warning'
      alerts.push({
        type: 'low_battery',
        severity,
        message: `Battery ${severity === 'critical' ? 'CRITICAL' : 'low'}: ${voltage}V`
      })
    }

    if (speed && speed > 80) {
      const severity = speed > 100 ? 'critical' : 'warning'
      alerts.push({
        type: 'speeding',
        severity,
        message: `Speeding ${severity === 'critical' ? 'CRITICAL' : 'warning'}: ${speed} km/h`
      })
    }

    if (fault_code) {
      alerts.push({
        type: 'check_engine',
        severity: 'critical',
        message: `Check Engine: Code ${fault_code}`
      })
    }

    // Save alerts and send notifications
    const botToken = process.env.TELEGRAM_BOT_TOKEN
    
    for (const alert of alerts) {
      if (vehicle && vehicle.id) {
        const { data: savedAlert } = await supabase
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
        if (savedAlert && botToken) {
          const { data: telegramSubs } = await supabase
            .from('telegram_subscriptions')
            .select('chat_id')
            .eq('customer_id', customerId)

          if (telegramSubs && telegramSubs.length > 0) {
            const alertEmoji = alert.severity === 'critical' ? '🚨🔴' : '⚠️🟡'
            const text = `${alertEmoji} *FLEETWATCH ALERT* ${alertEmoji}\n\n` +
              `*Vehicle:* ${vehicle.vehicle_name}\n` +
              `*Plate:* ${vehicle.plate_number}\n` +
              `*Alert:* ${alert.message}\n` +
              `*Time:* ${new Date().toLocaleString()}\n\n` +
              `📱 *Dashboard:* ${process.env.NEXT_PUBLIC_APP_URL || 'https://fleet-watch-theta.vercel.app'}/dashboard`

            for (const sub of telegramSubs) {
              await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  chat_id: sub.chat_id,
                  text,
                  parse_mode: 'Markdown'
                })
              }).catch(console.error)
            }
          }
        }
      }
    }

    return NextResponse.json({ success: true, alerts_count: alerts.length })
  } catch (error) {
    console.error('Telemetry error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
