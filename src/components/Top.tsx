import React, { useState } from 'react';
import { topPlayers, topClans } from '../data';

export default function Top() {
  const [tab, setTab] = useState<'players' | 'clans'>('players');

  const formatNum = (n: number) => {
    if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
    if (n >= 1000) return (n / 1000).toFixed(1) + 'K';
    return Math.floor(n).toString();
  };

  const getMedal = (rank: number) => {
    if (rank === 1) return '🥇';
    if (rank === 2) return '🥈';
    if (rank === 3) return '🥉';
    return `#${rank}`;
  };

  return (
    <div className="flex flex-col gap-4 pb-4">
      {/* Header */}
      <div className="bg-gradient-to-r from-amber-600 to-yellow-700 rounded-2xl p-4 text-center">
        <h1 className="text-white font-bold text-xl">🏆 Топ</h1>
        <p className="text-amber-200 text-sm mt-1">Лучшие игроки и кланы</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-800 rounded-xl p-1">
        <button
          onClick={() => setTab('players')}
          className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
            tab === 'players' 
              ? 'bg-gradient-to-r from-amber-600 to-yellow-600 text-white shadow-lg' 
              : 'text-gray-400 hover:text-white'
          }`}
        >
          👤 Игроки
        </button>
        <button
          onClick={() => setTab('clans')}
          className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
            tab === 'clans' 
              ? 'bg-gradient-to-r from-amber-600 to-yellow-600 text-white shadow-lg' 
              : 'text-gray-400 hover:text-white'
          }`}
        >
          🏰 Кланы
        </button>
      </div>

      {/* Players List */}
      {tab === 'players' && (
        <div className="flex flex-col gap-2">
          {topPlayers.map(player => (
            <div
              key={player.id}
              className={`flex items-center gap-3 p-3 rounded-xl transition-all ${
                player.rank <= 3 
                  ? 'bg-gradient-to-r from-yellow-900/40 to-amber-900/40 border border-yellow-600/30' 
                  : 'bg-gray-800/60 border border-gray-700/50'
              }`}
            >
              <div className="w-10 text-center font-bold text-lg">
                {getMedal(player.rank)}
              </div>
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-xl">
                {player.avatar}
              </div>
              <div className="flex-1">
                <div className="text-white font-medium">{player.name}</div>
                {player.clan && (
                  <div className="text-gray-400 text-xs">🏰 {player.clan}</div>
                )}
              </div>
              <div className="text-right">
                <div className="text-yellow-400 font-bold">💰 {formatNum(player.coins)}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Clans List */}
      {tab === 'clans' && (
        <div className="flex flex-col gap-2">
          {topClans.map(clan => (
            <div
              key={clan.id}
              className={`flex items-center gap-3 p-3 rounded-xl transition-all ${
                clan.rank <= 3 
                  ? 'bg-gradient-to-r from-yellow-900/40 to-amber-900/40 border border-yellow-600/30' 
                  : 'bg-gray-800/60 border border-gray-700/50'
              }`}
            >
              <div className="w-10 text-center font-bold text-lg">
                {getMedal(clan.rank)}
              </div>
              <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-teal-600 rounded-full flex items-center justify-center text-xl">
                {clan.emoji}
              </div>
              <div className="flex-1">
                <div className="text-white font-medium">{clan.name}</div>
                <div className="text-gray-400 text-xs">👥 {clan.members} участников</div>
              </div>
              <div className="text-right">
                <div className="text-purple-400 font-bold">⚔️ {formatNum(clan.power)}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
