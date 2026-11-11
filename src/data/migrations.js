"use strict";

function migrateChartStrength(chart) {
  for (const unit of chart.units) migrateDefaultStrength(unit);
  for (const definitions of Object.values(chart.recipes ?? {})) {
    for (const [key, preset] of Object.entries(definitions)) migrateDefaultStrength(preset, key);
  }
  return chart;
}

function migrateCommandGuards(document) {
  if (document.commandGuardVersion) return;
  document.commandGuardVersion = 1;
  for (const definitions of Object.values(document.recipes ?? {})) {
    const squad = definitions["form-guard-squad"];
    if (squad?.role === "营部警卫 · 推定员额") squad.estimated = true;
    if (!definitions["form-guard-company"]
        || JSON.stringify(presetTree(definitions, "form-guard-company")) !== stockGuardTree) continue;
    if (document.referenceComplete) {
      const headquarters = document.units.find((unit) => unit.id === "344-hq");
      if (headquarters && recipeOf(headquarters, document) === definitions && headquarters.recipe.key === "form-brigade-hq"
          && JSON.stringify(definitions["form-brigade-hq"].parts) === '[["form-guard-company",1]]') {
        definitions["reference-344-hq"] = { ...definitions["form-brigade-hq"], parts: [[brigade344Guard, 1]] };
        Object.assign(definitions, presetTree(builtInPresets, brigade344Guard));
        headquarters.recipe.key = "reference-344-hq";
      }
    }
    for (const [rank, guard] of Object.entries(commandGuards)) {
      const headquarters = definitions[`form-${rank}-hq`];
      if (JSON.stringify(headquarters?.parts) !== '[["form-guard-company",1]]') continue;
      headquarters.parts = [[guard, 1]];
      Object.assign(definitions, presetTree(builtInPresets, guard));
    }
  }
  const byParent = new Map();
  for (const unit of document.units) {
    if (!byParent.has(unit.parent)) byParent.set(unit.parent, []);
    byParent.get(unit.parent).push(unit);
  }
  function matchesStock(unit, key) {
    const expected = builtInPresets[key];
    if (unit.name.replace(/ \d+$/, "") !== expected.name
        || ["type", "rank", "role", "strength", "personnel"].some((field) => JSON.stringify(unit[field]) !== JSON.stringify(expected[field]))) return false;
    const recipe = recipeOf(unit, document);
    if (recipe) return JSON.stringify(presetTree(recipe, unit.recipe.key)) === JSON.stringify(presetTree(builtInPresets, key));
    const keys = (expected.parts ?? []).flatMap(([child, count]) => Array(count).fill(child));
    const children = byParent.get(unit.id) ?? [];
    return keys.length === children.length && children.every((child, index) => matchesStock(child, keys[index]));
  }
  const removed = new Set();
  function removeChildren(id) {
    for (const child of byParent.get(id) ?? []) {
      removed.add(child.id);
      removeChildren(child.id);
    }
  }
  for (const headquarters of document.units.filter((unit) => unit.type === "headquarters" && commandGuards[unit.rank])) {
    const key = document.referenceComplete && headquarters.id === "344-hq" ? brigade344Guard : commandGuards[headquarters.rank];
    for (const guard of byParent.get(headquarters.id) ?? []) {
      if (guard.role === "营部警卫 · 推定员额") guard.estimated = true;
      if (!matchesStock(guard, "form-guard-company")) continue;
      removeChildren(guard.id);
      const definition = builtInPresets[key];
      Object.assign(guard, { name: definition.name, rank: definition.rank, role: definition.role, estimated: true });
      delete guard.strength;
      delete guard.recipe;
      delete guard.personnel;
      if (definition.strength) guard.strength = [...definition.strength];
      if (definition.parts) {
        const snapshot = `command-guard:${key}`;
        document.recipes ??= {};
        document.recipes[snapshot] = presetTree(builtInPresets, key);
        guard.recipe = { snapshot, key };
        document.folded = document.folded?.filter((id) => id !== guard.id);
      }
    }
  }
  if (!removed.size) return document;
  document.units = document.units.filter((unit) => !removed.has(unit.id));
  if (document.folded) document.folded = document.folded.filter((id) => !removed.has(id));
  if (document.expansionLocks) document.expansionLocks = document.expansionLocks.filter((id) => !removed.has(id));
  if (document.stacks) document.stacks = Object.fromEntries(Object.entries(document.stacks)
    .filter(([id]) => !removed.has(id)).map(([id, members]) => [id, members.filter((member) => !removed.has(member))]));
  return document;
}

