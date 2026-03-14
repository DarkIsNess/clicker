const { Telegraf, Markup } = require('telegraf');
const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');

const BOT_TOKEN = '8558430865:AAEs5t-qIIDk3n2fOodR4HyfWW8g-GEVICg'; 
const app = express();
const bot = new Telegraf(BOT_TOKEN);

app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, '.')));

// Временная база данных в памяти сервера
let globalLeaderboard = [];

bot.start((ctx) => {
    const webAppUrl = `https://${process.env.RAILWAY_STATIC_URL}`;
    ctx.reply(`Привет, ${ctx.from.first_name}! Капибары ждут.`, 
        Markup.inlineKeyboard([Markup.button.webApp('ИГРАТЬ', webAppUrl)])
    );
});

// Сохранение и получение рейтинга
app.post('/api/sync', (req, res) => {
    const { user, balance } = req.body;
    if (user && user.id) {
        const index = globalLeaderboard.findIndex(i => i.id === user.id);
        if (index > -1) {
            globalLeaderboard[index].balance = Math.max(globalLeaderboard[index].balance, balance);
        } else {
            globalLeaderboard.push({ id: user.id, name: user.first_name, balance });
        }
        globalLeaderboard.sort((a, b) => b.balance - a.balance);
        globalLeaderboard = globalLeaderboard.slice(0, 10); // Только ТОП-10
    }
    res.json({ leaderboard: globalLeaderboard });
});

app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));

const PORT = process.env.PORT || 3000;
bot.launch();
app.listen(PORT, () => console.log(`Server Online`));
