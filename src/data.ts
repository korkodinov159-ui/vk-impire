import { Bot, Quest, ShopItem, Player, Clan } from './types';

export const initialBots: Bot[] = [
  { id: 'b1', name: 'Новичок', emoji: '🤖', cost: 50, incomePerSec: 1, level: 1, owned: false },
  { id: 'b2', name: 'Солдат', emoji: '⚔️', cost: 200, incomePerSec: 5, level: 1, owned: false },
  { id: 'b3', name: 'Рыцарь', emoji: '🛡️', cost: 800, incomePerSec: 20, level: 1, owned: false },
  { id: 'b4', name: 'Маг', emoji: '🧙', cost: 3000, incomePerSec: 80, level: 1, owned: false },
  { id: 'b5', name: 'Дракон', emoji: '🐉', cost: 12000, incomePerSec: 300, level: 1, owned: false },
  { id: 'b6', name: 'Титан', emoji: '👹', cost: 50000, incomePerSec: 1200, level: 1, owned: false },
  { id: 'b7', name: 'Феникс', emoji: '🔥', cost: 200000, incomePerSec: 5000, level: 1, owned: false },
  { id: 'b8', name: 'Бог Войны', emoji: '⚡', cost: 1000000, incomePerSec: 25000, level: 1, owned: false },
];

export const initialQuests: Quest[] = [
  { id: 'q1', title: 'Первые шаги', description: 'Купи 1 бота', reward: 100, type: 'daily', progress: 0, target: 1, completed: false },
  { id: 'q2', title: 'Коллекционер', description: 'Купи 3 ботов', reward: 300, type: 'daily', progress: 0, target: 3, completed: false },
  { id: 'q3', title: 'Магнат', description: 'Заработай 1000 монет', reward: 500, type: 'daily', progress: 0, target: 1000, completed: false },
  { id: 'q4', title: 'Армия', description: 'Купи 10 ботов', reward: 2000, type: 'weekly', progress: 0, target: 10, completed: false },
  { id: 'q5', title: 'Богач', description: 'Накопи 50000 монет', reward: 5000, type: 'weekly', progress: 0, target: 50000, completed: false },
  { id: 'q6', title: 'Империя', description: 'Купи 50 ботов', reward: 25000, type: 'monthly', progress: 0, target: 50, completed: false },
  { id: 'q7', title: 'Миллионер', description: 'Заработай 1 000 000 монет', reward: 100000, type: 'monthly', progress: 0, target: 1000000, completed: false },
  { id: 'q8', title: 'Клановая битва', description: 'Участвуй в клановой битве', reward: 3000, type: 'clan', progress: 0, target: 1, completed: false },
  { id: 'q9', title: 'Клановый сбор', description: 'Собери 10000 монет для клана', reward: 5000, type: 'clan', progress: 0, target: 10000, completed: false },
];

export const shopItems: ShopItem[] = [
  { id: 's1', name: '1000 монет', description: 'Получи 1000 монет', price: 5, emoji: '💰', category: 'coins', rarity: 'common' },
  { id: 's2', name: '5000 монет', description: 'Получи 5000 монет', price: 20, emoji: '💎', category: 'coins', rarity: 'rare' },
  { id: 's3', name: '25000 монет', description: 'Получи 25000 монет', price: 80, emoji: '👑', category: 'coins', rarity: 'epic' },
  { id: 's4', name: '100000 монет', description: 'Получи 100000 монет', price: 250, emoji: '🏆', category: 'coins', rarity: 'legendary' },
  { id: 's5', name: 'Буст x2 (1ч)', description: 'Удвоение дохода на 1 час', price: 15, emoji: '⚡', category: 'boost', rarity: 'common' },
  { id: 's6', name: 'Буст x5 (30мин)', description: 'Упятерение дохода на 30 минут', price: 40, emoji: '🚀', category: 'boost', rarity: 'rare' },
  { id: 's7', name: 'Буст x10 (15мин)', description: 'Десятикратный доход на 15 минут', price: 100, emoji: '💫', category: 'boost', rarity: 'epic' },
  { id: 's8', name: 'Рамка "Огонь"', description: 'Огненная рамка профиля', price: 30, emoji: '🔥', category: 'frame', rarity: 'rare' },
  { id: 's9', name: 'Рамка "Лёд"', description: 'Ледяная рамка профиля', price: 30, emoji: '❄️', category: 'frame', rarity: 'rare' },
  { id: 's10', name: 'Рамка "Молния"', description: 'Рамка с молниями', price: 60, emoji: '⚡', category: 'frame', rarity: 'epic' },
  { id: 's11', name: 'Рамка "Космос"', description: 'Космическая рамка профиля', price: 150, emoji: '🌌', category: 'frame', rarity: 'legendary' },
];

