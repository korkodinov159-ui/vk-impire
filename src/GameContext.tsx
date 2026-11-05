import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { GameState, Bot, Quest } from './types';
import { initialBots, initialQuests } from './data';

interface GameContextType {
  state: GameState;
  buyBot: (botId: string) => void;
  collectCoins: () => void;
  completeQuest: (questId: string) => void;
  joinClan: (clanId: string) => void;
  addCoins: (amount: number) => void;
  setBoost: (multiplier: number) => void;
  setFrame: (frame: string) => void;
}

const initialState: GameState = {
  coins: 500,
  totalEarned: 500,
  bots: initialBots,
  ownedBots: [],
  incomePerSec: 0,
  boostMultiplier: 1,
  frame: '',
  clanId: null,
  quests: initialQuests,
  level: 1,
  xp: 0,
};

const GameContext = createContext<GameContextType | null>(null);

export function GameProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<GameState>(() => {
    const saved = localStorage.getItem('botEmpire');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return initialState;
      }
    }
    return initialState;
  });

  // Save to localStorage
  useEffect(() => {
    localStorage.setItem('botEmpire', JSON.stringify(state));
  }, [state]);

  // Passive income tick
  useEffect(() => {
    const interval = setInterval(() => {
      setState(prev => {
        if (prev.incomePerSec <= 0) return prev;
        const earned = prev.incomePerSec * prev.boostMultiplier;
        return {
          ...prev,
          coins: prev.coins + earned,
          totalEarned: prev.totalEarned + earned,
        };
      });
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const buyBot = useCallback((botId: string) => {
    setState(prev => {
      const bot = prev.bots.find(b => b.id === botId);
      if (!bot || prev.coins < bot.cost) return prev;
      
      const newOwned = [...prev.ownedBots, botId];
      const newIncome = prev.incomePerSec + bot.incomePerSec;
      const newBots = prev.bots.map(b => 
        b.id === botId ? { ...b, owned: true, level: b.level + 1 } : b
      );
      
      // Update quests
      const newQuests = prev.quests.map(q => {
        if (q.completed) return q;
        if (q.title === 'Первые шаги' || q.title === 'Коллекционер' || q.title === 'Армия' || q.title === 'Империя') {
          return { ...q, progress: q.progress + 1 };
        }
        return q;
      });

      return {
        ...prev,
        coins: prev.coins - bot.cost,
        bots: newBots,
        ownedBots: newOwned,
        incomePerSec: newIncome,
        quests: newQuests,
        xp: prev.xp + bot.cost / 10,
        level: Math.floor((prev.xp + bot.cost / 10) / 1000) + 1,
      };
    });
  }, []);

  const collectCoins = useCallback(() => {
    setState(prev => {
      const bonus = Math.floor(prev.incomePerSec * prev.boostMultiplier * 10);
      const newQuests = prev.quests.map(q => {
        if (q.completed) return q;
        if (q.title === 'Магнат' || q.title === 'Богач' || q.title === 'Миллионер') {
          return { ...q, progress: q.progress + bonus };
        }
        return q;
      });
      return {
        ...prev,
        coins: prev.coins + bonus,
        totalEarned: prev.totalEarned + bonus,
        quests: newQuests,
      };
    });
  }, []);

  const completeQuest = useCallback((questId: string) => {
    setState(prev => {
      const quest = prev.quests.find(q => q.id === questId);
      if (!quest || quest.completed || quest.progress < quest.target) return prev;
      
      return {
        ...prev,
        coins: prev.coins + quest.reward,
        totalEarned: prev.totalEarned + quest.reward,
        quests: prev.quests.map(q => q.id === questId ? { ...q, completed: true } : q),
      };
    });
  }, []);

  const joinClan = useCallback((clanId: string) => {
    setState(prev => ({ ...prev, clanId }));
  }, []);

  const addCoins = useCallback((amount: number) => {
    setState(prev => ({
      ...prev,
      coins: prev.coins + amount,
      totalEarned: prev.totalEarned + amount,
    }));
  }, []);

  const setBoost = useCallback((multiplier: number) => {
    setState(prev => ({ ...prev, boostMultiplier: multiplier }));
  }, []);

  const setFrame = useCallback((frame: string) => {
    setState(prev => ({ ...prev, frame }));
  }, []);

  return (
    <GameContext.Provider value={{ state, buyBot, collectCoins, completeQuest, joinClan, addCoins, setBoost, setFrame }}>
      {children}
    </GameContext.Provider>
  );
}

export function useGame() {
  const ctx = useContext(GameContext);
  if (!ctx) throw new Error('useGame must be inside GameProvider');
  return ctx;
}
