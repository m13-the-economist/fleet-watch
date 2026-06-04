import { Telegraf } from 'telegraf'

const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN!)

bot.start((ctx) => {
  ctx.reply('Welcome to FleetWatch! Use /status to check your fleet.')
})

bot.command('status', (ctx) => {
  ctx.reply('🚗 Fleet status: 2 vehicles online, 0 alerts')
})

bot.launch().then(() => {
  console.log('Bot is running...')
})

process.once('SIGINT', () => bot.stop('SIGINT'))
process.once('SIGTERM', () => bot.stop('SIGTERM'))
