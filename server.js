const express = require('express');
const fs = require('fs');
const path = require('path');
const { Telegraf } = require('telegraf');

const BOT_TOKEN = '8558430865:AAEs5t-qIIDk3n2fOodR4HyfWW8g-GEVICg';
const app = express();
const bot = new Telegraf(BOT_TOKEN);

app.use(express.json());
app.use(express.static(path.join(__dirname, '.')));

// Пути к файлам в Volume
const DB_PATH = '/data/users.json';
const CONFIG_PATH = '/data/config.json';

let globalConfig = { adminId: 6675992053, adminPass: "GHG227YYK%%7", upgrades: {}, giveaways: [] };
let userData = {}; // { userId: { bal: 0, upgrades: {} } }

// Загрузка данных
if (fs.existsSync(CONFIG_PATH)) globalConfig = JSON.parse(fs.readFileSync(CONFIG_PATH));
if (fs.existsSync(DB_PATH)) userData = JSON.parse(fs.readFileSync(DB_PATH));

// Функция сохранения
const save = () => {
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(globalConfig));
    fs.writeFileSync(DB_PATH, JSON.stringify(userData));
};

// Проверка розыгрышей каждую минуту
setInterval(() => {
    const now = new Date();
    let changed = false;
    
    globalConfig.giveaways = globalConfig.giveaways.filter(g => {
        if (now >= new Date(g.endTime) && !g.completed) {
            const prizeAmount = parseInt(g.prize.replace(/\D/g, '')) || 0;
            // НАЧИСЛЕНИЕ ВСЕМ
            Object.keys(userData).forEach(uid => {
                userData[uid].bal += prizeAmount;
            });
            bot.telegram.sendMessage(globalConfig.adminId, `✅ Розыгрыш завершен! Всем начислено по ${prizeAmount} монет.`);
            changed = true;
            return false; 
        }
        return true;
    });
    
    if(changed) save();
}, 60000);

// API для синхронизации игрока
app.post('/api/sync', (req, res) => {
    const { userId, bal, upCosts } = req.body;
    if (!userData[userId]) userData[userId] = { bal: 0, upCosts: {} };
    
    // Берем то, что больше (серверное или клиентское), чтобы не было дюпа
    userData[userId].bal = Math.max(userData[userId].bal, bal);
    userData[userId].upCosts = upCosts;
    
    save();
    res.json(userData[userId]);
});

app.get('/api/config', (req, res) => res.json(globalConfig));

app.post('/api/admin/verify', (req, res) => {
    const { userId, password } = req.body;
    res.json({ success: (userId == globalConfig.adminId && password === globalConfig.adminPass) });
});

app.post('/api/admin/update', (req, res) => {
    const { userId, password, update } = req.body;
    if (userId == globalConfig.adminId && password === globalConfig.adminPass) {
        if (update.type === 'upgrade') globalConfig.upgrades[update.id] = update;
        else if (update.type === 'giveaway') globalConfig.giveaways.push(update.data);
        save();
        res.json({ success: true });
    }
});

bot.launch();
app.listen(process.env.PORT || 3000);
