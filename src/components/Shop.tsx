import React, { useState } from 'react';
import { useGame } from '../GameContext';
import { shopItems } from '../data';

export default function Shop() {
  const { state, addCoins, setBoost, setFrame } = useGame();
  const [activeTab, setActiveTab] = useState<'coins' | 'boost' | 'frame'>('coins');
  const [notification, setNotification] = useState('');

  const tabs = [
    { id: 'coins' as const, label: '💰 Монеты', icon: '💰' },
    { id: 'boost' as const, label: '⚡ Бусты', icon: '⚡' },
    { id: 'frame' as const, label: '🖼️ Рамки', icon: '🖼️' },
  ];

  const filteredItems = shopItems.filter(item => item.category === activeTab);

  const getRarityColor = (rarity: string) => {
    switch (rarity) {
      case 'common': return 'from-gray-600 to-gray-700 border-gray-500';
      case 'rare': return 'from-blue-600 to-blue-800 border-blue-400';
      case 'epic': return 'from-purple-600 to-purple-800 border-purple-400';
      case 'legendary': return 'from-yellow-600 to-orange-700 border-yellow-400';
      default: return 'from-gray-600 to-gray-700 border-gray-500';
    }
  };

  const getRarityLabel = (rarity: string) => {
    switch (rarity) {
      case 'common': return 'Обычный';
      case 'rare': return 'Редкий';
      case 'epic': return 'Эпический';
      case 'legendary': return 'Легендарный';
      default: return '';
    }
  };

  const handleBuy = (item: typeof shopItems[0]) => {
    // Simulating VK voice purchase
    setNotification(`🎉 Вы получили: ${item.name}!`);
    
    if (item.category === 'coins') {
      const amounts: Record<string, number> = { 's1': 1000, 's2': 5000, 's3': 25000, 's4': 100000 };
      addCoins(amounts[item.id] || 0);
    } else if (item.category === 'boost') {
      const multipliers: Record<string, number> = { 's5': 2, 's6': 5, 's7': 10 };
      setBoost(multipliers[item.id] || 1);
    } else if (item.category === 'frame') {
      const frames: Record<string, string> = { 's8': '🔥', 's9': '❄️', 's10': '⚡', 's11': '🌌' };
      setFrame(frames[item.id] || '');
    }

    setTimeout(() => setNotification(''), 3000);
  };

  return (
    <div className="flex flex-col gap-4 pb-4">
      {/* Notification */}
      {notification && (
        <div className="fixed top-4 left-4 right-4 z-50 bg-green-600 text-white text-center py-3 rounded-xl font-bold animate-bounce shadow-lg">
          {notification}
        </div>
      )}

      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-600 to-purple-700 rounded-2xl p-4 text-center">
        <h1 className="text-white font-bold text-xl">🏪 Магазин</h1>
        <p className="text-indigo-200 text-sm mt-1">Покупай за голоса ВКонтакте</p>
        <div className="mt-2 bg-black/20 rounded-lg py-1 px-3 inline-block">
          <span className="text-yellow-300 font-bold">🎵 Голоса VK</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-800 rounded-xl p-1">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 py-2 px-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === tab.id 
                ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg' 
                : 'text-gray-400 hover:text-white'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Items */}
      <div className="flex flex-col gap-3">
        {filteredItems.map(item => (
          <div
            key={item.id}
            className={`bg-gradient-to-r ${getRarityColor(item.rarity)} rounded-xl p-4 border shadow-lg`}
          >
            <div className="flex items-center gap-3">
              <div className="text-4xl">{item.emoji}</div>
              <div className="flex-1">
                <div className="text-white font-bold">{item.name}</div>
                <div className="text-gray-300 text-sm">{item.description}</div>
                <div className="mt-1">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    item.rarity === 'legendary' ? 'bg-yellow-500/30 text-yellow-300' :
                    item.rarity === 'epic' ? 'bg-purple-500/30 text-purple-300' :
                    item.rarity === 'rare' ? 'bg-blue-500/30 text-blue-300' :
                    'bg-gray-500/30 text-gray-300'
                  }`}>
                    {getRarityLabel(item.rarity)}
                  </span>
                </div>
              </div>
              <button
                onClick={() => handleBuy(item)}
                className="bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-400 hover:to-orange-400 text-white font-bold py-2 px-4 rounded-xl shadow-lg active:scale-95 transition-all"
              >
                <div className="text-lg">🎵 {item.price}</div>
                <div className="text-xs opacity-80">голосов</div>
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Info */}
      <div className="bg-gray-800/60 rounded-xl p-4 text-center">
        <p className="text-gray-400 text-sm">
          💡 Покупки осуществляются за голоса ВКонтакте. 
          Голоса можно приобрести в настройках VK.
        </p>
      </div>
    </div>
  );
}
