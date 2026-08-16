import Icon from '../../lib/icons'

// Placeholder only — the Excess tab is locked for Phase 1. It exists in the tab strip
// (disabled) rather than being hidden so the module's eventual scope is visible now;
// this body renders only if the lock is ever lifted without content being wired up.
export default function ExcessTab() {
  return (
    <div className="card">
      <div className="card-pad locked-panel">
        <span className="locked-panel-ico"><Icon name="lock" size={30} /></span>
        <h3>Excess Materials — coming in Phase 2</h3>
        <p className="muted">
          Surplus and returned materials recovered from completed projects, offered back to
          active sites before new purchase requests are raised.
        </p>
      </div>
    </div>
  )
}