export const topPlayers: Player[] = [
  { id: 'p1', name: 'DarkLord99', avatar: '😈', coins: 15000000, clan: 'Тени', rank: 1 },
  { id: 'p2', name: 'ProGamer', avatar: '🎮', coins: 12500000, clan: 'Легенды', rank: 2 },
  { id: 'p3', name: 'QueenBee', avatar: '👑', coins: 10200000, clan: 'Пчёлы', rank: 3 },
  { id: 'p4', name: 'ShadowX', avatar: '🥷', coins: 8700000, clan: 'Тени', rank: 4 },
  { id: 'p5', name: 'IceQueen', avatar: '👸', coins: 7300000, clan: 'Легенды', rank: 5 },
  { id: 'p6', name: 'ThunderGod', avatar: '🌩️', coins: 6100000, rank: 6 },
  { id: 'p7', name: 'NinjaMaster', avatar: '🥷', coins: 5500000, clan: 'Пчёлы', rank: 7 },
  { id: 'p8', name: 'DragonSlayer', avatar: '🐲', coins: 4800000, clan: 'Драконы', rank: 8 },
  { id: 'p9', name: 'CyberPunk', avatar: '🤖', coins: 4200000, rank: 9 },
  { id: 'p10', name: 'PhoenixRise', avatar: '🔥', coins: 3900000, clan: 'Драконы', rank: 10 },
];

export const topClans: Clan[] = [
  { id: 'c1', name: 'Тени', emoji: '🌑', members: 45, power: 890000, rank: 1 },
  { id: 'c2', name: 'Легенды', emoji: '⭐', members: 38, power: 750000, rank: 2 },
  { id: 'c3', name: 'Пчёлы', emoji: '🐝', members: 52, power: 620000, rank: 3 },
  { id: 'c4', name: 'Драконы', emoji: '🐉', members: 30, power: 540000, rank: 4 },
  { id: 'c5', name: 'Волки', emoji: '🐺', members: 41, power: 480000, rank: 5 },
  { id: 'c6', name: 'Орлы', emoji: '🦅', members: 35, power: 410000, rank: 6 },
  { id: 'c7', name: 'Титаны', emoji: '💪', members: 28, power: 350000, rank: 7 },
  { id: 'c8', name: 'Фениксы', emoji: '🔥', members: 33, power: 290000, rank: 8 },
];

export const availableClans: Clan[] = [
  { id: 'c1', name: 'Тени', emoji: '🌑', members: 45, power: 890000, rank: 1 },
  { id: 'c2', name: 'Легенды', emoji: '⭐', members: 38, power: 750000, rank: 2 },
  { id: 'c3', name: 'Пчёлы', emoji: '🐝', members: 52, power: 620000, rank: 3 },
  { id: 'c4', name: 'Драконы', emoji: '🐉', members: 30, power: 540000, rank: 4 },
  { id: 'c5', name: 'Волки', emoji: '🐺', members: 41, power: 480000, rank: 5 },
  { id: 'c6', name: 'Орлы', emoji: '🦅', members: 35, power: 410000, rank: 6 },
  { id: 'c7', name: 'Титаны', emoji: '💪', members: 28, power: 350000, rank: 7 },
  { id: 'c8', name: 'Фениксы', emoji: '🔥', members: 33, power: 290000, rank: 8 },
  { id: 'c9', name: 'Рыцари', emoji: '🛡️', members: 22, power: 210000, rank: 9 },
  { id: 'c10', name: 'Маги', emoji: '🧙', members: 19, power: 180000, rank: 10 },
];
