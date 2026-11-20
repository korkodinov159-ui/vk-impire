import { useState } from 'react';
import { AppRoot, ConfigProvider, AdaptivityProvider } from '@vkontakte/vkui';
import '@vkontakte/vkui/dist/vkui.css';
import './styles.css';

import { GameProvider, useGame } from './store/gameStore';
import { ProfileProvider } from './context/ProfileContext';
import { PlayerProfileModal } from './components/PlayerProfileModal';
import { DailyRewardModal } from './components/DailyRewardModal';
import { ToastViewport } from './components/ToastViewport';
import { EventBanner } from './components/EventBanner';


import { Market } from './panels/Market';
import { Profile } from './panels/Profile';
import { Top } from './panels/Top';
import { Auction } from './panels/Auction';
import { Shop } from './panels/Shop';

import { Regions } from './panels/Regions';


import { ClanDetails } from './panels/ClanDetails';
import { Clan } from './panels/Clan';

import { Icon24SartOutline, Icon24Market, Icon24CupOutline, Icon24User, Icon24CubeBoxOutline, Icon24LocationMapOutline } from '@vkontakte/icons';

// РђРІС‚РѕРјР°С‚РёС‡РµСЃРєРёР№ РїРѕРєР°Р· РµР¶РµРґРЅРµРІРЅРѕР№ РЅР°РіСЂР°РґС‹ РїСЂРё Р·Р°С…РѕРґРµ
function DailyAutoOpener() {
  const { dailyStatus } = useGame();
  const [closed, setClosed] = useState(false);
  if (closed || !dailyStatus.isNewDay) return null;
  return <DailyRewardModal forceOpen onClose={() => setClosed(true)} />;
}

export function App() {
  // РўРµРїРµСЂСЊ СЃС‚Р°СЂС‚РѕРІР°СЏ РїР°РЅРµР»СЊ вЂ” profile
  const [activePanel, setActivePanel] = useState('profile');
  const [selectedClanId, setSelectedClanId] = useState<string | null>(null);

  return (
    <ConfigProvider>
      <AdaptivityProvider>
        <AppRoot>
          <GameProvider>
            <ProfileProvider>

              {activePanel === 'profile' && <Profile go={setActivePanel} />}
              {activePanel === 'market' && <Market />}
              {activePanel === 'top' && (
                <Top
                  go={setActivePanel}
                  onOpenClan={(id) => {
                    setSelectedClanId(id);
                    setActivePanel('clan_details');
                  }}
                />
              )}
              {activePanel === 'clan' && (
                <Clan
                  onOpenClan={(id) => {
                    setSelectedClanId(id);
                    setActivePanel('clan_details');
                  }}
                />
              )}
              {activePanel === 'clan_details' && selectedClanId && (
                <ClanDetails clanId={selectedClanId} go={setActivePanel} />
              )}
              {activePanel === 'auction' && <Auction />}
              {activePanel === 'regions' && <Regions />}

              {activePanel === 'shop' && <Shop />}

              <EventBanner />

              <DailyAutoOpener />
              <PlayerProfileModal />
              <ToastViewport />

              <nav className="custom-tabbar" aria-label="Основная навигация">
                <button type="button" className={`tab-item ${activePanel === 'profile' ? 'active' : ''}`} onClick={() => setActivePanel('profile')}><span className="tab-icon" aria-hidden="true"><Icon24User /></span><span>Профиль</span></button>
                <button type="button" className={`tab-item ${activePanel === 'top' || activePanel === 'clan_details' || activePanel === 'clan' ? 'active' : ''}`} onClick={() => setActivePanel('top')}><span className="tab-icon" aria-hidden="true"><Icon24CupOutline /></span><span>Рейтинг</span></button>
                <button type="button" className={`tab-item ${activePanel === 'auction' ? 'active' : ''}`} onClick={() => setActivePanel('auction')}><span className="tab-icon" aria-hidden="true"><Icon24CubeBoxOutline /></span><span>Аукцион</span></button>
                <button type="button" className={`tab-item ${activePanel === 'regions' ? 'active' : ''}`} onClick={() => setActivePanel('regions')}><span className="tab-icon" aria-hidden="true"><Icon24LocationMapOutline /></span><span>Регионы</span></button>

                <button type="button" className={`tab-item ${activePanel === 'market' ? 'active' : ''}`} onClick={() => setActivePanel('market')}><span className="tab-icon" aria-hidden="true"><Icon24SartOutline /></span><span>Рынок</span></button>
                <button type="button" className={`tab-item ${activePanel === 'shop' ? 'active' : ''}`} onClick={() => setActivePanel('shop')}><span className="tab-icon" aria-hidden="true"><Icon24Market /></span><span>Магазин</span></button>
              </nav>

            </ProfileProvider>
          </GameProvider>
        </AppRoot>
      </AdaptivityProvider>
    </ConfigProvider>
  );
}
