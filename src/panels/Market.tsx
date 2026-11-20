import { useState, useMemo, useCallback, useEffect } from 'react';


import { Icon24Coins } from '@vkontakte/icons';
import { Panel, PanelHeader, Div, Avatar, Input } from '@vkontakte/vkui';
import { useGame } from '../store/gameStore';
import { useProfile } from '../context/ProfileContext';

import { apiGet } from '../api/client';
import type { MarketLot } from '../types';

import { calcCurrentPrice, MARKET_HIDE_THRESHOLD, isJudgmentDayNow } from '../config';

const PAGE_SIZE = 50;

export function Market() {
  const { lots, buyLot, buyCooldownEnd, player } = useGame();
  const { openProfile } = useProfile();

  const [sortBy, setSortBy] = useState<'asc' | 'desc' | 'none'>('asc');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  const isCooldown = Date.now() < buyCooldownEnd;
  const cooldownSec = isCooldown ? Math.ceil((buyCooldownEnd - Date.now()) / 1000) : 0;
  const [eventPhase, setEventPhase] = useState('INACTIVE');
  useEffect(() => { void apiGet<{ phase: string }>('/event/status').then((data) => setEventPhase(data.phase)).catch(() => {}); }, []);
  const isJudgmentDay = isJudgmentDayNow();

  const getLotPrice = useCallback(
    (lot: MarketLot) => calcCurrentPrice(lot.character.income, lot.character.resaleCount || 0, !!lot.character.boughtBySelf),
    [],
  );

  const filteredLots = useMemo(() => {
    // Фильтруем лоты с ценой ниже порога отображения.
    let result = lots.filter((l) => getLotPrice(l) < MARKET_HIDE_THRESHOLD);

    if (minPrice) {
      const min = Number(minPrice);
      if (Number.isFinite(min)) result = result.filter((l) => getLotPrice(l) >= min);
    }
    if (maxPrice) {
      const max = Number(maxPrice);
      if (Number.isFinite(max)) result = result.filter((l) => getLotPrice(l) <= max);
    }

    if (sortBy === 'asc') {
      result.sort((a, b) => {
        const d = a.character.income - b.character.income;
        return d !== 0 ? d : getLotPrice(a) - getLotPrice(b);
      });
    } else if (sortBy === 'desc') {
      result.sort((a, b) => {
        const d = b.character.income - a.character.income;
        return d !== 0 ? d : getLotPrice(a) - getLotPrice(b);
      });
    }

    return result;
  }, [lots, minPrice, maxPrice, sortBy, getLotPrice]);

  const displayedLots = filteredLots.slice(0, visibleCount);

  const fmt = (n: number) =>
    n >= 1_000_000 ? (n / 1_000_000).toFixed(1).replace('.0', '') + 'M'
    : n >= 1_000 ? (n / 1_000).toFixed(1).replace('.0', '') + 'K'
    : String(n);

  return (
    <Panel id="market" className="custom-app-bg">
        <PanelHeader style={{ background: 'transparent' }}>Р С‹РЅРѕРє</PanelHeader>

      <Div className="page-shell market-page" style={{ padding: '0 16px', paddingBottom: 100 }}>
        <header className="market-hero">
          <div className="market-title-row"><h1>Р С‹РЅРѕРє</h1><span className="market-help" aria-label="РЎРїСЂР°РІРєР° Рѕ СЂС‹РЅРєРµ">?</span></div>
          <div className="market-status">РћРўРљР Р«Рў В· 24/7</div>
          <div className="market-balance"><Icon24Coins aria-hidden="true" /><strong>{player.coins.toLocaleString('ru-RU')}</strong><span className="market-plus" aria-hidden="true">+</span></div>
        </header>
        <div className="market-tabs" role="tablist" aria-label="Р¤РёР»СЊС‚СЂ РїСЂРѕРґР°РІС†РѕРІ">
          <button type="button" role="tab" aria-selected="true" className="market-tab market-tab-active">Р’СЃРµ</button>
          <button type="button" role="tab" aria-selected="false" className="market-tab" disabled>Р”СЂСѓР·СЊСЏ</button>
        </div>

        {isJudgmentDay && (
          <div style={{
            background: 'rgba(239, 68, 68, 0.15)', border: '1px solid #ef4444',
            borderRadius: 12, padding: 12, marginBottom: 16, textAlign: 'center',
            color: '#ef4444', fontWeight: 600,
          }}>
            рџ”Ґ РЎСѓРґРЅС‹Р№ РґРµРЅСЊ! Р’СЃРµ РїРѕРґРґР°РЅРЅС‹Рµ СЃС‚РѕСЏС‚ РІ 2 СЂР°Р·Р° РґРµС€РµРІР»Рµ!
          </div>
        )}

        <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
          <button
            className="btn-primary"
            style={{ padding: 10, fontSize: 12, marginTop: 0, background: sortBy === 'asc' ? '#5a7af5' : '#2a2a35', boxShadow: 'none' }}
            onClick={() => { setSortBy('asc'); setVisibleCount(PAGE_SIZE); }}
          >
            в†‘ Р”РѕС…РѕРґ: РјРµРЅСЊС€Рµ в†’ Р±РѕР»СЊС€Рµ
          </button>
          <button
            className="btn-primary"
            style={{ padding: 10, fontSize: 12, marginTop: 0, background: sortBy === 'desc' ? '#5a7af5' : '#2a2a35', boxShadow: 'none' }}
            onClick={() => { setSortBy('desc'); setVisibleCount(PAGE_SIZE); }}
          >
            в†“ Р”РѕС…РѕРґ: Р±РѕР»СЊС€Рµ в†’ РјРµРЅСЊС€Рµ
          </button>
        </div>

        <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
          <Input placeholder="Р¦РµРЅР° РѕС‚" type="number" value={minPrice}
            onChange={(e) => { setMinPrice(e.target.value); setVisibleCount(PAGE_SIZE); }}
            style={{ background: '#1a1a21', borderRadius: 12, border: 'none', color: '#fff' }}
            className="custom-input" />
          <Input placeholder="Р¦РµРЅР° РґРѕ" type="number" value={maxPrice}
            onChange={(e) => { setMaxPrice(e.target.value); setVisibleCount(PAGE_SIZE); }}
            style={{ background: '#1a1a21', borderRadius: 12, border: 'none', color: '#fff' }}
            className="custom-input" />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: '65vh', overflowY: 'auto', paddingRight: 4, marginBottom: 16 }}>
          {displayedLots.map((lot) => {
            const oldPrice = getLotPrice(lot);
            const finalPrice = eventPhase === 'DISCOUNT_PHASE' ? Math.floor(oldPrice / 2) : oldPrice;
            const resaleCount = lot.character.resaleCount || 0;
            return (
              <div key={lot.id} className="glass-panel market-lot-card" role="button" tabIndex={0} onClick={() => openProfile({ vk_id: lot.character.ownerVkId || lot.sellerVkId || lot.id, name: lot.character.ownerName || lot.sellerName, avatar: lot.character.ownerAvatar || lot.character.avatar, coins: 0, income: lot.character.income, slaves: [lot.character], clanName: undefined })} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderRadius: 16, marginBottom: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', flex: 1, minWidth: 0 }}>
                  <Avatar size={48} src={lot.character.avatar} style={{ border: '2px solid #2a2a35', flexShrink: 0 }} />
                  <div style={{ marginLeft: 12, minWidth: 0 }}>
                    <div className="text-value" style={{ fontSize: 15, fontWeight: 600, color: '#fff' }}>{lot.character.name}</div>
                    <div style={{ color: '#4ade80', fontSize: 13, fontWeight: 600, marginTop: 2 }}>
                      +{lot.character.income} рџ’° / С‡ в†’ РїРѕСЃР»Рµ РїРѕРєСѓРїРєРё +{Math.min(500, Math.ceil(lot.character.income * 1.3))} рџ’° / С‡
                    </div>
                    <div style={{ fontSize: 10, color: '#888', marginTop: 2 }}>
                      {resaleCount > 0 ? `рџ”„ РїРµСЂРµРїСЂРѕРґР°Р¶Р° Г—${resaleCount}` : 'рџ†• РЅРѕРІС‹Р№'}
                      {lot.character.boughtBySelf ? ' вЂў РІС‹РєСѓРїР»РµРЅ' : ''}
                    </div>
                  </div>
                </div>

                <button
                  onClick={(event) => { event.stopPropagation(); buyLot(lot.id); }}
                  disabled={isCooldown}
                  style={{
                    background: isCooldown ? '#2a2a35' : 'rgba(90, 122, 245, 0.15)',
                    border: isCooldown ? '1px solid rgba(255,255,255,0.05)' : '1px solid rgba(90, 122, 245, 0.5)',
                    borderRadius: 24, padding: '8px 16px', display: 'flex', alignItems: 'center',
                    gap: 6, cursor: isCooldown ? 'not-allowed' : 'pointer',
                    flexShrink: 0, marginLeft: 8,
                  }}
                >
                  {isCooldown ? (
                    <span style={{ color: '#888', fontSize: 13, fontWeight: 700 }}>Р–РґРёС‚Рµ {cooldownSec}СЃ</span>
                  ) : (
                    <>
                      <div style={{ width: 16, height: 16, borderRadius: '50%', background: '#5a7af5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Icon24Coins style={{ width: 10, height: 10, color: '#fff' }} />
                      </div>
                      <span style={{ color: '#5a7af5', fontSize: 15, fontWeight: 800 }}>{eventPhase === 'DISCOUNT_PHASE' ? <><s style={{ color: '#8e8e9a', marginRight: 6 }}>{fmt(oldPrice)}</s><strong style={{ color: '#55e39a' }}>{fmt(finalPrice)}</strong></> : fmt(finalPrice)}</span>
                    </>
                  )}
                </button>
              </div>
            );
          })}

          {filteredLots.length === 0 && (
            <div style={{ textAlign: 'center', color: '#888', marginTop: 20 }}>РќРµС‚ Р»РѕС‚РѕРІ РїРѕ Р·Р°РґР°РЅРЅС‹Рј РєСЂРёС‚РµСЂРёСЏРј</div>
          )}

          {visibleCount < filteredLots.length && (
            <button className="btn-primary" style={{ marginTop: 12, background: '#2a2a35', boxShadow: 'none' }}
              onClick={() => setVisibleCount((prev) => prev + PAGE_SIZE)}>
              РџРѕРєР°Р·Р°С‚СЊ РµС‰С‘ {PAGE_SIZE} (Р’СЃРµРіРѕ: {filteredLots.length})
            </button>
          )}
        </div>
      </Div>
    </Panel>
  );
}

