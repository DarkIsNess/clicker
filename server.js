const { Telegraf, Markup } = require('telegraf');
const express = require('express');
const bodyParser = require('body-parser');
const { LocalStorage } = require('node-localstorage');
const path = require('path');

// --- КОНФИГУРАЦИЯ ROUGE ---
const BOT_TOKEN = '8558430865:AAEs5t-qIIDk3n2fOodR4HyfWW8g-GEVICg'; 
const app = express();
const bot = new Telegraf(BOT_TOKEN);
const localStorage = new LocalStorage('./db');

app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, '.')));

// Команда /start - выдает кнопку для запуска игры
bot.start((ctx) => {
    // Railway автоматически подставляет домен в переменную RAILWAY_STATIC_URL
    const webAppUrl = process.env.RAILWAY_STATIC_URL 
        ? `https://${process.env.RAILWAY_STATIC_URL}` 
        : 'https://google.com'; // Заглушка, если домен еще не создан

    ctx.reply('Система Rouge запущена. Твой кликер готов, High Command.', 
        Markup.inlineKeyboard([
            Markup.button.webApp('ИГРАТЬ', webAppUrl)
        ])
    );
});

// Эндпоинт для сохранения прогресса (баланс, сила клика и т.д.)
app.post('/save', (req, res) => {
    // В консоли Railway ты увидишь эти логи
    console.log(
