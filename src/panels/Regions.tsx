import type React from 'react';
import { Panel, PanelHeader, Div } from '@vkontakte/vkui';
import { useState } from 'react';
import { useGame } from '../store/gameStore';
import type { Region } from '../types';

const REGION_ZONES: Array<{ type: Region['type']; emoji: string; name: string; description: string; position: React.CSSProperties }> = [
  { type: 'mine', emoji: '⛏️', name: 'Шахты', description: 'Добыча руды', position: { left: '2%', top: '2%', width: '47%', height: '29%' } },
  { type: 'lumber', emoji: '🌲', name: 'Лес', description: 'Добыча древесины', position: { left: '2%', top: '29%', width: '47%', height: '29%' } },
  { type: 'farm', emoji: '🌾', name: 'Поля', description: 'Производство еды', position: { left: '49%', top: '27%', width: '49%', height: '29%' } },
  { type: 'port', emoji: '⚓', name: 'Порт', description: 'Торговля и ресурсы', position: { left: '49%', top: '48%', width: '49%', height: '30%' } },
];

export function Regions() {
  const { regions, resources, buyRegion, upgradeRegion, collectRegions } = useGame();
  const [selectedType, setSelectedType] = useState<Region['type'] | null>(null);
  const selectedZone = REGION_ZONES.find((zone) => zone.type === selectedType);
  const selectedRegion = regions.find((region) => region.type === selectedType);

  return (
    <Panel id="regions" className="custom-app-bg">
      <PanelHeader style={{ background: 'transparent' }}>Регионы</PanelHeader>
      <Div className="page-shell page-content regions-page">
        <div className="glass-panel region-resources" aria-label="Ресурсы">
          <b>💰 {resources.coins.toLocaleString('ru-RU')}</b><b>⛏️ {resources.ore}</b><b>🪵 {resources.wood}</b><b>🍞 {resources.food}</b>
        </div>
        <button className="btn-primary" onClick={() => void collectRegions()}>Собрать ресурсы</button>
        <div className="regions-map" role="group" aria-label="Карта регионов">
          <div className="regions-map-hint">Нажмите на область, чтобы открыть регион</div>
          {REGION_ZONES.map((zone) => {
            const region = regions.find((item) => item.type === zone.type);
            return <button key={zone.type} type="button" className={`region-zone ${region ? 'region-zone-owned' : ''}`} style={zone.position} onClick={() => setSelectedType(zone.type)} aria-label={`${zone.name}. ${region ? `Уровень ${region.level}` : 'Не захвачен'}`}>
              <span className="region-zone-label">{zone.emoji} {zone.name}</span>{region && <span className="region-zone-level">Ур. {region.level}</span>}
            </button>;
          })}
        </div>
        {selectedZone && <div className="region-dialog-backdrop" role="presentation" onClick={() => setSelectedType(null)}>
          <section className="region-dialog glass-panel" role="dialog" aria-modal="true" aria-labelledby="region-dialog-title" onClick={(event) => event.stopPropagation()}>
            <button type="button" className="region-dialog-close" onClick={() => setSelectedType(null)} aria-label="Закрыть">×</button>
            <div className="region-dialog-icon">{selectedZone.emoji}</div><h2 id="region-dialog-title">{selectedZone.name}</h2><p className="text-sub">{selectedZone.description}</p>
            {selectedRegion ? <><div className="region-stats"><span>Уровень <strong>{selectedRegion.level}/10</strong></span><span>Доход <strong>{Math.floor(selectedRegion.rate)} в час</strong></span></div><button className="btn-primary" onClick={() => void upgradeRegion(selectedRegion.id)} disabled={selectedRegion.level >= 10}>{selectedRegion.level >= 10 ? 'Максимальный уровень' : `Улучшить · ${selectedRegion.meta.cost.toLocaleString('ru-RU')} 💰`}</button></> : <><p>Этот регион ещё не захвачен. Купите его, чтобы начать добычу ресурсов.</p><button className="btn-primary" onClick={() => void buyRegion(selectedZone.type)}>Захватить регион</button></>}
          </section>
        </div>}
      </Div>
    </Panel>
  );
}
