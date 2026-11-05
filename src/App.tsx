import React, { useState } from 'react';
import { GameProvider } from './GameContext';
import Home from './components/Home';
import Shop from './components/Shop';
import Top from './components/Top';
import Quests from './components/Quests';
import ClanPage from './components/Clan';

type Tab = 'home' | 'shop' | 'top' | 'quests' | 'clan';

function AppContent() {
  const [activeTab, setActiveTab] = useState<Tab>('home');

  const tabs = [
    { id: 'home' as Tab, label: 'Главная', icon: '🏠' },
    { id: 'shop' as Tab, label: 'Магазин', icon: '🏪' },
    { id: 'top' as Tab, label: 'Топ', icon: '🏆' },
    { id: 'quests' as Tab, label: 'Квесты', icon: '📋' },
    { id: 'clan' as Tab, label: 'Клан', icon: '🏰' },
  ];

  const renderContent = () => {
    switch (activeTab) {
      case 'home': return <Home />;
      case 'shop': return <Shop />;
      case 'top': return <Top />;
      case 'quests': return <Quests />;
      case 'clan': return <ClanPage />;
      default: return <Home />;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 via-gray-900 to-black flex flex-col">
      {/* Top Bar */}
      <div className="bg-gray-800/90 backdrop-blur-sm border-b border-gray-700/50 px-4 py-3 flex items-center justify-between sticky top-0 z-40">
        <div className="flex items-center gap-2">
          <span className="text-xl">🤖</span>
          <span className="text-white font-bold text-lg">Bot Empire</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="bg-blue-600/20 border border-blue-500/30 text-blue-300 text-xs px-2 py-1 rounded-lg">
            VK Mini App
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4 pt-4 pb-24">
        {renderContent()}
      </div>

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-gray-800/95 backdrop-blur-sm border-t border-gray-700/50 z-40">
        <div className="flex items-center justify-around max-w-lg mx-auto">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex flex-col items-center py-2 px-3 transition-all ${
                activeTab === tab.id 
                  ? 'text-white scale-110' 
                  : 'text-gray-500 hover:text-gray-300'
              }`}
            >
              <span className={`text-xl mb-0.5 ${activeTab === tab.id ? 'drop-shadow-lg' : ''}`}>
                {tab.icon}
              </span>
              <span className={`text-[10px] font-medium ${
                activeTab === tab.id ? 'text-blue-400' : ''
              }`}>
                {tab.label}
              </span>
              {activeTab === tab.id && (
                <div className="absolute bottom-0 w-8 h-0.5 bg-blue-500 rounded-full" />
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <GameProvider>
      <AppContent />
    </GameProvider>
  );
}
