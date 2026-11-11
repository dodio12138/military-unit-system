"use strict";

const $ = (id) => document.getElementById(id);
const stage = $("stage");
const unitsLayer = $("units");
function readStorage(key) {
  try {
    return JSON.parse(localStorage.getItem(key));
  } catch {
    return null;
  }
}

function isChart(value) {
  return value && typeof value.title === "string" && Array.isArray(value.units);
}

function readPresetOverrides() {
  const overrides = readStorage(presetStorageKey) ?? {};
  let migrated = false;
  for (const [key, preset] of Object.entries(overrides)) {
    if (migrateDefaultStrength(preset, key)) migrated = true;
    if (addDefaultHeadquarters(preset, key)) migrated = true;
  }
  if (migrated) {
    try { localStorage.setItem(presetStorageKey, JSON.stringify(overrides)); } catch { /* Use the migrated values in memory. */ }
  }
  return overrides;
}

function readLibrary() {
  const stored = readStorage(storageKey);
  if (!Array.isArray(stored?.charts)) return null;
  const removed = new Set(Array.isArray(stored.removed) ? stored.removed : []);
  const charts = stored.charts.filter((item) => isChart(item) && typeof item.id === "string" && !removed.has(item.id))
    .map((item) => {
      migrateChartStrength(item);
      if (item.id === battalionExampleId || item.referenceComplete) migrateCommandGuards(item);
      if (item.reference) migrateReferenceLayout(item);
      migrateSupportEquipment(item);
      migrateNewFourthDirectUnits(item);
      return item.id === infantryExampleId ? migrateInfantryHeadquarters(item) : item;
    });
  for (const [id, create] of additionalExamples) {
    if (!removed.has(id) && !charts.some((item) => item.id === id)) charts.push(create());
  }
  if (!charts.length) return null;
  const activeId = charts.some((item) => item.id === stored.activeId) ? stored.activeId : charts[0].id;
  return { activeId, charts, removed: [...removed] };
}

function loadLibrary() {
  const stored = readLibrary();
  if (stored) return stored;
  const example = exampleChart();
  const charts = [example, ...additionalExamples.map(([, create]) => create())];
  const legacy = readStorage(legacyKey);
  if (isChart(legacy) && JSON.stringify(legacy) !== JSON.stringify(previousExample())) {
    return { activeId: "legacy", charts: [migrateChartStrength({ ...legacy, id: "legacy" }), ...charts] };
  }
  return { activeId: example.id, charts };
}

