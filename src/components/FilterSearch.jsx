import { useEffect, useMemo, useRef, useState } from 'react'
import { items } from '../data/insights'
import { TRADE_L1, ALL_L2 } from '../data/trades'
import Icon from '../lib/icons'

// A filter token: { type: 'item'|'l1'|'l2'|'brand', value, label }
const keyOf = (t) => `${t.type}:${t.value}`

// Every type is shown as an icon on the chips (the label survives as the tooltip) —
// the words repeat on every chip and crowd out the value itself. The four glyphs are
// chosen for distinct silhouettes rather than category: a package for a Material,
// stacked layers for a Trade, a folder for an Item Group, a tag for a Brand.
const TYPE_META = {
  item: { label: 'Material', icon: 'box', iconOnly: true },
  l1: { label: 'Trade', icon: 'layers', iconOnly: true },
  l2: { label: 'Item Group', icon: 'folder', iconOnly: true },
  brand: { label: 'Brand', icon: 'tag', iconOnly: true },
}

// Build the searchable universe once.
function buildIndex() {
  const byCode = new Map()
  for (const it of items) {
    if (!byCode.has(it.itemCode)) byCode.set(it.itemCode, it)
  }
  const materials = [...byCode.values()].map((it) => ({
    type: 'item',
    value: it.itemCode,
    label: it.description,
    hint: `${it.itemCode} · ${it.tradeL2}`,
    uom: it.uom,
  }))
  const l1 = TRADE_L1.map((t) => ({ type: 'l1', value: t, label: t, hint: 'Trade' }))
  const l2 = ALL_L2.map((t) => ({ type: 'l2', value: t, label: t, hint: 'Item Group' }))
  const brands = [...new Set(items.map((i) => i.brand).filter(Boolean))].map((b) => ({
    type: 'brand', value: b, label: b, hint: 'Brand',
  }))
  return [...materials, ...l1, ...l2, ...brands]
}

// Apply tokens to the item list. Tokens of the same type OR together; different types AND.
export function applyFilters(pool, tokens) {
  if (!tokens.length) return pool
  const groups = tokens.reduce((acc, t) => {
    ;(acc[t.type] ??= []).push(t.value)
    return acc
  }, {})
  return pool.filter((it) => {
    if (groups.item && !groups.item.includes(it.itemCode)) return false
    if (groups.l1 && !groups.l1.includes(it.tradeL1)) return false
    if (groups.l2 && !groups.l2.includes(it.tradeL2)) return false
    if (groups.brand && !groups.brand.includes(it.brand)) return false
    return true
  })
}

// `noun` names what is being counted — "material" on the inventory dashboard, "line"
// on Safekeeping, where the rows are project/item SOH lines rather than SKUs.
export default function FilterSearch({ tokens, onChange, resultCount, uoms, noun = 'material' }) {
  const index = useMemo(buildIndex, [])
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const wrapRef = useRef(null)

  const selected = useMemo(() => new Set(tokens.map(keyOf)), [tokens])

  const suggestions = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return []
    const scored = []
    for (const s of index) {
      const hay = `${s.label} ${s.value}`.toLowerCase()
      const i = hay.indexOf(q)
      if (i !== -1) scored.push({ ...s, score: i + (s.type === 'item' ? 0 : -5) })
    }
    return scored.sort((a, b) => a.score - b.score).slice(0, 12)
  }, [query, index])

  // Close the dropdown when clicking away.
  useEffect(() => {
    const h = (e) => { if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  const toggle = (s) => {
    const k = keyOf(s)
    if (selected.has(k)) onChange(tokens.filter((t) => keyOf(t) !== k))
    else onChange([...tokens, { type: s.type, value: s.value, label: s.label }])
  }

  const onKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      // Enter applies every unselected suggestion currently listed.
      const fresh = suggestions.filter((s) => !selected.has(keyOf(s)))
      if (fresh.length) {
        onChange([...tokens, ...fresh.map((s) => ({ type: s.type, value: s.value, label: s.label }))])
        setQuery('')
      }
    } else if (e.key === 'Escape') {
      setOpen(false)
    } else if (e.key === 'Backspace' && !query && tokens.length) {
      onChange(tokens.slice(0, -1))
    }
  }

  return (
    <div className="filter-search" ref={wrapRef} data-tour="filter-search">
      <div className="fs-bar">
        <Icon name="search" size={17} className="fs-ico" />
        <input
          className="fs-input"
          placeholder={tokens.length ? 'Add another filter…' : 'Filter by material, trade or brand…'}
          value={query}
          onChange={(e) => { setQuery(e.target.value); setOpen(true) }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
        />
        {tokens.length > 0 && (
          <button className="btn btn-sm fs-clear" onClick={() => { onChange([]); setQuery('') }}>
            <Icon name="close" size={13} /> Clear all
          </button>
        )}
        <span className="fs-count tabular">{resultCount} {noun}{resultCount === 1 ? '' : 's'}</span>
      </div>

      {open && suggestions.length > 0 && (
        <div className="fs-suggest card">
          <div className="fs-suggest-head">
            <span className="faint">{suggestions.length} match{suggestions.length === 1 ? '' : 'es'}</span>
            <span className="faint">Enter adds all</span>
          </div>
          {suggestions.map((s) => {
            const on = selected.has(keyOf(s))
            return (
              <button key={keyOf(s)} className={`fs-opt ${on ? 'on' : ''}`} onClick={() => toggle(s)} type="button">
                <span className={`fs-check ${on ? 'on' : ''}`}>{on && <Icon name="check" size={12} />}</span>
                <span className="fs-opt-kind" title={TYPE_META[s.type]?.label}>
                  <Icon name={TYPE_META[s.type]?.icon} size={14} />
                </span>
                <span className="fs-opt-main">
                  <span className="fs-opt-label">{s.label}</span>
                  <span className="fs-opt-hint">{s.type === 'item' ? s.hint : TYPE_META[s.type]?.label}</span>
                </span>
                {s.uom && <span className="fs-opt-uom">{s.uom}</span>}
              </button>
            )
          })}
        </div>
      )}

      {tokens.length > 0 && (
        <div className="fs-tokens">
          {tokens.map((t) => {
            const meta = TYPE_META[t.type]
            return (
            <span key={keyOf(t)} className={`fs-token type-${t.type}`}>
              <span className={`fs-token-type ${meta?.iconOnly ? 'is-icon' : ''}`} title={meta?.label}>
                {meta?.iconOnly ? <Icon name={meta.icon} size={13} /> : meta?.label}
              </span>
              <span className="fs-token-label" title={t.label}>{t.label}</span>
              <button className="fs-token-x" onClick={() => onChange(tokens.filter((x) => keyOf(x) !== keyOf(t)))} aria-label={`Remove ${t.label}`}>
                <Icon name="close" size={12} />
              </button>
            </span>
            )
          })}
        </div>
      )}

      {/* Unfiltered, there is nothing worth saying about units — the summary row only
          appears once a filter narrows things down and mixed units become a real risk. */}
      {tokens.length > 0 && (
        <div className="fs-summary">
          <span className="fs-uom-label">Unit{uoms.length === 1 ? '' : 's'} of measure:</span>
          {uoms.length === 0 ? <span className="faint">—</span> : uoms.map((u) => <span key={u} className="fs-uom">{u}</span>)}
          {uoms.length > 1 && (
            <span className="fs-mixed" title="The filtered materials use different units — quantities are not directly comparable.">
              ⚠ mixed units
            </span>
          )}
        </div>
      )}
    </div>
  )
}
