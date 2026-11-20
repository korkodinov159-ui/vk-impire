import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import bridge from '@vkontakte/vk-bridge';
import type { Character, Clan, MarketLot, Player, ReferralInfo, Region, Resources } from '../types';
import {
  NAMES, AVATARS,
  AD_INCOME_MULTIPLIER, AD_DAILY_LIMIT, UNDER_OWNER_INCOME_MULTIPLIER,
  CLAN_CREATE_COST, getAccumulationHours,
} from '../config';
import { notify } from '../utils/notifications';
import { apiGet, apiPost, resetLaunchParamsCache } from '../api/client';

export interface CareerLevel { level: number; title: string; emoji: string; reqCoins: number; reqCharacters: number; reqTotalEarned: number; rewardCoins: number; rewardVotes: number; }
export const CAREER_LEVELS: CareerLevel[] = [
  { level: 1, title: 'Новичок', emoji: '🐣', reqCoins: 0, reqCharacters: 0, reqTotalEarned: 0, rewardCoins: 10000, rewardVotes: 0 },
  { level: 2, title: 'Торговец', emoji: '💼', reqCoins: 500000, reqCharacters: 10, reqTotalEarned: 1000000, rewardCoins: 50000, rewardVotes: 5 },
  { level: 3, title: 'Барон', emoji: '🎩', reqCoins: 5000000, reqCharacters: 50, reqTotalEarned: 10000000, rewardCoins: 250000, rewardVotes: 10 },
  { level: 4, title: 'Граф', emoji: '🏰', reqCoins: 25000000, reqCharacters: 100, reqTotalEarned: 50000000, rewardCoins: 1000000, rewardVotes: 20 },
  { level: 5, title: 'Герцог', emoji: '⚔️', reqCoins: 100000000, reqCharacters: 500, reqTotalEarned: 250000000, rewardCoins: 5000000, rewardVotes: 50 },
  { level: 6, title: 'Король', emoji: '👑', reqCoins: 500000000, reqCharacters: 1000, reqTotalEarned: 1000000000, rewardCoins: 25000000, rewardVotes: 100 },
  { level: 7, title: 'Император', emoji: '🌍', reqCoins: 2000000000, reqCharacters: 2500, reqTotalEarned: 5000000000, rewardCoins: 100000000, rewardVotes: 500 },
];

export interface DailyReward { day: number; coins: number; votes: number; emoji: string; label: string; }
export const DAILY_REWARDS: DailyReward[] = [
  { day: 1, coins: 10000, votes: 0, emoji: '🎁', label: '10K' }, { day: 2, coins: 25000, votes: 0, emoji: '💰', label: '25K' },
  { day: 3, coins: 50000, votes: 5, emoji: '💎', label: '50K' }, { day: 4, coins: 100000, votes: 5, emoji: '🔥', label: '100K' },
  { day: 5, coins: 250000, votes: 10, emoji: '⚡', label: '250K' }, { day: 6, coins: 500000, votes: 15, emoji: '👑', label: '500K' },
  { day: 7, coins: 1000000, votes: 50, emoji: '🏆', label: '1M' },
];

export const REF_WELCOME_BONUS = 100000;
export const REF_PERCENT = 0.1;
export const REF_NEWBIE_BONUS = 50000;
export const STORY_SHARE_REWARD = 600000;
export const STORY_COOLDOWN_MS = 60 * 60 * 1000;
export const MAX_MARKET_LOTS = 15000;

const VK_STORE_PRODUCTS: Record<number, string> = { 1: 'coins_450000', 7: 'coins_3245000', 20: 'coins_9900000', 50: 'coins_25200000', 100: 'coins_54000000', 500: 'coins_360000000', 1000: 'coins_900000000' };
const VK_FRAME_PRODUCTS: Record<'gold' | 'neon' | 'flame', { productId: string; price: number; name: string }> = {
  gold: { productId: 'frame_gold', price: 20, name: 'Золотая рамка' },
  neon: { productId: 'frame_neon', price: 40, name: 'Неоновая рамка' },
  flame: { productId: 'frame_flame', price: 50, name: 'Огненная рамка' },
};

const DAILY_RESET_HOURS = 48;

function getTodayKey(): string { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; }
function rand<T>(arr: T[]): T { return arr[Math.floor(Math.random() * arr.length)]; }
function uid() { return Math.random().toString(36).slice(2, 10); }

