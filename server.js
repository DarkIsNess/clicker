const { Telegraf, Markup } = require('telegraf');
const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');

// --- КОНФИГУРАЦИЯ ROUGE ---
const BOT_TOKEN = '8558430865:AAEs5t-qIIDk3n2fOodR4HyfWW8g-GEVICg'; 
const app = express();
const bot = new Telegraf(BOT_TOKEN);

app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, '.')));

// Команда /start
bot.start((ctx) => {
    const webAppUrl = process.env.RAILWAY_STATIC_URL 
        ? `https://${process.env.RAILWAY_STATIC_URL}` 
        : 'https://google.com';

    ctx.reply('Система Rouge Online. Клик за кликом, High Command.', 
        Markup.inlineKeyboard([
            Markup.button.webApp('ИГРАТЬ', webAppUrl)
        ])
    );
});

// Сохранение
app.post('/save', (req, res) => {
    console.log(`[LOG] Баланс: ${req.body.balance}`);
    res.json({ ok: true });
});

// Главная страница
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Запуск
const PORT = process.env.PORT || 3000;
bot.launch();
app.listen(PORT, () => {
    console.log(`--- ROUGE SYSTEM ONLINE ON PORT ${PORT} ---`);
});

// Корректная остановка
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
