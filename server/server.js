require('dotenv').config();
const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const sqlite3 = require('sqlite3').verbose();

const adminIds = new Set(
  String(process.env.VK_ADMIN_IDS || '')
    .split(',')
    .map((id) => id.trim())
    .filter(Boolean),
);
const configuredDbPath = process.env.DB_PATH || path.join(__dirname, 'game.db');
fs.mkdirSync(path.dirname(configuredDbPath), { recursive: true });
const isAdmin = (vkId) => adminIds.has(String(vkId));


const app = express();
const allowedOrigins = [
  'https://korkodinov159-ui-vk-impire-3583.twc1.net',
  'https://vk.com',
  'https://m.vk.com',
  'https://vk.ru',
  'https://m.vk.ru',
  'http://localhost:5173',
  'http://localhost:4173',
];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
      return;
    }
    callback(new Error('CORS origin is not allowed'));
  },
}));
app.use(express.json());

const db = new sqlite3.Database(configuredDbPath);

// Создаем таблицы (только самое необходимое)
db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS players (
      vk_id TEXT PRIMARY KEY,
      name TEXT,
      avatar TEXT,
      coins INTEGER DEFAULT 1000,
      gems INTEGER DEFAULT 50,
      votes INTEGER DEFAULT 0,
      characters TEXT DEFAULT '[]',
      clan_id TEXT DEFAULT NULL,
      total_earned INTEGER DEFAULT 0,
      last_daily_bonus INTEGER DEFAULT 0,
      daily_streak INTEGER DEFAULT 0
    )
  `);
  db.run(`ALTER TABLE players ADD COLUMN max_characters INTEGER DEFAULT 1000`, () => {
    db.run(`UPDATE players SET max_characters=1000 WHERE max_characters IS NULL OR max_characters < 1000`);
  });


  db.run(`
    CREATE TABLE IF NOT EXISTS clans (
      id TEXT PRIMARY KEY,
      name TEXT,
      vk_group_id TEXT,
      owner_vk_id TEXT,
      avatar_url TEXT DEFAULT ''
    )
  `);

  db.run(`CREATE TABLE IF NOT EXISTS auction_lots (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    emoji TEXT NOT NULL,
    description TEXT NOT NULL,
    category TEXT NOT NULL,
    current_bid INTEGER NOT NULL,
    start_bid INTEGER NOT NULL,
    bidders INTEGER DEFAULT 0,
    ends_at INTEGER NOT NULL,
    rare INTEGER DEFAULT 0,
    status TEXT DEFAULT 'active',
    winner_vk_id TEXT DEFAULT NULL,
    created_at INTEGER NOT NULL
  )`);
  db.run(`CREATE TABLE IF NOT EXISTS auction_bids (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    lot_id INTEGER NOT NULL,
    vk_id TEXT NOT NULL,
    amount INTEGER NOT NULL,
    request_id TEXT NOT NULL UNIQUE,
    created_at INTEGER NOT NULL,
    status TEXT DEFAULT 'active'
  )`);
  db.run(`CREATE TABLE IF NOT EXISTS auction_inventory (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    vk_id TEXT NOT NULL,
    lot_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    emoji TEXT NOT NULL,
    description TEXT NOT NULL,
    awarded_at INTEGER NOT NULL,
    UNIQUE(vk_id, lot_id)
  )`);
  db.run(`CREATE TABLE IF NOT EXISTS auction_locks (
    lot_id INTEGER NOT NULL,
    vk_id TEXT NOT NULL,
    amount INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    PRIMARY KEY (lot_id, vk_id)
  )`);
  db.run(`CREATE TABLE IF NOT EXISTS auction_rewards (
    month TEXT NOT NULL,
    vk_id TEXT NOT NULL,
    place INTEGER NOT NULL,
    reward INTEGER NOT NULL,
    paid_at INTEGER NOT NULL,
    PRIMARY KEY (month, vk_id)
  )`);

});

[
  `ALTER TABLE auction_lots ADD COLUMN seller_vk_id TEXT DEFAULT NULL`,
  `ALTER TABLE auction_lots ADD COLUMN resource_type TEXT DEFAULT NULL`,
  `ALTER TABLE auction_lots ADD COLUMN resource_amount INTEGER DEFAULT 0`,
  `ALTER TABLE auction_lots ADD COLUMN buyout_price INTEGER DEFAULT 0`,
].forEach((sql) => db.run(sql, () => {}));

[
  `ALTER TABLE players ADD COLUMN characters TEXT DEFAULT '[]'`,
  `ALTER TABLE players ADD COLUMN last_income_collect_at INTEGER DEFAULT 0`,


  `ALTER TABLE players ADD COLUMN owned_by_vk_id TEXT DEFAULT NULL`,
  `ALTER TABLE players ADD COLUMN premium INTEGER DEFAULT 0`,
  `ALTER TABLE players ADD COLUMN is_donut_patron INTEGER DEFAULT 0`,
  `ALTER TABLE players ADD COLUMN ad_income_buff_expires_at INTEGER DEFAULT 0`,
  `ALTER TABLE players ADD COLUMN ad_views_today INTEGER DEFAULT 0`,
  `ALTER TABLE players ADD COLUMN ad_views_day TEXT DEFAULT ''`,
  `ALTER TABLE players ADD COLUMN clan_role TEXT DEFAULT NULL`,
  `ALTER TABLE players ADD COLUMN ore INTEGER DEFAULT 0`,
  `ALTER TABLE players ADD COLUMN wood INTEGER DEFAULT 0`,
  `ALTER TABLE players ADD COLUMN food INTEGER DEFAULT 0`,
].forEach((sql) => db.run(sql, () => {}));

// Дополнительные поля и таблицы экономики.
[
  `ALTER TABLE players ADD COLUMN has_shield INTEGER DEFAULT 0`,
  `ALTER TABLE players ADD COLUMN has_chains INTEGER DEFAULT 0`,
  `ALTER TABLE players ADD COLUMN has_umbrella INTEGER DEFAULT 0`,
  `ALTER TABLE players ADD COLUMN whip_expires_at INTEGER DEFAULT 0`,
  `ALTER TABLE players ADD COLUMN career_level INTEGER DEFAULT 0`,

  `ALTER TABLE clans ADD COLUMN level INTEGER DEFAULT 0`,
  `ALTER TABLE clans ADD COLUMN active_buff INTEGER DEFAULT 0`,

  `ALTER TABLE clans ADD COLUMN treasury INTEGER DEFAULT 0`,
  `ALTER TABLE clans ADD COLUMN extra_members_bought INTEGER DEFAULT 0`,
].forEach((sql) => db.run(sql, () => {}));
db.run(`CREATE TABLE IF NOT EXISTS treasury_transactions (id INTEGER PRIMARY KEY AUTOINCREMENT, clan_id TEXT, vk_id TEXT, amount INTEGER, type TEXT, created_at INTEGER)`);
db.run(`CREATE TABLE IF NOT EXISTS tax_transactions (id INTEGER PRIMARY KEY AUTOINCREMENT, vk_id TEXT, type TEXT, base_amount INTEGER, tax_amount INTEGER, created_at INTEGER)`);
db.run(`CREATE TABLE IF NOT EXISTS market_lots (
  id TEXT PRIMARY KEY,
  seller_vk_id TEXT NOT NULL,
  character TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  status TEXT DEFAULT 'active'
)`);
db.run(`CREATE TABLE IF NOT EXISTS economy_transactions (
  request_id TEXT PRIMARY KEY,
  vk_id TEXT NOT NULL,
  type TEXT NOT NULL,
  amount INTEGER NOT NULL,
  created_at INTEGER NOT NULL
)`);




db.run(`ALTER TABLE market_lots ADD COLUMN status TEXT DEFAULT 'active'`, () => {
  db.run(`UPDATE market_lots SET status='active' WHERE status IS NULL OR status=''`);
  ensureSystemMarketLots();
});

const ensureSystemMarketLots = () => {
  db.get(`SELECT COUNT(*) AS count FROM market_lots WHERE seller_vk_id='system' AND (status='active' OR status IS NULL OR status='')`, [], (countErr, row) => {
    if (countErr) return;
    const activeCount = Number(row?.count) || 0;
    const missingCount = Math.max(0, 100 - activeCount);
    if (missingCount === 0) return;

    const names = ['Екатерина', 'Зоя', 'Алла', 'Елена', 'Мария', 'София', 'Анастасия', 'Виктория'];
    const batchId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const stmt = db.prepare(`INSERT INTO market_lots (id, seller_vk_id, character, created_at, status) VALUES (?, ?, ?, ?, 'active')`);
    for (let i = 0; i < missingCount; i += 1) {
      const income = Math.min(500, Math.max(1, Math.floor(5 * Math.pow(1.3, (activeCount + i) % 18))));
      const character = {
        id: `system-character-${batchId}-${i}`,
        name: names[(activeCount + i) % names.length],
        avatar: `https://api.dicebear.com/9.x/personas/svg?seed=system-character-${batchId}-${i}`,
        type: 'bot',
        rarity: i % 10 === 0 ? 'Rare' : 'Common',
        level: 1,
        basePower: income * 10,
        income,
        resaleCount: 0,
        boughtBySelf: false,
      };
      stmt.run(`system-lot-${batchId}-${i}`, 'system', JSON.stringify(character), Date.now());
    }
    stmt.finalize();
  });
};

