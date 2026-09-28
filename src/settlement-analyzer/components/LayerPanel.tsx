'use client'

import { Building2, Layers3, MapPin } from 'lucide-react'
import type { Locale } from '@/lib/i18n'
import { CATEGORY_META, CATEGORY_ORDER } from '../config'
import { sa } from '../copy'
import type { LayerVisibility } from './layer-visibility'

interface Props {
  locale: Locale
  visible: LayerVisibility
  onChange: (visible: LayerVisibility) => void
  collapsed: boolean
  onToggleCollapsed: () => void
  terrainLabel: string
}

export function LayerPanel({ locale, visible, onChange, collapsed, onToggleCollapsed, terrainLabel }: Props) {
  const copy = sa(locale)
  const toggle = (key: keyof LayerVisibility) => onChange({ ...visible, [key]: !visible[key] })
  return (
    <aside className={`layer-panel ${collapsed ? 'layer-panel--collapsed' : ''}`} aria-label={copy.layersAria}>
      <button type="button" className="layer-panel__heading" onClick={onToggleCollapsed} aria-expanded={!collapsed}>
        <span><Layers3 size={19} /> {copy.layers}</span><span aria-hidden="true">{collapsed ? '+' : '−'}</span>
      </button>
      {!collapsed && (
        <div className="layer-list">
          <LayerRow checked={visible.boundary} onChange={() => toggle('boundary')} color="#040e31" label={copy.analysisBoundary} />
          {CATEGORY_ORDER.map((key) => (
            <LayerRow
              key={key}
              checked={visible[key]}
              onChange={() => toggle(key)}
              color={CATEGORY_META[key].color}
              label={copy.layerCategories[key] ?? copy.categories[key]}
            />
          ))}
          <div className="layer-divider" />
          <LayerRow checked={visible.buildings} onChange={() => toggle('buildings')} color="#f3f1e8" label={copy.buildings} icon={<Building2 size={17} />} />
          <LayerRow checked={visible.pois} onChange={() => toggle('pois')} color="#002cff" label={copy.pois} icon={<MapPin size={17} />} />
          <LayerRow checked={visible.terrain} onChange={() => toggle('terrain')} color="#d07a45" label={terrainLabel} />
          <LayerRow checked={visible.cadastre} onChange={() => toggle('cadastre')} color="#b3261e" label={copy.cadastreLayer} />
        </div>
      )}
    </aside>
  )
}

function LayerRow({ checked, onChange, color, label, icon }: { checked: boolean; onChange: () => void; color: string; label: string; icon?: React.ReactNode }) {
  return (
    <label className="layer-row">
      <input type="checkbox" checked={checked} onChange={onChange} />
      <span className="layer-check" aria-hidden="true">✓</span>
      {icon ?? <span className="layer-color" style={{ background: color }} />}
      <span>{label}</span>
    </label>
  )
}
