"use strict";

// Bounds already include any desired viewport margin. Traversal is independent
// of bounds because a formation's descendants may be far from its own marker.
function mapVisibleAtZoom(model, {zoom, west, east, south, north, autoDetail = true, collapsed = new Set(), limit = 450}) {
  const thresholds = {theatre:6, armyGroup:7, fieldArmy:8, corps:9, division:10, regiment:12, battalion:13, company:15, platoon:16, squad:17};
  const reachable = [];
  const expanded = new Set();
  const visit = (id, locked) => {
    const unit = model.units.get(id);
    if (!unit || (model.side !== 'both' && unit.side !== model.side)) return;
    reachable.push(id);
    const frozen = locked || model.locks.has(id);
    const open = !collapsed.has(id) && (model.expanded.has(id) ||
      (autoDetail && !frozen && zoom >= (unit.commandCategory==='highCommand'?6:unit.commandCategory==='operationalGroup'?9:thresholds[unit.rank] ?? Infinity)));
    if(open&&(model.children.get(id)??[]).length)expanded.add(id);
    if (open) for (const child of model.children.get(id) ?? []) visit(child, frozen);
  };
  if (model.focus) visit(model.focus, model.ancestors(model.focus).some(id => model.locks.has(id)));
  else for (const id of model.children.get(null) ?? []) visit(id, false);

  const reachableSet = new Set(reachable);
  const inBounds = id => {
    const p = model.position(id);
    return Number.isFinite(p.lon) && Number.isFinite(p.lat) && p.lon >= west && p.lon <= east && p.lat >= south && p.lat <= north;
  };
  const chain = id => {
    const ids = [];
    while (id && reachableSet.has(id)) {
      ids.unshift(id);
      if (id === model.focus) break;
      id = model.units.get(id).parent;
    }
    return ids;
  };
  const included = new Set();
  const max = Math.max(0, Math.floor(limit));
  let limited = false;
  const addChain = id => {
    const missing = chain(id).filter(key => !included.has(key));
    if (included.size + missing.length > max) { limited = true; return; }
    for (const key of missing) included.add(key);
  };
  if (model.selected && reachableSet.has(model.selected)) addChain(model.selected);
  for (const id of reachable) if (inBounds(id)) addChain(id);
  const ids = reachable.filter(id => included.has(id) && model.hasPosition(id));
  return {ids, expanded, limited, reachableIds: reachable};
}

// Return descendants in command order without assigning positions to them.
// The supplied expansion set is the logical expansion returned by the view.
function mapZoomPendingBranch(model, rootId, expanded) {
  const rows = [];
  const visit = (parent, depth) => {
    if (!expanded.has(parent)) return;
    for (const id of model.children.get(parent) ?? []) {
      const unit = model.units.get(id);
      if (!unit || (model.side !== 'both' && unit.side !== model.side)) continue;
      rows.push({id, parent, depth, pending: !model.hasPosition(id)});
      visit(id, depth + 1);
    }
  };
  const root = model.units.get(rootId);
  if (root && (model.side === 'both' || root.side === model.side)) visit(rootId, 1);
  return rows;
}