ensureSystemMarketLots();


app.get('/api/event/status', (_req, res) => {
  const now = new Date(); const day = now.getDay(); const hour = now.getHours();
  let phase = 'INACTIVE'; let endsAt = 0;
  if (day === 0 && hour >= 12 && hour < 18) { phase = 'DISCOUNT_PHASE'; endsAt = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 18, 0, 0).getTime(); }
  else if (day === 0 && hour >= 18) { phase = 'WAR_PHASE'; endsAt = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 0).getTime(); }
  else if (day === 6) { phase = 'DISCOUNT_PHASE'; endsAt = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 18, 0, 0).getTime(); }
  res.json({ phase, endsAt });
});


app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});


// Клиент не может изменять баланс, подданных или total_earned через синхронизацию.
app.post('/api/sync', (req, res) => {
  const vkId = String(req.body?.vk_user_id || '');
  const { name, avatar } = req.body;
  if (!vkId) return res.status(401).json({ error: 'Не удалось определить игрока' });
  db.get(`SELECT * FROM players WHERE vk_id=?`, [vkId], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    const finish = () => db.get(`SELECT * FROM players WHERE vk_id=?`, [vkId], (getErr, player) => getErr ? res.status(500).json({ error: getErr.message }) : res.json({ ...player, slaves: JSON.parse(player.characters || '[]') }));
    if (row) return db.run(`UPDATE players SET name=?, avatar=? WHERE vk_id=?`, [name || row.name, avatar || row.avatar, vkId], finish);
    db.run(`INSERT INTO players (vk_id,name,avatar,characters,max_characters,last_income_collect_at) VALUES (?,?,?,?,?,?)`, [vkId, name || 'Игрок', avatar || '', '[]', 1000, Date.now()], (insertErr) => insertErr ? res.status(500).json({ error: insertErr.message }) : finish());
  });
});

app.get('/api/player/:vkId', (req, res) => {
  const vkId = String(req.params.vkId || req.query?.vk_user_id || '');
  db.get(`SELECT * FROM players WHERE vk_id=?`, [vkId], (err, row) => {
  if (err) return res.status(500).json({ error: err.message });
  if (!row) return res.status(404).json({ error: 'Игрок не найден' });
    const chars = JSON.parse(row.characters || '[]');

    res.json({ ...row, max_characters: Math.min(50000, Math.max(1000, Number(row.max_characters) || 1000)), slaves: chars, characters: chars, hasShield: Boolean(row.has_shield), isDonutPatron: Boolean(row.is_donut_patron), premium: Boolean(row.premium), lastIncomeCollectAt: row.last_income_collect_at || Date.now() });

  });
});


 db.run(`CREATE TABLE IF NOT EXISTS regions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  owner_vk_id TEXT NOT NULL,
  type TEXT NOT NULL,
  level INTEGER DEFAULT 1,
  last_collected_at INTEGER DEFAULT 0,
  UNIQUE(owner_vk_id, type, id)
)`);

const REGION_TYPES = {
  lumber: { name: 'Лесопилка', emoji: '🌲', resource: 'wood', baseRate: 12, cost: 250000 },
  mine: { name: 'Шахта', emoji: '⛏️', resource: 'ore', baseRate: 10, cost: 300000 },
  farm: { name: 'Ферма', emoji: '🌾', resource: 'food', baseRate: 15, cost: 180000 },
  port: { name: 'Торговый порт', emoji: '⚓', resource: 'coins', baseRate: 3000, cost: 500000 },
};
const regionRate = (region) => (REGION_TYPES[region.type]?.baseRate || 0) * Math.pow(1.35, Math.max(0, region.level - 1));

app.get('/api/regions', (req, res) => {
  const vkId = econUser(req);
  db.all(`SELECT * FROM regions WHERE owner_vk_id=? ORDER BY id`, [vkId], (err, rows) => err ? res.status(500).json({ error: err.message }) : res.json((rows || []).map((r) => ({ ...r, meta: REGION_TYPES[r.type], rate: regionRate(r) }))));
});

