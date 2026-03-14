const express = require('express');
const fs = require('fs');
const path = require('path');
const { Telegraf } = require('telegraf');

const BOT_TOKEN = '8558430865:AAEs5t-qIIDk3n2fOodR4HyfWW8g-GEVICg';
const app = express();
const bot = new Telegraf(BOT_TOKEN);

app.use(express.json());
app.use(express.static(path.join(__dirname, '.')));

const CONFIG_PATH = '/data/config.json';
let globalConfig = {
    adminId: 6675992053,
    adminPass: "GHG227YYK%%7",
    upgrades: {},
    giveaways: [] // Храним будущие розыгрыши
};

if (fs.existsSync(CONFIG_PATH)) {
    try { globalConfig = JSON.parse(fs.readFileSync(CONFIG_PATH)); } catch (e) {}
}

// Проверка и запуск розыгрышей каждую минуту
setInterval(() => {
    const now = new Date();
    globalConfig.giveaways = globalConfig.giveaways.filter(g => {
        const gDate = new Date(g.endTime);
        if (now >= gDate && !g.completed) {
            // Тут логика завершения (можно отправить сообщение в чат через бота)
            bot.telegram.sendMessage(globalConfig.adminId, `🎁 Розыгрыш "${g.prize}" завершен! Пора выбирать победителя.`);
            g.completed = true; 
            return false; // Удаляем из активных
        }
        return true;
    });
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(globalConfig));
}, 60000);

app.get('/api/config', (req, res) => res.json(globalConfig));

app.post('/api/admin/update', (req, res) => {
    const { userId, password, update } = req.body;
    if (userId == globalConfig.adminId && password === globalConfig.adminPass) {
        if (update.type === 'upgrade') {
            globalConfig.upgrades[update.id] = { name: update.name, cost: parseInt(update.cost) };
        } else if (update.type === 'giveaway') {
            globalConfig.giveaways.push(update.data);
        }
        fs.writeFileSync(CONFIG_PATH, JSON.stringify(globalConfig));
        res.json({ success: true });
    } else { res.status(403).json({ error: "No" }); }
});

bot.launch();
app.listen(process.env.PORT || 3000);
