import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { device_id, temperature, voltage, rpm, speed, fault_code } = body

    if (!device_id) {
      return NextResponse.json({ error: 'device_id is required' }, { status: 400 })
    }

    const supabase = createAdminClient()

    // Find vehicle by device_id
    let { data: vehicle, error: vehicleError } = await supabase
      .from('vehicles')
      .select('id, plate_number, profile_id')
      .eq('device_id', device_id)
      .maybeSingle()

    if (vehicleError || !vehicle) {
      return NextResponse.json({ error: 'Vehicle not found for this device' }, { status: 404 })
    }

    // Update vehicle with latest telemetry
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

    // Save reading with error handling
    const { error: readingError } = await supabase
      .from('readings')
      .insert({
        vehicle_id: vehicle.id,
        device_id: device_id,
        temperature: temperature || null,
        voltage: voltage || null,
        rpm: rpm || null,
        speed: speed || null
      })

    if (readingError) {
      console.error('Reading insert error:', readingError)
      // Don't return error - continue with alerts
    }

    // Check for alerts
    const alerts = []
    
    if (temperature && temperature > 95) {
      const severity = temperature > 105 ? 'critical' : 'warning'
      alerts.push({
        type: 'overheat',
        severity,
        message: `Engine ${severity === 'critical' ? 'CRITICAL' : 'warning'}: ${temperature}°C`
      })
    }

    if (voltage && voltage < 12.2) {
      const severity = voltage < 11.8 ? 'critical' : 'warning'
      alerts.push({
        type: 'low_battery',
        severity,
        message: `Battery ${severity === 'critical' ? 'CRITICAL' : 'low'}: ${voltage}V`
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

      // Send Telegram notification if profile_id exists
      if (savedAlert && botToken && vehicle.profile_id) {
        const { data: telegramSubs } = await supabase
          .from('telegram_subscriptions')
          .select('chat_id')
          .eq('profile_id', vehicle.profile_id)

        if (telegramSubs && telegramSubs.length > 0) {
          const alertEmoji = alert.severity === 'critical' ? '🚨🔴' : '⚠️🟡'
          const text = `${alertEmoji} *FLEETWATCH ALERT* ${alertEmoji}\n\n` +
            `*Vehicle:* ${vehicle.plate_number}\n` +
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

    return NextResponse.json({ success: true, alerts_count: alerts.length })
  } catch (error) {
    console.error('Telemetry error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
