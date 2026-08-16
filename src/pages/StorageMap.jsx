import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { items } from '../data/insights'
import { Card, Badge } from '../components/ui'
import { num, peso } from '../lib/format'
import Icon from '../lib/icons'

const ZONES = ['A', 'B', 'C', 'D', 'E']

// Floor-plan geometry (Taytay Central Warehouse — single ground floor).
const ZONE_RECT = {
  A: { x: 70, y: 150, w: 150, h: 120 },
  B: { x: 240, y: 150, w: 150, h: 120 },
  C: { x: 410, y: 150, w: 150, h: 120 },
  D: { x: 70, y: 300, w: 150, h: 120 },
  E: { x: 240, y: 300, w: 150, h: 120 },
}
const HV_RECT = { x: 410, y: 300, w: 150, h: 120 }

function occColor(ratio) {
  if (ratio > 0.75) return '#ee3124'
  if (ratio > 0.45) return '#a8770f'
  if (ratio > 0.15) return '#7d7c7c'
  return '#2f7d5a'
}

export default function StorageMap() {
  const nav = useNavigate()
  const [zone, setZone] = useState(null)
  const [rack, setRack] = useState(null)
  const [bin, setBin] = useState(null)

  const zoneItems = useMemo(() => {
    const m = {}
    for (const z of [...ZONES, 'HV']) m[z] = items.filter((i) => i.zone === z)
    return m
  }, [])
  const maxCount = Math.max(...Object.values(zoneItems).map((a) => a.length), 1)

  const racks = useMemo(() => {
    if (!zone) return []
    const m = {}
    for (const it of zoneItems[zone]) (m[it.rack] ??= []).push(it)
    return Object.entries(m).sort()
  }, [zone, zoneItems])

  const bins = useMemo(() => {
    if (!zone || !rack) return []
    const list = zoneItems[zone].filter((i) => i.rack === rack)
    const m = {}
    for (const it of list) {
      const key = `${it.shelf}·${it.bin}`
      ;(m[key] ??= []).push(it)
    }
    return Object.entries(m).sort()
  }, [zone, rack, zoneItems])

  const selectZone = (z) => { setZone(z); setRack(null); setbinReset() }
  const setbinReset = () => setBin(null)
  const binItems = bin ? (bins.find(([k]) => k === bin)?.[1] || []) : []

  const Facility = ({ x, y, w, h, label, muted }) => (
    <g>
      <rect x={x} y={y} width={w} height={h} rx="6" fill={muted ? 'var(--surface-2)' : 'var(--surface)'} stroke="var(--border-strong)" strokeDasharray="4 3" />
      <text x={x + w / 2} y={y + h / 2} textAnchor="middle" dominantBaseline="middle" fontSize="11" fill="var(--text-faint)" fontWeight="600">{label}</text>
    </g>
  )

  const ZoneRect = ({ z, r }) => {
    const its = zoneItems[z]
    const ratio = its.length / maxCount
    const active = zone === z
    return (
      <g style={{ cursor: 'pointer' }} onClick={() => selectZone(z)}>
        <rect x={r.x} y={r.y} width={r.w} height={r.h} rx="8"
          fill={active ? occColor(ratio) : 'var(--surface)'}
          stroke={active ? occColor(ratio) : 'var(--border-strong)'} strokeWidth={active ? 3 : 1.5} />
        <rect x={r.x} y={r.y} width={r.w} height={r.h} rx="8" fill={active ? 'rgba(255,255,255,0.12)' : occColor(ratio)} opacity={active ? 1 : 0.12} />
        {/* rack stripes */}
        {[0, 1, 2].map((i) => (
          <rect key={i} x={r.x + 12} y={r.y + 16 + i * 30} width={r.w - 24} height="16" rx="3" fill={active ? 'rgba(255,255,255,0.35)' : 'var(--border-strong)'} opacity="0.5" />
        ))}
        <text x={r.x + 14} y={r.y + r.h - 30} fontSize="26" fontWeight="800" fill={active ? '#fff' : 'var(--text)'}>{z}</text>
        <text x={r.x + 14} y={r.y + r.h - 12} fontSize="11" fontWeight="600" fill={active ? '#fff' : 'var(--text-muted)'}>{its.length} SKUs</text>
      </g>
    )
  }

  return (
    <>
      {/* The page heading moved to the topbar; the tour's anchor moves onto the note
          that replaced it, so the floor-plan step still has something to point at. */}
      <div className="section-note" data-tour="floor">Taytay Central Warehouse — pick a zone, rack, then a shelf·bin to see what’s stored there</div>

      <div className="grid mt fp-grid">
        {/* Floor plan SVG */}
        <Card title="Ground Floor Layout" icon="warehouse">
          <div className="table-wrap">
            <svg viewBox="0 0 640 480" style={{ width: '100%', minWidth: 480, background: 'var(--surface-2)', borderRadius: 10 }}>
              {/* building outline */}
              <rect x="20" y="20" width="600" height="440" rx="12" fill="none" stroke="var(--border-strong)" strokeWidth="2" />
              {/* facilities */}
              <Facility x={70} y={50} w={230} h={70} label="OFFICE AREA" muted />
              <Facility x={320} y={50} w={110} h={70} label="SECURITY" muted />
              <Facility x={450} y={50} w={110} h={70} label="EE ROOM" muted />
              {/* receiving dock */}
              <rect x="20" y="360" width="40" height="100" rx="4" fill="var(--accent-weak)" />
              <text x="40" y="415" textAnchor="middle" fontSize="10" fontWeight="700" fill="var(--brand-red)" transform="rotate(-90 40 410)">RECEIVING</text>
              {/* storage zones */}
              {ZONES.map((z) => <ZoneRect key={z} z={z} r={ZONE_RECT[z]} />)}
              {/* HV cage */}
              <g style={{ cursor: 'pointer' }} onClick={() => selectZone('HV')}>
                <rect x={HV_RECT.x} y={HV_RECT.y} width={HV_RECT.w} height={HV_RECT.h} rx="8"
                  fill={zone === 'HV' ? '#2b2c2b' : 'var(--surface)'} stroke="#2b2c2b" strokeWidth={zone === 'HV' ? 3 : 1.5} strokeDasharray="6 3" />
                <rect x={HV_RECT.x} y={HV_RECT.y} width={HV_RECT.w} height={HV_RECT.h} rx="8" fill="#2b2c2b" opacity={zone === 'HV' ? 0 : 0.1} />
                <text x={HV_RECT.x + 14} y={HV_RECT.y + 34} fontSize="13" fontWeight="800" fill={zone === 'HV' ? '#fff' : '#2b2c2b'}>🔒 HIGH-VALUE</text>
                <text x={HV_RECT.x + 14} y={HV_RECT.y + 52} fontSize="11" fill={zone === 'HV' ? '#fff' : 'var(--text-muted)'}>SECURE CAGE</text>
                <text x={HV_RECT.x + 14} y={HV_RECT.y + HV_RECT.h - 14} fontSize="11" fontWeight="700" fill={zone === 'HV' ? '#fff' : 'var(--text-muted)'}>{zoneItems.HV.length} SKUs</text>
              </g>
            </svg>
          </div>
          <div className="wrap-gap mt-sm">
            <span className="chip"><span className="dot" style={{ color: '#2f7d5a' }} /> Low occupancy</span>
            <span className="chip"><span className="dot" style={{ color: '#7d7c7c' }} /> Moderate</span>
            <span className="chip"><span className="dot" style={{ color: '#a8770f' }} /> High</span>
            <span className="chip"><span className="dot" style={{ color: '#ee3124' }} /> Full</span>
            <span className="chip" style={{ color: '#2b2c2b' }}>🔒 High-value cage</span>
          </div>
        </Card>

        {/* Drilldown panel */}
        <Card title={zone ? `Zone ${zone}` : 'Select a Zone'} icon="box"
          right={zone && <button className="btn btn-sm btn-ghost" onClick={() => { setZone(null); setRack(null); setBin(null) }}>Reset</button>}>
          {!zone && <div className="empty">Click a zone or the high-value cage on the floor plan to drill in.</div>}

          {zone && !rack && (
            <>
              <div className="muted" style={{ fontSize: 12, marginBottom: 10 }}>{racks.length} racks · {zoneItems[zone].length} SKUs · {peso(zoneItems[zone].reduce((a, b) => a + b.inventoryValue, 0))}</div>
              <div className="wrap-gap">
                {racks.map(([rk, its]) => (
                  <button key={rk} className="chip" style={{ padding: '10px 12px' }} onClick={() => { setRack(rk); setBin(null) }}>
                    <Icon name="warehouse" size={14} /> <b>{rk}</b> <span className="faint">{its.length}</span>
                  </button>
                ))}
              </div>
            </>
          )}

          {zone && rack && (
            <>
              <div className="location-crumb" style={{ marginBottom: 12 }}>
                <button className="btn btn-sm" onClick={() => { setRack(null); setBin(null) }}>← Racks</button>
                <span className="chip">Zone {zone}</span><Icon name="chevronDown" size={14} style={{ transform: 'rotate(-90deg)' }} className="arrow" />
                <span className="chip">Rack {rack}</span>
              </div>
              <div className="muted" style={{ fontSize: 12, marginBottom: 8 }}>Shelf·Bin cells — click to view contents</div>
              <div className="bin-grid">
                {bins.map(([key, its]) => {
                  const status = its.some((i) => i.stockStatus === 'Low') ? '#a8770f' : its.some((i) => i.stockStatus === 'Overstocked') ? '#ee3124' : '#2f7d5a'
                  return (
                    <button key={key} className={`bin-cell ${bin === key ? 'active' : ''}`} onClick={() => setBin(key)} title={`${key} — ${its.length} item(s)`} style={{ '--bc': status }}>
                      <span className="bc-code">{key}</span>
                      <span className="bc-n">{its.length}</span>
                    </button>
                  )
                })}
              </div>

              {bin && (
                <div className="mt">
                  <div className="spread" style={{ marginBottom: 6 }}><b>Bin {bin}</b><Badge>{binItems.length} materials</Badge></div>
                  {binItems.map((it) => (
                    <div className="insight-row" key={it.id} onClick={() => nav(`/inventory/${it.id}`)} style={{ cursor: 'pointer' }}>
                      <span className="badge badge-neutral" style={{ padding: 6 }}><Icon name="box" size={14} /></span>
                      <div className="insight-main">
                        <div className="t">{it.description}</div>
                        <div className="s mono">{it.itemCode} · {it.tradeL1}</div>
                      </div>
                      <div className="right"><div style={{ fontWeight: 700 }}>{num(it.availableQty)}</div><div className="faint" style={{ fontSize: 11 }}>{it.uom}</div></div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </Card>
      </div>
    </>
  )
}
