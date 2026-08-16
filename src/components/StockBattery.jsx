import { num } from '../lib/format'
import Icon from '../lib/icons'

// A "battery" gauge for stock on hand — Reserved sits on top of Available, the two
// summing to SOH — with download/upload style Incoming/Outgoing badges beside it.
export default function StockBattery({ available, reserved, incoming, outgoing, unit }) {
  const base = available + reserved
  const availPct = base > 0 ? Math.round((available / base) * 100) : 0
  const reservedPct = 100 - availPct

  return (
    <div className="battery-wrap">
      <div className="battery-col">
        {/* column-reverse: the first child renders at the bottom, so Available fills
            from the base up and Reserved caps it off on top. */}
        <div className="battery-tube">
          <div className="battery-seg seg-avail" style={{ height: `${availPct}%` }} />
          <div className="battery-seg seg-res" style={{ height: `${reservedPct}%` }} />
          <div className="battery-pct">{availPct}%</div>
        </div>
        <div className="battery-stats">
          <div className="battery-stat-main tabular">
            <span className="bs-avail">{num(available)}</span>
            <span className="bs-sep">/</span>
            <span className="bs-total">{num(base)}</span>
            <span className="bs-unit">{unit}</span>
          </div>
          <div className="battery-stat-sub">Available of SOH</div>
        </div>
      </div>

      <div className="flow-col">
        <div className="flow-badge flow-in">
          <span className="flow-icon"><Icon name="incoming" size={20} /></span>
          <div className="flow-info">
            <span className="flow-val tabular">{num(incoming)}</span>
            <span className="flow-lbl">Incoming {unit}</span>
          </div>
        </div>
        <div className="flow-badge flow-out">
          <span className="flow-icon"><Icon name="outgoing" size={20} /></span>
          <div className="flow-info">
            <span className="flow-val tabular">{num(outgoing)}</span>
            <span className="flow-lbl">Outgoing {unit}</span>
          </div>
        </div>
      </div>
    </div>
  )
}
