import React, { useState } from 'react';
import { useGame } from '../GameContext';

export default function Home() {
  const { state, buyBot, collectCoins } = useGame();
  const { coins, bots, ownedBots, incomePerSec, boostMultiplier, level, xp, frame } = state;
  const [collectAnim, setCollectAnim] = useState(false);

  const handleCollect = () => {
    collectCoins();
    setCollectAnim(true);
    setTimeout(() => setCollectAnim(false), 500);
  };

  const formatNum = (n: number) => {
    if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
    if (n >= 1000) return (n / 1000).toFixed(1) + 'K';
    return Math.floor(n).toString();
  };

  const getFrameBorder = () => {
    switch (frame) {
      case '🔥': return 'border-orange-500 shadow-orange-500/50';
      case '❄️': return 'border-cyan-400 shadow-cyan-400/50';
      case '⚡': return 'border-yellow-400 shadow-yellow-400/50';
      case '🌌': return 'border-purple-500 shadow-purple-500/50';
      default: return 'border-gray-600';
    }
  };

  return (
    <div className="flex flex-col gap-4 pb-4">
      {/* Player Stats */}
      <div className={`bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl p-4 border-2 ${getFrameBorder()} shadow-lg`}>
        <div className="flex items-center gap-3 mb-3">
          <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-2xl shadow-lg">
            🎮
          </div>
          <div className="flex-1">
            <div className="text-white font-bold text-lg">Игрок</div>
            <div className="text-gray-400 text-sm">Уровень {level} • {formatNum(xp)} XP</div>
          </div>
          {boostMultiplier > 1 && (
            <div className="bg-yellow-500/20 border border-yellow-500 rounded-lg px-2 py-1 text-yellow-400 text-xs font-bold">
              x{boostMultiplier} ⚡
            </div>
          )}
        </div>
        
        <div className="bg-black/30 rounded-xl p-3">
          <div className="flex items-center justify-between mb-1">
            <span className="text-yellow-400 font-bold text-xl">💰 {formatNum(coins)}</span>
            <span className="text-green-400 text-sm">+{formatNum(incomePerSec * boostMultiplier)}/сек</span>
          </div>
          <div className="w-full bg-gray-700 rounded-full h-2">
            <div 
              className="bg-gradient-to-r from-blue-500 to-purple-500 h-2 rounded-full transition-all"
              style={{ width: `${(xp % 1000) / 10}%` }}
            />
          </div>
        </div>
      </div>

      {/* Collect Button */}
      <button
        onClick={handleCollect}
        className={`relative bg-gradient-to-r from-yellow-500 to-orange-500 rounded-2xl p-4 text-white font-bold text-lg shadow-lg active:scale-95 transition-all ${collectAnim ? 'scale-105' : ''}`}
      >
        {collectAnim && (
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-4xl animate-bounce">💰</span>
          </div>
        )}
        <span className={collectAnim ? 'opacity-0' : ''}>
          ⚡ Собрать бонус (+{formatNum(incomePerSec * boostMultiplier * 10)})
        </span>
      </button>

      {/* Bots Section */}
      <div className="bg-gray-800/80 rounded-2xl p-4">
        <h2 className="text-white font-bold text-lg mb-3 flex items-center gap-2">
          🤖 Твои боты
          <span className="text-sm text-gray-400 font-normal">({ownedBots.length}/{bots.length})</span>
        </h2>
        
        {ownedBots.length === 0 ? (
          <div className="text-center py-6 text-gray-500">
            <div className="text-4xl mb-2">🤖</div>
            <p>У тебя пока нет ботов</p>
            <p className="text-sm">Купи первого бота ниже!</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            {bots.filter(b => ownedBots.includes(b.id)).map(bot => (
              <div key={bot.id} className="bg-gray-700/50 rounded-xl p-3 flex items-center gap-2">
                <span className="text-2xl">{bot.emoji}</span>
                <div>
                  <div className="text-white text-sm font-medium">{bot.name}</div>
                  <div className="text-green-400 text-xs">+{formatNum(bot.incomePerSec)}/с</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Buy Bots */}
      <div className="bg-gray-800/80 rounded-2xl p-4">
        <h2 className="text-white font-bold text-lg mb-3">🛒 Купить ботов</h2>
        <div className="flex flex-col gap-2">
          {bots.map(bot => {
            const canAfford = coins >= bot.cost;
            const owned = ownedBots.includes(bot.id);
            return (
              <button
                key={bot.id}
                onClick={() => buyBot(bot.id)}
                disabled={!canAfford}
                className={`flex items-center gap-3 p-3 rounded-xl transition-all ${
                  canAfford 
                    ? 'bg-gradient-to-r from-blue-600/50 to-purple-600/50 hover:from-blue-600/70 hover:to-purple-600/70 active:scale-[0.98]' 
                    : 'bg-gray-700/30 opacity-60'
                } border border-gray-600/50`}
              >
                <span className="text-3xl">{bot.emoji}</span>
                <div className="flex-1 text-left">
                  <div className="text-white font-medium">{bot.name}</div>
                  <div className="text-green-400 text-xs">+{formatNum(bot.incomePerSec)} монет/сек</div>
                </div>
                <div className={`text-right ${canAfford ? 'text-yellow-400' : 'text-gray-500'}`}>
                  <div className="font-bold">💰 {formatNum(bot.cost)}</div>
                  {owned && <div className="text-xs text-green-400">✓ Куплен</div>}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
