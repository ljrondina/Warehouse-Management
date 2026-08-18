// Trade taxonomy — replaces the old Category/Subcategory model.
// L1 = Trade, L2 = Item Group (internal keys stay l1/l2; user-facing text always
// says "Trade" / "Item Group"). Used by filters, charts and the Add Material form.
//
// Trade names were shortened app-wide: "General Requirements" reads "General Hardware",
// and every "… Works" trade drops the "Works" suffix. `renameTrade()` is the single
// canonical transform — the raw values arriving from Postgres carry the old long names,
// so it is applied wherever a trade enters the app as data (rebuildItems,
// rebuildDeliveryRows, rebuildSafekeeping) and the keys below are already the new names.
export const renameTrade = (name) => {
  if (!name) return name
  if (name === 'General Requirements') return 'General Hardware'
  return name.replace(/\s+Works$/, '')
}

export const TRADES = {
  'General Hardware': [
    'Office Equipment and Supplies',
    'House Keeping and Sanitation',
    'Support Equipment',
    'Fuel and Oil',
    'Safety Protection',
    'Temporary Facility',
    'Tools',
    'Tools Consumables',
    'Power Tools',
    'General Hardware Materials',
    'Equipment Parts',
    'Furniture and Fixtures',
  ],
  'Architectural': [
    'Masonry',
    'Masonry Consumables',
    'Stones',
    'Tiles',
    'Tile Consumables',
    'Ceiling',
    'Thermal and Moisture Protection',
    'Door and Jamb',
    // Door hardware is tracked separately from the door/jamb assembly in the
    // warehouse's own item-group list, so it stays its own group here too.
    'Door Hardwares',
    'Metals',
    'Metalworks Consumables',
    'Paint',
    'Painting Consumables',
    'Aluminium Glass and Glazing',
    'Roof',
    'Specialties',
  ],
  'Electrical and Auxiliary': ['Electrical', 'Auxiliary', 'Electrical Consumables'],
  'Fire Protection': ['Fire Protection', 'Fire Protection Consumables'],
  'Mechanical': ['Mechanical', 'Mechanical Consumables'],
  'Plumbing': ['Plumbing', 'Plumbing Consumables'],
  'Site': ['Site Works', 'Earthworks', 'Landscape and Amenities'],
  'Structural': [
    'Rebar Works',
    'Rebar Consumables',
    'Concrete Works',
    'Concrete Consumables',
    'Formworks',
    'Formwork Consumables',
    'Precast',
    'Precast Consumables',
    'Structural Steel',
  ],
  'Allied Services': ['Allied Services'],
}

export const TRADE_L1 = Object.keys(TRADES)
export const l2For = (l1) => TRADES[l1] || []
export const ALL_L2 = [...new Set(Object.values(TRADES).flat())].sort()

// Short labels for compact chart/segment controls.
export const SHORT_L1 = {
  'General Hardware': 'Gen. Hardware',
  'Architectural': 'Architectural',
  'Electrical and Auxiliary': 'Electrical',
  'Fire Protection': 'Fire Prot.',
  'Mechanical': 'Mechanical',
  'Plumbing': 'Plumbing',
  'Site': 'Site',
  'Structural': 'Structural',
  'Allied Services': 'Allied Svcs',
}