function makeId() {
  return crypto.randomUUID?.() ?? `local-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

const stockGuardTree = JSON.stringify(presetTree(builtInPresets, "form-guard-company"));
let library = loadLibrary();
const requestedChartId = new URLSearchParams(location.search).get("chart");
let chart = library.charts.find((item) => item.id === requestedChartId)
  ?? library.charts.find((item) => item.id === library.activeId);
let selectedId = null;
let activeTab = "preset";
let placement = null;
let tool = "select";
let spaceHeld = false;
let gesture = null;
let targetElement = null;
let visibleUnits = [];
let displayedStacks = new Map();
let paletteMode = "formation";
let presetEdit = null;
let presetOverrides = readPresetOverrides();
let presets = { ...builtInPresets, ...presetOverrides };
const histories = new Map();
const unsavedCharts = new Map();
const presetDrafts = new Map();
const view = { x: 0, y: 0, scale: 1 };
const minScale = .1;
const maxScale = 2;
let lastSize = null;

function announce(message) {
  $("announcement").textContent = message;
}

function editorFeedback(message) {
  $("canvas-tip").textContent = message;
  $("canvas-tip").classList.add("is-feedback");
  announce(message);
}

function historyForChart() {
  if (!histories.has(chart.id)) histories.set(chart.id, { past: [], future: [] });
  return histories.get(chart.id);
}

function refreshLibrary() {
  const saved = readLibrary();
  const removed = new Set([...(library.removed ?? []), ...(saved?.removed ?? [])]);
  const records = new Map((saved?.charts ?? library.charts).map((item) => [item.id, item]));
  for (const [id, item] of unsavedCharts) records.set(id, item);
  for (const id of removed) records.delete(id);
  const order = [...library.charts.map((item) => item.id), ...records.keys()];
  const charts = [...new Set(order)].map((id) => records.get(id)).filter(Boolean);
  library = { activeId: records.has(chart.id) ? chart.id : (saved?.activeId ?? charts[0]?.id), charts, removed: [...removed] };
}

function save(changed = null) {
  if (presetEdit) {
    if (changed) presetDrafts.set(presetEdit.token, changed);
    $("save-text").textContent = "预设草稿";
    $("save-status").classList.remove("save-failed");
    return;
  }
  if (changed) unsavedCharts.set(changed.id, changed);
  refreshLibrary();
  if (!library.charts.some((item) => item.id === chart.id)) {
    $("save-text").textContent = "此编制已被删除";
    $("save-status").classList.add("save-failed");
    return;
  }
  try {
    localStorage.setItem(storageKey, JSON.stringify(library));
    unsavedCharts.clear();
    $("save-text").textContent = "已保存在此浏览器";
    $("save-status").classList.remove("save-failed");
  } catch {
    $("save-text").textContent = "浏览器存储不可用";
    $("save-status").classList.add("save-failed");
  }
}

function commit(update) {
  if ($("canvas-tip").classList.contains("is-feedback")) setPlacement(placement);
  const { past, future } = historyForChart();
  past.push(structuredClone(chart));
  if (past.length > 60) past.shift();
  future.length = 0;
  update();
  chart.stacks = Object.fromEntries(validStacks());
  save(chart);
  render();
}

function restore(redo = false) {
  const { past, future } = historyForChart();
  const [from, to] = redo ? [future, past] : [past, future];
  if (!from.length) return;
  to.push(chart);
  chart = from.pop();
  setPlacement(null);
  save(chart);
  render();
  if (!chart.units.length || !anyUnitVisible()) fitView();
}

function anyUnitVisible() {
  return visibleUnits.some(isUnitVisible);
}

function isUnitVisible(unit) {
  const projected = projectPoint(unit, displayMode);
  const x = projected.x * view.scale + view.x;
  const y = projected.y * view.scale + view.y;
  return x >= 38 * view.scale && y >= 42 * view.scale
    && x <= stage.clientWidth - 38 * view.scale && y <= stage.clientHeight - (chart.showComposition ? 88 : 56) * view.scale;
}

function getUnit(id) {
  return chart.units.find((unit) => unit.id === id);
}

function descendants(id) {
  const children = new Set([id]);
  const queue = [id];
  while (queue.length) {
    const parent = queue.pop();
    for (const unit of chart.units) {
      if (unit.parent === parent && !children.has(unit.id)) {
        children.add(unit.id);
        queue.push(unit.id);
      }
    }
  }
  return children;
}

function recipeOf(unit, document = chart) {
  return unit.recipe ? document.recipes?.[unit.recipe.snapshot] : null;
}

function hasDeferredChildren(unit, document = chart) {
  return Boolean(recipeOf(unit, document)?.[unit.recipe.key]?.parts?.length);
}

function defaultPresetKey(rank, type) {
  const specialized = `form-${type}-${rank}`;
  if (Object.hasOwn(builtInPresets, specialized)) return specialized;
  return ({ none: "form-staff", fieldArmy: "form-field-army", armyGroup: "form-army-group" })[rank] ?? `form-${rank}`;
}

function isBasicRank(rank) {
  return rank === "team" || rank === "squad" || rank === "none";
}

function isStaffedLeaf(unit) {
  return (isBasicRank(unit.rank) || unit.type === "headquarters") && fixedStrength(unit.strength);
}

function supportsPersonnel(unit) {
  return unit?.type === "headquarters" || Boolean(unit?.equipment) || Boolean(unit?.personnel?.length);
}

function validEquipment(unit) {
  return !unit.equipment || (equipmentKinds[unit.equipment.kind] && unit.equipment.kind === unit.type
    && unit.rank === "team" && !unit.parts?.length && unit.personnel?.length
    && fixedStrength(unit.strength) && personnelTotal(unit.personnel) === unit.strength[0]);
}

function staffedPreset(definitions, key, memo = new Map()) {
  if (memo.has(key)) return memo.get(key);
  const preset = definitions[key];
  if (!validEquipment(preset)) return false;
  if (preset.strength && !fixedStrength(preset.strength)) return false;
  const staffed = preset.parts?.length
    ? preset.parts.every(([child]) => staffedPreset(definitions, child, memo))
    : isStaffedLeaf(preset);
  memo.set(key, staffed);
  return staffed;
}

function canRemoveFromParent(unit) {
  if (!unit.parent) return true;
  const parent = getUnit(unit.parent);
  return !parent || hasDeferredChildren(parent) || chart.units.some((other) => other.parent === parent.id && other.id !== unit.id)
    || isStaffedLeaf(parent);
}

function documentSize(document) {
  let size = document.units.length;
  for (const unit of document.units) {
    const recipe = recipeOf(unit, document);
    if (recipe) size += presetStats(recipe, unit.recipe.key).size - 1;
  }
  return size;
}

function strengthText(people) {
  return `${people.toLocaleString()} 人`;
}

function strengthSummary(stat) {
  if (!stat.known) return "待定员";
  return `${stat.incomplete ? "已录入 " : ""}${strengthText(stat.people)}${stat.estimated ? "（含推定）" : ""}`;
}

function strengthOf(unit, byParent) {
  const recipe = recipeOf(unit);
  if (recipe) {
    const { key } = unit.recipe;
    return presetStats({ ...recipe, [key]: { ...recipe[key], strength: unit.strength, personnel: unit.personnel, estimated: unit.estimated ?? recipe[key].estimated } }, key);
  }
  const children = byParent.get(unit.id) ?? [];
  const known = !unit.rosterOnly && fixedStrength(unit.strength);
  const stat = {
    people: known ? unit.strength[0] : 0,
    equipment: ownEquipment(unit),
    officers: unit.rosterOnly ? 0 : officerTotal(unit.personnel),
    known, incomplete: Boolean(unit.rosterOnly) || (!known && (Boolean(unit.strength) || !children.length)),
    estimated: Boolean(unit.estimated),
  };
  for (const child of children) {
    const nested = strengthOf(child, byParent);
    stat.people += nested.people;
    addEquipment(stat.equipment, nested.equipment);
    stat.officers += nested.officers;
    stat.estimated ||= nested.estimated;
    stat.known ||= nested.known;
    stat.incomplete ||= nested.incomplete;
  }
  return stat;
}

function compositionOf(unit, byParent) {
  const recipe = recipeOf(unit);
  const parts = recipe?.[unit.recipe.key]?.parts ?? [];
  const children = byParent.get(unit.id) ?? [];
  const names = new Map();
  for (const [name, quantity] of parts.length ? parts.map(([key, count]) => [recipe[key].name, count])
    : children.map((child) => [child.name.replace(/ \d+$/, ""), 1])) {
    names.set(name, (names.get(name) ?? 0) + quantity);
  }
  const breakdown = names.size <= 2 ? [...names].map(([name, count]) => `${count} 个${name}`).join(" · ")
    : `${[...names.values()].reduce((sum, count) => sum + count, 0)} 个直属下级`;
  const stat = strengthOf(unit, byParent);
  return {
    children: breakdown,
    strength: unit.estimated && stat.known ? `推定 ${strengthText(stat.people)}` : strengthSummary(stat),
  };
}

function personnelSignature(personnel) {
  const counts = new Map();
  for (const entry of personnel ?? []) {
    const role = entry.role.trim().split(/\s+/)[0];
    const key = JSON.stringify([role, Boolean(entry.officer)]);
    counts.set(key, (counts.get(key) ?? 0) + entry.count);
  }
  return JSON.stringify([...counts].sort(([a], [b]) => a.localeCompare(b)));
}

function sameStackKind(a, b) {
  return a.parent === b.parent && a.type === b.type && a.rank === b.rank
    && a.equipment?.kind === b.equipment?.kind
    && String(a.strength ?? "") === String(b.strength ?? "")
    && Boolean(a.estimated) === Boolean(b.estimated)
    && Boolean(a.rosterOnly) === Boolean(b.rosterOnly)
    && personnelSignature(a.personnel) === personnelSignature(b.personnel);
}

function stackSignature(children, document = chart) {
  const interned = new Map();
  const units = new Map();
  const recipes = new WeakMap();
  function signature(item, parts) {
    const counts = new Map();
    for (const [id, count] of parts) counts.set(id, (counts.get(id) ?? 0) + count);
    const key = JSON.stringify([
      item.type, item.rank, item.strength || null, personnelSignature(item.personnel),
      item.equipment?.kind ?? null,
      Boolean(item.estimated), Boolean(item.rosterOnly),
      [...counts].sort(([a], [b]) => a - b),
    ]);
    if (!interned.has(key)) interned.set(key, interned.size + 1);
    return interned.get(key);
  }
  function presetParts(recipe, key) {
    if (!recipes.has(recipe)) recipes.set(recipe, new Map());
    const cache = recipes.get(recipe);
    return (recipe[key].parts ?? []).map(([part, count]) => {
      if (!cache.has(part)) cache.set(part, signature(recipe[part], presetParts(recipe, part)));
      return [cache.get(part), count];
    });
  }
  function identify(unit) {
    if (units.has(unit.id)) return units.get(unit.id);
    const recipe = recipeOf(unit, document);
    const parts = recipe ? presetParts(recipe, unit.recipe.key)
      : (children.get(unit.id) ?? []).map((child) => [identify(child), 1]);
    const id = signature(unit, parts);
    units.set(unit.id, id);
    return id;
  }
  return identify;
}

function validStacks(document = chart) {
  const stacks = new Map();
  const entries = Object.entries(document.stacks ?? {});
  if (!entries.length) return stacks;
  const children = indexChildren(document);
  const identify = stackSignature(children, document);
  const byId = new Map(document.units.map((unit) => [unit.id, unit]));
  for (const [id, memberIds] of entries) {
    const leader = byId.get(id);
    if (!leader) continue;
    const branch = children.has(id) || hasDeferredChildren(leader, document);
    const members = memberIds.filter((memberId) => {
      const member = byId.get(memberId);
      if (!member || !sameStackKind(leader, member)) return false;
      if (branch) return identify(leader) === identify(member);
      return !children.has(memberId) && !hasDeferredChildren(member, document);
    });
    if (members.length > 1) stacks.set(id, members);
  }
  return stacks;
}

function indexChildren(document = chart) {
  const children = new Map();
  for (const unit of document.units) {
    if (!children.has(unit.parent)) children.set(unit.parent, []);
    children.get(unit.parent).push(unit);
  }
  return children;
}

function visibleProjection(stacks = displayedStacks, document = chart) {
  const hidden = new Set();
  const children = indexChildren(document);
  for (const id of document.folded ?? []) {
    for (const child of children.get(id) ?? []) hidden.add(child.id);
  }
  for (const [leader, ids] of stacks) {
    for (const id of ids) if (id !== leader) hidden.add(id);
    for (const child of children.get(leader) ?? []) hidden.add(child.id);
  }
  for (const id of hidden) {
    for (const child of children.get(id) ?? []) hidden.add(child.id);
  }
  return { units: document.units.filter((unit) => !hidden.has(unit.id)), children };
}

function expansionLocks() {
  const roots = new Set(chart.expansionLocks);
  const frozen = new Set(roots);
  const ancestors = new Set();
  if (!roots.size) return { roots, frozen, ancestors };
  const byId = new Map(chart.units.map((unit) => [unit.id, unit]));
  const children = indexChildren();
  for (const id of roots) {
    for (const peer of displayedStacks.get(id) ?? []) frozen.add(peer);
    for (let parent = byId.get(byId.get(id)?.parent); parent; parent = byId.get(parent.parent)) ancestors.add(parent.id);
  }
  for (const id of frozen) {
    for (const child of children.get(id) ?? []) frozen.add(child.id);
    for (const peer of displayedStacks.get(id) ?? []) frozen.add(peer);
  }
  return { roots, frozen, ancestors };
}

function stackPeers(unit) {
  const { frozen, ancestors } = expansionLocks();
  if (frozen.has(unit.id) || ancestors.has(unit.id)) return [];
  if (displayedStacks.has(unit.id)) return displayedStacks.get(unit.id);
  const candidates = branchEndUnits(new Set([...frozen, ...ancestors]));
  if (!candidates.some((item) => item.id === unit.id)) return [];
  const identify = stackSignature(indexChildren());
  const signature = identify(unit);
  const stacked = new Set([...displayedStacks.values()].flat());
  return candidates.filter((peer) => !stacked.has(peer.id) && sameStackKind(unit, peer) && identify(peer) === signature)
    .map((peer) => peer.id);
}

function toggleStack(id) {
  const unit = getUnit(id);
  if (!unit) return;
  const members = stackPeers(unit);
  if (members.length < 2) return;
  const stacked = displayedStacks.has(id);
  commit(() => {
    chart.stacks ??= {};
    if (stacked) delete chart.stacks[id];
    else chart.stacks[id] = members;
    reflowComposition();
  });
  announce(stacked ? `已展开 ${members.length} 枚兵牌` : `已叠放 ${members.length} 枚同类兵牌`);
}

function toggleBranch(id) {
  const { frozen, ancestors } = expansionLocks();
  if (frozen.has(id) || ancestors.has(id)) return;
  const unit = getUnit(id);
  const folded = new Set(chart.folded);
  const deferred = hasDeferredChildren(unit);
  const opening = folded.delete(id) || deferred;
  if (!opening) folded.add(id);
  commit(() => {
    chart.folded = [...folded];
    if (deferred) materializeChildren(unit);
    reflowComposition();
  });
  if (isReferenceBranch(unit) || (chart.showComposition && visibleUnits.length === 1)) fitView();
  else if (chart.showComposition) {
    reveal(unit);
    const first = visibleUnits.find((child) => child.parent === id);
    if (opening && first && !isUnitVisible(first)) reveal(first);
  } else if (opening && chart.units.some((child) => child.parent === id && !isUnitVisible(child))) fitView();
  announce(opening ? `已展开${unit.name}的下级` : `已收起${unit.name}的下级`);
}

function reflowComposition() {
  if (chart.reference && !chart.manualLayout) return arrangeReference(chart);
  if ((!chart.showComposition && !chart.verticalLayout) || chart.manualLayout) return;
  const { units, children } = visibleProjection(validStacks());
  const visible = new Set(units.map((unit) => unit.id));
  let row = 0;
  function visit(unit, depth) {
    if (!visible.has(unit.id)) return;
    unit.x = depth * 56;
    unit.y = row++ * (chart.showComposition ? 80 : 108);
    if (!chart.showComposition) unit.connector = "vertical-tree";
    for (const child of children.get(unit.id) ?? []) visit(child, depth + 1);
  }
  for (const root of children.get(null) ?? []) visit(root, 0);
}

function unitLevel(unit, byId) {
  let depth = 0;
  for (let parent = byId.get(unit.parent); parent && depth < byId.size; parent = byId.get(parent.parent)) depth++;
  return depth;
}

function nextLayer() {
  const { frozen } = expansionLocks();
  const folded = new Set(chart.folded);
  const byId = new Map(chart.units.map((unit) => [unit.id, unit]));
  let depth = Infinity;
  let layer = [];
  for (const unit of visibleUnits) {
    if (frozen.has(unit.id)) continue;
    if (!folded.has(unit.id) && !hasDeferredChildren(unit) && !displayedStacks.has(unit.id)) continue;
    const level = unitLevel(unit, byId);
    if (level < depth) {
      depth = level;
      layer = [];
    }
    if (level === depth) layer.push(unit);
  }
  return layer;
}

function branchEndUnits(excluded = new Set()) {
  const visibleParents = new Set(visibleUnits.map((unit) => unit.parent));
  return visibleUnits.filter((unit) => !visibleParents.has(unit.id) && !excluded.has(unit.id));
}

function deepestVisibleParents() {
  const { frozen, ancestors } = expansionLocks();
  const byId = new Map(visibleUnits.map((unit) => [unit.id, unit]));
  let depth = 0;
  const parents = new Set();
  for (const unit of visibleUnits) {
    if (!unit.parent || frozen.has(unit.parent) || ancestors.has(unit.parent)) continue;
    const level = unitLevel(unit, byId);
    if (level < depth) continue;
    if (level > depth) parents.clear();
    depth = level;
    parents.add(unit.parent);
  }
  return parents;
}

function collapseLayer() {
  const parents = deepestVisibleParents();
  if (!parents.size) return;
  commit(() => {
    chart.folded = [...new Set([...(chart.folded ?? []), ...parents])];
    reflowComposition();
  });
  fitView();
  announce("已叠起一层");
}

function expandLayer() {
  const layer = nextLayer();
  if (!layer.length) return;
  const byParent = indexChildren();
  const count = layer.reduce((total, unit) => {
    if (displayedStacks.has(unit.id)) return total + displayedStacks.get(unit.id).length;
    const recipe = recipeOf(unit);
    const deferred = recipe?.[unit.recipe.key]?.parts ?? [];
    return total + (deferred.length ? deferred.reduce((sum, [, count]) => sum + count, 0) : byParent.get(unit.id)?.length ?? 0);
  }, 0);
  if (count + visibleUnits.length > maxFullExpansion) return editorFeedback("这一层单位较多，请分支展开");
  commit(() => {
    const opening = new Set();
    for (const unit of layer) {
      if (displayedStacks.has(unit.id)) delete chart.stacks[unit.id];
      else {
        opening.add(unit.id);
        materializeChildren(unit);
      }
    }
    chart.folded = chart.folded?.filter((id) => !opening.has(id));
    reflowComposition();
  });
  fitView();
  announce("已展开一层");
}

function expandedSize(frozen) {
  const visible = new Set(visibleUnits.map((unit) => unit.id));
  return chart.units.reduce((size, unit) => {
    if (frozen.has(unit.id)) return size + Number(visible.has(unit.id));
    const recipe = recipeOf(unit);
    return size + (recipe ? presetStats(recipe, unit.recipe.key).size : 1);
  }, 0);
}

function expandAll() {
  const { frozen } = expansionLocks();
  const size = expandedSize(frozen);
  if (size <= visibleUnits.length || size > maxFullExpansion) return;
  commit(() => {
    chart.folded = (chart.folded ?? []).filter((id) => frozen.has(id));
    chart.stacks = Object.fromEntries([...displayedStacks].filter(([id]) => frozen.has(id)));
    for (const unit of chart.units) if (!frozen.has(unit.id)) materializeChildren(unit);
    reflowComposition();
  });
  fitView();
  announce("已展开全部层级");
}

function stackIdentical() {
  const { frozen, ancestors } = expansionLocks();
  const children = indexChildren();
  const identify = stackSignature(children);
  const stacked = new Set([...displayedStacks.values()].flat());
  const groups = new Map();
  for (const unit of branchEndUnits(new Set([...frozen, ...ancestors]))) {
    if (stacked.has(unit.id)) continue;
    const key = JSON.stringify([unit.parent, identify(unit)]);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(unit.id);
  }
  const matching = [...groups.values()].filter((group) => group.length > 1);
  if (!matching.length) return editorFeedback("各分支当前末层没有可叠放的同类单位");
  commit(() => {
    chart.stacks ??= {};
    for (const ids of matching) chart.stacks[ids[0]] = ids;
    reflowComposition();
  });
  fitView();
  announce(`已叠放 ${matching.length} 组同类单位`);
}

function expandAncestors(parent) {
  const folded = new Set(chart.folded);
  if (!folded.size) return;
  for (let unit = getUnit(parent); unit; unit = getUnit(unit.parent)) folded.delete(unit.id);
  chart.folded = [...folded];
}

function chartDepth() {
  const byId = new Map(chart.units.map((unit) => [unit.id, unit]));
  let max = 0;
  for (const unit of chart.units) {
    const recipe = recipeOf(unit);
    let depth = recipe ? presetStats(recipe, unit.recipe.key).depth : 1;
    let current = unit;
    for (let steps = 0; current.parent && byId.has(current.parent) && steps < byId.size; steps++) {
      depth++;
      current = byId.get(current.parent);
    }
    max = Math.max(max, depth);
  }
  return max;
}

function plateCaption(unit, stacked = false) {
  if (unit.plateLabel) return unit.plateLabel;
  const battalion = /^(步兵|教导)营 ([1-3])$/.exec(unit.name);
  if (unit.plateLabel === "" && unit.rank === "battalion" && battalion) {
    return stacked ? `${battalion[1]}营` : `第${battalion[2]}营`;
  }
  return unit.name === "师部指挥部" ? "师部" : unit.name;
}

function isReferenceBranch(unit, document = chart) {
  if (document.referenceNewFourthArmy) {
    return unit.parent === "new-fourth-army" && /^n4-detachment-[1-4]$/.test(unit.id);
  }
  return document.referenceArmy && unit.parent === "eighth-route-army" && /^(115|120|129):\1$/.test(unit.id);
}

function unitElement(unit, composition, children) {
  const node = document.createElement("button");
  const count = displayedStacks.get(unit.id)?.length ?? 0;
  node.type = "button";
  node.className = unit.parent ? "unit" : "unit root";
  node.classList.toggle("reference-root", unit.connector === "reference-root");
  node.classList.toggle("label-right", unit.plateLabel !== undefined);

  node.classList.toggle("has-composition", Boolean(composition));
  node.dataset.id = unit.id;
  node.style.left = `${unit.x}px`;
  node.style.top = `${unit.y}px`;
  const locked = chart.expansionLocks?.includes(unit.id);

  const rank = unit.rank === "none" ? "" : `，${ranks[unit.rank].name}级`;
  const details = composition ? [composition.children, composition.strength].filter(Boolean) : [];
  if (!composition && unit.estimated) details.push(`推定 ${strengthText(strengthOf(unit, children).people)}`);
  else if (!composition && unit.strength && !unit.rosterOnly) details.push(fixedStrength(unit.strength) ? strengthText(unit.strength[0]) : "待定员");
  const stackDescription = count > 1 ? [`${count} 枚叠牌`] : [];
  node.setAttribute("aria-label", [`${unit.name}，${types[unit.type].name}${rank}`, ...details, ...stackDescription, ...(locked ? ["展开已锁定"] : [])].join("，"));
  node.setAttribute("aria-pressed", String(unit.id === selectedId));
  node.innerHTML = `<span class="unit-rank">${rankMark(unit.rank)}</span>${symbol(unit.type, count > 1)}<span class="unit-label"></span>`;
  const label = plateCaption(unit, count > 1);
  node.lastElementChild.textContent = unit.equipment && label
    ? `${label} · 1${equipmentKinds[unit.equipment.kind].unit}` : label;
  node.lastElementChild.hidden = !label;
  if (isReferenceBranch(unit) && children.has(unit.id)) {
    const closed = chart.folded?.includes(unit.id);
    node.setAttribute("aria-expanded", String(!closed));

    const indicator = document.createElement("span");
    indicator.className = "unit-disclosure";
    indicator.innerHTML = icon("chevron");
    node.append(indicator);
  }
  if (locked) {
    const indicator = document.createElement("span");
    indicator.className = "unit-lock";
    indicator.innerHTML = icon("lock");
    node.append(indicator);
  }
  if (count > 1) {
    const quantity = document.createElement("span");
    quantity.className = "stack-count";
    quantity.setAttribute("aria-hidden", "true");
    quantity.textContent = `×${count}`;
    node.append(quantity);
  }
  return node;
}

function sideHeadquarters(parent, child) {
  return child.type === "headquarters" && (child.connector === "stem" || child.rank === "none" || child.rank !== parent.rank);
}

function linkPath(parent, child) {
  if ((chart.showComposition || child.connector === "vertical-tree") && child.x - parent.x === 56 && child.y > parent.y + 44) {
    return `M ${parent.x - 37} ${parent.y + 24} V ${child.y} H ${child.x - 38}`;
  }
  const start = parent.y + (parent.strength && !chart.showComposition ? 68 : 48);
  const bus = parent.y + (parent.busOffset ?? 160);
  if (sideHeadquarters(parent, child) && child.x > parent.x + 68 && child.y > start && child.y < bus) {
    return `M ${parent.x} ${start - 4} V ${child.y} H ${child.x - 44}`;
  }
  if (child.connector === "bus" && child.y > bus + 52) {
    return `M ${parent.x} ${start - 4} V ${bus} H ${child.x} V ${child.y - 52}`;
  }
  if (child.connector === "right-rail" && child.x > parent.x + 104 && child.y > bus) {
    const rail = child.x - 62;
    return `M ${parent.x} ${start - 4} V ${bus} H ${rail} V ${child.y} H ${child.x - 44}`;
  }
  if (child.connector === "left-rail" && child.y > parent.y + 64 && child.x - parent.x === 24) {
    const rail = parent.x - 37;
    return `M ${rail} ${parent.y + 23} V ${child.y} H ${child.x - 44}`;
  }
  if (child.y >= parent.y + 100 && Math.abs(parent.x - child.x) < 56 && Math.abs(parent.x - child.x) > 1) {
    const rail = Math.min(parent.x, child.x) - 60;
    return `M ${parent.x} ${start} v 12 H ${rail} V ${child.y} H ${child.x - 38}`;
  }
  if (child.y > parent.y + 96) {
    const elbow = parent.y + 76;
    return `M ${parent.x} ${start} V ${elbow} H ${child.x} V ${child.y - 42}`;
  }
  const direction = child.x >= parent.x ? 1 : -1;
  const fromX = parent.x + direction * 38;
  const toX = child.x - direction * 38;
  const elbow = (fromX + toX) / 2;
  return `M ${fromX} ${parent.y} H ${elbow} V ${child.y} H ${toX}`;
}

function drawLinks(movingIds, dx = 0, dy = 0) {
  const byId = new Map(visibleUnits.map((unit) => {
    const position = movingIds?.has(unit.id) ? { ...unit, x: unit.x + dx, y: unit.y + dy } : unit;
    return [unit.id, position];
  }));
  const paths = [];
  for (const child of byId.values()) {
    const parent = byId.get(child.parent);
    if (!parent) continue;
    const path = document.createElementNS(svgNamespace, "path");
    path.setAttribute("d", linkPath(parent, child));
    paths.push(path);
  }
  $("connections").replaceChildren(...paths);
}

function svgElement(name, attributes, text) {
  const node = document.createElementNS(svgNamespace, name);
  for (const [key, value] of Object.entries(attributes)) node.setAttribute(key, value);
  if (text !== undefined) node.textContent = text;
  return node;
}

function saveChartImage() {
  if (!visibleUnits.length) return;
  const previousTransform = $("world").style.transform;
  $("world").style.transform = `translate(${view.x}px, ${view.y}px) scale(${view.scale})`;
  try {
    const origin = $("world").getBoundingClientRect();
    const background = getComputedStyle(stage).getPropertyValue("--board").trim();
    const chartTitle = getComputedStyle($("chart-title"));
    const artwork = svgElement("g", { "font-family": getComputedStyle(unitsLayer).fontFamily });
    const bounds = { left: Infinity, top: Infinity, right: -Infinity, bottom: -Infinity };

    function include(x, y, width, height) {
      bounds.left = Math.min(bounds.left, x);
      bounds.top = Math.min(bounds.top, y);
      bounds.right = Math.max(bounds.right, x + width);
      bounds.bottom = Math.max(bounds.bottom, y + height);
    }

    function position(element) {
      const rect = element.getBoundingClientRect();
      const x = (rect.left - origin.left) / view.scale;
      const y = (rect.top - origin.top) / view.scale;
      const width = rect.width / view.scale;
      const height = rect.height / view.scale;
      include(x, y, width, height);
      return { x, y, width, height };
    }

    const textMeasure = document.createElement("canvas").getContext("2d");

    function drawText(parent, element, content, box) {
      if (!content.trim()) return;
      const { x, y, width, height } = box;
      const style = getComputedStyle(element);
      const leftAligned = style.textAlign === "left" || style.textAlign === "start";
      if (style.textOverflow === "ellipsis" && textMeasure) {
        const available = Math.max(0, width - (parseFloat(style.paddingLeft) || 0) - (parseFloat(style.paddingRight) || 0));
        textMeasure.font = `${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
        if (textMeasure.measureText(content).width > available) {
          const characters = Array.from(content);
          while (characters.length && textMeasure.measureText(characters.join("") + "…").width > available) characters.pop();
          content = textMeasure.measureText("…").width <= available ? characters.join("") + "…" : "";
        }
      }
      parent.append(svgElement("text", {
        x: leftAligned ? x + (parseFloat(style.paddingLeft) || 0) : x + width / 2,
        y: y + height / 2,
        "text-anchor": leftAligned ? "start" : "middle",
        "dominant-baseline": "central",
        "font-size": style.fontSize,
        "font-weight": style.fontWeight,
        fill: style.color,
      }, content));
    }

    for (const line of $("connections").children) {
      const { x, y, width, height } = line.getBBox();
      const style = getComputedStyle(line);
      include(x, y, width, height);
      artwork.append(svgElement("path", {
        d: line.getAttribute("d"), fill: "none", stroke: style.stroke, "stroke-width": style.strokeWidth,
        "stroke-linejoin": style.strokeLinejoin,
      }));
    }
    for (const card of unitsLayer.children) {
      const group = svgElement("g", { "data-unit-id": card.dataset.id });
      for (const glyph of card.querySelectorAll(".rank-mark, .unit-symbol")) {
        const shape = glyph.cloneNode(true);
        for (const [name, value] of Object.entries(position(glyph))) shape.setAttribute(name, value);
        shape.setAttribute("color", getComputedStyle(glyph).color);
        shape.setAttribute("overflow", "visible");
        const originals = glyph.querySelectorAll("g, rect, path, circle, ellipse");
        const copies = shape.querySelectorAll("g, rect, path, circle, ellipse");
        originals.forEach((part, index) => {
          const style = getComputedStyle(part);
          for (const property of ["fill", "stroke", "stroke-width", "stroke-linecap", "stroke-linejoin"]) {
            copies[index].setAttribute(property, style.getPropertyValue(property));
          }
        });
        group.append(shape);
      }
      const label = card.querySelector(".unit-label");
      if (!label.hidden) {
        const box = position(label);
        const name = label.firstChild?.nodeType === Node.TEXT_NODE ? label.firstChild.textContent : "";
        const lineHeight = parseFloat(getComputedStyle(label).lineHeight);
        drawText(group, label, name, { ...box, height: lineHeight });
        for (const detail of label.children) drawText(group, detail, detail.textContent, position(detail));
      }
      const quantity = card.querySelector(".stack-count");
      if (quantity) {
        const box = position(quantity);
        drawText(group, quantity, quantity.textContent, box);
      }
      artwork.append(group);
    }

    Object.assign(bounds, projectBounds(bounds, displayMode));
    const padding = 32;
    const header = 88;
    const width = Math.ceil(Math.max(bounds.right - bounds.left, chart.title.length * 28, 320) + padding * 2);
    const height = Math.ceil(bounds.bottom - bounds.top + header + padding * 2);
    const image = svgElement("svg", { width, height, viewBox: `0 0 ${width} ${height}`, role: "img" });
    image.append(
      svgElement("title", {}, chart.title),
      svgElement("rect", { width, height, fill: background }),
      svgElement("text", { x: padding, y: 51, fill: chartTitle.color, "font-size": 28, "font-weight": 600, "font-family": chartTitle.fontFamily }, chart.title),
      svgElement("text", { x: padding, y: 76, fill: chartTitle.color, "font-size": 13, "font-family": getComputedStyle(unitsLayer).fontFamily }, $("chart-description").textContent),
    );
    artwork.setAttribute("transform", `translate(${padding - bounds.left} ${header + padding - bounds.top}) matrix(${projectionMatrix(displayMode).join(" ")} 0 0)`);
    image.append(artwork);

    const file = new Blob([new XMLSerializer().serializeToString(image)], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(file);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${chart.title.replace(/[\\/:*?"<>|]/g, "_")}.svg`;
    document.body.append(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    announce("已导出当前编制图");
  } finally {
    $("world").style.transform = previousTransform;
  }
}

function render() {
  hideUnitTooltip();
  closeUnitMenu();
  displayedStacks = validStacks();
  const { units, children } = visibleProjection();
  visibleUnits = units;
  if (!visibleUnits.some((unit) => unit.id === selectedId)) selectedId = null;
  $("chart-title").textContent = chart.title;
  document.title = `${chart.title} · 兵牌编辑器`;
  $("preset-edit-actions").hidden = !presetEdit;
  $("new-chart").hidden = Boolean(presetEdit);
  $("chart-library").hidden = Boolean(presetEdit);
  $("manage-presets").hidden = Boolean(presetEdit);
  $("chart-description").textContent = presetEdit ? "预设编制图" : chart.equipmentFormation ? "装备编成与定员示例 · 逐层展开查看装备和乘员" : chart.showComposition ? "编制示例"
    : chart.referenceNewFourthArmy ? "1938年春初建序列 · 点击支队兵牌展开 · 补充编成与员额为示例"
    : chart.referenceArmy ? "1937年改编初期 · 点击师级兵牌展开 · 补充编成与员额为示例"
    : chart.referenceComplete && ["120", "129"].includes(chart.referenceDivision) ? "1937年8月改编序列 · 下级编成与员额为示例"
    : chart.referenceComplete ? "参考图结构 · 补充编制与员额为示例"
      : chart.reference ? "国民革命军第八路军" : chart.example ? "第八路军 · 示例编制" : "自建编制";
  const size = documentSize(chart);
  const hidden = size - visibleUnits.length;
  $("chart-stats").textContent = `${size.toLocaleString()} 个单位 · ${chartDepth()} 层编制${hidden ? ` · 折叠 ${hidden.toLocaleString()} 个` : ""}`;
  $("empty").hidden = chart.units.length > 0;
  $("arrange").disabled = chart.units.length === 0;
  $("save-image").disabled = visibleUnits.length === 0;
  $("expand-layer").disabled = !nextLayer().length;
  $("collapse-layer").disabled = !deepestVisibleParents().size;
  const { frozen, ancestors } = expansionLocks();
  const expandableSize = frozen.size ? expandedSize(frozen) : size;
  $("expand-all").disabled = expandableSize <= visibleUnits.length || expandableSize > maxFullExpansion;
  $("expand-all").title = expandableSize > maxFullExpansion ? "编制较大，请逐层展开" : "展开未锁定的编制和叠牌";
  $("stack-peers").disabled = branchEndUnits(new Set([...frozen, ...ancestors])).length < 2;
  const { past, future } = historyForChart();
  $("undo").disabled = !past.length;
  $("redo").disabled = !future.length;
  const fragment = document.createDocumentFragment();
  for (const unit of visibleUnits) {
    fragment.append(unitElement(unit, chart.showComposition ? compositionOf(unit, children) : null, children));
  }
  unitsLayer.replaceChildren(fragment);
  drawLinks();
  renderInspector();
  if ($("chart-library").open) renderLibrary();
}

function option(value, text) {
  const element = document.createElement("option");
  element.value = value;
  element.textContent = text;
  return element;
}

function renderInspector() {
  const unit = getUnit(selectedId);
  $("no-unit").hidden = Boolean(unit);
  $("unit-fields").hidden = !unit;
  if (!unit) return;
  $("inspector-symbol").innerHTML = rankMark(unit.rank) + symbol(unit.type);
  $("inspector-caption").textContent = unit.name;
  $("unit-name").value = unit.name;
  $("unit-type").value = unit.type;
  $("unit-rank").value = unit.rank;
  $("unit-rank").disabled = Boolean(unit.equipment);
  const blocked = descendants(unit.id);
  const parents = chart.units.filter((candidate) => !blocked.has(candidate.id));
  $("unit-parent").replaceChildren(option("", "无上级（独立单位）"), ...parents.map((candidate) => option(candidate.id, candidate.name)));
  $("unit-parent").value = unit.parent ?? "";
  const byParent = indexChildren();
  const stat = strengthOf(unit, byParent);
  $("unit-role").hidden = !unit.role;
  $("unit-role").textContent = unit.role ?? "";
  const children = byParent.get(unit.id)?.length ?? 0;
  const deferred = hasDeferredChildren(unit);
  const hasRoster = Boolean(unit.personnel?.length);
  const showOwnSummary = supportsPersonnel(unit) && hasRoster;
  const equipment = Boolean(unit.equipment);
  $("unit-equipment-summary").hidden = !Object.keys(stat.equipment).length;
  $("unit-equipment-summary").textContent = equipmentSummary(stat.equipment);
  const totalText = stat.known && !stat.incomplete
    ? `编制人数 ${unit.estimated ? `推定 ${strengthText(stat.people)}` : strengthSummary(stat)}` : strengthSummary(stat);
  $("unit-strength-summary").hidden = (!stat.known && !unit.strength && !children && !deferred)
    || (showOwnSummary && !children && !deferred);
  $("unit-strength-summary").textContent = stat.officers ? `${totalText} · 军官 ${strengthText(stat.officers)}` : totalText;
  $("unit-headcount").value = fixedStrength(unit.strength) ? unit.strength[0] : "";
  $("unit-headcount").placeholder = unit.strength && !fixedStrength(unit.strength) ? "填写固定人数" : "上级可由下级汇总";
  $("unit-headcount").closest("label").hidden = showOwnSummary;
  $("unit-staff-summary").hidden = !showOwnSummary;
  const ownPeople = personnelTotal(unit.personnel);
  const ownOfficers = officerTotal(unit.personnel);
  $("unit-staff-summary").textContent = unit.rosterOnly ? `已录 ${ownPeople} 项主要岗位`
    : `${equipment ? "乘员" : "本部"} ${unit.estimated ? "推定 " : ""}${strengthText(ownPeople)} · 军官 ${strengthText(ownOfficers)}`;
  $("unit-subordinate-summary").hidden = !showOwnSummary || (!children && !deferred) || !stat.known;
  const subordinateStrength = strengthText(stat.people - (unit.rosterOnly ? 0 : ownPeople));
  const subordinateOfficers = strengthText(stat.officers - (unit.rosterOnly ? 0 : ownOfficers));
  $("unit-subordinate-summary").textContent = `${stat.incomplete ? "下辖已录入" : "下辖"} ${subordinateStrength}${stat.estimated ? "（含推定）" : ""} · 军官 ${subordinateOfficers}`;
  $("edit-unit-staff").hidden = !supportsPersonnel(unit);
  $("edit-unit-staff").textContent = equipment ? "编辑乘员" : "编辑本部人员";
  const locks = expansionLocks();
  const locked = locks.roots.has(unit.id);
  const inherited = locks.frozen.has(unit.id) && !locked;
  const lock = $("lock-expansion");
  lock.hidden = !locked && !inherited && !children && !deferred && !displayedStacks.has(unit.id);
  lock.disabled = inherited;
  lock.setAttribute("aria-pressed", String(locked || inherited));
  lock.textContent = locked ? "解除展开锁定" : inherited ? "上级已锁定展开" : "锁定展开状态";
  lock.title = "保留此分支当前的展开、折叠和叠牌状态";
  $("fold-branch").hidden = (!children && !deferred) || displayedStacks.has(unit.id);
  $("fold-branch").disabled = locks.frozen.has(unit.id) || locks.ancestors.has(unit.id);
  $("fold-branch").textContent = deferred || chart.folded?.includes(unit.id) ? "展开下级" : "收起下级";
  const stack = $("fold-peers");
  const peers = stackPeers(unit);
  stack.hidden = peers.length < 2;
  stack.textContent = displayedStacks.has(unit.id) ? "展开叠牌" : `叠放同类兵牌（${peers.length} 枚）`;
  $("delete-unit").title = children || deferred ? "下级单位将转接至该单位的上级" : "删除单位";
}

function selectUnit(id, openInspector = false) {
  selectedId = id;
  for (const node of unitsLayer.querySelectorAll(".unit")) node.setAttribute("aria-pressed", String(node.dataset.id === id));
  renderInspector();
  if (openInspector) switchTab("unit");
}

function activateUnit(unit) {
  selectUnit(unit.id, true);
  if (isReferenceBranch(unit) && chart.units.some((child) => child.parent === unit.id)) toggleBranch(unit.id);
}

// Keep hover information outside the zoomed canvas and out of SVG export.
function hideUnitTooltip() {
  const tooltip = $("unit-tooltip");
  tooltip.hidden = true;
  unitsLayer.querySelectorAll('[aria-describedby="unit-tooltip"]').forEach(node => node.removeAttribute("aria-describedby"));
}

function showUnitTooltip(node, x, y) {
  if (gesture || !$("unit-context-menu").hidden) return;
  const unit = getUnit(node.dataset.id);
  if (!unit) return;
  const tooltip = $("unit-tooltip");
  const children = indexChildren();
  const stat = strengthOf(unit, children);
  const composition = compositionOf(unit, children);
  const own = !unit.rosterOnly && fixedStrength(unit.strength) ? unit.strength[0] : 0;
  tooltip.replaceChildren();
  const heading = document.createElement("div");
  heading.className = "hud-titlebar";
  heading.textContent = unit.name;
  tooltip.append(heading);
  const body = document.createElement("div");
  body.className = "tooltip-body";
  const rows = [["单位", [ranks[unit.rank].name, types[unit.type].name].filter(Boolean).join(" · ")]];
  const stacked = displayedStacks.get(unit.id)?.length ?? 0;
  if (stacked > 1) rows.push(["叠牌", `${stacked} 枚 · 下方为单枚兵牌数据`]);
  if (Object.keys(stat.equipment).length) rows.push(["装备", equipmentSummary(stat.equipment)]);
  if (composition.children) rows.push(["组成", composition.children]);
  if (unit.type === "headquarters") {
    if (own) rows.push(["本部人员", `${unit.estimated ? "推定 " : ""}${strengthText(own)}`]);
    if (unit.rosterOnly) rows.push(["本部岗位", `已录 ${personnelTotal(unit.personnel)} 项，不计入员额`]);
    if (composition.children && stat.known) rows.push(["下辖人员", strengthText(stat.people - own)]);
  }
  if (unit.equipment) {
    rows.push(["乘员", strengthText(own)], ["定员说明", "示例定员，可按型号修改"]);
  }
  rows.push(["合计人数", composition.strength]);
  if (stat.officers) rows.push(["军官", strengthText(stat.officers)]);
  if (unit.personnel?.length) rows.push(["主要岗位", unit.personnel.map(entry => `${entry.role} ${entry.count}人`).join("、")]);
  if (chart.expansionLocks?.includes(unit.id)) rows.push(["展开状态", "已锁定"]);
  for (const [name, value] of rows) {
    const row = document.createElement("div");
    row.className = "tooltip-row";
    const key = document.createElement("span");
    key.textContent = name;
    const detail = document.createElement("span");
    detail.textContent = value;
    row.append(key, detail);
    body.append(row);
  }
  tooltip.append(body);
  tooltip.hidden = false;
  node.setAttribute("aria-describedby", "unit-tooltip");
  const bounds = tooltip.getBoundingClientRect();
  tooltip.style.left = `${Math.max(8, Math.min(x + 16, innerWidth - bounds.width - 8))}px`;
  tooltip.style.top = `${Math.max(8, y + bounds.height + 24 > innerHeight ? y - bounds.height - 12 : y + 16)}px`;
}

function closeUnitMenu(restoreFocus = false) {
  const menu = $("unit-context-menu");
  const id = menu.dataset.unit;
  menu.hidden = true;
  if (restoreFocus && id) unitsLayer.querySelector(`[data-id="${CSS.escape(id)}"]`)?.focus({ preventScroll: true });
}

function openUnitMenu(unit, x, y) {
  hideUnitTooltip();
  selectUnit(unit.id);
  const menu = $("unit-context-menu");
  menu.replaceChildren();
  menu.dataset.unit = unit.id;
  menu.setAttribute("aria-label", `${unit.name}快捷操作`);
  for (const id of ["fold-branch", "fold-peers", "lock-expansion", "edit-unit-staff"]) {
    const control = $(id);
    if (control.hidden) continue;
    const item = document.createElement("button");
    item.type = "button";
    item.className = "hud-menu__item";
    item.setAttribute("role", "menuitem");
    item.textContent = control.textContent;
    item.disabled = control.disabled;
    item.addEventListener("click", () => {
      closeUnitMenu();
      control.click();
    });
    menu.append(item);
  }
  const properties = document.createElement("button");
  properties.type = "button";
  properties.className = "hud-menu__item";
  properties.setAttribute("role", "menuitem");
  properties.textContent = "单位属性";
  properties.addEventListener("click", () => {
    closeUnitMenu();
    switchTab("unit");
    $("unit-name").focus();
  });
  menu.append(properties);
  menu.hidden = false;
  const bounds = menu.getBoundingClientRect();
  menu.style.left = `${Math.max(8, Math.min(x, innerWidth - bounds.width - 8))}px`;
  menu.style.top = `${Math.max(8, Math.min(y, innerHeight - bounds.height - 8))}px`;
  menu.querySelector("button:not(:disabled)")?.focus({ preventScroll: true });
}

function switchTab(tab, focus = false) {
  activeTab = tab;
  for (const name of ["preset", "unit"]) {
    const selected = name === tab;
    const button = $(`${name}-tab`);
    button.setAttribute("aria-selected", String(selected));
    button.tabIndex = selected ? 0 : -1;
    $(`${name}-panel`).hidden = !selected;
    if (selected && focus) button.focus();
  }
}

function setTool(next) {
  tool = next;
  if (tool === "pan") setPlacement(null);
  $("select-tool").setAttribute("aria-pressed", String(tool === "select"));
  $("pan-tool").setAttribute("aria-pressed", String(tool === "pan"));
  stage.classList.toggle("is-pan", tool === "pan" || spaceHeld);
}

function setPlacement(type) {
  placement = type;
  stage.classList.toggle("is-placing", Boolean(type));
  for (const button of $("preset-groups").querySelectorAll(".preset")) {
    button.setAttribute("aria-pressed", String(button.dataset.type === type));
  }
  const tip = $("canvas-tip");
  tip.classList.remove("is-feedback");
  if (type) {
    tip.textContent = `点按画布放置${paletteItem(type).name} · Esc 取消`;
    announce(tip.textContent);
  } else if (chart.showComposition) {
    tip.textContent = matchMedia("(pointer: coarse)").matches ? "拖动画布查看下方单位" : "滚动查看下方单位";
  } else if (matchMedia("(pointer: coarse)").matches) {
    tip.textContent = "拖动空白处平移";
  } else {
    tip.innerHTML = "<kbd>空格</kbd> 平移画布";
  }
}

function armPreset(type) {
  const next = placement === type ? null : type;
  setTool("select");
  setPlacement(next);
  if (!next) return;
  stage.focus({ preventScroll: true });
  if (matchMedia("(pointer: coarse)").matches) stage.scrollIntoView({ block: "nearest" });
}

function applyView() {
  $("world").style.transform = `translate(${view.x}px, ${view.y}px) scale(${view.scale}) matrix(${projectionMatrix(displayMode).join(",")},0,0)`;
  $("world").style.setProperty("--label-size", `${Math.min(34, Math.max(14, 11 / view.scale))}px`);
  $("world").style.setProperty("--label-height", `${Math.min(32, Math.max(20, 13 / view.scale))}px`);
  const gridStep = 20 * view.scale * Math.max(1, Math.ceil(.6 / view.scale));
  stage.style.setProperty("--grid-step", `${gridStep}px`);
  stage.style.setProperty("--grid-x", `${view.x % gridStep - gridStep / 2}px`);
  stage.style.setProperty("--grid-y", `${view.y % gridStep - gridStep / 2}px`);
  if (displayMode === "depth") {
    const step = gridStep / view.scale;
    const matrix = projectionMatrix(displayMode).map(value => value * view.scale);
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%"><defs><pattern id="grid" width="${step}" height="${step}" patternUnits="userSpaceOnUse" patternTransform="matrix(${matrix.join(" ")} ${view.x} ${view.y})"><circle cx="0" cy="0" r="${.9/view.scale}" fill="#bccac4"/></pattern></defs><rect width="100%" height="100%" fill="url(#grid)"/></svg>`;
    stage.style.backgroundImage = `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
    stage.style.backgroundSize = "100% 100%";
    stage.style.backgroundPosition = "0 0";
  } else {
    stage.style.removeProperty("background-image");
    stage.style.removeProperty("background-size");
    stage.style.removeProperty("background-position");
  }
  $("zoom-level").textContent = `${Math.round(view.scale * 100)}%`;
  $("zoom-in").disabled = view.scale >= maxScale;
  $("zoom-out").disabled = view.scale <= minScale;
}

function fitView() {
  const width = stage.clientWidth;
  const height = stage.clientHeight;
  if (!width || !height) return;
  if (!visibleUnits.length) {
    Object.assign(view, { x: width / 2, y: height / 2, scale: 1 });
  } else {
    const xs = visibleUnits.map((unit) => unit.x);
    const ys = visibleUnits.map((unit) => unit.y);
    const modelLeft = Math.min(...xs) - 72;
    const modelRight = Math.max(...visibleUnits.map((unit) => unit.x + (chart.showComposition ? 208 : unit.plateLabel !== undefined ? 132 : 72)));
    const modelTop = Math.min(...ys) - 44;
    const modelBottom = Math.max(...visibleUnits.map((unit) => unit.y + (chart.showComposition ? 32 : unit.strength || unit.estimated ? 68 : 48)));
    const {left,right,top,bottom} = projectBounds({left:modelLeft,right:modelRight,top:modelTop,bottom:modelBottom}, displayMode);
    const heightFit = (height - 68) / (bottom - top);
    view.scale = Math.max(minScale, Math.min(1, (width - 32) / (right - left), chart.showComposition && displayMode === "flat" ? Math.max(.84, heightFit) : heightFit));
    view.x = width / 2 - (left + right) * view.scale / 2;
    view.y = chart.showComposition && heightFit < view.scale ? 16 - top * view.scale
      : height / 2 - 14 - (top + bottom) * view.scale / 2;
  }
  lastSize = { width, height };
  applyView();
}

function zoomAt(scale, x = stage.clientWidth / 2, y = stage.clientHeight / 2) {
  const next = Math.max(minScale, Math.min(maxScale, scale));
  const factor = next / view.scale;
  view.x = x - (x - view.x) * factor;
  view.y = y - (y - view.y) * factor;
  view.scale = next;
  applyView();
}

function canvasPoint(clientX, clientY) {
  const rect = stage.getBoundingClientRect();
  return unprojectPoint({ x: (clientX - rect.left - view.x) / view.scale, y: (clientY - rect.top - view.y) / view.scale }, displayMode);
}

function snap(value) {
  return Math.round(value / 4) * 4;
}

function attachPosition(parent, movingIds, child, units = chart.units) {
  if (sideHeadquarters(parent, child)) {
    let x = parent.x + 124;
    const y = parent.y + 100;
    while (units.some((unit) => !movingIds?.has(unit.id) && Math.abs(unit.x - x) < 128 && Math.abs(unit.y - y) < 88)) x += 132;
    return { x, y };
  }
  const x = parent.x + 24;
  let y = parent.y + 112;
  while (units.some((unit) => !movingIds?.has(unit.id) && Math.abs(unit.x - x) < 148 && Math.abs(unit.y - y) < 96)) y += 104;
  return { x, y };
}

function reveal(unit) {
  const projected = projectPoint(unit, displayMode);
  const x = projected.x * view.scale + view.x;
  const y = projected.y * view.scale + view.y;
  const marginX = Math.min(76, stage.clientWidth / 3);
  const minY = 48;
  const maxY = stage.clientHeight - 64;
  view.x += Math.max(marginX, Math.min(stage.clientWidth - marginX, x)) - x;
  view.y += Math.max(minY, Math.min(maxY, y)) - y;
  applyView();
}

function makePresetUnit(definition, x, y, parent, recipe) {
  const unit = { id: makeId(), name: definition.name, type: definition.type, rank: definition.rank, x, y, parent };
  if (definition.role) unit.role = definition.role;
  if (definition.estimated) unit.estimated = true;
  if (definition.rosterOnly) unit.rosterOnly = true;
  if (definition.strength) unit.strength = [...definition.strength];
  if (definition.personnel) unit.personnel = structuredClone(definition.personnel);
  if (definition.equipment) unit.equipment = structuredClone(definition.equipment);
  if (definition.parts?.length) unit.recipe = recipe;
  return unit;
}

function snapshotPreset(key, catalog = presets) {
  const definitions = presetTree(catalog, key);
  const serialized = JSON.stringify(definitions);
  chart.recipes ??= {};
  let snapshot = Object.keys(chart.recipes).find((id) => JSON.stringify(chart.recipes[id]) === serialized);
  if (!snapshot) {
    snapshot = makeId();
    chart.recipes[snapshot] = definitions;
  }
  return { snapshot, key };
}

function materializeChildren(parent) {
  if (!hasDeferredChildren(parent)) return;
  const definitions = recipeOf(parent);
  const { snapshot, key } = parent.recipe;
  delete parent.recipe;
  const children = definitions[key].parts.flatMap(([part, count]) => Array.from({ length: count }, () => part));
  let verticalY = parent.y + 80;
  const numbers = new Map();
  for (const part of children) {
    const definition = definitions[part];
    const index = (numbers.get(part) ?? 0) + 1;
    numbers.set(part, index);
    let position;
    if (sideHeadquarters(parent, definition)) position = attachPosition(parent, null, definition);
    else if (chart.showComposition && chart.manualLayout) {
      const x = parent.x + 56;
      while (chart.units.some((unit) => Math.abs(unit.x - x) < 112 && Math.abs(unit.y - verticalY) < 76)) verticalY += 80;
      position = { x, y: verticalY };
      verticalY += 80;
    } else position = attachPosition(parent, null, definition);
    const unit = makePresetUnit(definition, position.x, position.y, parent.id, { snapshot, key: part });
    if (!chart.showComposition && position.x === parent.x + 24) unit.connector = "left-rail";
    if (children.filter((id) => id === part).length > 1) unit.name += ` ${index}`;
    chart.units.push(unit);
  }
}

function addUnit(key, parent, point) {
  if (parent?.equipment) return editorFeedback("单件装备的人员请通过“编辑乘员”配置");
  const definition = paletteItem(key);
  const fromCatalog = Object.hasOwn(presets, key);
  const catalog = fromCatalog ? presets : builtInPresets;
  const presetKey = fromCatalog ? key : defaultPresetKey(definition.rank, definition.type);
  let unit;
  setPlacement(null);
  if (!staffedPreset(catalog, presetKey)) return editorFeedback("请先补齐预设的下级组成和固定人数");
  commit(() => {
    if (parent) materializeChildren(parent);
    const { x, y } = parent
      ? attachPosition(parent, null, definition)
      : { x: snap(point.x), y: snap(point.y) };
    const recipe = definition.parts?.length ? snapshotPreset(presetKey, catalog) : null;
    unit = makePresetUnit(definition, x, y, parent?.id ?? null, recipe);
    selectedId = unit.id;
    expandAncestors(unit.parent);
    chart.units.push(unit);
  });
  reveal(unit);
  announce(parent ? `已将${unit.name}编入${parent.name}` : `已放置${unit.name}`);
}

function updateUnit(fields, movingIds) {
  const unit = getUnit(selectedId);
  if (!unit || !Object.keys(fields).some((key) => unit[key] !== fields[key])) return;
  const moving = "parent" in fields && fields.parent !== unit.parent;
  if (moving && !canRemoveFromParent(unit)) {
    render();
    return editorFeedback("上级至少要保留一个下级单位");
  }
  const hasChildren = hasDeferredChildren(unit) || chart.units.some((child) => child.parent === unit.id);
  const nextType = fields.type ?? unit.type;
  const nextRank = fields.rank ?? unit.rank;
  if (unit.equipment && (!equipmentKinds[nextType] || nextRank !== "team")) {
    renderInspector();
    return editorFeedback("单件装备使用机组级别，请选择装备兵种");
  }
  if (moving && getUnit(fields.parent)?.equipment) {
    renderInspector();
    return editorFeedback("单件装备的人员请通过“编辑乘员”配置");
  }
  if ("strength" in fields && ((!fields.strength && !hasChildren) || (fields.strength && !fixedStrength(fields.strength)))) {
    return editorFeedback("基层单位需要固定的正整数人数");
  }
  commit(() => {
    if (moving) {
      delete unit.connector;
      const parent = getUnit(fields.parent);
      if (parent) materializeChildren(parent);
      expandAncestors(fields.parent);
    }
    if ("name" in fields && fields.name !== unit.name) delete unit.plateLabel;
    if (!hasChildren && nextType !== "headquarters" && (nextRank !== unit.rank || unit.type === "headquarters")) {
      const key = defaultPresetKey(nextRank, nextType);
      const preset = builtInPresets[key];
      if (preset.parts?.length) unit.recipe = snapshotPreset(key, builtInPresets);
      else if (!fixedStrength(unit.strength)) unit.strength = [...preset.strength];
    }
    if (unit.type === "headquarters" && nextType !== "headquarters") delete unit.personnel;
    if (unit.equipment && nextType !== unit.type) {
      const definition = equipmentPreset(nextType);
      Object.assign(unit, { equipment: definition.equipment, personnel: definition.personnel, strength: definition.strength });
    }
    if (movingIds) {
      if (chart.showComposition || chart.verticalLayout || chart.reference) chart.manualLayout = true;
      const dx = fields.x - unit.x;
      const dy = fields.y - unit.y;
      for (const child of chart.units) {
        if (child.id === unit.id || !movingIds.has(child.id)) continue;
        child.x += dx;
        child.y += dy;
      }
    }
    Object.assign(unit, fields);
  });
}

function deleteSelected() {
  const unit = getUnit(selectedId);
  if (!unit) return;
  const hasChildren = hasDeferredChildren(unit) || chart.units.some((child) => child.parent === unit.id);
  if (!hasChildren && !canRemoveFromParent(unit)) return editorFeedback("上级至少要保留一个下级单位");
  commit(() => {
    materializeChildren(unit);
    for (const child of chart.units) {
      if (child.parent === unit.id) child.parent = unit.parent;
    }
    chart.units = chart.units.filter((item) => item.id !== unit.id);
    chart.folded = chart.folded?.filter((id) => id !== unit.id);
    chart.expansionLocks = chart.expansionLocks?.filter((id) => id !== unit.id);
    selectedId = unit.parent;
  });
  announce(`已删除${unit.name}`);
}

function arrangeReference(document) {
  const division = document.referenceDivision ?? "115";
  const newFourthArmy = document.referenceNewFourthArmy;
  const anchors = new Map();
  const anchorDivisions = document.referenceArmy ? Object.keys(divisionReferences) : newFourthArmy ? [] : [division];
  for (const number of anchorDivisions) {
    const prefix = document.referenceArmy ? `${number}:` : "";
    for (const unit of exampleChart(number).units) {
      const id = prefix + unit.id;
      anchors.set(id, { ...unit, id, parent: unit.parent ? prefix + unit.parent : null });
    }
  }
  const { units, children } = visibleProjection(validStacks(document), document);
  const visible = new Set(units.map((unit) => unit.id));
  const peers = (parent) => (children.get(parent) ?? []).filter((unit) => visible.has(unit.id));
  const gap = 96;
  let right = 0;

  function place(unit, x, y, connector) {
    Object.assign(unit, { x, y, connector });
    const labelWidth = unit.plateLabel === undefined ? 60 : 54 + plateCaption(unit, true).length * 15;
    right = Math.max(right, x + labelWidth);
  }

  function branch(unit, x, y, connector) {
    place(unit, x, y, connector);
    const anchor = anchors.get(unit.id);
    const direct = peers(unit.id);
    const headquarters = direct.find((child) => child.id === `${unit.id}-hq`);
    let bottom = y + (unit.plateLabel === undefined && (unit.strength || unit.estimated) ? 16 : 0);
    if (headquarters) {
      const offset = newFourthArmy && isReferenceBranch(unit, document) ? 184 : 136;
      bottom = Math.max(bottom, branch(headquarters, x + offset, y));
    }
    let next = bottom + gap;
    for (const child of direct) {
      if (child === headquarters) continue;
      const original = anchors.get(child.id);
      const offset = original?.parent === unit.id && anchor ? original.y - anchor.y : gap;
      const childY = Math.max(next, y + offset);
      next = branch(child, x + 24, childY, "left-rail") + gap;
    }
    return Math.max(bottom, next - gap);
  }

  function formation(unit, x, y, connector, headquartersId, isArmy = false) {
    place(unit, x, y, connector);
    const direct = peers(unit.id);
    const headquarters = direct.find((child) => child.id === headquartersId);
    const headBottom = headquarters ? branch(headquarters, x + 124, y + 100, "stem") : y + 100;
    unit.busOffset = Math.max(160, headBottom + 60 - y);
    const top = y + unit.busOffset + 68;
    const headerRight = right;
    right = -Infinity;
    let bottom = headBottom;
    const columns = direct.filter((child) => isArmy ? isReferenceBranch(child, document) : anchors.get(child.id)?.connector === "bus");
    for (const [index, child] of columns.entries()) {
      if (isArmy) {
        const left = Math.max(40 + index * 245, right + 76);
        if (newFourthArmy) {
          bottom = Math.max(bottom, branch(child, left, top, "bus"));
        } else {
          const open = peers(child.id).length > 0;
          bottom = Math.max(bottom, formation(child, left + (open ? 420 : 0), top, "bus", `${child.id.slice(0, 3)}:staff`));
        }
      } else {
        bottom = Math.max(bottom, branch(child, Math.max(x + anchors.get(child.id).x - 460, right + 52), top, "bus"));
      }
    }
    const rail = Math.max(x + 444, right + 76);
    let next = top;
    for (const child of direct) {
      if (child === headquarters || columns.includes(child)) continue;
      next = branch(child, rail, next, "right-rail") + gap;
    }
    right = Math.max(right, headerRight);
    return Math.max(bottom, next - gap);
  }

  const roots = peers(null);
  const rootId = newFourthArmy ? "new-fourth-army" : document.referenceArmy ? "eighth-route-army" : division;
  const headquartersId = newFourthArmy ? `${rootId}-hq` : document.referenceArmy ? "army-hq" : "staff";
  const root = roots.find((unit) => unit.id === rootId);
  if (root) formation(root, 460, 76, "reference-root", headquartersId, newFourthArmy || document.referenceArmy);
  for (const unit of roots) if (unit !== root) branch(unit, Math.max(unit.x, right + 76), unit.y);
}

function arrange() {
  commit(() => {
    delete chart.manualLayout;
    if (chart.reference) arrangeReference(chart);
    else {
      chart.verticalLayout = true;
      reflowComposition();
    }
  });
  fitView();
}

function showDropTarget(element) {
  if (targetElement === element) return;
  targetElement?.classList.remove("drop-target");
  targetElement = element;
  targetElement?.classList.add("drop-target");
}

function hitTest(event) {
  const hit = document.elementFromPoint(event.clientX, event.clientY);
  const node = hit?.closest(".unit");
  return { hit, inside: Boolean(hit && stage.contains(hit)), node, unit: getUnit(node?.dataset.id) };
}

function gestureMoved(event) {
  return Math.hypot(event.clientX - gesture.startX, event.clientY - gesture.startY) >= 5;
}

function startGesture(event, kind, data = {}, capture = event.currentTarget) {
  gesture = {
    kind, id: event.pointerId, startX: event.clientX, startY: event.clientY,
    capture, moved: false, ...data,
  };
  gesture.capture.setPointerCapture(event.pointerId);
}

function previewBranch(drag, dx = 0, dy = 0, moving = false) {
  for (const node of drag.branchNodes) {
    const unit = getUnit(node.dataset.id);
    if (!unit || !node.isConnected) continue;
    node.classList.toggle("moving", moving);
    node.style.left = `${unit.x + dx}px`;
    node.style.top = `${unit.y + dy}px`;
  }
  drawLinks(moving ? drag.branchIds : null, dx, dy);
}

function moveGesture(event) {
  if (!gesture || gesture.id !== event.pointerId) return;
  if (!gesture.moved && !gestureMoved(event)) return;
  gesture.moved = true;
  if (gesture.kind === "pan") {
    stage.classList.add("is-panning");
    view.x = gesture.x + event.clientX - gesture.startX;
    view.y = gesture.y + event.clientY - gesture.startY;
    applyView();
  }
  if (gesture.kind === "preset") {
    const preview = $("drag-preview");
    preview.hidden = false;
    preview.style.transform = `translate(${event.clientX - 38}px, ${event.clientY - 40}px)`;
    showDropTarget(hitTest(event).node ?? null);
  }
  if (gesture.kind === "unit") {
    const point = canvasPoint(event.clientX, event.clientY);
    const x = snap(point.x + gesture.offsetX);
    const y = snap(point.y + gesture.offsetY);
    previewBranch(gesture, x - gesture.unit.x, y - gesture.unit.y, true);
    const target = hitTest(event);
    showDropTarget(target.unit && !gesture.branchIds.has(target.unit.id) ? target.node : null);
  }
}

function finishGesture(event, cancelled = false) {
  if (!gesture || gesture.id !== event.pointerId) return;
  const finished = gesture;
  const target = hitTest(event);
  gesture = null;
  stage.classList.remove("is-panning");
  $("drag-preview").hidden = true;
  showDropTarget(null);

  if (finished.kind === "preset") {
    if (cancelled) return;
    if (finished.moved && target.inside) {
      addUnit(finished.type, target.unit, canvasPoint(event.clientX, event.clientY));
      stage.focus({ preventScroll: true });
    } else if (!finished.moved && finished.capture.contains(target.hit)) {
      armPreset(finished.type);
    }
    return;
  }
  if (finished.kind === "unit") {
    const { unit, branchIds } = finished;
    if (cancelled || (finished.moved && (!target.inside || branchIds.has(target.unit?.id)))) {
      previewBranch(finished);
      if (!cancelled && target.unit) announce("不能将单位编入自身的下级");
      return;
    }
    if (!finished.moved) {
      activateUnit(unit);
      return;
    }
    selectedId = unit.id;
    const point = canvasPoint(event.clientX, event.clientY);
    const position = target.unit
      ? attachPosition(target.unit, branchIds, unit)
      : { x: snap(point.x + finished.offsetX), y: snap(point.y + finished.offsetY) };
    updateUnit({ ...position, parent: target.unit?.id ?? unit.parent }, branchIds);
    if (finished.branchNodes.some((node) => node.isConnected)) previewBranch(finished);
    if (target.unit) reveal(getUnit(unit.id));
    stage.focus({ preventScroll: true });
  }
  if (cancelled || finished.moved || !target.inside) return;
  if (finished.kind === "place") {
    addUnit(placement, target.unit, canvasPoint(event.clientX, event.clientY));
    stage.focus({ preventScroll: true });
  }
  if (finished.kind === "blank" || (finished.kind === "pan" && finished.clearSelection)) selectUnit(null);
}

for (const element of document.querySelectorAll("[data-icon]")) element.innerHTML = icon(element.dataset.icon);
$("brand-mark").innerHTML = '<svg viewBox="0 0 24 18" fill="none" stroke="currentColor" stroke-width="1.35"><path d="M2 2.5h20v13H2zM2 2.5l20 13m0-13L2 15.5"/></svg>';
$("empty-symbol").innerHTML = rankMark("company") + symbol("infantry");
$("unit-type").replaceChildren(...Object.entries(types).map(([key, type]) => option(key, type.name)));
$("unit-rank").replaceChildren(...Object.entries(ranks).map(([key, rank]) => option(key, rank.name)));

function paletteItem(key) {
  if (Object.hasOwn(presets, key)) return presets[key];
  const type = types[key];
  return {
    ...builtInPresets[defaultPresetKey(type.rank, key)],
    type: key, rank: type.rank,
    name: type.rank === "none" || (type.rank === "team" && equipmentKinds[key]) ? type.name : type.name + ranks[type.rank].name,
  };
}

function renderPalette() {
  const items = $("preset-groups");
  const isFormation = paletteMode === "formation";
  const own = Object.keys(presetOverrides).filter((key) => !Object.hasOwn(builtInPresets, key) && !presetOverrides[key].internalFor);
  const entries = isFormation
    ? [...(own.length ? [{ name: "自定义", keys: own }] : []), ...formationGroups]
    : groups;
  $("formation-mode").setAttribute("aria-pressed", String(isFormation));
  $("symbol-mode").setAttribute("aria-pressed", String(!isFormation));
  $("palette-hint").textContent = isFormation ? "拖动兵牌到画布，或点击后放置" : "拖入兵牌时带上该级别的基础编制";
  const count = entries.reduce((total, group) => total + group.keys.length, 0);
  $("preset-count").textContent = `${count} ${isFormation ? "份" : "枚"}`;
  items.classList.toggle("formation-palette", isFormation);
  items.replaceChildren();
  const memo = new Map();
  for (const group of entries) {
    const section = document.createElement("section");
    section.className = "preset-group";
    section.innerHTML = `<h3>${group.name}</h3><div class="preset-grid"></div>`;
    for (const key of group.keys) {
      const preset = paletteItem(key);
      const button = document.createElement("button");
      button.type = "button";
      button.className = "preset hud-row";
      button.dataset.type = key;
      button.setAttribute("aria-pressed", String(placement === key));
      button.setAttribute("aria-label", isFormation ? preset.name : types[key].name);
      button.innerHTML = `<span class="preset-mark">${rankMark(preset.rank)}${symbol(preset.type)}</span><span class="preset-copy"><span class="preset-name"></span><small class="preset-detail" hidden></small></span><span class="preset-grip" aria-hidden="true">${icon("grip")}</span>`;
      button.querySelector(".preset-name").textContent = isFormation ? preset.name : types[key].name;
      if (isFormation) {
        const stat = presetStats(presets, key, memo);
        const detail = button.querySelector(".preset-detail");
        const parts = preset.parts ?? [];
        detail.textContent = parts.length
          ? parts.map(([child, count]) => `${count} × ${presets[child].name}`).join(" · ")
          : preset.equipment ? `1 ${equipmentKinds[preset.equipment.kind].unit} · 乘员 ${strengthText(stat.people)}` : strengthSummary(stat);
        detail.hidden = !detail.textContent;
        button.title = [preset.role, strengthSummary(stat)].filter(Boolean).join(" · ");
      }
      section.lastElementChild.append(button);
    }
    items.append(section);
  }
}

function switchPalette(mode) {
  if (paletteMode === mode) return;
  setPlacement(null);
  paletteMode = mode;
  renderPalette();
}

$("preset-groups").addEventListener("pointerdown", (event) => {
  const button = event.target.closest(".preset");
  if (!button || event.button !== 0 || gesture) return;
  const key = button.dataset.type;
  const { type, rank } = paletteItem(key);
  startGesture(event, "preset", { type: key }, button);
  $("drag-preview").innerHTML = rankMark(rank) + symbol(type);
});
$("preset-groups").addEventListener("click", (event) => {
  const button = event.target.closest(".preset");
  if (button && event.detail === 0) armPreset(button.dataset.type);
});
$("preset-groups").addEventListener("contextmenu", (event) => {
  const key = event.target.closest(".preset")?.dataset.type;
  if (!key || !Object.hasOwn(presets, key)) return;
  event.preventDefault();
  editBasePreset(key);
});
$("formation-mode").addEventListener("click", () => switchPalette("formation"));
$("symbol-mode").addEventListener("click", () => switchPalette("symbol"));
renderPalette();

stage.addEventListener("pointerdown", (event) => {
  if (gesture || (event.button !== 0 && event.button !== 1)) return;
  const node = event.target.closest(".unit");
  if (tool === "pan" || spaceHeld || event.button === 1) {
    event.preventDefault();
    startGesture(event, "pan", { x: view.x, y: view.y });
  } else if (placement) {
    event.preventDefault();
    startGesture(event, "place");
  } else if (node) {
    const unit = getUnit(node.dataset.id);
    const point = canvasPoint(event.clientX, event.clientY);
    const branchIds = descendants(unit.id);
    const branchNodes = [...unitsLayer.children].filter((member) => branchIds.has(member.dataset.id));
    startGesture(event, "unit", {
      unit, branchIds, branchNodes, offsetX: unit.x - point.x, offsetY: unit.y - point.y,
    });
  } else if (event.pointerType === "touch") {
    startGesture(event, "pan", { x: view.x, y: view.y, clearSelection: true });
  } else {
    startGesture(event, "blank");
  }
});

unitsLayer.addEventListener("click", (event) => {
  // Keyboard activation has no pointer gesture.
  const node = event.target.closest(".unit");
  if (event.detail !== 0 || !node) return;
  const unit = getUnit(node.dataset.id);
  if (placement) addUnit(placement, unit);
  else activateUnit(unit);
});

unitsLayer.addEventListener("pointerover", (event) => {
  const node = event.target.closest(".unit");
  if (!node || node.contains(event.relatedTarget) || event.pointerType === "touch") return;
  hideUnitTooltip();
  showUnitTooltip(node, event.clientX, event.clientY);
});
unitsLayer.addEventListener("pointerout", (event) => {
  const node = event.target.closest(".unit");
  if (node && !node.contains(event.relatedTarget)) hideUnitTooltip();
});
unitsLayer.addEventListener("focusin", (event) => {
  if (!event.target.matches(".unit:focus-visible")) return;
  const bounds = event.target.getBoundingClientRect();
  showUnitTooltip(event.target, bounds.right, bounds.top);
});
unitsLayer.addEventListener("focusout", hideUnitTooltip);
document.addEventListener("pointerdown", hideUnitTooltip);
window.addEventListener("resize", hideUnitTooltip);
window.addEventListener("scroll", hideUnitTooltip, true);
stage.addEventListener("wheel", hideUnitTooltip, { passive: true });
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") hideUnitTooltip();
});

unitsLayer.addEventListener("contextmenu", (event) => {
  const node = event.target.closest(".unit");
  if (!node) return;
  event.preventDefault();
  const unit = getUnit(node.dataset.id);
  const bounds = node.getBoundingClientRect();
  openUnitMenu(unit, event.clientX || bounds.right, event.clientY || bounds.top);
});
unitsLayer.addEventListener("keydown", (event) => {
  if (event.key !== "ContextMenu" && !(event.shiftKey && event.key === "F10")) return;
  const node = event.target.closest(".unit");
  if (!node) return;
  event.preventDefault();
  const bounds = node.getBoundingClientRect();
  openUnitMenu(getUnit(node.dataset.id), bounds.right, bounds.top);
});
document.addEventListener("pointerdown", (event) => {
  if (!$("unit-context-menu").contains(event.target)) closeUnitMenu();
});
window.addEventListener("resize", () => closeUnitMenu());
stage.addEventListener("wheel", () => closeUnitMenu(), { passive: true });
$("unit-context-menu").addEventListener("keydown", (event) => {
  if (event.key === "Escape" || event.key === "Tab") {
    closeUnitMenu(event.key === "Escape");
    event.stopPropagation();
    if (event.key === "Escape") event.preventDefault();
    return;
  }
  if (!["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) return;
  event.preventDefault();
  const items = [...event.currentTarget.querySelectorAll("button:not(:disabled)")];
  const current = items.indexOf(document.activeElement);
  const index = event.key === "Home" ? 0 : event.key === "End" ? items.length - 1
    : (current + (event.key === "ArrowDown" ? 1 : -1) + items.length) % items.length;
  items[index]?.focus();
});

unitsLayer.addEventListener("focusin", (event) => {
  if (event.target.matches(".unit:focus-visible")) reveal(getUnit(event.target.dataset.id));
});

document.addEventListener("pointermove", moveGesture);
document.addEventListener("pointerup", (event) => finishGesture(event));
document.addEventListener("pointercancel", (event) => finishGesture(event, true));
document.addEventListener("lostpointercapture", (event) => finishGesture(event, true));

stage.addEventListener("wheel", (event) => {
  event.preventDefault();
  if (gesture) return;
  const rect = stage.getBoundingClientRect();
  const multiplier = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? stage.clientHeight : 1;
  if (event.ctrlKey || event.metaKey) {
    zoomAt(view.scale * Math.exp(-event.deltaY * multiplier / 360), event.clientX - rect.left, event.clientY - rect.top);
  } else {
    view.x -= event.deltaX * multiplier;
    view.y -= event.deltaY * multiplier;
    applyView();
  }
}, { passive: false });

for (const tab of ["preset", "unit"]) {
  $(`${tab}-tab`).addEventListener("click", () => switchTab(tab));
  $(`${tab}-tab`).addEventListener("keydown", (event) => {
    if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
    event.preventDefault();
    const next = event.key === "Home" ? "preset" : event.key === "End" ? "unit" : activeTab === "unit" ? "preset" : "unit";
    switchTab(next, true);
  });
}

$("unit-name").addEventListener("change", (event) => {
  const name = event.target.value.trim();
  if (name) updateUnit({ name });
  else event.target.value = getUnit(selectedId)?.name ?? "";
});
$("unit-name").addEventListener("keydown", (event) => {
  if (event.key === "Enter" && !event.isComposing) event.target.blur();
});
$("unit-type").addEventListener("change", (event) => updateUnit({ type: event.target.value }));
$("unit-rank").addEventListener("change", (event) => updateUnit({ rank: event.target.value }));
$("unit-parent").addEventListener("change", (event) => updateUnit({ parent: event.target.value || null }));
$("fold-branch").addEventListener("click", () => toggleBranch(selectedId));
$("fold-peers").addEventListener("click", () => toggleStack(selectedId));
$("delete-unit").addEventListener("click", deleteSelected);
$("undo").addEventListener("click", () => restore());
$("redo").addEventListener("click", () => restore(true));
$("arrange").addEventListener("click", arrange);
$("save-image").addEventListener("click", saveChartImage);
$("select-tool").addEventListener("click", () => setTool("select"));
$("pan-tool").addEventListener("click", () => setTool("pan"));
$("zoom-out").addEventListener("click", () => zoomAt(view.scale / 1.2));
$("zoom-in").addEventListener("click", () => zoomAt(view.scale * 1.2));
$("fit").addEventListener("click", fitView);
$("expand-layer").addEventListener("click", expandLayer);
$("collapse-layer").addEventListener("click", collapseLayer);
$("expand-all").addEventListener("click", expandAll);
$("stack-peers").addEventListener("click", stackIdentical);
$("lock-expansion").addEventListener("click", () => {
  const unit = getUnit(selectedId);
  if (!unit) return;
  const { roots, frozen } = expansionLocks();
  const locked = roots.delete(unit.id);
  if (!locked && frozen.has(unit.id)) return;
  if (!locked) roots.add(unit.id);
  commit(() => { chart.expansionLocks = [...roots]; });
  announce(locked ? `已解除${unit.name}的展开锁定` : `已锁定${unit.name}的展开状态`);
});

const titleInput = $("title-input");
function finishRename(cancel = false) {
  if (titleInput.hidden) return;
  const title = titleInput.value.trim();
  titleInput.hidden = true;
  $("chart-title").hidden = false;
  $("rename-chart").hidden = false;
  if (!cancel && title && title !== chart.title) commit(() => { chart.title = title; });
}

$("rename-chart").addEventListener("click", () => {
  titleInput.value = chart.title;
  $("chart-title").hidden = true;
  $("rename-chart").hidden = true;
  titleInput.hidden = false;
  titleInput.select();
});
titleInput.addEventListener("blur", () => finishRename());
titleInput.addEventListener("keydown", (event) => {
  if (!event.isComposing && ["Escape", "Enter"].includes(event.key)) {
    event.preventDefault();
    finishRename(event.key === "Escape");
    $("rename-chart").focus();
  }
});

const libraryMenu = $("chart-library");
const librarySummary = libraryMenu.querySelector("summary");

function renderLibrary() {
  $("library-count").textContent = `${library.charts.length} 份`;
  $("chart-list").replaceChildren(...library.charts.map((item) => {
    const wrapper = document.createElement("div");
    wrapper.className = "chart-list-row";
    const row = document.createElement("button");
    row.type = "button";
    row.className = "chart-entry hud-row";
    row.dataset.id = item.id;
    const current = item.id === chart.id;
    if (current) row.setAttribute("aria-current", "true");
    row.innerHTML = `<span data-icon="diagram">${icon("diagram")}</span><span><span class="chart-entry-name"></span><span class="chart-entry-detail"></span></span><span data-icon="check">${current ? icon("check") : ""}</span>`;
    row.querySelector(".chart-entry-name").textContent = item.title;
    const kind = item.referenceComplete ? "补全示例 · " : item.reference ? "原图示例 · " : item.showComposition ? "分级示例 · " : "";
    row.querySelector(".chart-entry-detail").textContent = `${kind}${documentSize(item).toLocaleString()} 个单位`;
    row.title = item.title;
    const remove = trashButton(`删除编制：${item.title}`);
    remove.classList.add("chart-delete");
    remove.dataset.id = item.id;
    wrapper.append(row, remove);
    return wrapper;
  }));
}

function activateChart(next, isNew = false) {
  finishRename();
  const url = new URL(location.href);
  if (url.searchParams.has("chart") && url.searchParams.get("chart") !== next.id) {
    url.searchParams.delete("chart");
    history.replaceState(history.state, "", url);
  }
  chart = next;
  selectedId = null;
  setTool("select");
  setPlacement(null);
  switchTab("preset");
  save(isNew ? chart : null);
  render();
  fitView();
}

librarySummary.addEventListener("click", () => {
  if (libraryMenu.open) return;
  refreshLibrary();
  renderLibrary();
});
$("chart-list").addEventListener("click", (event) => {
  const remove = event.target.closest(".chart-delete");
  if (remove) {
    refreshLibrary();
    const item = library.charts.find((entry) => entry.id === remove.dataset.id);
    if (item) confirmRemoval("编制", item.title, () => deleteChart(item.id));
    return;
  }
  const entry = event.target.closest(".chart-entry");
  if (!entry) return;
  refreshLibrary();
  const next = library.charts.find((item) => item.id === entry.dataset.id);
  libraryMenu.open = false;
  if (next && next.id !== chart.id) {
    activateChart(next);
    announce(`已切换到${chart.title}`);
  }
  librarySummary.focus({ preventScroll: true });
});
document.addEventListener("click", (event) => {
  if (libraryMenu.open && !libraryMenu.contains(event.target)) libraryMenu.open = false;
});
libraryMenu.addEventListener("focusout", (event) => {
  if (event.relatedTarget && !libraryMenu.contains(event.relatedTarget)) libraryMenu.open = false;
});

const newDialog = $("new-dialog");
const presetDialog = $("preset-dialog");
const deleteDialog = $("delete-dialog");
const presetManager = $("preset-manager");
const staffDialog = $("staff-dialog");
let deleteAction = null;

function trashButton(label) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "icon-button hud-icon-btn";
  button.setAttribute("aria-label", label);
  button.title = label;
  button.innerHTML = icon("trash");
  return button;
}

function confirmRemoval(kind, title, action) {
  deleteAction = action;
  $("delete-dialog-title").textContent = `删除${kind}`;
  $("delete-description").textContent = `确定删除「${title}」？`;
  $("delete-error").hidden = true;
  deleteDialog.showModal();
}

$("cancel-delete").addEventListener("click", () => deleteDialog.close());
deleteDialog.addEventListener("close", () => { deleteAction = null; });
$("delete-form").addEventListener("submit", (event) => {
  event.preventDefault();
  try {
    deleteAction?.();
    deleteDialog.close();
  } catch (error) {
    $("delete-error").textContent = error.message;
    $("delete-error").hidden = false;
  }
});

function deleteChart(id) {
  refreshLibrary();
  const remaining = library.charts.filter((item) => item.id !== id);
  if (!remaining.length) remaining.push({ id: makeId(), title: "未命名编制", units: [] });
  const next = remaining.find((item) => item.id === chart.id) ?? remaining[0];
  const updated = { activeId: next.id, charts: remaining, removed: [...new Set([...(library.removed ?? []), id])] };
  try {
    localStorage.setItem(storageKey, JSON.stringify(updated));
  } catch {
    throw new Error("浏览器未能保存删除操作");
  }
  library = updated;
  unsavedCharts.clear();
  histories.delete(id);
  if (chart.id !== next.id) activateChart(next);
  else renderLibrary();
  announce("已删除编制");
}

function wholePresetRecords() {
  const stored = readStorage(wholePresetStorageKey);
  if (!Array.isArray(stored)) return [];
  let equipmentUpdated = false;
  const records = stored.filter((record) => typeof record?.id === "string" && isChart(record.chart)).map((record) => {
    if (record.id === "builtin-whole-company") migrateInfantryHeadquarters(record.chart);
    if (record.id === "builtin-whole-battalion" || record.chart.referenceComplete) migrateCommandGuards(record.chart);
    if (record.chart.reference) migrateReferenceLayout(record.chart);
    equipmentUpdated = migrateSupportEquipment(record.chart) || equipmentUpdated;
    equipmentUpdated = migrateNewFourthDirectUnits(record.chart) || equipmentUpdated;
    return record;
  });
  if (equipmentUpdated) {
    try { writeWholePresets(records); } catch { /* Keep upgraded presets usable in memory if storage is full. */ }
  }
  return records;
}

function writeWholePresets(records) {
  try {
    localStorage.setItem(wholePresetStorageKey, JSON.stringify(records));
  } catch {
    throw new Error("浏览器未能保存预设");
  }
}

function builtInWholePresets() {
  const key = "form-corps";
  const snapshot = "whole-corps";
  const definitions = presetTree(builtInPresets, key);
  definitions[key] = { ...definitions[key], name: "军团", type: "infantry" };
  const root = makePresetUnit(definitions[key], 0, 0, null, { snapshot, key });
  return [
    { id: "builtin-whole-company", builtIn: true, title: "步兵连编制", chart: infantryCompanyExample() },
    { id: "builtin-whole-battalion", builtIn: true, title: "步兵营编制", chart: infantryBattalionExample() },
    { id: "builtin-whole-artillery-battalion", builtIn: true, title: "炮兵营编制", chart: supportBattalionExample("artillery") },
    { id: "builtin-whole-logistics-battalion", builtIn: true, title: "辎重营编制", chart: supportBattalionExample("logistics") },
    ...["115", "120", "129"].map((division) => {
      const example = completeDivisionExample(division);
      return { id: `builtin-whole-${division}`, builtIn: true, title: example.title, chart: example };
    }),
    { id: "builtin-whole-eighth-route-army", builtIn: true, title: "八路军总编制", chart: eighthRouteArmyExample() },
    { id: "builtin-whole-new-fourth-army", builtIn: true, title: "新四军总编制", chart: newFourthArmyExample() },
    { id: "builtin-whole-corps", builtIn: true, title: "军团编制", chart: { title: "军团编制", units: [root], recipes: { [snapshot]: definitions } } },
  ];
}

function renderPresetManager() {
  const saved = wholePresetRecords();
  const records = [...saved, ...builtInWholePresets().filter((record) => !saved.some((item) => item.id === record.id))];
  $("whole-preset-list").replaceChildren(...records.map((record) => {
    const row = document.createElement("div");
    row.className = "whole-preset-row";
    const copy = document.createElement("div");
    const title = document.createElement("span");
    title.className = "chart-entry-name";
    title.textContent = record.title;
    const detail = document.createElement("small");
    detail.className = "chart-entry-detail";
    detail.textContent = `${record.builtIn ? "内置" : "自定义"} · ${documentSize(record.chart).toLocaleString()} 个单位`;
    copy.append(title, detail);
    const use = document.createElement("button");
    use.type = "button";
    use.className = "button secondary hud-btn";
    use.textContent = "使用";
    use.setAttribute("aria-label", `使用预设：${record.title}`);
    use.addEventListener("click", () => {
      const next = structuredClone(record.chart);
      next.id = makeId();
      next.title = record.title;
      library.charts.unshift(next);
      presetManager.close();
      activateChart(next, true);
      announce(`已从预设新建${next.title}`);
    });
    const edit = document.createElement("button");
    edit.type = "button";
    edit.className = "button secondary hud-btn";
    edit.textContent = "编辑";
    edit.setAttribute("aria-label", `编辑预设：${record.title}`);
    edit.addEventListener("click", () => editWholePreset(record));
    row.addEventListener("contextmenu", (event) => {
      event.preventDefault();
      editWholePreset(record);
    });
    row.append(copy, edit, use);
    if (!record.builtIn) {
      const remove = trashButton(`删除预设：${record.title}`);
      remove.addEventListener("click", () => confirmRemoval("预设", record.title, () => {
        writeWholePresets(wholePresetRecords().filter((item) => item.id !== record.id));
        renderPresetManager();
        announce("已删除预设");
      }));
      row.append(remove);
    }
    return row;
  }));
}

function requireStaffedChart() {
  if (!chart.units.length) throw new Error("请先在画布上搭建编制");
  const children = indexChildren();
  for (const unit of chart.units) {
    if (!validEquipment(unit) || (unit.equipment && (children.has(unit.id) || hasDeferredChildren(unit)))) {
      throw new Error("单件装备须配置固定乘员岗位，不能包含下级单位");
    }
    if (unit.strength && !fixedStrength(unit.strength)) throw new Error("请先补齐编制里的固定人数");
    const recipe = recipeOf(unit);
    if (recipe) {
      const { key } = unit.recipe;
      const current = { ...recipe, [key]: { ...recipe[key], strength: unit.strength, personnel: unit.personnel } };
      if (!staffedPreset(current, key)) throw new Error("请先补齐编制里的固定人数和下级组成");
    }
    if (!recipe && !children.has(unit.id) && !isStaffedLeaf(unit)) {
      throw new Error("请先补齐编制里的固定人数和下级组成");
    }
  }
  return children;
}

function openPresetCanvas(info, document) {
  finishRename();
  const returnId = presetEdit?.returnId ?? chart.id;
  const token = `${info.kind}:${info.id}`;
  if (presetEdit?.token === token) return;
  presetEdit = { ...info, returnId, token };
  if (presetDialog.open) presetDialog.close();
  if (presetManager.open) presetManager.close();
  const draft = presetDrafts.get(token);
  chart = draft ?? { ...structuredClone(document), id: makeId(), title: info.title };
  selectedId = null;
  setTool("select");
  setPlacement(null);
  switchTab("preset");
  save();
  render();
  fitView();
}

function editWholePreset(record) {
  openPresetCanvas({ kind: "whole", id: record.id, title: record.title, builtIn: record.builtIn }, record.chart);
}

function editBasePreset(key) {
  const definitions = presetTree(presets, key);
  const definition = definitions[key];
  const root = makePresetUnit(definition, 0, 0, null, { snapshot: key, key });
  const document = { showComposition: true, units: [root], recipes: { [key]: definitions } };
  openPresetCanvas({ kind: "base", id: key, title: definition.name }, document);
}

function exportBasePreset(edit, children) {
  const roots = children.get(null) ?? [];
  if (roots.length !== 1) throw new Error("基础模板须有一个顶级单位，请把独立单位编入同一上级");
  const overrides = readPresetOverrides();
  const catalog = { ...builtInPresets, ...overrides };
  for (const [key, definition] of Object.entries(overrides)) {
    if (definition.internalFor === edit.id) delete overrides[key];
  }

  const imported = new WeakMap();
  function importDefinition(definitions, key) {
    if (!imported.has(definitions)) imported.set(definitions, new Map());
    const memo = imported.get(definitions);
    if (memo.has(key)) return memo.get(key);
    if (key !== edit.id && catalog[key] && !catalog[key].internalFor
        && JSON.stringify(presetTree(definitions, key)) === JSON.stringify(presetTree(catalog, key))) return key;
    const internal = `part-${makeId()}`;
    memo.set(key, internal);
    const definition = definitions[key];
    const parts = (definition.parts ?? []).map(([child, count]) => [importDefinition(definitions, child), count]);
    overrides[internal] = { ...definition, parts, internalFor: edit.id };
    return internal;
  }

  function exportUnit(unit, key) {
    const recipe = recipeOf(unit);
    const parts = recipe
      ? (recipe[unit.recipe.key].parts ?? []).map(([child, count]) => [importDefinition(recipe, child), count])
      : (children.get(unit.id) ?? []).map((child) => {
        const childKey = `part-${makeId()}`;
        exportUnit(child, childKey);
        return [childKey, 1];
      });
    const name = key === edit.id && chart.title !== edit.title ? chart.title : unit.name;
    overrides[key] = { name, type: unit.type, rank: unit.rank, role: unit.role, strength: unit.strength, personnel: unit.personnel, equipment: unit.equipment, estimated: unit.estimated, parts };
    if (key !== edit.id) overrides[key].internalFor = edit.id;
  }
  exportUnit(roots[0], edit.id);
  return overrides;
}

$("save-preset-edit").addEventListener("click", () => {
  if (!presetEdit) return;
  try {
    const children = requireStaffedChart();
    if (presetEdit.kind === "whole") {
      const record = { id: presetEdit.id, builtIn: presetEdit.builtIn, title: chart.title, chart };
      writeWholePresets([record, ...wholePresetRecords().filter((item) => item.id !== record.id)]);
    } else {
      writeBasePresets(exportBasePreset(presetEdit, children), presetEdit.id);
      chart.title = presets[presetEdit.id].name;
      renderPalette();
    }
    presetEdit.title = chart.title;
    presetDrafts.delete(presetEdit.token);
    if ($("canvas-tip").classList.contains("is-feedback")) setPlacement(placement);
    $("save-text").textContent = "预设已保存";
    render();
    announce("预设已保存");
  } catch (error) {
    editorFeedback(error.message);
  }
});

$("exit-preset-edit").addEventListener("click", () => {
  if (!presetEdit) return;
  const returnId = presetEdit.returnId;
  histories.delete(chart.id);
  presetEdit = null;
  refreshLibrary();
  const destination = library.charts.find((item) => item.id === returnId) ?? library.charts[0];
  if (destination) activateChart(destination);
});

$("manage-presets").addEventListener("click", () => {
  $("formation-preset-name").value = chart.title;
  $("save-current-preset").disabled = !chart.units.length;
  $("manager-error").hidden = true;
  renderPresetManager();
  presetManager.showModal();
});
$("close-manager").addEventListener("click", () => presetManager.close());
$("save-formation-preset").addEventListener("submit", (event) => {
  event.preventDefault();
  const title = $("formation-preset-name").value.trim();
  $("manager-error").hidden = true;
  try {
    if (!title) throw new Error("请填写预设名称");
    requireStaffedChart();
    writeWholePresets([{ id: makeId(), title, chart }, ...wholePresetRecords()]);
    renderPresetManager();
    announce(`已保存整套预设${title}`);
  } catch (error) {
    $("manager-error").textContent = error.message;
    $("manager-error").hidden = false;
  }
});

$("unit-headcount").addEventListener("change", (event) => {
  const input = event.target;
  if (!input.validity.valid) return editorFeedback("请输入有效的固定人数");
  const strength = input.value ? [input.valueAsNumber, input.valueAsNumber] : undefined;
  const unit = getUnit(selectedId);
  if (!unit || String(unit.strength) === String(strength)) return;
  if (!strength && !hasDeferredChildren(unit) && !chart.units.some((child) => child.parent === unit.id)) {
    input.value = fixedStrength(unit.strength) ? unit.strength[0] : "";
  }
  updateUnit({ strength });
});

function readStaffRows() {
  return [...$("staff-rows").children].map((row) => {
    const [role, count, officer] = row.children;
    return { role: role.value.trim(), count: count.valueAsNumber || 0, officer: officer.checked };
  });
}

function renderStaffTotal() {
  const personnel = readStaffRows();
  $("staff-total").textContent = `${getUnit(selectedId)?.equipment ? "乘员" : "本部"} ${strengthText(personnelTotal(personnel))} · 军官 ${strengthText(officerTotal(personnel))}`;
}

function addStaffRow(entry = { role: "", count: 1, officer: false }) {
  const row = document.createElement("div");
  row.className = "staff-row";
  const role = document.createElement("input");
  role.setAttribute("aria-label", "岗位");
  role.required = true;
  role.maxLength = 32;
  role.value = entry.role;
  const count = document.createElement("input");
  count.setAttribute("aria-label", "岗位人数");
  count.type = "number";
  count.min = 1;
  count.max = 9999999;
  count.required = true;
  count.value = entry.count;
  const officer = document.createElement("input");
  officer.setAttribute("aria-label", "计为军官");
  officer.type = "checkbox";
  officer.checked = entry.officer;
  const remove = trashButton("移除此岗位");
  remove.addEventListener("click", () => {
    row.remove();
    renderStaffTotal();
  });
  row.append(role, count, officer, remove);
  $("staff-rows").append(row);
  renderStaffTotal();
  return role;
}

$("edit-unit-staff").addEventListener("click", () => {
  const unit = getUnit(selectedId);
  if (!supportsPersonnel(unit)) return;
  $("staff-dialog-title").textContent = `${unit.name} · ${unit.equipment ? "乘员配置" : "本部人员"}`;
  $("staff-description").textContent = unit.equipment ? "配置这一辆车或这一门炮的操作人员，按岗位合计人数；默认岗位为可修改示例" : "本部岗位独立计员，下辖单位的人数另计";
  $("save-staff").textContent = unit.equipment ? "保存乘员" : "保存本部人员";
  $("staff-error").hidden = true;
  $("staff-rows").replaceChildren();
  if (unit.personnel?.length) {
    for (const entry of unit.personnel) addStaffRow(entry);
  } else if (fixedStrength(unit.strength)) {
    addStaffRow({ role: unit.equipment ? "操作乘员" : "本部人员", count: unit.strength[0], officer: false });
  } else {
    addStaffRow();
  }
  staffDialog.showModal();
});
$("staff-rows").addEventListener("input", renderStaffTotal);
$("add-staff-row").addEventListener("click", () => addStaffRow().focus());
$("cancel-staff").addEventListener("click", () => staffDialog.close());
$("staff-form").addEventListener("submit", (event) => {
  event.preventDefault();
  const personnel = readStaffRows();
  const count = personnelTotal(personnel);
  if (!personnel.length || personnel.some((entry) => !entry.role || !Number.isInteger(entry.count) || entry.count < 1) || count > 9999999) {
    $("staff-error").textContent = "请填写至少一个岗位，人数为正整数，合计不超过 9,999,999 人";
    $("staff-error").hidden = false;
    return;
  }
  const unit = getUnit(selectedId);
  if (!supportsPersonnel(unit)) return;
  updateUnit({ personnel, strength: [count, count] });
  staffDialog.close();
});

function setPresetError(message = "") {
  $("preset-error").textContent = message;
  $("preset-error").hidden = !message;
}

function addPartRow(key = "", quantity = 1) {
  const row = document.createElement("div");
  row.className = "part-row";
  const select = document.createElement("select");
  select.setAttribute("aria-label", "下级预设");
  select.required = true;
  select.append(option("", "选择下级预设"));
  for (const [id, preset] of Object.entries(presets)) {
    if (id !== $("preset-picker").value && (!preset.internalFor || id === key)) select.append(option(id, preset.name));
  }
  select.value = key;
  const count = document.createElement("input");
  count.type = "number";
  count.min = 1;
  count.max = 24;
  count.required = true;
  count.value = quantity;
  count.setAttribute("aria-label", "下级数量");
  const remove = document.createElement("button");
  remove.type = "button";
  remove.className = "icon-button hud-icon-btn";
  remove.setAttribute("aria-label", "移除此下级");
  remove.innerHTML = icon("trash");
  remove.addEventListener("click", () => row.remove());
  row.append(select, count, remove);
  $("part-rows").append(row);
  return select;
}

function loadPresetForm() {
  const preset = presets[$("preset-picker").value];
  $("open-template-canvas").hidden = !preset;
  $("preset-name").value = preset?.name ?? "";
  $("preset-type").value = preset?.type ?? "general";
  $("preset-rank").value = preset?.rank ?? "team";
  $("preset-role").value = preset?.role ?? "";
  $("preset-headcount").value = fixedStrength(preset?.strength) ? preset.strength[0] : "";
  $("preset-equipment").checked = Boolean(preset?.equipment);
  syncPresetEquipmentForm();
  $("part-rows").replaceChildren();
  for (const [key, count] of preset?.parts ?? []) addPartRow(key, count);
  setPresetError();
}

$("edit-templates").addEventListener("click", () => {
  const picker = $("preset-picker");
  picker.replaceChildren(option("", "新建预设"), ...Object.entries(presets)
    .filter(([, preset]) => !preset.internalFor).map(([key, preset]) => option(key, preset.name)));
  $("preset-type").replaceChildren(...Object.entries(types).map(([key, type]) => option(key, type.name)));
  $("preset-rank").replaceChildren(...Object.entries(ranks).map(([key, rank]) => option(key, rank.name)));
  loadPresetForm();
  presetDialog.showModal();
});
$("preset-picker").addEventListener("change", loadPresetForm);
$("preset-type").addEventListener("change", () => {
  syncPresetEquipmentForm();
});
function syncPresetEquipmentForm() {
  const type = $("preset-type").value;
  const current = presets[$("preset-picker").value];
  const equipment = $("preset-equipment");
  equipment.disabled = !equipmentKinds[type];
  if (equipment.disabled) equipment.checked = false;
  const roster = equipment.checked ? (current?.equipment?.kind === type ? current : equipmentPreset(type)).personnel
    : type === "headquarters" ? current?.personnel : null;
  $("preset-headcount").readOnly = Boolean(roster?.length);
  if (roster?.length) $("preset-headcount").value = personnelTotal(roster);
  $("preset-rank").disabled = equipment.checked;
  if (equipment.checked) $("preset-rank").value = "team";
  $("preset-parts").hidden = equipment.checked;
  $("preset-parts").disabled = equipment.checked;
}
$("preset-equipment").addEventListener("change", syncPresetEquipmentForm);
$("open-template-canvas").addEventListener("click", () => editBasePreset($("preset-picker").value));
$("add-part").addEventListener("click", () => addPartRow().focus());
$("cancel-preset").addEventListener("click", () => presetDialog.close());

function writeBasePresets(changes, key) {
  const next = { ...builtInPresets, ...changes };
  const stats = new Map();
  presetTree(next, key);
  if (!staffedPreset(next, key)) throw new Error("上级预设必须包含下级组成，基层单位必须填写固定人数");
  for (const id of Object.keys(next)) {
    presetTree(next, id);
    const stat = presetStats(next, id, stats);
    if (stat.size > 100000000 || !Number.isSafeInteger(stat.people)) throw new Error("嵌套规模过大，请减少下级数量");
  }
  try {
    localStorage.setItem(presetStorageKey, JSON.stringify(changes));
  } catch {
    throw new Error("浏览器未能保存预设");
  }
  presets = next;
  presetOverrides = changes;
}

$("preset-form").addEventListener("submit", (event) => {
  event.preventDefault();
  setPresetError();
  try {
    const key = $("preset-picker").value || `form-${makeId()}`;
    const name = $("preset-name").value.trim();
    if (!name) throw new Error("请填写预设名称");
    const parts = new Map();
    for (const row of $("part-rows").children) {
      const [select, quantity] = row.children;
      parts.set(select.value, (parts.get(select.value) ?? 0) + quantity.valueAsNumber);
    }
    if ([...parts.values()].some((count) => count > 24)) throw new Error("每种下级预设最多 24 份");
    const headcount = $("preset-headcount").valueAsNumber;
    const type = $("preset-type").value;
    const equipment = $("preset-equipment").checked ? { kind: type } : undefined;
    const personnel = equipment ? (presets[key]?.equipment?.kind === type ? presets[key] : equipmentPreset(type)).personnel
      : type === "headquarters" ? presets[key]?.personnel : undefined;
    const preset = {
      name, type, rank: $("preset-rank").value, role: $("preset-role").value.trim(),
      strength: Number.isNaN(headcount) ? undefined : [headcount, headcount], parts: equipment ? [] : [...parts], personnel, equipment,
    };
    if (personnel?.length) {
      const count = personnelTotal(personnel);
      preset.strength = [count, count];
    }
    writeBasePresets({ ...readPresetOverrides(), [key]: preset }, key);
    presetDialog.close();
    setPlacement(null);
    paletteMode = "formation";
    renderPalette();
    announce(`已保存预设${name}`);
  } catch (error) {
    setPresetError(error.message);
  }
});

$("new-chart").addEventListener("click", () => {
  $("new-title").value = "";
  newDialog.showModal();
});
$("cancel-new").addEventListener("click", () => newDialog.close());
$("new-form").addEventListener("submit", (event) => {
  event.preventDefault();
  const title = $("new-title").value.trim() || "未命名编制";
  const next = { id: makeId(), title, units: [] };
  library.charts.unshift(next);
  newDialog.close();
  activateChart(next, true);
  stage.focus({ preventScroll: true });
  announce(`已创建${title}`);
});

document.addEventListener("keydown", (event) => {
  if (event.isComposing || newDialog.open || presetDialog.open || presetManager.open || deleteDialog.open || staffDialog.open
      || event.target.matches("input, select, textarea, [contenteditable]")) return;
  if (gesture) return;
  const key = event.key.toLowerCase();
  if ((event.metaKey || event.ctrlKey) && (key === "z" || key === "y")) {
    event.preventDefault();
    restore(event.shiftKey || key === "y");
    return;
  }
  if (event.metaKey || event.ctrlKey || event.altKey) return;
  if (key === "escape") {
    if (libraryMenu.open) {
      libraryMenu.open = false;
      librarySummary.focus({ preventScroll: true });
    }
    setPlacement(null);
  }
  if (key === "v") setTool("select");
  if (key === "h") setTool("pan");
  if (key === "f") fitView();
  if (key === " " && (event.target === stage || stage.contains(event.target) || event.target === document.body)) {
    if (event.target.closest(".unit")) return;
    event.preventDefault();
    spaceHeld = true;
    stage.classList.add("is-pan");
  }
  if (event.target === stage || stage.contains(event.target)) {
    if ((key === "delete" || key === "backspace") && selectedId) {
      event.preventDefault();
      deleteSelected();
      stage.focus();
    }
    if (event.target === stage && placement && key === "enter") {
      const point = unprojectPoint({ x: (stage.clientWidth / 2 - view.x) / view.scale, y: (stage.clientHeight / 2 - view.y) / view.scale }, displayMode);
      addUnit(placement, null, point);
    }
  }
});

function releaseSpace() {
  spaceHeld = false;
  stage.classList.toggle("is-pan", tool === "pan");
}
document.addEventListener("keyup", (event) => {
  if (event.key === " ") releaseSpace();
});
window.addEventListener("blur", releaseSpace);

new ResizeObserver(() => {
  if (!lastSize) return fitView();
  const width = stage.clientWidth;
  const height = stage.clientHeight;
  if (width === lastSize.width && height === lastSize.height) return;
  if (!chart.units.length || width < lastSize.width || height < lastSize.height) return fitView();
  view.x += (width - lastSize.width) / 2;
  view.y += (height - lastSize.height) / 2;
  lastSize = { width, height };
  applyView();
}).observe(stage);

initializeViewMode();
setPlacement(null);
render();
save();
fitView();
