const express = require('express');
const fs = require('fs');
const path = require('path');
const { Telegraf } = require('telegraf');

const BOT_TOKEN = '8558430865:AAEs5t-qIIDk3n2fOodR4HyfWW8g-GEVICg';
const app = express();
const bot = new Telegraf(BOT_TOKEN);

app.use(express.json());
app.use(express.static(path.join(__dirname, '.')));

const DB_PATH = '/data/users.json';
const CONFIG_PATH = '/data/config.json';

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

// ПРОВЕРКА РОЗЫГРЫШЕЙ (С учетом МСК)
setInterval(() => {
    const now = new Date();
    // МСК это UTC + 3 часа
    const mskNow = new Date(now.getTime() + (3 * 60 * 60 * 1000));
    
    let changed = false;
    globalConfig.giveaways = globalConfig.giveaways.filter(g => {
        const targetTime = new Date(g.endTime);
        if (mskNow >= targetTime && !g.completed) {
            const prize = parseInt(g.prize) || 0;
            Object.keys(userData).forEach(uid => {
                userData[uid].bal += prize;
            });
            console.log(`[GIVEAWAY] Приз ${prize} выдан всем по МСК времени!`);
            bot.telegram.sendMessage(globalConfig.adminId, `✅ Розыгрыш на ${prize} завершен! Начислено всем.`);
            changed = true;
            return false; 
        }
        return true;
    });
    if(changed) save();
}, 30000);

app.post('/api/admin/verify', (req, res) => {
    const { userId, password } = req.body;
    if (userId == globalConfig.adminId && password === globalConfig.adminPass) return res.json({ success: true });
    res.status(403).json({ success: false });
});

app.post('/api/sync', (req, res) => {
    const { userId, name, bal, upCosts } = req.body;
    if (!userData[userId]) userData[userId] = { bal: 0, upCosts: {}, name: name || "Игрок" };
    userData[userId].bal = Math.max(userData[userId].bal, bal || 0);
    if(upCosts) userData[userId].upCosts = upCosts;
    userData[userId].name = name;
    save();
    res.json(userData[userId]);
});

app.get('/api/config', (req, res) => {
    const leaders = Object.entries(userData)
        .map(([id, u]) => ({ id, bal: u.bal, name: u.name || "Игрок" }))
        .sort((a, b) => b.bal - a.bal).slice(0, 10);
    res.json({ ...globalConfig, leaders });
});

app.post('/api/admin/update', (req, res) => {
    const { userId, password, update } = req.body;
    if (userId == globalConfig.adminId && password === globalConfig.adminPass) {
        if (update.type === 'upgrade') {
            globalConfig.upgrades[update.id] = update.data;
        } else if (update.type === 'giveaway') {
            globalConfig.giveaways.push(update.data);
        }
        save();
        return res.json({ success: true });
    }
    res.status(403).send("No access");
});

bot.launch();
app.listen(process.env.PORT || 3000);