app.get('/api/resources', (req, res) => {
  const vkId = econUser(req);
  db.get(`SELECT coins, ore, wood, food FROM players WHERE vk_id=?`, [vkId], (err, row) => err ? res.status(500).json({ error: err.message }) : res.json(row || { coins: 0, ore: 0, wood: 0, food: 0 }));
});

app.post('/api/regions/buy', (req, res) => {
  const vkId = econUser(req); const type = String(req.body?.type || ''); const meta = REGION_TYPES[type];
  if (!meta) return res.status(400).json({ error: 'Неизвестный тип региона' });
  db.get(`SELECT * FROM players WHERE vk_id=?`, [vkId], (err, player) => {
    if (err || !player) return res.status(404).json({ error: 'Игрок не найден' });
    db.get(`SELECT COUNT(*) AS count FROM regions WHERE owner_vk_id=?`, [vkId], (countErr, countRow) => {
      if (countErr) return res.status(500).json({ error: countErr.message });
      if (player.coins < meta.cost) return res.status(400).json({ error: 'Недостаточно монет' });
      db.serialize(() => {
        db.run('BEGIN IMMEDIATE TRANSACTION');
        db.run(`UPDATE players SET coins=coins-? WHERE vk_id=?`, [meta.cost, vkId]);
        db.run(`INSERT INTO regions (owner_vk_id,type,level,last_collected_at) VALUES (?,?,1,?)`, [vkId, type, Date.now()], (insertErr) => insertErr ? db.run('ROLLBACK', () => res.status(400).json({ error: 'Регион уже куплен' })) : db.run('COMMIT', () => res.json({ success: true, type, count: Number(countRow.count) + 1 })));
      });
    });
  });
});

app.post('/api/regions/upgrade', (req, res) => {
  const vkId = econUser(req); const regionId = Number(req.body?.regionId);
  db.get(`SELECT * FROM regions WHERE id=? AND owner_vk_id=?`, [regionId, vkId], (err, region) => {
    if (err || !region) return res.status(404).json({ error: 'Регион не найден' });
    if (region.level >= 10) return res.status(400).json({ error: 'Достигнут максимальный уровень' });
    const cost = Math.floor((REGION_TYPES[region.type]?.cost || 100000) * Math.pow(1.8, region.level));
    db.get(`SELECT * FROM players WHERE vk_id=?`, [vkId], (playerErr, player) => {
      if (playerErr || !player) return res.status(404).json({ error: 'Игрок не найден' });
      if (player.coins < cost) return res.status(400).json({ error: 'Недостаточно монет' });
      db.run(`UPDATE players SET coins=coins-? WHERE vk_id=?`, [cost, vkId], (payErr) => payErr ? res.status(500).json({ error: payErr.message }) : db.run(`UPDATE regions SET level=level+1 WHERE id=?`, [regionId], (upErr) => upErr ? res.status(500).json({ error: upErr.message }) : res.json({ success: true, level: region.level + 1, cost })));
    });
  });
});

app.post('/api/regions/collect', (req, res) => {
  const vkId = econUser(req); const now = Date.now();
  db.all(`SELECT * FROM regions WHERE owner_vk_id=?`, [vkId], (err, regions) => {
    if (err) return res.status(500).json({ error: err.message });
    const income = { coins: 0, ore: 0, wood: 0, food: 0 };
    for (const region of regions || []) {
      const hours = Math.max(0, now - Number(region.last_collected_at || now)) / 3600000;
      const amount = Math.floor(hours * regionRate(region));
      const key = REGION_TYPES[region.type]?.resource;
      if (key) income[key] += amount;
    }
    const tax = (regions?.length || 0) > 5 ? 0.1 : 0;
    const coins = Math.floor(income.coins * (1 - tax));
    db.serialize(() => {
      db.run('BEGIN IMMEDIATE TRANSACTION');
      db.run(`UPDATE players SET coins=coins+?, ore=ore+?, wood=wood+?, food=food+? WHERE vk_id=?`, [coins, income.ore, income.wood, income.food, vkId]);
      db.run(`UPDATE regions SET last_collected_at=? WHERE owner_vk_id=?`, [now, vkId], (updateErr) => updateErr ? db.run('ROLLBACK', () => res.status(500).json({ error: updateErr.message })) : db.run('COMMIT', () => res.json({ success: true, income: { ...income, coins }, tax })));
    });
  });
});

app.get('/api/market', (req, res) => {
  db.all(`SELECT * FROM market_lots WHERE (status='active' OR status IS NULL OR status='') ORDER BY created_at DESC`, [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json((rows || []).map((row) => ({ ...row, character: JSON.parse(row.character || '{}') })));
  });
});

const econBasePrice = (income) => Math.max(100, Math.floor(Math.pow(Math.max(1, income), 3) * 0.07));
const econPrice = (ch) => Math.floor(econBasePrice(ch.income) * Math.pow(2.2, Math.min(ch.resaleCount || 0, 30)) * (ch.boughtBySelf ? 2.2 : 1));
const econNextIncome = (income) => Math.min(500, Math.max(1, Math.ceil(income * 1.3)));
const econUser = (req) => String(req.body?.vk_user_id || req.query?.vk_user_id || '');
app.post('/api/admin/add-coins', (req, res) => {
  const vkId = econUser(req);
  const amount = Number(req.body?.amount);
  if (!isAdmin(vkId)) return res.status(403).json({ error: 'Доступ только для администратора' });
  if (!Number.isSafeInteger(amount) || amount <= 0 || amount > 1_000_000_000_000) return res.status(400).json({ error: 'Некорректная сумма' });
  db.run(`UPDATE players SET coins=coins+? WHERE vk_id=?`, [amount, vkId], function updateAdminBalance(updateErr) {
    if (updateErr) return res.status(500).json({ error: updateErr.message });
    if (this.changes === 0) return res.status(404).json({ error: 'Игрок не найден' });
    db.get(`SELECT coins FROM players WHERE vk_id=?`, [vkId], (getErr, row) => getErr ? res.status(500).json({ error: getErr.message }) : res.json({ success: true, coins: row.coins, added: amount }));
  });
});