function migrateReferenceLayout(document) {
  if (document.referenceLayoutVersion >= 2) return;
  document.referenceLayoutVersion = 2;
  arrangeReference(document);
}

// Replace the requested support branches once, including already-expanded saved trees.
// Isolated recipes avoid modifying snapshots shared by other branches or presets.
function migrateSupportEquipment(document) {
  if (document.supportEquipmentVersion >= 1 || !(document.reference || document.referenceComplete || document.referenceArmy)) return false;
  const targets = document.units.filter(unit => /^(?:(?:115|120|129):)?(?:artillery|logistics)$/.test(unit.id)
    && unit.rank === "battalion" && ["artillery", "logistics"].includes(unit.type));
  const roots = new Set(targets.map(unit => unit.id));
  const children = new Map();
  for (const unit of document.units) {
    if (!children.has(unit.parent)) children.set(unit.parent, []);
    children.get(unit.parent).push(unit.id);
  }
  const removed = new Set();
  const pending = targets.flatMap(unit => children.get(unit.id) ?? []);
  while (pending.length) {
    const id = pending.pop();
    if (removed.has(id) || roots.has(id)) continue;
    removed.add(id);
    pending.push(...(children.get(id) ?? []));
  }
  document.units = document.units.filter(unit => !removed.has(unit.id));
  document.recipes ??= {};
  for (const unit of targets) {
    const key = `form-${unit.type}-battalion`;
    const snapshot = `support-equipment-v1:${unit.id}`;
    document.recipes[snapshot] = structuredClone(presetTree(builtInPresets, key));
    unit.recipe = { snapshot, key };
    unit.role = builtInPresets[key].role;
    for (const field of ["strength", "personnel", "rosterOnly", "equipment", "estimated"]) delete unit[field];
  }
  document.folded = [...new Set([...(document.folded ?? []).filter(id => !removed.has(id)), ...roots])];
  if (document.expansionLocks) document.expansionLocks = document.expansionLocks.filter(id => !removed.has(id));
  if (document.stacks) document.stacks = Object.fromEntries(Object.entries(document.stacks)
    .filter(([id]) => !removed.has(id) && !roots.has(id))
    .map(([id, members]) => [id, members.filter(member => !removed.has(member) && !roots.has(member))])
    .filter(([, members]) => members.length > 1));
  document.supportEquipmentVersion = 1;
  return true;
}

