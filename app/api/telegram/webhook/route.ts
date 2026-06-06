import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { message } = body
    const chatId = message?.chat?.id.toString()
    const text = message?.text || ''

    if (!chatId) return NextResponse.json({ success: true })

    const supabase = await createClient()

    // Handle commands
    if (text === '/start') {
      await sendTelegramMessage(chatId, 
        `🔧 *FleetWatch Bot Active* 🔧\n\n` +
        `Your Chat ID is: \`${chatId}\`\n\n` +
        `📋 *How to get alerts:*\n` +
        `1. Copy this Chat ID\n` +
        `2. Go to Fleet Watch Settings page\n` +
        `3. Paste it in Telegram Alerts section\n` +
        `4. Click Add\n\n` +
        `You will now receive alerts for your vehicles.\n\n` +
        `Commands:\n` +
        `/status - Check your fleet status\n` +
        `/alerts - View active alerts\n` +
        `/help - Show this message`,
        { parse_mode: 'Markdown' }
      )
    }
    else if (text === '/status') {
      // Get user's fleet status
      const { data: subscription } = await supabase
        .from('telegram_subscriptions')
        .select('profile_id')
        .eq('chat_id', chatId)
        .single()

      if (subscription?.profile_id) {
        const { data: vehicles } = await supabase
          .from('vehicles')
          .select('plate_number, status, last_temperature, last_voltage')
          .eq('profile_id', subscription.profile_id)

        if (vehicles && vehicles.length > 0) {
          let statusMsg = `🚗 *Your Fleet Status*\n\n`
          for (const v of vehicles) {
            const statusIcon = v.status === 'online' ? '🟢' : '⚫'
            statusMsg += `${statusIcon} *${v.plate_number}* - ${v.status || 'offline'}\n`
            if (v.last_temperature) statusMsg += `   🌡️ ${v.last_temperature}°C`
            if (v.last_voltage) statusMsg += `   🔋 ${v.last_voltage}V`
            statusMsg += `\n\n`
          }
          await sendTelegramMessage(chatId, statusMsg, { parse_mode: 'Markdown' })
        } else {
          await sendTelegramMessage(chatId, 
            `🚗 *Your Fleet Status*\n\nNo vehicles found. Add a vehicle from your dashboard.`,
            { parse_mode: 'Markdown' }
          )
        }
      } else {
        await sendTelegramMessage(chatId,
          `🚗 *Fleet Status*\n\n` +
          `To see your fleet status, first add this Chat ID to your Settings page in Fleet Watch dashboard.\n\n` +
          `Your Chat ID: \`${chatId}\``,
          { parse_mode: 'Markdown' }
        )
      }
    }
    else if (text === '/alerts') {
      // Get user's active alerts
      const { data: subscription } = await supabase
        .from('telegram_subscriptions')
        .select('profile_id')
        .eq('chat_id', chatId)
        .single()

      if (subscription?.profile_id) {
        const { data: alerts } = await supabase
          .from('alerts')
          .select(`
            id,
            message,
            severity,
            created_at,
            vehicles (
              plate_number
            )
          `)
          .eq('is_resolved', false)
          .eq('vehicles.profile_id', subscription.profile_id)
          .limit(10) as any

        if (alerts && alerts.length > 0) {
          let alertsMsg = `🚨 *Active Alerts* 🚨\n\n`
          for (const alert of alerts) {
            const emoji = alert.severity === 'critical' ? '🔴' : '🟡'
            alertsMsg += `${emoji} *${alert.vehicles?.plate_number || 'Unknown'}*\n`
            alertsMsg += `   ${alert.message}\n`
            alertsMsg += `   🕐 ${new Date(alert.created_at).toLocaleString()}\n\n`
          }
          await sendTelegramMessage(chatId, alertsMsg, { parse_mode: 'Markdown' })
        } else {
          await sendTelegramMessage(chatId, 
            `✅ *No Active Alerts*\n\nYour fleet is healthy!`,
            { parse_mode: 'Markdown' }
          )
        }
      } else {
        await sendTelegramMessage(chatId,
          `🚨 *Active Alerts*\n\n` +
          `To see your alerts, first add this Chat ID to your Settings page in Fleet Watch dashboard.\n\n` +
          `Your Chat ID: \`${chatId}\``,
          { parse_mode: 'Markdown' }
        )
      }
    }
    else if (text === '/help') {
      await sendTelegramMessage(chatId,
        `🤖 *FleetWatch Bot Commands*\n\n` +
        `/start - Get your Chat ID and register\n` +
        `/status - Check your fleet status\n` +
        `/alerts - View active alerts for your fleet\n` +
        `/help - Show this message\n\n` +
        `📱 *Need to set up alerts?*\n` +
        `1. Copy your Chat ID: \`${chatId}\`\n` +
        `2. Go to Settings page in Fleet Watch\n` +
        `3. Paste and save`,
        { parse_mode: 'Markdown' }
      )
    }
    else {
      // If user sends any message without command, reply with their Chat ID
      await sendTelegramMessage(chatId,
        `🔑 *Your Chat ID:* \`${chatId}\`\n\n` +
        `Copy this ID and add it to your Fleet Watch Settings page to receive alerts.\n\n` +
        `Send /help for available commands.`,
        { parse_mode: 'Markdown' }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Webhook error:', error)
    return NextResponse.json({ error: 'Webhook error' }, { status: 500 })
  }
}

async function sendTelegramMessage(chatId: string, text: string, options?: any) {
  const botToken = process.env.TELEGRAM_BOT_TOKEN
  if (!botToken) return

  await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: options?.parse_mode || 'Markdown',
    })
  })
}
