const express = require('express');
const fs = require('fs');
const path = require('path');
const { Telegraf, Markup } = require('telegraf');

const BOT_TOKEN = '8558430865:AAEs5t-qIIDk3n2fOodR4HyfWW8g-GEVICg';
const app = express();
const bot = new Telegraf(BOT_TOKEN);

// ТВОЙ URL ИЗ RAILWAY (Впиши его сюда)
const WEB_APP_URL = 'https://clicker-production-2ed0.up.railway.app'; 

app.use(express.json());
app.use(express.static(path.join(__dirname, '.')));

const DB_PATH = '/data/users.json';
const CONFIG_PATH = '/data/config.json';

let globalConfig = { adminId: 6675992053, adminPass: "GHG227YYK%%7", upgrades: {} };
let userData = {}; 

const load = () => {
    if (fs.existsSync(CONFIG_PATH)) globalConfig = JSON.parse(fs.readFileSync(CONFIG_PATH));
    if (fs.existsSync(DB_PATH)) userData = JSON.parse(fs.readFileSync(DB_PATH));
};
load();

const save = () => {
    if (!fs.existsSync('/data')) fs.mkdirSync('/data');
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(globalConfig));
    fs.writeFileSync(DB_PATH, JSON.stringify(userData));
};

// Команда /start всегда кидает кнопку "Играть"
bot.start((ctx) => {
    ctx.replyWithHTML(`<b>Привет, Капибарин!</b>\nЖми кнопку ниже, чтобы начать зарабатывать.`, 
        Markup.inlineKeyboard([
            [Markup.button.webApp('🎮 Играть', WEB_APP_URL)]
        ])
    );
});

// Админ-панель: Выдача денег только тебе
app.post('/api/admin/action', (req, res) => {
    const { userId, password, type, amount } = req.body;
    if (userId != globalConfig.adminId || password !== globalConfig.adminPass) {
        return res.status(403).json({ error: "Access Denied" });
    }
    if (type === 'add_money') {
        if (!userData[userId]) userData[userId] = { bal: 0, upCosts: {} };
        userData[userId].bal += parseInt(amount);
        save();
        return res.json({ success: true });
    }
});

app.post('/api/sync', (req, res) => {
    const { userId, name, bal, upCosts, isInitial } = req.body;
    if (!userData[userId]) userData[userId] = { bal: 0, upCosts: {}, name: name || "Player" };
    
    if (!isInitial) {
        if (bal !== undefined) userData[userId].bal = bal;
        if (upCosts) userData[userId].upCosts = upCosts;
    }
    save();
    res.json(userData[userId]); 
});

app.get('/api/config', (req, res) => {
    const leaders = Object.entries(userData)
        .map(([id, u]) => ({ bal: u.bal, name: u.name }))
        .sort((a, b) => b.bal - a.bal).slice(0, 10);
    res.json({ ...globalConfig, leaders });
});

bot.launch();
app.listen(process.env.PORT || 3000);