function migrateNewFourthDirectUnits(document) {
  if (!document.referenceNewFourthArmy || document.directUnitsVersion >= 1) return false;
  const definitions = newFourthDirectPresets();
  const identities = {
    "new-fourth-army-hq":"n4-direct-hq", "n4-general-staff":"n4-direct-staff",
    "n4-political":"n4-direct-political", "n4-field-service":"n4-direct-field-service",
    "n4-school":"n4-direct-school", "n4-logistics":"n4-direct-logistics",
  };
  for (const [id, key] of Object.entries(identities)) {
    const previous = document.units.find(unit => unit.id === id);
    for (const role of definitions[key].personnel ?? []) {
      const named = previous?.personnel?.find(entry => entry.role.split(/\s+/)[0] === role.role);
      if (named) role.role = named.role;
    }
  }
  const targets = document.units.filter(unit => newFourthDirectBranches[unit.id]);
  const roots = new Set(targets.map(unit => unit.id));
  const removed = new Set();
  let pending = [...roots];
  while (pending.length) {
    const parents = new Set(pending);
    pending = document.units.filter(unit => parents.has(unit.parent) && !roots.has(unit.id) && !removed.has(unit.id)).map(unit => unit.id);
    pending.forEach(id => removed.add(id));
  }
  document.units = document.units.filter(unit => !removed.has(unit.id));
  const snapshot = "new-fourth-direct-v1";
  document.recipes ??= {};
  document.recipes[snapshot] = definitions;
  for (const unit of targets) {
    const key = newFourthDirectBranches[unit.id];
    const definition = definitions[key];
    for (const field of ["strength", "personnel", "rosterOnly", "equipment"]) delete unit[field];
    Object.assign(unit, { type: definition.type, rank: definition.rank, role: definition.role, estimated: true, recipe:{snapshot,key} });
    if (definition.strength) unit.strength = [...definition.strength];
    if (definition.personnel) unit.personnel = structuredClone(definition.personnel);
  }
  document.folded = [...new Set([...(document.folded ?? []).filter(id => !removed.has(id)), ...roots])];
  if (document.expansionLocks) document.expansionLocks = document.expansionLocks.filter(id => !removed.has(id));
  if (document.stacks) document.stacks = Object.fromEntries(Object.entries(document.stacks)
    .filter(([id]) => !removed.has(id) && !roots.has(id))
    .map(([id, ids]) => [id, ids.filter(member => !removed.has(member) && !roots.has(member))])
    .filter(([, ids]) => ids.length > 1));
  document.directUnitsVersion = 1;
  return true;
}

function addDefaultHeadquarters(definition, key, catalog) {
  const headquarters = `${key}-hq`;
  const defaults = builtInPresets[key]?.parts;
  const parts = definition?.parts;
  if (defaults?.length !== 2 || defaults[0][0] !== headquarters || parts?.length !== 1) return false;
  const [child, count] = parts[0];
  const oldBattalion = key === "form-battalion" && child === "form-company";
  if (child !== defaults[1][0] && !oldBattalion) return false;
  if (oldBattalion && definition.name === "营" && definition.type === "general") {
    definition.name = builtInPresets[key].name;
    definition.type = builtInPresets[key].type;
  }
  definition.parts = [[headquarters, 1], [defaults[1][0], count]];
  if (catalog && !catalog[headquarters]) catalog[headquarters] = structuredClone(builtInPresets[headquarters]);
  return true;
}

function migrateInfantryHeadquarters(document) {
  if (document.headquartersVersion) return document;
  document.headquartersVersion = 1;
  const recipe = document.recipes?.[infantryExampleId];
  if (recipe) {
    for (const key of ["form-company", "form-platoon"]) addDefaultHeadquarters(recipe[key], key, recipe);
  }
  const root = document.units.find((unit) => unit.id === "infantry-company");
  if (!root) return document;
  const parents = [root, ...document.units.filter((unit) => unit.parent === root.id && unit.rank === "platoon" && unit.type !== "headquarters")];
  for (const parent of parents) {
    if (recipeOf(parent, document) || document.units.some((unit) => unit.parent === parent.id && unit.type === "headquarters")) continue;
    const definition = builtInPresets[parent === root ? "form-company-hq" : "form-platoon-hq"];
    const x = parent.x + 56;
    let y = parent.y + 80;
    if (document.manualLayout) {
      while (document.units.some((unit) => Math.abs(unit.x - x) < 112 && Math.abs(unit.y - y) < 76)) y += 80;
    } else {
      for (const unit of document.units) if (unit.y >= y) unit.y += 80;
    }
    const headquarters = makePresetUnit(definition, x, y, parent.id);
    headquarters.id = `${parent.id}-headquarters`;
    document.units.splice(document.units.indexOf(parent) + 1, 0, headquarters);
  }
  return document;
}