function makeChestCharacter(minIncome: number, maxIncome: number): Character {
  const income = Math.floor(Math.random() * (maxIncome - minIncome + 1)) + minIncome;
  return { id: uid(), name: rand(NAMES), avatar: rand(AVATARS), type: 'bot', rarity: 'Legendary', level: 1, basePower: income * 10, income, resaleCount: 0, boughtBySelf: false };
}

interface RefDbEntry { referrer: string; ref: string; name: string; avatar: string; totalEarned: number; joinedAt: number; bonusPaid: number; }
function loadRefDb(): RefDbEntry[] { try { return JSON.parse(localStorage.getItem('ref_db_v1') || '[]'); } catch { return []; } }
function saveRefDb(db: RefDbEntry[]) { localStorage.setItem('ref_db_v1', JSON.stringify(db)); }
function parseRefFromUrl(): string | null { try { const ref = new URLSearchParams(window.location.search).get('ref'); if (ref && /^\d+$/.test(ref)) return ref; } catch { return null; } return null; }

interface GameState {
  player: Player; lots: MarketLot[]; clans: Clan[];
  buyLot: (lotId: string) => Promise<void>; sellCharacter: (charId: string) => Promise<void>; giveAwayCharacter: (charId: string) => Promise<void>;
  buyoutSelf: () => Promise<void>; releaseCharacter: (charId: string) => void; upgradeCharacter: (charId: string) => void;
  createClan: (name: string, vkGroupId: string) => Promise<void>; joinClan: (clanId: string) => Promise<void>; claimIncome: () => Promise<void>;
  buyLimitCoins: () => void; buyLimitVotes: () => void; buyBoost: (type: any) => void; buyFrame: (frame: any) => Promise<void>;
  regions: Region[]; resources: Resources;
  loadRegions: () => Promise<void>; buyRegion: (type: Region['type']) => Promise<void>; upgradeRegion: (id: number) => Promise<void>; collectRegions: () => Promise<void>;

  buyCoinsForVotes: (coinsAmount: number, votesCost: number) => Promise<void>; openChest: (type: any) => Character | null; claimAdReward: () => Promise<void>;
  incomePerHour: number; effectiveIncomePerHour: number; clanBonusPercent: number; uncollectedCoins: number; displayCoins: number;
  adBuffActive: boolean; buyCount: number; buyCooldownEnd: number; adCooldownEnd: number; playerAdViews: number;
  claimDailyReward: () => void; dailyStatus: any; getRefLink: () => string; shareRefLink: () => Promise<void>; inviteToProfile: () => Promise<void>;
  careerStatus: any; claimCareerReward: () => void; shareToStory: () => Promise<void>; storyCooldownEnd: number; adViewsToday: number; dailyAdLimit: number; judgmentStatus: any;
}

const defaultPlayer: Player = {
  name: '', avatar: '', coins: 0, gems: 0, votes: 0, characters: [], clanId: null, lastCollectAt: 0,
  maxCharacters: 1000, limitLevel: 0, hasWhip: false, hasChains: false, hasShield: false, hasUmbrella: false, avatarFrame: 'none', lastChestOpen: 0,
  totalEarned: 0, lastDailyClaimAt: 0, dailyStreak: 0, lastDailyDay: '', myRefCode: '', invitedBy: null, referrals: [], referralEarned: 0, careerLevel: 0,
  lastStoryShareAt: 0, adViewsToday: 0, lastAdViewDay: '', ownedByVkId: null, adIncomeBuffMultiplier: 1, adIncomeBuffExpiresAt: 0, isDonutPatron: false,
};

const Ctx = createContext<GameState | null>(null);