app.post('/api/collect', (req, res) => {
  const vkId = econUser(req);
  const now = Date.now();
  db.get(`SELECT * FROM players WHERE vk_id=?`, [vkId], (err, row) => {
    if (err || !row) return res.status(404).json({ error: 'Игрок не найден' });
    const chars = JSON.parse(row.characters || '[]');
  const cap = row.is_donut_patron ? 36 : 24;
  const premiumMultiplier = row.premium ? 1.2 : 1;
  const donutMultiplier = row.is_donut_patron ? 1.2 : 1;
  const clanId = row.clan_id;
  const finishIncome = (clanBonus, adMultiplier) => {
    const baseIncome = chars.reduce((sum, ch) => sum + Number(ch.income || 0), 0);
    const income = baseIncome * premiumMultiplier * donutMultiplier * (1 + clanBonus / 100) * (row.owned_by_vk_id ? 0.5 : 1);
    const elapsed = Math.min(Math.max(0, now - (row.last_income_collect_at || now)), cap * 3600000);
    const gross = Math.floor(income * elapsed / 3600000 * adMultiplier);
    const taxRate = chars.length >= 1000 ? 0.05 : chars.length >= 500 ? 0.03 : chars.length >= 100 ? 0.01 : 0;
    const tax = Math.floor(gross * taxRate);
    const collected = gross - tax;
    db.run(`UPDATE players SET coins=coins+?, total_earned=total_earned+?, last_income_collect_at=?, ad_income_buff_expires_at=0 WHERE vk_id=?`, [collected, collected, now, vkId], (updateErr) => {
      if (updateErr) return res.status(500).json({ error: updateErr.message });
      db.run(`INSERT INTO tax_transactions (vk_id,type,base_amount,tax_amount,created_at) VALUES (?,?,?,?,?)`, [vkId, 'income', gross, tax, now]);
      const clanTax = Math.floor(gross * 0.01);
      if (clanId && clanTax > 0) db.run(`UPDATE clans SET treasury=COALESCE(treasury,0)+? WHERE id=?`, [clanTax, clanId]);
      res.json({ collected, gross, tax, coins: row.coins + collected, lastIncomeCollectAt: now });
    });
  };
  const day = new Date(now).toISOString().slice(0, 10);
  const adMultiplier = row.ad_income_buff_expires_at > now && row.ad_views_day === day ? 1.5 : 1;
  if (!clanId) return finishIncome(0, adMultiplier);
  db.get(`SELECT level FROM clans WHERE id=?`, [clanId], (clanErr, clan) => finishIncome(!clanErr && clan ? Math.min(150, clan.level || 0) : 0, adMultiplier));

  });
});

app.post('/api/ad/reward', (req, res) => {
  const vkId = econUser(req); const now = Date.now(); const day = new Date(now).toISOString().slice(0, 10);
  db.get(`SELECT * FROM players WHERE vk_id=?`, [vkId], (err, row) => {
    if (err || !row) return res.status(404).json({ error: 'Игрок не найден' });
    const views = row.ad_views_day === day ? row.ad_views_today : 0;
    if (views >= 10) return res.status(429).json({ error: 'Дневной лимит рекламы исчерпан' });
    db.run(`UPDATE players SET ad_views_today=?, ad_views_day=?, ad_income_buff_expires_at=? WHERE vk_id=?`, [views + 1, day, now + 3600000, vkId], (updateErr) => updateErr ? res.status(500).json({ error: updateErr.message }) : res.json({ multiplier: 1.5, expiresAt: now + 3600000, viewsToday: views + 1 }));
  });
});
app.post('/api/character/buy', (req, res) => {
  const vkId = econUser(req); const lotId = String(req.body?.lotId || '');
  db.get(`SELECT * FROM players WHERE vk_id=?`, [vkId], (err, player) => {
    if (err || !player) return res.status(404).json({ error: 'Игрок не найден' });
    db.get(`SELECT * FROM market_lots WHERE id=? AND (status='active' OR status IS NULL OR status='')`, [lotId], (lotErr, lot) => {
      if (lotErr || !lot) return res.status(404).json({ error: 'Лот не найден' });
      const ch = JSON.parse(lot.character); const price = econPrice(ch); const chars = JSON.parse(player.characters || '[]');
      const maxCharacters = Math.min(50000, Math.max(1000, Number(player.max_characters) || 1000));
      if (chars.length >= maxCharacters) return res.status(400).json({ error: `Лимит: максимум ${maxCharacters}` });
      if (player.coins < price) return res.status(400).json({ error: 'Недостаточно монет', price });
      ch.ownerVkId = vkId; ch.ownerName = player.name; ch.income = econNextIncome(ch.income); ch.resaleCount = (ch.resaleCount || 0) + 1;
      db.serialize(() => {
        db.run('BEGIN IMMEDIATE TRANSACTION');
        db.run(`UPDATE players SET coins=coins-?, characters=? WHERE vk_id=?`, [price, JSON.stringify([...chars, ch]), vkId]);
        if (lot.seller_vk_id !== 'system') db.run(`UPDATE players SET coins=coins+? WHERE vk_id=?`, [Math.floor(econBasePrice(JSON.parse(lot.character).income) * 0.5), lot.seller_vk_id]);
        db.run(`UPDATE market_lots SET status='sold' WHERE id=?`, [lotId], (updateErr) => updateErr ? db.run('ROLLBACK', () => res.status(500).json({ error: updateErr.message })) : db.run('COMMIT', () => { ensureSystemMarketLots(); res.json({ success: true, paid: price, tax: 0, character: ch, coins: player.coins - price }); }));
      });
    });
  });
});

app.post('/api/character/sell', (req, res) => {
  const vkId = econUser(req); const charId = String(req.body?.charId || '');
  db.get(`SELECT * FROM players WHERE vk_id=?`, [vkId], (err, row) => {
    if (err || !row) return res.status(404).json({ error: 'Игрок не найден' });
    const chars = JSON.parse(row.characters || '[]'); const index = chars.findIndex((item) => item.id === charId);
    if (index < 0) return res.status(404).json({ error: 'Подданный не найден' });
    const character = chars[index]; const price = econPrice(character);
    if (price >= 20000000) return res.status(400).json({ error: 'Подданного с такой ценой нельзя выставить в общий список' });
    const lotId = `player-${vkId}-${charId}-${Date.now()}`;
    const remaining = chars.filter((item) => item.id !== charId);
    db.serialize(() => {
      db.run('BEGIN IMMEDIATE TRANSACTION');
      db.run(`UPDATE players SET characters=? WHERE vk_id=?`, [JSON.stringify(remaining), vkId]);
      db.run(`INSERT INTO market_lots (id,seller_vk_id,character,created_at) VALUES (?,?,?,?)`, [lotId, vkId, JSON.stringify(character), Date.now()], (insertErr) => {
        if (insertErr) return db.run('ROLLBACK', () => res.status(500).json({ error: insertErr.message }));
        db.run('COMMIT', () => res.json({ success: true, lotId, payout: 0 }));
      });
    });
  });
});

