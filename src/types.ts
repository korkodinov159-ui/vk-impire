export interface Bot {
  id: string;
  name: string;
  emoji: string;
  cost: number;
  incomePerSec: number;
  level: number;
  owned: boolean;
}

export interface Player {
  id: string;
  name: string;
  avatar: string;
  coins: number;
  clan?: string;
  rank: number;
}

export interface Clan {
  id: string;
  name: string;
  emoji: string;
  members: number;
  power: number;
  rank: number;
}

export interface Quest {
  id: string;
  title: string;
  description: string;
  reward: number;
  type: 'daily' | 'weekly' | 'monthly' | 'clan';
  progress: number;
  target: number;
  completed: boolean;
}

export interface ShopItem {
  id: string;
  name: string;
  description: string;
  price: number;
  emoji: string;
  category: 'coins' | 'boost' | 'frame';
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
}

export interface GameState {
  coins: number;
  totalEarned: number;
  bots: Bot[];
  ownedBots: string[];
  incomePerSec: number;
  boostMultiplier: number;
  frame: string;
  clanId: string | null;
  quests: Quest[];
  level: number;
  xp: number;
}
