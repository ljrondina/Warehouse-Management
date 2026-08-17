import { useState } from 'react'
import { facilityCapacity } from '../data/warehouseMap'
import { seriesFor } from '../lib/colors'
import { useTheme } from '../context/ThemeContext'
import { Toggle } from './ui'
import { num, compact } from '../lib/format'
import Icon from '../lib/icons'

// Moved here from the Inventory Composition card — it is a SPACE reading (pallet/
// shelf positions occupied), not a stock reading, so it belongs on the floor plan
// that actually defines those positions rather than beside a card about goods on
// hand. Warehouse is every warehouse-owned rack (MEPFS, Structural, Architectural,
// High Value); Safekeeping is its own area; Available is whatever neither has
// filled. See facilityCapacity() in warehouseMap.js for the real numbers this reads.
const CAP_SEGMENTS = [
  { key: 'warehouse', role: 'total', icon: 'warehouse', label: 'Warehouse' },
  { key: 'safekeeping', role: 'reserved', icon: 'vault', label: 'Safekeeping' },
  { key: 'available', role: 'available', icon: 'box', label: 'Available' },
]
const metricOpts = [{ value: 'qty', label: 'Quantity', icon: 'box' }, { value: 'value', label: 'Value', icon: 'receipt' }]

// `bare` drops the widget's own frame and heading: on the floor plan it now sits inside
// a "Warehouse Capacity" card that supplies both, and two headings stacked read as two
// separate things rather than one.
export default function FacilityCapacityGauge({ bare }) {
  const { theme } = useTheme()
  const series = seriesFor(theme)
  const [metric, setMetric] = useState('qty')
  const money = metric === 'value'

  const cap = facilityCapacity()
  const capPct = { warehouse: cap.warehousePct, safekeeping: cap.safekeepingPct, available: cap.availablePct }
  // Quantity mode reads positions (a real occupancy count); Value mode reads the
  // peso value of stock sitting in that bucket. Available has no value figure —
  // empty floor space holds nothing — so it prints an em dash rather than a false 0.
  const figure = (key) => {
    if (!money) return `${num({ warehouse: cap.warehouseUsed, safekeeping: cap.safekeepingUsed, available: cap.available }[key])} pos.`
    const v = { warehouse: cap.warehouseValue, safekeeping: cap.safekeepingValue, available: null }[key]
    return v == null ? '—' : `₱${compact(v)}`
  }

  return (
    <div className={bare ? 'cap-widget is-bare' : 'cap-widget'}>
      <div className="cap-widget-head">
        {bare
          ? <div className="cap-widget-sub">{num(cap.positions)} pallet and shelf positions across the warehouse</div>
          : (
            <div>
              <div className="card-title">Warehouse Capacity</div>
              <div className="card-sub">{num(cap.positions)} pallet/shelf positions across the warehouse</div>
            </div>
          )}
        <Toggle size="sm" options={metricOpts} value={metric} onChange={setMetric} />
      </div>
      <div className="cap-widget-body">
        {/* column-reverse: the first child renders at the bottom. Warehouse and
            Safekeeping fill up from the base — real racked/shelved space in use —
            and whatever is left rises as Available at the top. */}
        <div className="battery-tube cap-tube">
          {CAP_SEGMENTS.map((s) => (
            <div key={s.key} className="battery-seg cap-seg" style={{ height: `${capPct[s.key]}%`, '--seg': series[s.role] }} />
          ))}
        </div>
        <div className="cap-legend cap-legend-wide">
          {CAP_SEGMENTS.map((s) => (
            <span key={s.key} className="cap-item" style={{ '--seg': series[s.role] }}>
              <Icon name={s.icon} size={13} />
              <span className="cap-lbl">{s.label}</span>
              <span className="cap-figure tabular">{figure(s.key)}</span>
              <span className="cap-pct tabular">{Math.round(capPct[s.key])}%</span>
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}
