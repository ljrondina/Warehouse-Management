import { useEffect, useRef, useState } from 'react'
import Icon from '../lib/icons'

// The single entry point for creating anything in the warehouse. It replaces the
// old per-page "+ Add Material" / "+ Add Request" buttons, which meant the action
// you wanted depended on the page you happened to be on.
//
// `form` names the modal the dashboard should open. An entry with no `form` and no
// `children` is a Phase-2 placeholder: shown, described, and disabled — deliberately
// visible so the eventual shape of the module is legible now.
export const TRANSACTIONS = [
  {
    key: 'receipt', label: 'Receipt', icon: 'receipt',
    hint: 'Record materials received into the warehouse',
    children: [
      { key: 'material', label: 'Material', icon: 'inventory', form: 'material', hint: 'Warehouse-owned stock received into inventory' },
      { key: 'safekeeping', label: 'Safekeeping', icon: 'vault', form: 'safekeeping', hint: 'Project-owned materials delivered in for storage' },
    ],
  },
  {
    key: 'issuance', label: 'Issuance', icon: 'issue',
    hint: 'Release stock against a project request',
  },
  {
    key: 'transfer', label: 'Transfer', icon: 'transfer',
    hint: 'Move materials between custody or location',
    children: [
      { key: 'borrowing', label: 'Goods Borrowing', icon: 'borrow', hint: 'Lend stock out for temporary site use' },
      { key: 'reorganization', label: 'Reorganization', icon: 'reorganize', hint: 'Relocate stock within the warehouse' },
    ],
  },
  {
    key: 'return', label: 'Return', icon: 'return',
    hint: 'Take materials back from a project site',
  },
  {
    key: 'reservation', label: 'Reservation', icon: 'reserve',
    hint: 'Allocate available stock to a project',
  },
]

// One row of the menu. A parent with children expands in place rather than flying
// out sideways — a flyout at this width would run off the right edge of the viewport
// on the narrow screens the dashboard already supports.
function Row({ item, depth, expanded, onToggle, onPick, locked }) {
  const disabled = locked || (!item.form && !item.children)
  const hasKids = Boolean(item.children)
  return (
    <button
      type="button"
      className={`txn-opt ${depth ? 'sub' : ''} ${disabled ? 'locked' : ''} ${expanded ? 'expanded' : ''}`}
      disabled={disabled}
      title={disabled ? `${item.label} — not available in Phase 1` : item.hint}
      onClick={() => (hasKids ? onToggle(item.key) : onPick(item))}
    >
      <span className="txn-opt-ico"><Icon name={item.icon} size={17} /></span>
      <span className="txn-opt-main">
        <span className="txn-opt-label">{item.label}</span>
        <span className="txn-opt-hint">{item.hint}</span>
      </span>
      {hasKids
        ? <Icon name="chevronDown" size={15} className="txn-caret" />
        : disabled && <span className="txn-lock">🔒</span>}
    </button>
  )
}

export default function NewTransactionMenu({ onPick, canCreate = true, allowed }) {
  const [open, setOpen] = useState(false)
  const [expanded, setExpanded] = useState(null)
  const ref = useRef(null)

  useEffect(() => {
    if (!open) return
    const away = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    const esc = (e) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', away)
    document.addEventListener('keydown', esc)
    return () => {
      document.removeEventListener('mousedown', away)
      document.removeEventListener('keydown', esc)
    }
  }, [open])

  // Collapsing on close means reopening always starts from the flat five-item list
  // rather than whatever branch was left open last time.
  const close = () => { setOpen(false); setExpanded(null) }

  const pick = (item) => {
    close()
    onPick(item)
  }

  // `allowed` lets a caller narrow the set further (unset = every form permitted).
  const isLocked = (item) => !canCreate || (allowed && item.form && !allowed.includes(item.form))

  return (
    <div className="txn-wrap" ref={ref}>
      <button
        className={`btn btn-primary txn-trigger ${open ? 'open' : ''}`}
        onClick={() => (open ? close() : setOpen(true))}
        disabled={!canCreate}
        title={canCreate ? 'Create a warehouse transaction' : 'Restricted for your role'}
        aria-expanded={open}
        aria-haspopup="menu"
        data-tour="add-btn"
      >
        <Icon name={canCreate ? 'plus' : 'settings'} size={16} />
        New Transaction {!canCreate && '🔒'}
        <Icon name="chevronDown" size={14} className="txn-caret" />
      </button>

      {open && (
        <div className="txn-menu card" role="menu">
          <div className="txn-menu-head">
            <span>Transaction type</span>
            <span className="faint">Phase 1</span>
          </div>
          {TRANSACTIONS.map((t) => (
            <div key={t.key} className="txn-group">
              <Row
                item={t}
                depth={0}
                expanded={expanded === t.key}
                locked={isLocked(t)}
                onToggle={(k) => setExpanded((e) => (e === k ? null : k))}
                onPick={pick}
              />
              {t.children && expanded === t.key && (
                <div className="txn-sublist">
                  {t.children.map((c) => (
                    <Row key={c.key} item={c} depth={1} locked={isLocked(c)} onToggle={() => {}} onPick={pick} />
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
