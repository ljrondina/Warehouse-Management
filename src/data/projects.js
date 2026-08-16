// Project master — LOADED FROM POSTGRES AT RUNTIME (public.projects).
// Master copy: /private-data/projects.js (untracked). Project names are commercially
// sensitive; see src/data/inventory.js for why this file carries no data.
//
// PROJECTS and PROJECT_CODES are filled IN PLACE by src/lib/hydrate.js.
export const PROJECTS = [];

export const PROJECT_CODES = [];

export function rebuildProjectCodes() {
  PROJECT_CODES.length = 0;
  PROJECT_CODES.push(...PROJECTS.map((p) => p.code));
}

export const projectLabel = (code) => {
  const p = PROJECTS.find((p) => p.code === code);
  return p ? `${p.code} · ${p.name}` : code;
};
export const projectName = (code) => PROJECTS.find((p) => p.code === code)?.name || code;
