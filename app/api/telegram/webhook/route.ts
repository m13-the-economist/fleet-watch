import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { message } = body
    const chatId = message?.chat?.id.toString()
    const text = message?.text || ''

    if (!chatId) return NextResponse.json({ success: true })

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
      await sendTelegramMessage(chatId,
        `🚗 *Fleet Status*\n\n` +
        `To see your fleet status, log into your dashboard:\n` +
        `https://fleet-watch-theta.vercel.app/dashboard\n\n` +
        `Make sure you've added your Chat ID in Settings first.`,
        { parse_mode: 'Markdown' }
      )
    }
    else if (text === '/alerts') {
      await sendTelegramMessage(chatId,
        `🚨 *Active Alerts*\n\n` +
        `To see your active alerts, log into your dashboard:\n` +
        `https://fleet-watch-theta.vercel.app/dashboard/alerts`,
        { parse_mode: 'Markdown' }
      )
    }
    else if (text === '/help') {
      await sendTelegramMessage(chatId,
        `🤖 *FleetWatch Bot Commands*\n\n` +
        `/start - Get your Chat ID and register\n` +
        `/status - Check fleet status\n` +
        `/alerts - View active alerts\n` +
        `/help - Show this message\n\n` +
        `📱 *Need to set up alerts?*\n` +
        `1. Copy your Chat ID above\n` +
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