app.post('/api/character/give-away', (req, res) => {

  const vkId = econUser(req); const charId = String(req.body?.charId || '');
  db.get(`SELECT * FROM players WHERE vk_id=?`, [vkId], (err, row) => {
    if (err || !row) return res.status(404).json({ error: 'Игрок не найден' });
    const chars = JSON.parse(row.characters || '[]'); const ch = chars.find((item) => item.id === charId);
    if (!ch) return res.status(404).json({ error: 'Подданный не найден' });
    const price = econPrice(ch); const payout = price >= 500000 ? 0 : Math.floor(price * 0.2273 / (econJudgment() ? 2 : 1));
    db.run(`UPDATE players SET coins=coins+?, characters=? WHERE vk_id=?`, [payout, JSON.stringify(chars.filter((item) => item.id !== charId)), vkId], (updateErr) => updateErr ? res.status(500).json({ error: updateErr.message }) : res.json({ payout, isJudgmentDay: econJudgment(), coins: row.coins + payout }));
  });
});

app.post('/api/character/buyout-self', (req, res) => {
  const vkId = econUser(req);
  db.get(`SELECT * FROM players WHERE vk_id=?`, [vkId], (err, row) => {
    if (err || !row) return res.status(404).json({ error: 'Игрок не найден' });
    if (!row.owned_by_vk_id) return res.status(400).json({ error: 'Игрок свободен' });
    const price = Math.floor(econBasePrice(1) * 0.5);
    if (row.coins < price) return res.status(400).json({ error: 'Недостаточно монет', price });
    db.run(`UPDATE players SET coins=coins-?, owned_by_vk_id=NULL WHERE vk_id=?`, [price, vkId], (updateErr) => updateErr ? res.status(500).json({ error: updateErr.message }) : res.json({ paid: price, coins: row.coins - price }));
  });
});



app.post('/api/career/claim', (req, res) => {
  const vkId = econUser(req);
  const levels = [
    [0, 0, 0, 10000, 0], [500000, 10, 1000000, 50000, 5], [5000000, 50, 10000000, 250000, 10],
    [25000000, 100, 50000000, 1000000, 20], [100000000, 500, 250000000, 5000000, 50],
    [500000000, 1000, 1000000000, 25000000, 100], [2000000000, 2500, 5000000000, 100000000, 500],
  ];
  db.get(`SELECT * FROM players WHERE vk_id=?`, [vkId], (err, row) => {
    if (err || !row) return res.status(404).json({ error: 'Игрок не найден' });
    const level = row.career_level || 0; const next = levels[level];
    if (!next) return res.status(400).json({ error: 'Максимальный уровень уже получен' });
    const chars = JSON.parse(row.characters || '[]');
    if (row.coins < next[0] || chars.length < next[1] || row.total_earned < next[2]) return res.status(400).json({ error: 'Условия карьеры не выполнены' });
    db.run(`UPDATE players SET career_level=?, coins=coins+?, votes=votes+? WHERE vk_id=?`, [level + 1, next[3], next[4], vkId], (updateErr) => updateErr ? res.status(500).json({ error: updateErr.message }) : res.json({ success: true, careerLevel: level + 1, rewardCoins: next[3], rewardVotes: next[4], coins: row.coins + next[3], totalEarned: row.total_earned + next[3] }));
  });
});

  app.get('/api/top', (req, res) => {

  db.all(`SELECT vk_id, name, avatar, coins, total_earned, characters FROM players ORDER BY coins DESC LIMIT 50`, [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows.map(r => ({ ...r, characters: JSON.parse(r.characters || '[]') })));
  });
});

// Ежедневная награда хранится на сервере и начисляется атомарно.
app.post('/api/daily-bonus', (req, res) => {
  const vkId = econUser(req);
  if (!vkId) return res.status(401).json({ error: 'Не удалось определить игрока' });

  db.get(`SELECT * FROM players WHERE vk_id=?`, [vkId], (err, player) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!player) return res.status(404).json({ error: 'Игрок не найден' });

    const now = Date.now();
    const dayMs = 24 * 60 * 60 * 1000;
    const lastClaim = Number(player.last_daily_bonus || 0);
    if (now - lastClaim < dayMs) {
      return res.status(400).json({ error: 'Бонус еще не готов', nextClaimAt: lastClaim + dayMs });
    }

    const previousStreak = Number(player.daily_streak || 0);
    const streak = now - lastClaim <= 48 * 60 * 60 * 1000 ? Math.min(previousStreak + 1, 7) : 1;
    const rewards = [10000, 25000, 50000, 100000, 250000, 500000, 1000000];
    const reward = rewards[streak - 1];

    db.run(
      `UPDATE players SET coins=coins+?, votes=votes+?, total_earned=total_earned+?, last_daily_bonus=?, daily_streak=? WHERE vk_id=? AND last_daily_bonus=?`,
      [reward, streak >= 3 ? (streak === 3 ? 5 : streak === 4 ? 5 : streak === 5 ? 10 : streak === 6 ? 15 : 50) : 0, reward, now, streak, vkId, lastClaim],
      function (updateErr) {
        if (updateErr) return res.status(500).json({ error: updateErr.message });
        if (!this.changes) return res.status(400).json({ error: 'Бонус уже был получен' });
        res.json({ success: true, reward, streak, coins: player.coins + reward, votes: player.votes + (streak >= 3 ? (streak === 3 ? 5 : streak === 4 ? 5 : streak === 5 ? 10 : streak === 6 ? 15 : 50) : 0), totalEarned: player.total_earned + reward, lastDailyBonus: now });
      },
    );
  });
});

// --- API КЛАНОВ ---

// Создание клана. Создатель автоматически становится лидером.
app.post('/api/clan/create', (req, res) => {
  const vkId = econUser(req);
  const { name, vkGroupId, avatarUrl } = req.body;
  if (!vkId || !name || !vkGroupId) return res.status(400).json({ error: 'Нужны пользователь VK, название и сообщество' });
  const clanId = Math.random().toString(36).slice(2, 8);
  const image = String(avatarUrl || `https://api.dicebear.com/7.x/shapes/svg?seed=${encodeURIComponent(vkGroupId)}`);

  db.get(`SELECT clan_id FROM players WHERE vk_id=?`, [vkId], (lookupErr, player) => {
    if (lookupErr) return res.status(500).json({ error: lookupErr.message });
    if (!player) return res.status(404).json({ error: 'Игрок не найден' });
    if (player.clan_id) return res.status(400).json({ error: 'Вы уже состоите в клане' });
    db.run(`INSERT INTO clans (id,name,vk_group_id,owner_vk_id,avatar_url) VALUES (?,?,?,?,?)`, [clanId, name.trim(), String(vkGroupId), vkId, image], (err) => {
      if (err) return res.status(500).json({ error: err.message });
      db.run(`UPDATE players SET clan_id=?, clan_role='leader', clan_joined_at=? WHERE vk_id=?`, [clanId, Date.now(), vkId], (updateErr) => updateErr ? res.status(500).json({ error: updateErr.message }) : res.json({ success: true, clanId, avatarUrl: image }));
    });
  });
});

