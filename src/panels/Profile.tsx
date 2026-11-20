import { useEffect, useMemo, useState } from 'react';
import { Panel, Div, Avatar, Input } from '@vkontakte/vkui';
import { Icon24Chart, Icon24Coins, Icon24Fire, Icon24User, Icon24Users, Icon24CubeBoxOutline } from '@vkontakte/icons';
import { useGame, CAREER_LEVELS } from '../store/gameStore';
import { calcCurrentPrice, calcGiveAwayPayout, calcSellerPayout, isJudgmentDayNow } from '../config';
import { BonusesModal } from '../components/BonusesModal';
import { ChestModal } from '../components/ChestModal';
import { SlaveProfileModal } from '../components/SlaveProfileModal';
import { JudgmentTimer } from '../components/JudgmentTimer';
import { Character } from '../types';

const IMPERORS_PER_PAGE = 25;

const formatMoney = (value: number) => {
  if (value >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(2)}B`;
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(2)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  return value.toLocaleString();
};

const progress = (value: number, target: number) => target === 0 ? 100 : Math.min(100, Math.round((value / target) * 100));

export function Profile({ go }: { go: (p: string) => void }) {
  const [bonusesOpen, setBonusesOpen] = useState(false);
  const [imperorsPage, setImperorsPage] = useState(0);
  const [search, setSearch] = useState('');
  const [chestPrize, setChestPrize] = useState<Character | null>(null);
  const [selectedSlave, setSelectedSlave] = useState<Character | null>(null);

  const {
    player,
    effectiveIncomePerHour,
    displayCoins,
    adBuffActive,
    uncollectedCoins,
    claimIncome,
    dailyStatus,
    careerStatus,
    claimCareerReward,
    openChest,
    buyoutSelf,
    releaseCharacter,
    sellCharacter,
    giveAwayCharacter,
    admin,

  } = useGame();

  const nextCareer = CAREER_LEVELS[player.careerLevel] || null;
  const careerProgress = nextCareer
    ? Math.min(
      progress(player.coins, nextCareer.reqCoins),
      progress(player.characters.length, nextCareer.reqCharacters),
      progress(player.totalEarned || 0, nextCareer.reqTotalEarned),
    )
    : 100;

  const isJD = isJudgmentDayNow();

  // Фильтрация подданных по поиску
  const filteredChars = useMemo(() => {
    return player.characters.filter((ch) =>
      ch.name.toLowerCase().includes(search.toLowerCase())
    );
  }, [player.characters, search]);

  const imperorsPageCount = Math.max(1, Math.ceil(filteredChars.length / IMPERORS_PER_PAGE));
  const visibleImperors = useMemo(
    () => filteredChars.slice(imperorsPage * IMPERORS_PER_PAGE, (imperorsPage + 1) * IMPERORS_PER_PAGE),
    [filteredChars, imperorsPage],
  );

  useEffect(() => {
    setImperorsPage((page) => Math.min(page, imperorsPageCount - 1));
  }, [imperorsPageCount]);

  return (
    <Panel id="profile" className="custom-app-bg">
      <Div className="profile-page page-content">
        
        {/* ШАПКА ПРОФИЛЯ */}
        <div className="profile-hero">
          <div className="profile-avatar-wrap">
            <Avatar size={88} src={player.avatar || undefined} className="profile-avatar" />
            <span className="profile-level-badge">{player.careerLevel + 1}</span>
          </div>
          <div className="profile-hero-info">
            <div className="profile-kicker">ТВОЙ ПРОФИЛЬ</div>
            <h1 className="profile-name">{player.name}</h1>
            <div className="profile-balance"><Icon24Coins width={16} height={16} /> {player.coins.toLocaleString()}</div>
            {player.ownedByVkId && (
              <div style={{ marginTop: 6, fontSize: 11, color: '#ef4444', fontWeight: 600 }}>
                ⛓️ Под властью — доход −50%
              </div>
            )}
          </div>
        </div>

        {admin.isAdmin && (
          <section className="profile-card admin-tools-card">
            <div className="profile-card-heading"><span>🛠️ Администрирование</span><b>Тестовый баланс</b></div>
            <div className="admin-tools-buttons">
              {[100000, 1000000, 10000000, 100000000].map((amount) => (
                <button key={amount} type="button" className="btn-primary" onClick={() => void admin.addCoins(amount)}>+{amount.toLocaleString('ru-RU')} 💰</button>
              ))}
            </div>
          </section>
        )}
        <JudgmentTimer />




        {/* СТАТИСТИКА */}
        <div className="profile-stats-grid" style={{ marginTop: 16 }}>
          <div className="profile-stat-card"><Icon24Chart /><strong>{formatMoney(effectiveIncomePerHour)}</strong><span>доход / час</span></div>
          <div className="profile-stat-card"><Icon24Users /><strong>{player.characters.length}</strong><span>подданных</span></div>
          <div className="profile-stat-card"><Icon24Fire /><strong>{dailyStatus.streak}</strong><span>дней серии</span></div>
        </div>

        {/* СБОР ДОХОДА */}
        <section className="profile-card profile-income-card">
          <div className="profile-card-heading">
            <span><Icon24Coins /> Накопленный доход</span>
            <b>+{displayCoins.toLocaleString()} {adBuffActive && <span style={{color: '#fbbf24'}}>×1.5</span>}</b>
          </div>
          <div className="profile-progress">
            <span style={{ width: `${Math.min(100, effectiveIncomePerHour ? (uncollectedCoins / Math.max(1, effectiveIncomePerHour * 8)) * 100 : 0)}%` }} />
          </div>
          <div className="profile-card-note" style={{ marginBottom: 8 }}>
            {player.isDonutPatron ? 'Накопление до 36 часов' : 'Накопление до 24 часов'}
          </div>
          <button className="btn-primary profile-action-button" type="button" onClick={claimIncome} disabled={displayCoins <= 0}>
            Собрать монеты
          </button>
        </section>

        {/* ВЫКУП СЕБЯ */}
        {player.ownedByVkId && (
          <div className="profile-card" style={{ border: '1px solid #ef4444', background: 'rgba(239,68,68,0.1)' }}>
            <div className="profile-card-heading" style={{ color: '#ef4444' }}>⛓️ Ты под властью другого игрока</div>
            <div className="profile-card-note" style={{ marginBottom: 12 }}>
              Выкупи себя, чтобы вернуть полный доход и свободу.
            </div>
            <button className="btn-primary" style={{ background: '#ef4444' }} onClick={buyoutSelf}>
              Выкупиться
            </button>
          </div>
        )}

        {/* КАРЬЕРА */}
        <section className="profile-card">
          <div className="profile-card-heading"><span><Icon24User /> Карьера</span><b>{careerStatus.currentLevel} / {CAREER_LEVELS.length}</b></div>
          <div className="career-title">{nextCareer ? `${nextCareer.emoji} ${nextCareer.title}` : '👑 Максимальный уровень'}</div>
          <div className="profile-progress"><span style={{ width: `${careerProgress}%` }} /></div>
          <div className="profile-card-note">
            {nextCareer ? `Следующий уровень: ${nextCareer.reqCharacters} подданных и ${formatMoney(nextCareer.reqCoins)} монет` : 'Все уровни карьеры открыты'}
          </div>
          {nextCareer && <button className="profile-outline-button" type="button" onClick={claimCareerReward} disabled={!careerStatus.canClaim}>{careerStatus.canClaim ? 'Забрать награду' : 'Условия ещё не выполнены'}</button>}
        </section>

        {/* БОНУСЫ */}
        <button className="profile-bonuses-button" type="button" onClick={() => setBonusesOpen(true)}>
          <span className="profile-menu-icon">🎁</span>
          <span>
            <b>Бонусы и челленджи</b>
            <small>Ежедневные награды, карьера и задания</small>
          </span>
          <span className="profile-bonuses-arrow">›</span>
        </button>

        {/* БЫСТРЫЕ ССЫЛКИ */}
        <div className="profile-action-grid">
          <button className="profile-menu-card" type="button" onClick={() => go('market')}><span className="profile-menu-icon">♜</span><b>Рынок</b><small>Найти подданных</small></button>
          <button className="profile-menu-card" type="button" onClick={() => go('shop')}><span className="profile-menu-icon">✦</span><b>Улучшения</b><small>{player.votes.toLocaleString()} голосов</small></button>
          <button className="profile-menu-card" type="button" onClick={() => go('top')}><span className="profile-menu-icon">🏆</span><b>Мой рейтинг</b><small>Смотреть таблицу</small></button>
        </div>

        {/* СУНДУКИ */}
        <div style={{ marginTop: 16, marginBottom: 12 }}>
          <div className="text-sub" style={{ letterSpacing: 1, fontSize: 12, fontWeight: 700, textTransform: 'uppercase', marginBottom: 12 }}>Сундуки</div>
          <div style={{ display: 'flex', gap: 8 }}>
            <div className="glass-panel" style={{ flex: 1, flexDirection: 'column', padding: 12, textAlign: 'center', cursor: 'pointer' }} onClick={() => { const p = openChest('common'); if (p) setChestPrize(p); }}>
              <div style={{ fontSize: 32, marginBottom: 4 }}><Icon24CubeBoxOutline /></div>
              <div className="text-value" style={{ fontSize: 14 }}>Обычный</div>
              <div className="text-sub" style={{ fontSize: 11, color: '#fbbf24', marginTop: 4 }}>5 000 <Icon24Coins /></div>
            </div>
            <div className="glass-panel" style={{ flex: 1, flexDirection: 'column', padding: 12, textAlign: 'center', border: '1px solid #5a7af5', cursor: 'pointer' }} onClick={() => { const p = openChest('gold'); if (p) setChestPrize(p); }}>
              <div style={{ fontSize: 32, marginBottom: 4 }}><Icon24CubeBoxOutline /></div>
              <div className="text-value" style={{ fontSize: 14 }}>Золотой</div>
              <div className="text-sub" style={{ fontSize: 11, color: '#5a7af5', marginTop: 4 }}>50 🗳️</div>
            </div>
            <div className="glass-panel" style={{ flex: 1, flexDirection: 'column', padding: 12, textAlign: 'center', border: '1px solid #ef4444', cursor: 'pointer' }} onClick={() => { const p = openChest('imperial'); if (p) setChestPrize(p); }}>
              <div style={{ fontSize: 32, marginBottom: 4 }}><Icon24CubeBoxOutline /></div>
              <div className="text-value" style={{ fontSize: 14 }}>Империя</div>
              <div className="text-sub" style={{ fontSize: 11, color: '#ef4444', marginTop: 4 }}>500 🗳️</div>
            </div>
          </div>
        </div>

        {/* ПОДДАННЫЕ */}
        <div style={{ marginTop: 24, marginBottom: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div className="text-sub" style={{ letterSpacing: 1, fontSize: 12, fontWeight: 700, textTransform: 'uppercase' }}>Мои подданные</div>
          <div className="text-sub" style={{ fontSize: 14 }}>{player.characters.length} / {player.maxCharacters}</div>
        </div>

        <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
          <Input placeholder="Поиск по имени" value={search} onChange={(e) => setSearch(e.target.value)} style={{ background: '#1a1a21', borderRadius: 12, border: 'none', color: '#fff' }} className="custom-input" />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {visibleImperors.map((ch) => {
            const currentPrice = calcCurrentPrice(ch.income, ch.resaleCount || 0, !!ch.boughtBySelf);
            const canSell = currentPrice < 20_000_000;
            const givePayout = calcGiveAwayPayout(ch.income, ch.resaleCount || 0, !!ch.boughtBySelf, isJD);
            const sellerPayout = calcSellerPayout(ch.income);

            return (
              <div
                key={ch.id}
                className="glass-panel"
                style={{ padding: '12px 16px', borderRadius: 16, marginBottom: 0, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
                onClick={() => setSelectedSlave(ch)}
              >
                <div style={{ display: 'flex', alignItems: 'center', flex: 1, minWidth: 0 }}>
                  <Avatar size={48} src={ch.avatar} style={{ border: '2px solid #2a2a35', flexShrink: 0 }} />
                  <div style={{ marginLeft: 12, minWidth: 0 }}>
                    <div className="text-value" style={{ fontSize: 15, fontWeight: 600 }}>{ch.name}</div>
                    <div style={{ color: '#4ade80', fontSize: 13, fontWeight: 600, marginTop: 2 }}>
                      +{ch.income} <Icon24Coins style={{ verticalAlign: 'middle', width: 12, height: 12 }} /> / ч
                    </div>
                    <div style={{ fontSize: 10, color: '#888', marginTop: 2 }}>
                      Цена: {formatMoney(currentPrice)} {ch.boughtBySelf ? '• выкуплен' : ''}{ch.resaleCount > 0 ? ` • ×${ch.resaleCount}` : ''}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                  {canSell && (
                    <button
                      onClick={(e) => { e.stopPropagation(); sellCharacter(ch.id); }}
                      style={{
                        background: 'rgba(251, 191, 36, 0.1)', color: '#fbbf24',
                        border: '1px solid rgba(251, 191, 36, 0.3)', borderRadius: 20,
                        padding: '6px 10px', fontWeight: 700, fontSize: 11, cursor: 'pointer',
                      }}
                      title={`Продажа на рынок: +${sellerPayout.toLocaleString()} 💰`}
                    >
                      Продать
                    </button>
                  )}
                  <button
                    onClick={(e) => { e.stopPropagation(); giveAwayCharacter(ch.id); }}
                    style={{
                      background: givePayout > 0 ? 'rgba(74, 222, 128, 0.1)' : 'rgba(255,255,255,0.05)',
                      color: givePayout > 0 ? '#4ade80' : '#888',
                      border: givePayout > 0 ? '1px solid rgba(74, 222, 128, 0.3)' : '1px solid rgba(255,255,255,0.05)',
                      borderRadius: 20, padding: '6px 10px', fontWeight: 700, fontSize: 11, cursor: 'pointer',
                    }}
                    title={givePayout > 0 ? `Отдать: +${givePayout.toLocaleString()} 💰${isJD ? ' (Судный день ×0.5)' : ''}` : 'Цена ≥ 500k — без выплаты'}
                  >
                    {givePayout > 0 ? 'Отдать' : 'Освободить'}
                  </button>
                </div>
              </div>
            );
          })}
          {filteredChars.length === 0 && <div style={{ textAlign: 'center', color: '#888', marginTop: 20 }}>Никого не найдено</div>}
        </div>

        {/* ПАГИНАЦИЯ ПОДДАННЫХ */}
        {filteredChars.length > IMPERORS_PER_PAGE && (
          <div className="profile-imperors-pagination" style={{ marginTop: 16 }}>
            <button type="button" onClick={() => setImperorsPage((page) => Math.max(0, page - 1))} disabled={imperorsPage === 0}>
              ‹ Назад
            </button>
            <span>{imperorsPage + 1} / {imperorsPageCount}</span>
            <button type="button" onClick={() => setImperorsPage((page) => Math.min(imperorsPageCount - 1, page + 1))} disabled={imperorsPage >= imperorsPageCount - 1}>
              Вперёд ›
            </button>
          </div>
        )}
      </Div>

      <BonusesModal open={bonusesOpen} onClose={() => setBonusesOpen(false)} />
      <ChestModal key={chestPrize ? chestPrize.id : 'empty'} prize={chestPrize} onClose={() => setChestPrize(null)} />
      
      <SlaveProfileModal
        slave={selectedSlave}
        onClose={() => setSelectedSlave(null)}
        onRelease={(id) => { releaseCharacter(id); setSelectedSlave(null); }}
        onGiveAway={(id) => { giveAwayCharacter(id); setSelectedSlave(null); }}
        onSell={(id) => { sellCharacter(id); setSelectedSlave(null); }}
      />
    </Panel>
  );
}