import React, { useState } from 'react';
import { useGame } from '../GameContext';

export default function Quests() {
  const { state, completeQuest } = useGame();
  const [tab, setTab] = useState<'daily' | 'weekly' | 'monthly' | 'clan'>('daily');
  const [claimAnim, setClaimAnim] = useState<string | null>(null);

  const tabs = [
    { id: 'daily' as const, label: '📅 Ежедневные' },
    { id: 'weekly' as const, label: '📆 Еженедельные' },
    { id: 'monthly' as const, label: '🗓️ Месячные' },
    { id: 'clan' as const, label: '🏰 Клановые' },
  ];

  const filteredQuests = state.quests.filter(q => q.type === tab);

  const handleClaim = (questId: string) => {
    completeQuest(questId);
    setClaimAnim(questId);
    setTimeout(() => setClaimAnim(null), 1000);
  };

  const formatNum = (n: number) => {
    if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
    if (n >= 1000) return (n / 1000).toFixed(1) + 'K';
    return Math.floor(n).toString();
  };

  return (
    <div className="flex flex-col gap-4 pb-4">
      {/* Header */}
      <div className="bg-gradient-to-r from-green-600 to-emerald-700 rounded-2xl p-4 text-center">
        <h1 className="text-white font-bold text-xl">📋 Задания</h1>
        <p className="text-green-200 text-sm mt-1">Выполняй квесты и получай награды</p>
      </div>

      {/* Tabs */}
      <div className="grid grid-cols-2 gap-1 bg-gray-800 rounded-xl p-1">
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`py-2 px-2 rounded-lg text-xs font-medium transition-all ${
              tab === t.id 
                ? 'bg-gradient-to-r from-green-600 to-emerald-600 text-white shadow-lg' 
                : 'text-gray-400 hover:text-white'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Quests List */}
      <div className="flex flex-col gap-3">
        {filteredQuests.map(quest => {
          const canClaim = quest.progress >= quest.target && !quest.completed;
          const progress = Math.min(quest.progress / quest.target, 1);
          
          return (
            <div
              key={quest.id}
              className={`bg-gray-800/80 rounded-xl p-4 border transition-all ${
                quest.completed 
                  ? 'border-green-600/30 opacity-60' 
                  : canClaim 
                    ? 'border-yellow-500/50 shadow-lg shadow-yellow-500/10' 
                    : 'border-gray-700/50'
              } ${claimAnim === quest.id ? 'scale-105' : ''}`}
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1">
                  <div className="text-white font-bold">{quest.title}</div>
                  <div className="text-gray-400 text-sm">{quest.description}</div>
                </div>
                <div className="text-yellow-400 font-bold text-sm bg-yellow-500/10 px-2 py-1 rounded-lg">
                  💰 {formatNum(quest.reward)}
                </div>
              </div>

              {/* Progress Bar */}
              <div className="mb-3">
                <div className="flex justify-between text-xs text-gray-400 mb-1">
                  <span>{formatNum(quest.progress)} / {formatNum(quest.target)}</span>
                  <span>{Math.floor(progress * 100)}%</span>
                </div>
                <div className="w-full bg-gray-700 rounded-full h-2.5">
                  <div
                    className={`h-2.5 rounded-full transition-all ${
                      quest.completed 
                        ? 'bg-green-500' 
                        : canClaim 
                          ? 'bg-yellow-500 animate-pulse' 
                          : 'bg-gradient-to-r from-blue-500 to-purple-500'
                    }`}
                    style={{ width: `${progress * 100}%` }}
                  />
                </div>
              </div>

              {/* Claim Button */}
              {quest.completed ? (
                <div className="text-center text-green-400 text-sm font-medium py-1">
                  ✅ Выполнено
                </div>
              ) : canClaim ? (
                <button
                  onClick={() => handleClaim(quest.id)}
                  className="w-full bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-400 hover:to-orange-400 text-white font-bold py-2 rounded-xl active:scale-95 transition-all"
                >
                  🎁 Забрать награду!
                </button>
              ) : (
                <div className="text-center text-gray-500 text-sm py-1">
                  Продолжай играть для прогресса
                </div>
              )}
            </div>
          );
        })}
      </div>

      {filteredQuests.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          <div className="text-4xl mb-2">📋</div>
          <p>Нет доступных заданий</p>
        </div>
      )}
    </div>
  );
}