app.post('/api/clan/join', (req, res) => {
  const vkId = econUser(req);
  const clanId = String(req.body?.clanId || '');
  if (!vkId || !clanId) return res.status(400).json({ error: 'Некорректные данные' });
  db.get(`SELECT * FROM players WHERE vk_id=?`, [vkId], (playerErr, player) => {
    if (playerErr || !player) return res.status(404).json({ error: 'Игрок не найден' });
    if (player.clan_id) return res.status(400).json({ error: 'Вы уже состоите в клане' });
    db.get(`SELECT c.*, COUNT(p.vk_id) AS member_count FROM clans c LEFT JOIN players p ON p.clan_id=c.id WHERE c.id=? GROUP BY c.id`, [clanId], (clanErr, clan) => {
      if (clanErr || !clan) return res.status(404).json({ error: 'Клан не найден' });
      const limit = Number(clan.limit || 30);
      if (Number(clan.member_count) >= limit) return res.status(400).json({ error: 'В клане нет мест' });
      db.run(`UPDATE players SET clan_id=?, clan_role='member', clan_joined_at=? WHERE vk_id=?`, [clanId, Date.now(), vkId], (updateErr) => updateErr ? res.status(500).json({ error: updateErr.message }) : res.json({ success: true, clanId }));
    });
  });
});

app.post('/api/clan/leave', (req, res) => {
  const vkId = econUser(req);
  db.run(`UPDATE players SET clan_id=NULL, clan_role=NULL, clan_joined_at=0 WHERE vk_id=? AND clan_role!='leader'`, [vkId], function (err) {
    if (err) return res.status(500).json({ error: err.message });
    if (!this.changes) return res.status(400).json({ error: 'Лидер не может выйти из клана' });
    res.json({ success: true });
  });
});

app.post('/api/clan/shop', (req, res) => {
  const vkId = econUser(req);
  const clanId = String(req.body?.clanId || '');
  const item = String(req.body?.item || '');
  if (item !== 'level_up' && item !== 'buff_income' && item !== 'buy_slot') return res.status(400).json({ error: 'Неизвестное улучшение' });
  db.get(`SELECT c.*, p.clan_role, p.coins FROM clans c JOIN players p ON p.clan_id=c.id WHERE c.id=? AND p.vk_id=?`, [clanId, vkId], (err, clan) => {
    if (err || !clan) return res.status(404).json({ error: 'Клан или игрок не найден' });
    if (clan.clan_role !== 'leader' && clan.clan_role !== 'deputy') return res.status(403).json({ error: 'Недостаточно прав' });
    const level = Number(clan.level || 0);
    const cost = item === 'level_up' ? Math.max(100000, (level + 1) * 100000) : item === 'buff_income' ? 300000 : 500000;
    if (clan.coins < cost) return res.status(400).json({ error: 'Недостаточно монет' });
    const update = item === 'level_up' ? `UPDATE clans SET level=COALESCE(level,0)+1, treasury=treasury-? WHERE id=?` : item === 'buff_income' ? `UPDATE clans SET active_buff=1, treasury=treasury-? WHERE id=?` : `UPDATE clans SET extra_members_bought=COALESCE(extra_members_bought,0)+1, treasury=treasury-? WHERE id=?`;
    db.run(update, [cost, clanId], (updateErr) => updateErr ? res.status(500).json({ error: updateErr.message }) : res.json({ success: true, cost }));
  });
});

