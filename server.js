const express = require('express');
const fs = require('fs');
const path = require('path');
const { Telegraf, Markup } = require('telegraf');

const BOT_TOKEN = '8558430865:AAEs5t-qIIDk3n2fOodR4HyfWW8g-GEVICg';
const app = express();
const bot = new Telegraf(BOT_TOKEN);

const WEB_APP_URL = 'https://clicker-production-2ed0.up.railway.app'; 

app.use(express.json());
app.use(express.static(path.join(__dirname, '.')));

const DB_PATH = '/data/users.json';
const CONFIG_PATH = '/data/config.json';

// Создаем папку если нет
if (!fs.existsSync('/data')) fs.mkdirSync('/data');

let globalConfig = { adminId: 6675992053, adminPass: "GHG227YYK%%7", upgrades: {}, giveaways: [] };
let userData = {}; 

const load = () => {
    if (fs.existsSync(CONFIG_PATH)) globalConfig = JSON.parse(fs.readFileSync(CONFIG_PATH));
    if (fs.existsSync(DB_PATH)) userData = JSON.parse(fs.readFileSync(DB_PATH));
};
load();

const save = () => {
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(globalConfig));
    fs.writeFileSync(DB_PATH, JSON.stringify(userData));
};

// Проверка розыгрышей каждые 30 секунд
setInterval(() => {
    const now = new Date(new Date().getTime() + (3 * 60 * 60 * 1000)); // МСК
    let changed = false;
    globalConfig.giveaways = globalConfig.giveaways.filter(g => {
        if (now >= new Date(g.endTime) && !g.completed) {
            Object.keys(userData).forEach(uid => { userData[uid].bal += parseInt(g.prize); });
            changed = true; return false; 
        }
        return true;
    });
    if(changed) save();
}, 30000);

bot.start((ctx) => {
    ctx.replyWithHTML(`<b>Играть в Капибару!</b>`, 
        Markup.inlineKeyboard([[Markup.button.webApp('🎮 Играть', WEB_APP_URL)]])
    );
});

app.post('/api/admin/action', (req, res) => {
    const { userId, password, type, amount, update } = req.body;
    if (userId != globalConfig.adminId || password !== globalConfig.adminPass) return res.status(403).send();

    if (type === 'add_money') {
        if (!userData[userId]) userData[userId] = { bal: 0, upCosts: {} };
        userData[userId].bal += parseInt(amount);
        save();
        return res.json({ success: true });
    }
    if (type === 'create_giveaway') {
        globalConfig.giveaways.push(update);
        save();
        return res.json({ success: true });
    }
});

app.post('/api/sync', (req, res) => {
    const { userId, name, bal, upCosts, energy, isInitial } = req.body;
    if (!userData[userId]) userData[userId] = { bal: 0, upCosts: {}, energy: 100, name: name || "Player" };
    
    if (!isInitial) {
        if (bal !== undefined) userData[userId].bal = bal;
        if (upCosts) userData[userId].upCosts = upCosts;
        if (energy !== undefined) userData[userId].energy = energy;
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
