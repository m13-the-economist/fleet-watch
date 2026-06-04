require('dotenv').config({ path: '.env.local' });

const { Telegraf } = require('telegraf');

const token = process.env.TELEGRAM_BOT_TOKEN;
console.log('Token exists:', !!token);

if (!token) {
  console.error('❌ TELEGRAM_BOT_TOKEN not found in .env.local');
  process.exit(1);
}

const bot = new Telegraf(token);

bot.start((ctx) => {
  ctx.reply('Welcome to FleetWatch! Use /status to check your fleet.');
});

bot.command('status', (ctx) => {
  ctx.reply('🚗 Fleet status: 2 vehicles online, 0 alerts');
});

bot.launch().then(() => {
  console.log('�� Bot is running...');
  console.log('📱 Message @FleetWatchAlertBot in Telegram');
});

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
