require('dotenv').config();
const { VK } = require('vk-io');
const { HearManager } = require('@vk-io/hear');

const vk = new VK({
    token: process.env.VK_BOT_TOKEN,
    pollingGroupId: process.env.VK_GROUP_ID
});

const hearManager = new HearManager();
vk.updates.on('message_new', hearManager.middleware);

hearManager.hear('/инфа', async (context) => {
    await context.send(`Привет! Твой VK ID: ${context.senderId}. Бот работает.`);
});

hearManager.hear(/^\/клан (.+)$/, async (context) => {
    const clanName = context.$match[1];
    await context.send(`Ищу клан: ${clanName}... (заглушка)`);
});

vk.updates.start().then(() => {
    console.log('Бот запущен и слушает сообщения');
}).catch((err) => {
    console.error('Ошибка запуска:', err);
});