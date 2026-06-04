import { createClient } from '@/lib/supabase/server'

export async function sendTelegramAlert(chatId: string, message: string, vehicle: any) {
  const botToken = process.env.TELEGRAM_BOT_TOKEN
  
  if (!botToken) {
    console.error('TELEGRAM_BOT_TOKEN not set')
    return
  }
  
  const formattedMessage = `
🔧 *FLEETWATCH ALERT* 🔧

*Vehicle:* ${vehicle.plate_number}
*Type:* ${vehicle.vehicle_type}
*Time:* ${new Date().toLocaleString()}

${message}

�� *Dashboard:* ${process.env.NEXT_PUBLIC_APP_URL || 'https://fleetwatch.vercel.app'}/dashboard
  `.trim()
  
  try {
    const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: formattedMessage,
        parse_mode: 'Markdown'
      })
    })
    
    const result = await response.json()
    if (!result.ok) {
      console.error('Telegram send error:', result)
    }
    return result
  } catch (error) {
    console.error('Telegram API error:', error)
  }
}

export async function sendAlertToAllSubscribers(alert: any, vehicle: any) {
  const supabase = await createClient()
  
  const { data: subscriptions } = await supabase
    .from('telegram_subscriptions')
    .select('chat_id')
  
  if (!subscriptions || subscriptions.length === 0) return
  
  let message = ''
  if (alert.alert_type === 'overheat') {
    message = `⚠️ *ENGINE OVERHEATING WARNING* ⚠️\n\nEngine temperature: ${vehicle.last_temperature}°C\nNormal range: 80-100°C\n\n🛑 Action required: Pull over and check coolant.`
  } else if (alert.alert_type === 'low_battery') {
    message = `🔋 *LOW BATTERY WARNING* 🔋\n\nBattery voltage: ${vehicle.last_voltage}V\nNormal: 12.2-12.8V\n\n🛑 Action required: Schedule battery check within 24 hours.`
  } else if (alert.alert_type === 'check_engine') {
    message = `🔧 *CHECK ENGINE* 🔧\n\nFault code detected: ${vehicle.last_fault_code || 'Unknown'}\n\n🛑 Action required: Bring to mechanic for diagnosis.`
  }
  
  for (const sub of subscriptions) {
    await sendTelegramAlert(sub.chat_id, message, vehicle)
  }
}