app.get('/api/clans', (req, res) => {
    db.all(`SELECT c.*, COALESCE(SUM(p.total_earned),0) AS total_earned, COUNT(p.vk_id) AS member_count FROM clans c LEFT JOIN players p ON p.clan_id=c.id GROUP BY c.id ORDER BY total_earned DESC`, [], (err, rows) => {

    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// 6. Детали клана
app.get('/api/clan/:clanId', (req, res) => {
  const { clanId } = req.params;
  db.get(`SELECT * FROM clans WHERE id = ?`, [clanId], (err, clan) => {
    if (err || !clan) return res.status(404).json({ error: 'Клан не найден' });
    db.all(`SELECT vk_id, name, avatar, coins, characters, clan_role, clan_joined_at FROM players WHERE clan_id = ? ORDER BY coins DESC`, [clanId], (err, members) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({
        ...clan,
        members: members.map(m => ({ ...m, characters: JSON.parse(m.characters || '[]') }))
      });
    });
  });
});

// --- API АУКЦИОНА ---


const auctionLots = [
  [1, 'Монетный двор', '🏦', '+5% к доходу на 7 дней', 'Предприятия', 850000, 500000, 12, 18, 1],
  [2, 'Купон освобождения', '🎟️', 'Освобождение подданного', 'Бонусы', 125000, 100000, 7, 42, 0],
  [3, 'Рамка «Золотой век»', '🖼️', 'Уникальная рамка на 30 дней', 'Косметика', 300000, 250000, 15, 67, 0],
  [4, 'Скрытый лот', '❓', 'Откроется после торгов', 'Сюрприз', 50000, 50000, 3, 91, 1],
  [5, 'Цепи защиты', '🔗', 'Защита подданных на 14 дней', 'Защита', 200000, 150000, 9, 25, 0],
];

function auctionUser(req) {
  return String(req.body?.vk_user_id || req.query?.vk_user_id || '');
}
function auctionError(res, status, error) { return res.status(status).json({ error }); }

// Заполняем демо-лоты только при первом запуске базы.
db.serialize(() => {
  db.get('SELECT COUNT(*) AS count FROM auction_lots', [], (err, row) => {
    if (err || row.count) return;
    const now = Date.now();
    const stmt = db.prepare(`INSERT INTO auction_lots (id,name,emoji,description,category,current_bid,start_bid,bidders,ends_at,rare,created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?)`);
    auctionLots.forEach((l) => stmt.run(l[0], l[1], l[2], l[3], l[4], l[5], l[6], l[7], now + l[8] * 60000, l[9], now));
    stmt.finalize();
  });
});

function normalizeLot(lot) {
  return { ...lot, currentBid: lot.current_bid, startBid: lot.start_bid, endsAt: lot.ends_at, rare: Boolean(lot.rare) };
}
app.get('/api/auction/lots', (req, res) => {
  db.all(`SELECT * FROM auction_lots WHERE status = 'active' ORDER BY ends_at ASC`, [], (err, lots) => {
    if (err) return auctionError(res, 500, err.message);
    res.json((lots || []).map(normalizeLot));
  });
});




app.get('/api/auction/history', (req, res) => {
  const vkId = auctionUser(req);
  if (!vkId) return auctionError(res, 401, 'Не удалось определить игрока');
  db.all(`SELECT b.*, l.name, l.emoji FROM auction_bids b JOIN auction_lots l ON l.id=b.lot_id WHERE b.vk_id=? ORDER BY b.created_at DESC LIMIT 50`, [vkId], (err, rows) => {
    if (err) return auctionError(res, 500, err.message);
    res.json(rows || []);
  });
});

app.get('/api/auction/inventory', (req, res) => {
  const vkId = auctionUser(req);
  if (!vkId) return auctionError(res, 401, 'Не удалось определить игрока');
  db.all(`SELECT * FROM auction_inventory WHERE vk_id=? ORDER BY awarded_at DESC`, [vkId], (err, rows) => err ? auctionError(res, 500, err.message) : res.json(rows || []));
});

app.get('/api/auction/rating', (req, res) => {


  db.all(`SELECT b.vk_id, p.name, p.avatar, COUNT(DISTINCT b.lot_id) AS wins, SUM(b.amount) AS spent
    FROM auction_bids b JOIN players p ON p.vk_id=b.vk_id
    JOIN auction_lots l ON l.id=b.lot_id
    WHERE b.status='winner' GROUP BY b.vk_id ORDER BY wins DESC, spent DESC LIMIT 100`, [], (err, rows) => {
      if (err) return auctionError(res, 500, err.message);
      res.json(rows || []);
    });
});

app.post('/api/auction/resource-lot', (req, res) => {
  const vkId = auctionUser(req); const resource = String(req.body?.resource || ''); const amount = Number(req.body?.amount); const price = Number(req.body?.price);
  if (!vkId || !['ore', 'wood', 'food'].includes(resource) || !Number.isInteger(amount) || amount <= 0 || !Number.isInteger(price) || price <= 0) return auctionError(res, 400, 'Некорректный ресурсный лот');
  db.get(`SELECT * FROM players WHERE vk_id=?`, [vkId], (err, player) => {
    if (err || !player) return auctionError(res, 404, 'Игрок не найден');
    if (Number(player[resource] || 0) < amount) return auctionError(res, 400, 'Недостаточно ресурса');
    db.run(`UPDATE players SET ${resource}=${resource}-? WHERE vk_id=?`, [amount, vkId], (updateErr) => {
      if (updateErr) return auctionError(res, 500, updateErr.message);
      const now = Date.now();
      db.run(`INSERT INTO auction_lots (name,emoji,description,category,current_bid,start_bid,buyout_price,bidders,ends_at,rare,status,seller_vk_id,resource_type,resource_amount,created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`, [`${resource} · ${amount}`, resource === 'ore' ? '⛏️' : resource === 'wood' ? '🪵' : '🍞', 'Ресурсный лот игрока', 'Ресурсы', price, price, price, 0, now + 7 * 86400000, 0, 'active', vkId, resource, amount, now], (insertErr) => insertErr ? auctionError(res, 500, insertErr.message) : res.json({ success: true }));
    });
  });
});

app.post('/api/auction/resource-buy', (req, res) => {
  const vkId = auctionUser(req); const lotId = Number(req.body?.lotId);
  db.serialize(() => {
    db.run('BEGIN IMMEDIATE TRANSACTION');
    db.get(`SELECT * FROM auction_lots WHERE id=? AND category='Ресурсы' AND status='active'`, [lotId], (err, lot) => {
      if (err || !lot) return db.run('ROLLBACK', () => auctionError(res, 404, 'Ресурсный лот недоступен'));
      if (lot.seller_vk_id === vkId) return db.run('ROLLBACK', () => auctionError(res, 400, 'Нельзя купить свой лот'));
      db.get(`SELECT * FROM players WHERE vk_id IN (?,?)`, [vkId, lot.seller_vk_id], (playersErr, rows) => {
        if (playersErr || !rows?.length) return db.run('ROLLBACK', () => auctionError(res, 404, 'Игрок не найден'));
        const buyer = rows.find((p) => p.vk_id === vkId); const seller = rows.find((p) => p.vk_id === lot.seller_vk_id);
        if (!buyer || buyer.coins < lot.buyout_price) return db.run('ROLLBACK', () => auctionError(res, 400, 'Недостаточно монет'));
        const r = lot.resource_type; db.run(`UPDATE players SET coins=coins-? WHERE vk_id=?`, [lot.buyout_price, vkId]); db.run(`UPDATE players SET coins=coins+? , ${r}=${r}+? WHERE vk_id=?`, [lot.buyout_price, lot.resource_amount, lot.seller_vk_id]);
        db.run(`UPDATE players SET ${r}=${r}+? WHERE vk_id=?`, [lot.resource_amount, vkId], (addErr) => addErr ? db.run('ROLLBACK', () => auctionError(res, 500, addErr.message)) : db.run(`UPDATE auction_lots SET status='sold', winner_vk_id=? WHERE id=?`, [vkId, lotId], (closeErr) => closeErr ? db.run('ROLLBACK', () => auctionError(res, 500, closeErr.message)) : db.run('COMMIT', () => res.json({ success: true, resource: r, amount: lot.resource_amount, price: lot.buyout_price }))));
      });
    });
  });
});

app.post('/api/auction/bid', (req, res) => {
  const requestId = String(req.body?.requestId || '');
  if (!vkId || !Number.isInteger(lotId) || !requestId || requestId.length > 100) return auctionError(res, 400, 'Некорректная ставка');

  db.serialize(() => {
    db.run('BEGIN IMMEDIATE TRANSACTION');
    db.get(`SELECT * FROM auction_bids WHERE request_id=?`, [requestId], (err, duplicate) => {
      if (err) return db.run('ROLLBACK', () => auctionError(res, 500, err.message));
      if (duplicate) return db.run('ROLLBACK', () => res.json({ success: true, duplicate: true, amount: duplicate.amount }));
      db.get(`SELECT * FROM players WHERE vk_id=?`, [vkId], (err, player) => {
        if (err || !player) return db.run('ROLLBACK', () => auctionError(res, 404, 'Игрок не найден'));
        db.get(`SELECT * FROM auction_lots WHERE id=? AND status='active'`, [lotId], (err, lot) => {
          if (err || !lot) return db.run('ROLLBACK', () => auctionError(res, 404, 'Лот недоступен'));
          if (lot.ends_at <= Date.now()) return db.run('ROLLBACK', () => auctionError(res, 409, 'Торги завершены'));
          const amount = lot.current_bid + Math.max(10000, Math.ceil(lot.current_bid * 0.05));
          db.get(`SELECT amount FROM auction_locks WHERE lot_id=? AND vk_id=?`, [lotId, vkId], (err, lock) => {
            if (err) return db.run('ROLLBACK', () => auctionError(res, 500, err.message));
            const extra = amount - (lock?.amount || 0);
            if (extra <= 0 || player.coins < extra) return db.run('ROLLBACK', () => auctionError(res, 400, 'Недостаточно монет'));
            const now = Date.now();
            db.run(`UPDATE players SET coins=coins-? WHERE vk_id=?`, [extra, vkId]);
            db.run(`INSERT INTO auction_bids (lot_id,vk_id,amount,request_id,created_at) VALUES (?,?,?,?,?)`, [lotId, vkId, amount, requestId, now]);
            db.run(`INSERT INTO auction_locks (lot_id,vk_id,amount,updated_at) VALUES (?,?,?,?) ON CONFLICT(lot_id,vk_id) DO UPDATE SET amount=excluded.amount,updated_at=excluded.updated_at`, [lotId, vkId, amount, now]);
            db.run(`UPDATE auction_lots SET current_bid=?, bidders=bidders+1, ends_at=CASE WHEN ends_at-?<=30000 THEN ends_at+30000 ELSE ends_at END WHERE id=?`, [amount, now, lotId], (err) => {
              if (err) return db.run('ROLLBACK', () => auctionError(res, 500, err.message));
              db.run('COMMIT', (err) => err ? auctionError(res, 500, err.message) : res.json({ success: true, amount, coins: player.coins - extra }));
            });
          });
        });
      });
    });
  });
});

function closeExpiredLots(done) {
  db.all(`SELECT * FROM auction_lots WHERE status='active' AND ends_at <= ?`, [Date.now()], (err, lots) => {
    if (err) return done(err);
    let index = 0;
    const next = () => {
      if (index >= lots.length) return done(null, lots.length);
      const lot = lots[index++];
      db.serialize(() => {
        db.run('BEGIN IMMEDIATE TRANSACTION');
        db.all(`SELECT * FROM auction_bids WHERE lot_id=? ORDER BY amount DESC, created_at ASC`, [lot.id], (err, bids) => {
          if (err) return db.run('ROLLBACK', () => done(err));
          const winner = bids[0];
          const losers = bids.filter((b) => !winner || b.id !== winner.id);
          const refund = losers.reduce((sum, b) => sum + b.amount, 0);
          const finish = () => db.run(`UPDATE auction_lots SET status='closed', winner_vk_id=? WHERE id=?`, [winner?.vk_id || null, lot.id], (updateErr) => {
            if (updateErr) return db.run('ROLLBACK', () => done(updateErr));
            db.run('COMMIT', (commitErr) => commitErr ? done(commitErr) : next());
          });

          const awardWinner = () => {
            if (!winner) return finish();
            db.run(`INSERT OR IGNORE INTO auction_inventory (vk_id,lot_id,name,emoji,description,awarded_at) VALUES (?,?,?,?,?,?)`, [winner.vk_id, lot.id, lot.name, lot.emoji, lot.description, Date.now()], (awardErr) => awardErr ? db.run('ROLLBACK', () => done(awardErr)) : finish());
          };
          const refundLosers = () => {
            if (!losers.length) return finish();
            const placeholders = losers.map(() => '?').join(',');
            const ids = losers.map((b) => b.vk_id);
            db.run(`UPDATE players SET coins=coins + (SELECT COALESCE(SUM(amount),0) FROM auction_bids WHERE lot_id=? AND vk_id=players.vk_id AND status='active') WHERE vk_id IN (${placeholders})`, [lot.id, ...ids], (refundErr) => {
              if (refundErr) return db.run('ROLLBACK', () => done(refundErr));
              db.run(`UPDATE auction_bids SET status='refunded' WHERE lot_id=? AND status='active' AND id<>?`, [lot.id, winner?.id || -1], (statusErr) => statusErr ? db.run('ROLLBACK', () => done(statusErr)) : awardWinner());
            });
          };
          db.run(`UPDATE auction_bids SET status='winner' WHERE id=?`, [winner?.id || -1], (winnerErr) => {
            if (winnerErr) return db.run('ROLLBACK', () => done(winnerErr));
            db.run(`DELETE FROM auction_locks WHERE lot_id=?`, [lot.id], (lockErr) => lockErr ? db.run('ROLLBACK', () => done(lockErr)) : (losers.length ? refundLosers() : awardWinner()));
          });
        });
      });
    };
    next();
  });
}

function monthKey(date = new Date()) { return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`; }
function payMonthlyRewards(done) {
  const month = monthKey(new Date(Date.now() - 86400000));
  const rewards = [500000000, 300000000, 200000000, 100000000, 50000000, 20000000];
  const monthStart = Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), 1);
  db.all(`SELECT b.vk_id, COUNT(*) AS wins, SUM(b.amount) AS spent FROM auction_bids b JOIN auction_lots l ON l.id=b.lot_id WHERE b.status='winner' AND l.created_at>=? GROUP BY b.vk_id ORDER BY wins DESC, spent DESC LIMIT 100`, [monthStart], (err, rows) => {
    if (err) return done(err);
    let i = 0;
    const next = () => {
      if (i >= rows.length) return done(null, rows.length);
      const row = rows[i];
      const place = i + 1;
      const reward = place === 1 ? rewards[0] : place === 2 ? rewards[1] : place === 3 ? rewards[2] : place <= 10 ? rewards[3] : place <= 25 ? rewards[4] : rewards[5];
      db.run(`INSERT OR IGNORE INTO auction_rewards (month,vk_id,place,reward,paid_at) VALUES (?,?,?,?,?)`, [month, row.vk_id, place, reward, Date.now()], function (insertErr) {
        if (insertErr) return done(insertErr);
        if (!this.changes) { i += 1; return next(); }
        db.run(`UPDATE players SET coins=coins+? WHERE vk_id=?`, [reward, row.vk_id], (payErr) => { if (payErr) return done(payErr); i += 1; next(); });
      });
    };
    next();
  });
}

let lastRewardMonth = '';
function runAuctionJobs() {
  closeExpiredLots((err) => { if (err) console.error('Auction close error:', err.message); });
  const current = monthKey();
  if (new Date().getUTCDate() === 1 && lastRewardMonth !== current) {
    lastRewardMonth = current;
    payMonthlyRewards((err) => { if (err) console.error('Auction rewards error:', err.message); });
  }
}
setInterval(runAuctionJobs, 30000);
setTimeout(runAuctionJobs, 1000);
const port = Number(process.env.PORT) || 3000;
const server = app.listen(port, '0.0.0.0', () => {
  console.log(`🚀 Сервер слушает 0.0.0.0:${port}; PORT=${process.env.PORT || '3000'}`);
  console.log(`🗄️ База данных: ${configuredDbPath}`);
});
function shutdown(signal) {
  console.log(`Получен ${signal}, завершаю сервер`);
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(0), 10000).unref();
}

process.once('SIGTERM', () => shutdown('SIGTERM'));
process.once('SIGINT', () => shutdown('SIGINT'));



