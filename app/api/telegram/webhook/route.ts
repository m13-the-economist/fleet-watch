import { NextResponse } from 'next/server'
import { Telegraf } from 'telegraf'
import { createClient } from '@/lib/supabase/server'

// Initialize bot
const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN!)

export async function POST(request: Request) {
  try {
    const body = await request.json()
    await bot.handleUpdate(body)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Webhook error:', error)
    return NextResponse.json({ error: 'Webhook error' }, { status: 500 })
  }
}

// Bot commands
bot.start(async (ctx) => {
  const chatId = ctx.chat.id.toString()
  const userId = ctx.from.id.toString()
  
  const supabase = await createClient()
  
  // Check if user is authenticated (you'll need to link Telegram to user account)
  // For now, just register the chat ID
  const { error } = await supabase
    .from('telegram_subscriptions')
    .insert({ chat_id: chatId })
  
  if (error) {
    ctx.reply('❌ Error registering. Please contact support.')
  } else {
    ctx.reply(`
✅ *Welcome to FleetWatch Alerts!*

You will now receive real-time alerts for your fleet.

📌 *Available Commands:*
/status - Check fleet status
/alerts - View active alerts
/help - Show this message

_Note: Link your account by logging into the web dashboard and adding this chat ID._
    `, { parse_mode: 'Markdown' })
  }
})

bot.command('status', async (ctx) => {
  const chatId = ctx.chat.id.toString()
  const supabase = await createClient()
  
  // Get vehicles for this Telegram chat (you'll need to link chat_id to customer_id)
  const { data: vehicles } = await supabase
    .from('vehicles')
    .select('plate_number, last_temperature, last_voltage, status, last_seen')
    .limit(10)
  
  if (!vehicles || vehicles.length === 0) {
    ctx.reply('📭 No vehicles found in your fleet.')
    return
  }
  
  let message = '🚗 *Fleet Status*\n\n'
  for (const v of vehicles) {
    const tempEmoji = v.last_temperature > 95 ? '🔥' : v.last_temperature > 85 ? '⚠️' : '✅'
    const voltageEmoji = v.last_voltage < 11.8 ? '🔋⚠️' : v.last_voltage < 12.2 ? '⚡⚠️' : '✅'
    message += `*${v.plate_number}*\n`
    message += `  ${tempEmoji} Temp: ${v.last_temperature || '--'}°C\n`
    message += `  ${voltageEmoji} Voltage: ${v.last_voltage || '--'}V\n`
    message += `  📡 Status: ${v.status || 'unknown'}\n\n`
  }
  
  ctx.reply(message, { parse_mode: 'Markdown' })
})

bot.command('alerts', async (ctx) => {
  const supabase = await createClient()
  
  const { data: alerts } = await supabase
    .from('alerts')
    .select('*, vehicles(plate_number)')
    .eq('is_resolved', false)
    .order('created_at', { ascending: false })
    .limit(10)
  
  if (!alerts || alerts.length === 0) {
    ctx.reply('✅ No active alerts. All vehicles are operating normally.')
    return
  }
  
  let message = '🚨 *Active Alerts*\n\n'
  for (const a of alerts) {
    const severityEmoji = a.severity === 'critical' ? '🔴' : '🟡'
    message += `${severityEmoji} *${a.vehicles?.plate_number || 'Unknown'}*\n`
    message += `   ${a.message}\n`
    message += `   📅 ${new Date(a.created_at).toLocaleString()}\n\n`
  }
  
  ctx.reply(message, { parse_mode: 'Markdown' })
})

bot.command('help', async (ctx) => {
  ctx.reply(`
🤖 *FleetWatch Bot Commands*

/start - Register for alerts
/status - Check fleet status
/alerts - View active alerts
/help - Show this message

📱 *Web Dashboard*
Login at: https://fleetwatch.vercel.app

💡 *Need to link your account?*
1. Go to Web Dashboard → Settings
2. Copy your Chat ID: \`${ctx.chat.id}\`
3. Add it to receive alerts
  `, { parse_mode: 'Markdown' })
})

// Set webhook endpoint (run once)
export async function GET() {
  const webhookUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://your-domain.vercel.app'}/api/telegram/webhook`
  await bot.telegram.setWebhook(webhookUrl)
  return NextResponse.json({ message: 'Webhook set', url: webhookUrl })
}
