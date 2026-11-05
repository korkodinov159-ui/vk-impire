import React, { useState } from 'react';
import { useGame } from '../GameContext';
import { availableClans } from '../data';

export default function ClanPage() {
  const { state, joinClan } = useGame();
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [selectedClan, setSelectedClan] = useState<string | null>(null);
  const [joinSuccess, setJoinSuccess] = useState(false);

  const currentClan = availableClans.find(c => c.id === state.clanId);

  const formatNum = (n: number) => {
    if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
    if (n >= 1000) return (n / 1000).toFixed(1) + 'K';
    return Math.floor(n).toString();
  };

  const handleJoin = (clanId: string) => {
    joinClan(clanId);
    setJoinSuccess(true);
    setShowJoinModal(false);
    setTimeout(() => setJoinSuccess(false), 3000);
  };

  return (
    <div className="flex flex-col gap-4 pb-4">
      {/* Notification */}
      {joinSuccess && (
        <div className="fixed top-4 left-4 right-4 z-50 bg-green-600 text-white text-center py-3 rounded-xl font-bold animate-bounce shadow-lg">
          🎉 Добро пожаловать в клан!
        </div>
      )}

      {/* Header */}
      <div className="bg-gradient-to-r from-red-600 to-rose-700 rounded-2xl p-4 text-center">
        <h1 className="text-white font-bold text-xl">🏰 Кланы</h1>
        <p className="text-red-200 text-sm mt-1">Объединяйся с друзьями</p>
      </div>

      {/* Current Clan */}
      {currentClan ? (
        <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl p-5 border-2 border-red-500/30 shadow-lg">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-16 h-16 bg-gradient-to-br from-red-500 to-orange-600 rounded-full flex items-center justify-center text-3xl shadow-lg">
              {currentClan.emoji}
            </div>
            <div>
              <div className="text-white font-bold text-xl">{currentClan.name}</div>
              <div className="text-gray-400">Ранг #{currentClan.rank}</div>
            </div>
          </div>
          
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-black/30 rounded-xl p-3 text-center">
              <div className="text-2xl mb-1">👥</div>
              <div className="text-white font-bold">{currentClan.members}</div>
              <div className="text-gray-400 text-xs">Участников</div>
            </div>
            <div className="bg-black/30 rounded-xl p-3 text-center">
              <div className="text-2xl mb-1">⚔️</div>
              <div className="text-white font-bold">{formatNum(currentClan.power)}</div>
              <div className="text-gray-400 text-xs">Мощь</div>
            </div>
            <div className="bg-black/30 rounded-xl p-3 text-center">
              <div className="text-2xl mb-1">🏆</div>
              <div className="text-white font-bold">#{currentClan.rank}</div>
              <div className="text-gray-400 text-xs">Место</div>
            </div>
          </div>

          {/* Clan Quests */}
          <div className="mt-4 bg-black/20 rounded-xl p-3">
            <div className="text-white font-bold text-sm mb-2">🏰 Клановые квесты</div>
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="text-gray-300 text-sm">Клановая битва</span>
                <span className="text-green-400 text-xs">Активен</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-300 text-sm">Сбор ресурсов</span>
                <span className="text-yellow-400 text-xs">В процессе</span>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-gray-800/80 rounded-2xl p-6 text-center border border-gray-700">
          <div className="text-5xl mb-3">🏰</div>
          <h2 className="text-white font-bold text-lg mb-2">Ты не в клане</h2>
          <p className="text-gray-400 text-sm mb-4">
            Вступи в клан, чтобы получать бонусы, участвовать в клановых битвах и квестах!
          </p>
          <button
            onClick={() => setShowJoinModal(true)}
            className="bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-400 hover:to-orange-400 text-white font-bold py-3 px-6 rounded-xl shadow-lg active:scale-95 transition-all"
          >
            🏰 Найти клан
          </button>
        </div>
      )}

      {/* Available Clans (always show) */}
      <div className="bg-gray-800/60 rounded-2xl p-4">
        <h2 className="text-white font-bold text-lg mb-3">📋 Все кланы</h2>
        <div className="flex flex-col gap-2">
          {availableClans.map(clan => (
            <div
              key={clan.id}
              className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${
                state.clanId === clan.id 
                  ? 'bg-green-900/30 border-green-500/50' 
                  : 'bg-gray-700/30 border-gray-600/30 hover:border-gray-500/50'
              }`}
            >
              <div className="w-10 h-10 bg-gradient-to-br from-red-500 to-orange-600 rounded-full flex items-center justify-center text-xl">
                {clan.emoji}
              </div>
              <div className="flex-1">
                <div className="text-white font-medium">{clan.name}</div>
                <div className="text-gray-400 text-xs">👥 {clan.members} • ⚔️ {formatNum(clan.power)}</div>
              </div>
              {state.clanId === clan.id ? (
                <span className="text-green-400 text-sm font-medium">✓ В клане</span>
              ) : !state.clanId ? (
                <button
                  onClick={() => handleJoin(clan.id)}
                  className="bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium py-1.5 px-3 rounded-lg active:scale-95 transition-all"
                >
                  Вступить
                </button>
              ) : (
                <span className="text-gray-500 text-sm">—</span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Join Modal */}
      {showJoinModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={() => setShowJoinModal(false)}>
          <div className="bg-gray-800 rounded-2xl p-5 w-full max-w-sm max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <h2 className="text-white font-bold text-lg mb-4 text-center">Выбери клан</h2>
            <div className="flex flex-col gap-2">
              {availableClans.map(clan => (
                <button
                  key={clan.id}
                  onClick={() => handleJoin(clan.id)}
                  className="flex items-center gap-3 p-3 rounded-xl bg-gray-700/50 hover:bg-gray-700 border border-gray-600/50 transition-all active:scale-95"
                >
                  <span className="text-2xl">{clan.emoji}</span>
                  <div className="flex-1 text-left">
                    <div className="text-white font-medium">{clan.name}</div>
                    <div className="text-gray-400 text-xs">👥 {clan.members} • ⚔️ {formatNum(clan.power)}</div>
                  </div>
                  <span className="text-blue-400 text-sm">→</span>
                </button>
              ))}
            </div>
            <button
              onClick={() => setShowJoinModal(false)}
              className="w-full mt-4 py-2 text-gray-400 hover:text-white transition-colors"
            >
              Отмена
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
