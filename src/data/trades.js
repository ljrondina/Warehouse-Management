// Trade taxonomy — replaces the old Category/Subcategory model.
// L1 = Trade, L2 = Item Group (internal keys stay l1/l2; user-facing text always
// says "Trade" / "Item Group"). Used by filters, charts and the Add Material form.
export const TRADES = {
  'General Requirements': [
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
  'Architectural Works': [
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
  'Electrical and Auxiliary Works': ['Electrical', 'Auxiliary', 'Electrical Consumables'],
  'Fire Protection Works': ['Fire Protection', 'Fire Protection Consumables'],
  'Mechanical Works': ['Mechanical', 'Mechanical Consumables'],
  'Plumbing Works': ['Plumbing', 'Plumbing Consumables'],
  'Site Works': ['Site Works', 'Earthworks', 'Landscape and Amenities'],
  'Structural Works': [
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
  'General Requirements': 'Gen. Reqs',
  'Architectural Works': 'Architectural',
  'Electrical and Auxiliary Works': 'Electrical',
  'Fire Protection Works': 'Fire Prot.',
  'Mechanical Works': 'Mechanical',
  'Plumbing Works': 'Plumbing',
  'Site Works': 'Site Works',
  'Structural Works': 'Structural',
  'Allied Services': 'Allied Svcs',
}
