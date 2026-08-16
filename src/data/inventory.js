// Central Warehouse stock on hand — LOADED FROM POSTGRES AT RUNTIME.
//
// This file used to carry the real 779-line dataset inline. It does not any more:
// this repository is public, and the dataset (unit prices, line valuations, project
// names) is confidential. The master copy lives in /private-data/inventory.js on the
// maintainer's machine, which feeds `npm run seed`; the live data lives in
// public.inventory in Supabase and reaches the app only after a successful sign-in.
//
// `inventory` is filled IN PLACE by src/lib/hydrate.js — never reassigned — because
// src/data/insights.js and ~20 pages hold a live reference to this exact array.
export const WAREHOUSE = 'Central Warehouse Taytay';
export const inventory = [];