export const GameProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [player, setPlayer] = useState<Player>(defaultPlayer);
  const [lots, setLots] = useState<MarketLot[]>([]);
  const [clans, setClans] = useState<Clan[]>([]);
  const [tick, setTick] = useState(0);
  const [buyCount, setBuyCount] = useState(0);
  const [buyCooldownEnd, setBuyCooldownEnd] = useState(0);
  const [adCooldownEnd, setAdCooldownEnd] = useState(0);
  const [regions, setRegions] = useState<Region[]>([]);
  const [resources, setResources] = useState<Resources>({ coins: 0, ore: 0, wood: 0, food: 0 });

  const [playerAdViews, setPlayerAdViews] = useState(0);
  const [clanData, setClanData] = useState<any>(null);
  const vkIdRef = useRef<string>('');
  const syncTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  void tick;

  useEffect(() => {
    const initGame = async () => {
      let vkId = '', vkName = '', vkAvatar = '';
      try {
        const userInfo = await bridge.send('VKWebAppGetUserInfo');
        vkId = userInfo.id.toString(); vkName = `${userInfo.first_name} ${userInfo.last_name}`; vkAvatar = userInfo.photo_200 || userInfo.photo_100 || '';
        resetLaunchParamsCache();
      } catch (e) {
        console.error('VK Bridge не вернул пользователя', e);
        notify('Ошибка', 'Не удалось определить пользователя VK', 'error');
        return;
      }

      vkIdRef.current = vkId;
      const urlRef = parseRefFromUrl();
      let invitedBy: string | null = null;

      if (urlRef && urlRef !== vkId) {
        const db = loadRefDb();
        if (!db.some((e) => e.ref === vkId)) {
          invitedBy = urlRef;
          db.push({ referrer: urlRef, ref: vkId, name: vkName, avatar: vkAvatar, totalEarned: 0, joinedAt: Date.now(), bonusPaid: REF_WELCOME_BONUS });
          saveRefDb(db);
          const key = `ref_bonus_${urlRef}`;
          localStorage.setItem(key, String(Number(localStorage.getItem(key) || '0') + REF_WELCOME_BONUS));
        }
      }

      try {
        await apiPost('/sync', { name: vkName, avatar: vkAvatar });
        const data = await apiGet<any>(`/player/${vkId}`);
        const db = loadRefDb();
        const myReferrals: ReferralInfo[] = db.filter((e) => e.referrer === vkId).map((e) => ({ vk_id: e.ref, name: e.name, avatar: e.avatar, totalEarned: e.totalEarned, joinedAt: e.joinedAt, bonusPaid: e.bonusPaid }));
        const newbieBonus = invitedBy ? REF_NEWBIE_BONUS : 0;

        setPlayer((prev) => ({
          ...prev, 
          name: vkName, 
          avatar: vkAvatar, 
          coins: data.coins + newbieBonus, 
          votes: data.votes,
          characters: data.slaves || [],
          maxCharacters: Math.min(50000, Math.max(1000, Number(data.max_characters) || 1000)),
          hasShield: data.hasShield ?? false,
          clanId: data.clan_id || null, 
          totalEarned: data.total_earned ?? 0,
          ownedByVkId: data.ownedByVkId || null, 
          isDonutPatron: data.isDonutPatron ?? false,
          adIncomeBuffExpiresAt: data.adIncomeBuffExpiresAt || 0, 
          lastCollectAt: data.lastIncomeCollectAt || Date.now(),
          lastDailyClaimAt: Number(data.last_daily_bonus || 0),
          lastDailyDay: data.last_daily_bonus ? new Date(Number(data.last_daily_bonus)).toISOString().slice(0, 10) : '',
          dailyStreak: Number(data.daily_streak || 0),
          careerLevel: data.career_level ?? data.careerLevel ?? 0, 
          myRefCode: vkId, 
          invitedBy, 
          referrals: myReferrals, 
          referralEarned: Number(localStorage.getItem(`ref_bonus_${vkId}`) || '0'),
        }));

        try {
    const serverLots = await apiGet<MarketLot[]>('/market');
    setLots(Array.isArray(serverLots) ? serverLots : []);
        } catch (marketError) {
          console.error('Ошибка загрузки рынка', marketError);
        }

        await loadRegions();

        if (data.clan_id) {
          const cData = await apiGet(`/clan/${data.clan_id}`);
          setClanData(cData);
        }

        if (invitedBy) {
          try { const url = new URL(window.location.href); url.searchParams.delete('ref'); window.history.replaceState({}, '', url.toString()); } catch { /* URL may be unavailable outside a browser. */ }
        }
      } catch (e) {
        console.error("Ошибка загрузки профиля", e);
        notify('Ошибка', 'Не удалось загрузить профиль', 'error');
      }
    };
    initGame();
  }, []);

  useEffect(() => {
    if (!vkIdRef.current) return;
    if (syncTimerRef.current) clearTimeout(syncTimerRef.current);
    syncTimerRef.current = setTimeout(async () => {
      try {
        await apiPost('/sync', { name: player.name, avatar: player.avatar, hasShield: player.hasShield, slaves: player.characters });
        if (player.clanId) {
          const cData = await apiGet(`/clan/${player.clanId}`);
          setClanData(cData);
        }
      } catch {
        // Синхронизация выполняется повторно следующим таймером.
      }
    }, 5000);
    return () => { if (syncTimerRef.current) clearTimeout(syncTimerRef.current); };
  }, [player]);

  useEffect(() => { const id = setInterval(() => setTick((v) => v + 1), 1000); return () => clearInterval(id); }, []);
  useEffect(() => { if (buyCooldownEnd > 0 && Date.now() >= buyCooldownEnd) { setBuyCount(0); setBuyCooldownEnd(0); } }, [tick, buyCooldownEnd]);

  // === ДОХОД ===
  const baseTotalIncome = player.characters.reduce((s, ch) => s + (Number(ch.income) || 0), 0);
  
  let clanBonusPercent = 0;
  if (clanData && clanData.members) {
    const me = clanData.members.find((m: any) => m.vk_id === vkIdRef.current);
    if (me) {
      const passedCooldown = Date.now() - me.clan_joined_at >= 24 * 3600 * 1000;
      if (passedCooldown) {
        clanBonusPercent += clanData.level;
        if (clanData.activeBuff) clanBonusPercent += 15;
      }
    }
  }

  const incomeWithClan = Math.floor(baseTotalIncome * (1 + clanBonusPercent / 100));
  const underOwner = !!player.ownedByVkId;
  const effectiveIncomePerHour = incomeWithClan * (underOwner ? UNDER_OWNER_INCOME_MULTIPLIER : 1);

  const hoursCap = getAccumulationHours(player.isDonutPatron);
  const elapsedMs = Math.min(Date.now() - player.lastCollectAt, hoursCap * 3600 * 1000);
  let uncollectedCoins = Math.floor((effectiveIncomePerHour / 3600000) * Math.max(0, elapsedMs));
  if (effectiveIncomePerHour === 0) uncollectedCoins = 0;

  const adBuffActive = player.adIncomeBuffExpiresAt > Date.now();
  const displayCoins = adBuffActive ? Math.floor(uncollectedCoins * AD_INCOME_MULTIPLIER) : uncollectedCoins;

  // === ЕЖЕДНЕВНЫЙ ===
  const todayKey = getTodayKey();
  const isNewDay = player.lastDailyDay !== todayKey;
  const hoursSinceLastClaim = player.lastDailyClaimAt ? (Date.now() - player.lastDailyClaimAt) / 3600000 : Infinity;
  let effectiveStreak = player.dailyStreak;
  if (hoursSinceLastClaim > DAILY_RESET_HOURS) effectiveStreak = 0;
  
  const todayIndex = isNewDay ? (effectiveStreak >= 7 ? 0 : effectiveStreak) : Math.max(0, (player.dailyStreak - 1) % 7);
  const nextReward = DAILY_REWARDS[todayIndex] ?? DAILY_REWARDS[0];
  const dailyStatus = { canClaim: isNewDay, streak: effectiveStreak, nextReward, todayIndex, isNewDay };

  const claimDailyReward = async () => {
    if (!isNewDay) { notify('Уже получено', 'Возвращайся завтра', 'info'); return; }

    try {
      const data = await apiPost<{ reward: number; streak: number; coins: number; votes: number; totalEarned: number }>('/daily-bonus');
      setPlayer((prev) => ({
        ...prev,
        coins: data.coins,
        votes: data.votes,
        totalEarned: data.totalEarned,
        lastDailyClaimAt: Date.now(),
        lastDailyDay: todayKey,
        dailyStreak: data.streak,
      }));
      notify('Ежедневная награда', `День ${data.streak}: +${data.reward.toLocaleString()} 💰`, 'success');
    } catch (e) {
      notify('Ошибка', e instanceof Error ? e.message : 'Награда не получена', 'error');
    }
  };

  // === КАРЬЕРА ===
  const nextCareer = CAREER_LEVELS[player.careerLevel] || null;
  const careerCanClaim = !!nextCareer && player.coins >= nextCareer.reqCoins && player.characters.length >= nextCareer.reqCharacters && (player.totalEarned || 0) >= nextCareer.reqTotalEarned;
  const careerStatus = { currentLevel: player.careerLevel, nextLevel: nextCareer, canClaim: careerCanClaim, progress: { coins: player.coins, characters: player.characters.length, totalEarned: player.totalEarned || 0 } };
  
  const claimCareerReward = async () => {
    if (!careerCanClaim || !nextCareer) { notify('Не готово', 'Условия не выполнены', 'error'); return; }
    try {
      const data = await apiPost<{ careerLevel: number; rewardCoins: number; rewardVotes: number; coins: number }>('/career/claim');
      setPlayer((prev) => ({ ...prev, coins: data.coins, votes: prev.votes + data.rewardVotes, totalEarned: (prev.totalEarned || 0) + data.rewardCoins, careerLevel: data.careerLevel }));
      notify(`Уровень «${nextCareer.title}»`, `+${data.rewardCoins.toLocaleString()} 💰`, 'success');
    } catch (e) { notify('Ошибка', e instanceof Error ? e.message : 'Награда не получена', 'error'); }
  };


  // === СУДНЫЙ ДЕНЬ ===
  const getNextJudgmentDay = () => { const now = new Date(); const day = now.getDay(); const daysUntilSunday = day === 0 ? 7 : 7 - day; return new Date(now.getFullYear(), now.getMonth(), now.getDate() + daysUntilSunday, 0, 0, 0).getTime(); };
  const judgmentStatus = { endTime: getNextJudgmentDay(), isNow: new Date().getDay() === 0 };

  // === РЕФЕРАЛЫ ===
  const getRefLink = () => `${window.location.origin}${window.location.pathname}?ref=${player.myRefCode}`;
  const shareRefLink = async () => { const link = getRefLink(); try { await bridge.send('VKWebAppShare', { link }); } catch { try { await navigator.clipboard.writeText(link); notify('Скопировано', link, 'success'); } catch { notify('Ссылка', link, 'info'); } } };
  const inviteToProfile = async () => { const link = getRefLink(); try { await bridge.send('VKWebAppAddToProfile', { t: 1, link } as any); notify('Добавлено', 'Кнопка в профиле', 'success'); } catch { await shareRefLink(); } };

  // === ИСТОРИЯ ===
  const storyCooldownEnd = player.lastStoryShareAt ? player.lastStoryShareAt + STORY_COOLDOWN_MS : 0;
  const shareToStory = async () => {
    if (Date.now() < storyCooldownEnd) { notify('Кулдаун', `Ещё ${Math.ceil((storyCooldownEnd - Date.now()) / 60000)} мин`, 'info'); return; }
    const link = getRefLink();
    try {
      await bridge.send('VKWebAppShowStoryBox', { background_type: 'image', url: link, stickers: [{ sticker_type: 'renderable', sticker: { content_type: 'image', url: 'https://i.imgur.com/8Z8Z8Z8.png' } }], attachment: { text: 'go_to', type: 'url', url: link } });
      setPlayer((prev) => ({ ...prev, coins: prev.coins + STORY_SHARE_REWARD, totalEarned: (prev.totalEarned || 0) + STORY_SHARE_REWARD, lastStoryShareAt: Date.now() }));
      notify('Опубликовано', `+${STORY_SHARE_REWARD.toLocaleString()} 💰`, 'success');
    } catch {
      try { await bridge.send('VKWebAppShare', { link }); setPlayer((prev) => ({ ...prev, coins: prev.coins + STORY_SHARE_REWARD, totalEarned: (prev.totalEarned || 0) + STORY_SHARE_REWARD, lastStoryShareAt: Date.now() })); notify('Опубликовано', `+${STORY_SHARE_REWARD.toLocaleString()} 💰`, 'success'); }
      catch { notify('Не удалось', 'Попробуй позже', 'error'); }
    }
  };

  // === РЕКЛАМА ===
  const dailyAdLimit = AD_DAILY_LIMIT;
  const adViewsToday = player.lastAdViewDay === todayKey ? player.adViewsToday : 0;
  const claimAdReward = async () => {
    if (adViewsToday >= dailyAdLimit) { notify('Лимит', 'Дневной лимит исчерпан', 'info'); return; }
    if (Date.now() < adCooldownEnd) { notify('Кулдаун', `${Math.ceil((adCooldownEnd - Date.now()) / 1000)} сек`, 'info'); return; }
    try {
      const result = await bridge.send('VKWebAppShowNativeAds', { ad_format: 'reward' });
      if (result?.result) {
        const data = await apiPost<{ multiplier: number; expiresAt: number }>('/ad/reward');
        setPlayer((prev) => ({ ...prev, adIncomeBuffMultiplier: data.multiplier, adIncomeBuffExpiresAt: data.expiresAt, adViewsToday: (prev.lastAdViewDay === todayKey ? prev.adViewsToday : 0) + 1, lastAdViewDay: todayKey }));
        setAdCooldownEnd(Date.now() + 5 * 60 * 1000);
        setPlayerAdViews((p: number) => p + 1);
        notify('Бонус активирован', `Следующий сбор ×${data.multiplier}`, 'success');
      } else { notify('Реклама не завершена', 'Досмотри до конца', 'info'); }
    } catch { notify('Реклама недоступна', 'Попробуй позже', 'error'); }
  };

  // === СБОР ===
  const claimIncome = async () => {
    if (uncollectedCoins < 1) { notify('Нечего собирать', 'Подожди немного', 'info'); return; }
    try {
      const data = await apiPost<{ collected: number; coins: number }>('/collect');
      setPlayer((prev) => ({ ...prev, coins: data.coins, totalEarned: (prev.totalEarned || 0) + data.collected, lastCollectAt: Date.now(), adIncomeBuffExpiresAt: 0 }));
      if (data.collected > 0) notify('Собрано', `+${data.collected.toLocaleString()} 💰`, 'success');
    } catch (e: any) { notify('Ошибка', e.message || 'Не удалось собрать', 'error'); }
  };

  // === РЫНОК ===
  const buyLot = async (lotId: string) => {
    if (player.characters.length >= player.maxCharacters) { notify('Лимит', `Максимум ${player.maxCharacters}`, 'error'); return; }
    if (Date.now() < buyCooldownEnd) { notify('Кулдаун', `${Math.ceil((buyCooldownEnd - Date.now()) / 1000)} сек`, 'info'); return; }
    try {
      const data = await apiPost<{ character: Character; paid: number }>('/character/buy', { lotId });
      setPlayer((prev) => ({ ...prev, coins: prev.coins - data.paid, characters: [...prev.characters, data.character] }));
      setLots((prev) => prev.filter((l) => l.id !== lotId));
      const newCount = buyCount + 1;
      if (newCount >= 100) { setBuyCount(0); setBuyCooldownEnd(Date.now() + 30_000); } else setBuyCount(newCount);
      notify('Куплено', `${data.character.name} за ${data.paid.toLocaleString()} 💰`, 'success');
    } catch (e: any) { notify('Ошибка', e.message || 'Не удалось купить', 'error'); }
  };

  const sellCharacter = async (charId: string) => {
    try {
      const data = await apiPost<{ payout: number; lotId: string }>('/character/sell', { charId });
      setPlayer((prev) => ({ ...prev, coins: prev.coins + data.payout, totalEarned: (prev.totalEarned || 0) + data.payout, characters: prev.characters.filter((c) => c.id !== charId) }));
      notify('Выставлен на рынок', `+${data.payout.toLocaleString()} 💰`, 'success');
    } catch (e: any) { notify('Ошибка', e.message || 'Не удалось продать', 'error'); }
  };

  const giveAwayCharacter = async (charId: string) => {
    try {
      const data = await apiPost<{ payout: number; isJudgmentDay: boolean }>('/character/give-away', { charId });
      setPlayer((prev) => ({ ...prev, coins: prev.coins + data.payout, totalEarned: (prev.totalEarned || 0) + data.payout, characters: prev.characters.filter((c) => c.id !== charId) }));
      if (data.payout > 0) notify('Отдан', `+${data.payout.toLocaleString()} 💰${data.isJudgmentDay ? ' (×0.5)' : ''}`, 'success');
      else notify('Освобождён', 'Без выплаты (цена ≥ 500 000)', 'info');
    } catch (e: any) { notify('Ошибка', e.message || 'Не удалось отдать', 'error'); }
  };

  const buyoutSelf = async () => {
    try {
      const data = await apiPost<{ paid: number }>('/character/buyout-self');
      setPlayer((prev) => ({ ...prev, coins: prev.coins - data.paid, ownedByVkId: null }));
      notify('Свобода!', `Выкуплен за ${data.paid.toLocaleString()} 💰`, 'success');
    } catch (e: any) { notify('Ошибка', e.message || 'Не удалось выкупиться', 'error'); }
  };

  const releaseCharacter = (charId: string) => setPlayer({ ...player, characters: player.characters.filter((c) => c.id !== charId) });
  const upgradeCharacter = (charId: string) => { void charId; notify('В разработке', 'Прокачка скоро', 'info'); };

  const loadRegions = async () => {
    const [regionData, resourceData] = await Promise.all([apiGet<Region[]>('/regions'), apiGet<Resources>('/resources')]);
    setRegions(regionData || []); setResources(resourceData || { coins: 0, ore: 0, wood: 0, food: 0 });
  };
  const buyRegion = async (type: Region['type']) => { await apiPost('/regions/buy', { type }); await loadRegions(); notify('Регион куплен', 'Новый источник дохода добавлен', 'success'); };
  const upgradeRegion = async (id: number) => { await apiPost('/regions/upgrade', { regionId: id }); await loadRegions(); notify('Регион улучшен', 'Доходность увеличена', 'success'); };
  const collectRegions = async () => { const data = await apiPost<{ income: Resources }>('/regions/collect'); await loadRegions(); notify('Ресурсы собраны', `+${data.income.ore} руды · +${data.income.wood} дерева · +${data.income.food} еды`, 'success'); };


  const createClan = async (name: string, vkGroupId: string) => {
    if (player.coins < CLAN_CREATE_COST) { notify('Не хватает', `Нужно ${CLAN_CREATE_COST} 💰`, 'error'); return; }
    try {
      const data = await apiPost<{ clanId: string }>('/clan/create', { name, vkGroupId, avatarUrl: `https://api.dicebear.com/7.x/shapes/svg?seed=${encodeURIComponent(vkGroupId)}` });
      setClans([...clans, { id: data.clanId, name, emoji: '🛡️', members: [player.name], bonusPercent: 8 }]);
      setPlayer((prev) => ({ ...prev, coins: prev.coins - CLAN_CREATE_COST, clanId: data.clanId }));
      notify('Клан создан', name, 'success');
    } catch (e: any) { notify('Ошибка', e.message || 'Не удалось создать', 'error'); }
  };

  const joinClan = async (clanId: string) => {
    try {
      await apiPost('/clan/join', { clanId });
      setPlayer((prev) => ({ ...prev, clanId }));
      notify('Успешно', 'Вы вступили в клан!', 'success');
    } catch (e: any) {
      notify('Ошибка', e.message || 'Не удалось вступить', 'error');
    }
  };

  const buyLimitCoins = () => {
    const cost = 50000 * Math.pow(3, player.limitLevel);
    if (player.coins < cost) { notify('Не хватает', `Нужно ${cost.toLocaleString()} 💰`, 'error'); return; }
    if (player.maxCharacters >= 50000) { notify('Лимит', 'Достигнут максимум 50 000', 'info'); return; }
    setPlayer({ ...player, coins: player.coins - cost, maxCharacters: Math.min(50000, player.maxCharacters + 5000), limitLevel: player.limitLevel + 1 });
    notify('+5000 к лимиту', `-${cost.toLocaleString()} 💰`, 'success');
  };
  const buyLimitVotes = () => {
    const cost = 100 * Math.pow(3, player.limitLevel);
    if (player.maxCharacters >= 50000) { notify('Лимит', 'Достигнут максимум 50 000', 'info'); return; }
    if (player.votes < cost) { notify('Не хватает', `Нужно ${cost} 🗳️`, 'error'); return; }
    setPlayer({ ...player, votes: player.votes - cost, maxCharacters: Math.min(50000, player.maxCharacters + 5000), limitLevel: player.limitLevel + 1 });
    notify('+5000 к лимиту', `-${cost} 🗳️`, 'success');
  };
  const buyBoost = (type: 'whip' | 'chains' | 'shield' | 'umbrella' | 'stone') => {
    if (type === 'stone') { notify('Камень использован', 'На врага!', 'info'); return; }
    if (type === 'whip' && player.hasWhip) return notify('Уже есть', 'Кнут', 'info');
    if (type === 'chains' && player.hasChains) return notify('Уже есть', 'Цепи', 'info');
    if (type === 'shield' && player.hasShield) return notify('Уже есть', 'Щит', 'info');
    if (type === 'umbrella' && player.hasUmbrella) return notify('Уже есть', 'Зонтик', 'info');
    if (player.votes < 50) return notify('Не хватает', '50 🗳️', 'error');
    setPlayer({
      ...player, votes: player.votes - 50, hasWhip: type === 'whip' ? true : player.hasWhip, hasChains: type === 'chains' ? true : player.hasChains,
      hasShield: type === 'shield' ? true : player.hasShield, hasUmbrella: type === 'umbrella' ? true : player.hasUmbrella,
    });
    notify('Буст куплен', type, 'success');
  };
  const buyFrame = async (frame: 'gold' | 'neon' | 'flame') => {
    const product = VK_FRAME_PRODUCTS[frame];
    try {
      const result = await bridge.send('VKWebAppShowOrderBox', { type: 'item', item: product.productId } as any);
      if (result?.status === 'success') {
        setPlayer((prev) => ({ ...prev, avatarFrame: frame }));
        notify('Рамка куплена', `${product.name} · ${product.price} голосов`, 'success');
      } else {
        notify('Покупка отменена', '', 'info');
      }
    } catch {
      notify('Ошибка оплаты', 'Попробуйте ещё раз', 'error');
    }
  };
  const buyCoinsForVotes = async (coinsAmount: number, votesCost: number) => {
    const productId = VK_STORE_PRODUCTS[votesCost];
    if (!productId) { notify('Товар не настроен', 'VK Store', 'error'); return; }
    try {
      const result = await bridge.send('VKWebAppShowOrderBox', { type: 'item', item: productId } as any);
      if (result?.status === 'success') {
        setPlayer((prev) => ({ ...prev, coins: prev.coins + coinsAmount, totalEarned: (prev.totalEarned || 0) + coinsAmount }));
        notify('Куплено', `+${coinsAmount.toLocaleString()} 💰`, 'success');
      } else notify('Отменено', '', 'info');
    } catch { notify('Ошибка оплаты', '', 'error'); }
  };

  const openChest = (type: 'common' | 'gold' | 'imperial'): Character | null => {
    if (player.characters.length >= player.maxCharacters) { notify('Лимит', '', 'error'); return null; }
    let newChar: Character | null = null;
    if (type === 'common') {
      if (player.coins < 5000) { notify('Не хватает', '5 000 💰', 'error'); return null; }
      const roll = Math.random() * 100;
      if (roll < 70) newChar = makeChestCharacter(10, 50);
      else if (roll < 95) newChar = makeChestCharacter(100, 250);
      else newChar = makeChestCharacter(300, 500);
      setPlayer({ ...player, coins: player.coins - 5000, characters: [...player.characters, newChar!] });
    } else if (type === 'gold') {
      if (player.votes < 50) { notify('Не хватает', '50 🗳️', 'error'); return null; }
      const roll = Math.random() * 100;
      if (roll < 50) newChar = makeChestCharacter(200, 300);
      else if (roll < 85) newChar = makeChestCharacter(350, 450);
      else newChar = makeChestCharacter(450, 500);
      setPlayer({ ...player, votes: player.votes - 50, characters: [...player.characters, newChar!] });
    } else if (type === 'imperial') {
      if (player.votes < 500) { notify('Не хватает', '500 🗳️', 'error'); return null; }
      newChar = makeChestCharacter(480, 500);
      setPlayer({ ...player, votes: player.votes - 500, characters: [...player.characters, newChar] });
    }
    if (newChar) { newChar.ownerName = player.name; newChar.ownerAvatar = player.avatar; }
    return newChar;
  };

  return (
    <Ctx.Provider value={{
      player, lots, clans,
      regions, resources, loadRegions, buyRegion, upgradeRegion, collectRegions,
      buyLot, sellCharacter, giveAwayCharacter, buyoutSelf, releaseCharacter, upgradeCharacter,
      createClan, joinClan, claimIncome,
      buyLimitCoins, buyLimitVotes, buyBoost, buyFrame, buyCoinsForVotes, openChest, claimAdReward,
      incomePerHour: baseTotalIncome,
      effectiveIncomePerHour,
      clanBonusPercent,
      uncollectedCoins,
      displayCoins,
      adBuffActive,
      buyCount, buyCooldownEnd, adCooldownEnd, playerAdViews,
      claimDailyReward, dailyStatus,
      getRefLink, shareRefLink, inviteToProfile,
      careerStatus, claimCareerReward, shareToStory, storyCooldownEnd,
      adViewsToday, dailyAdLimit, judgmentStatus,
    }}>
      {children}
    </Ctx.Provider>
  );
};

export function useGame() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useGame must be inside GameProvider');
  return ctx;
}