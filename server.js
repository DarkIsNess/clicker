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

if (!fs.existsSync('/data')) fs.mkdirSync('/data');

let globalConfig = { adminId: 6675992053, adminPass: "GHG227YYK%%7", giveaways: [] };
let userData = {}; 

const load = () => {
    try {
        if (fs.existsSync(CONFIG_PATH)) globalConfig = JSON.parse(fs.readFileSync(CONFIG_PATH));
        if (fs.existsSync(DB_PATH)) userData = JSON.parse(fs.readFileSync(DB_PATH));
    } catch (e) { console.log("Ошибка загрузки БД:", e); }
};
load();

const save = () => {
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(globalConfig));
    fs.writeFileSync(DB_PATH, JSON.stringify(userData));
};

// ИСПРАВЛЕННЫЙ ЦИКЛ РОЗЫГРЫШЕЙ
setInterval(() => {
    const now = new Date(new Date().getTime() + (3 * 60 * 60 * 1000)); // МСК время
    let changed = false;
    
    globalConfig.giveaways = globalConfig.giveaways.filter(g => {
        const endTime = new Date(g.endTime);
        if (now >= endTime && !g.completed) {
            const prize = parseInt(g.prize) || 0;
            console.log(`🎁 РОЗЫГРЫШ ЗАВЕРШЕН! Начисляю ${prize} монет...`);
            
            // Начисляем ВСЕМ игрокам в базе
            Object.keys(userData).forEach(uid => {
                userData[uid].bal = (userData[uid].bal || 0) + prize;
            });
            
            changed = true;
            return false; // Удаляем из списка активных
        }
        return true;
    });
    
    if(changed) save();
}, 10000); // Проверка каждые 10 сек

app.post('/api/admin/verify', (req, res) => {
    const { userId, password } = req.body;
    if (userId == globalConfig.adminId && password === globalConfig.adminPass) return res.json({ success: true });
    res.status(403).json({ error: "Forbidden" });
});

app.post('/api/admin/action', (req, res) => {
    const { userId, password, type, amount, update } = req.body;
    if (userId != globalConfig.adminId || password !== globalConfig.adminPass) return res.status(403).send();

    if (type === 'add_money') {
        if (!userData[userId]) userData[userId] = { bal: 0, upCosts: {}, name: "Admin" };
        userData[userId].bal += parseInt(amount);
        save();
        return res.json({ success: true });
    }
    if (type === 'create_giveaway') {
        globalConfig.giveaways.push({ ...update, completed: false });
        save();
        console.log("✅ Новый розыгрыш создан:", update);
        return res.json({ success: true });
    }
});

app.post('/api/sync', (req, res) => {
    const { userId, name, bal, upCosts, energy, isInitial } = req.body;
    const now = Date.now();

    if (!userData[userId]) {
        userData[userId] = { bal: 0, upCosts: {}, energy: 100, maxEnergy: 100, name: name || "Player", lastSeen: now };
    }

    if (isInitial) {
        const offlineSec = (now - (userData[userId].lastSeen || now)) / 1000;
        const recovered = offlineSec * 0.2; 
        userData[userId].energy = Math.min(userData[userId].maxEnergy || 100, (userData[userId].energy || 0) + recovered);
    } else {
        if (bal !== undefined) userData[userId].bal = bal;
        if (upCosts) userData[userId].upCosts = upCosts;
        if (energy !== undefined) userData[userId].energy = energy;
    }

    if (name && name !== "undefined") userData[userId].name = name;
    userData[userId].lastSeen = now;
    save();
    res.json(userData[userId]); 
});

app.get('/api/config', (req, res) => {
    const leaders = Object.entries(userData)
        .map(([id, u]) => ({ bal: u.bal, name: u.name || "Player" }))
        .sort((a, b) => b.bal - a.bal).slice(0, 10);
    res.json({ ...globalConfig, leaders });
});

bot.start((ctx) => {
    ctx.replyWithHTML(`<b>Capybara Clicker</b>`, 
        Markup.inlineKeyboard([[Markup.button.webApp('🎮 Играть', WEB_APP_URL)]])
    );
});

bot.launch();
app.listen(process.env.PORT || 3000);
