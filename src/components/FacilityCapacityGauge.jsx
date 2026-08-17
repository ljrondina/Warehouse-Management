import { facilityCapacity } from '../data/warehouseMap'
import { seriesFor } from '../lib/colors'
import { useTheme } from '../context/ThemeContext'
import { num } from '../lib/format'
import Icon from '../lib/icons'

// A SPACE reading (pallet/shelf positions occupied), not a stock reading, so it lives on
// the floor plan that defines those positions. The battery fills from the base up:
// Warehouse-owned racks first (MEPFS, Structural, Architectural, High Value), then the
// Safekeeping area, and whatever neither has filled rises to the top as Available.
// See facilityCapacity() in warehouseMap.js for the real numbers this reads.
//
// The old quantity/value toggle is gone — the gauge now speaks only in percentage of
// floor space, which is the one question a capacity chart answers.
const CAP_SEGMENTS = [
  { key: 'warehouse', role: 'total', icon: 'warehouse', label: 'Warehouse' },
  { key: 'safekeeping', role: 'reserved', icon: 'vault', label: 'Safekeeping' },
  { key: 'available', role: 'available', icon: 'box', label: 'Available' },
]

// `bare` drops the widget's own frame and heading: on the floor plan it sits inside a
// "Warehouse Capacity" card that supplies both.
export default function FacilityCapacityGauge({ bare }) {
  const { theme } = useTheme()
  const series = seriesFor(theme)

  const cap = facilityCapacity()
  const capPct = { warehouse: cap.warehousePct, safekeeping: cap.safekeepingPct, available: cap.availablePct }

  return (
    <div className={bare ? 'cap-widget is-bare' : 'cap-widget'}>
      <div className="cap-widget-head">
        {bare
          ? <div className="cap-widget-sub">Space occupancy across {num(cap.positions)} pallet and shelf positions</div>
          : (
            <div>
              <div className="card-title">Warehouse Capacity</div>
              <div className="card-sub">{num(cap.positions)} pallet/shelf positions across the warehouse</div>
            </div>
          )}
      </div>
      <div className="cap-widget-body">
        {/* column-reverse: the first child renders at the bottom. Warehouse and
            Safekeeping fill up from the base — real racked/shelved space in use — and
            whatever is left rises as Available at the top. Each band prints its own
            share of the total in place. */}
        <div className="battery-tube cap-tube">
          {CAP_SEGMENTS.map((s) => {
            const p = capPct[s.key]
            return (
              <div key={s.key} className="battery-seg cap-seg" style={{ height: `${p}%`, '--seg': series[s.role] }}>
                {p >= 7 && <span className="cap-seg-pct tabular">{Math.round(p)}%</span>}
              </div>
            )
          })}
        </div>
        <div className="cap-legend cap-legend-wide">
          {CAP_SEGMENTS.map((s) => (
            <span key={s.key} className="cap-item" style={{ '--seg': series[s.role] }}>
              <Icon name={s.icon} size={14} />
              <span className="cap-lbl">{s.label}</span>
              <span className="cap-pct tabular">{Math.round(capPct[s.key])}%</span>
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}
