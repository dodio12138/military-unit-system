"use strict";

const icons = {
  undo: '<path d="M8 5 3 10l5 5M3 10h11a6 6 0 0 1 6 6v2"/>',
  redo: '<path d="m16 5 5 5-5 5m5-5H10a6 6 0 0 0-6 6v2"/>',
  pencil: '<path d="m15 5 4 4M4 20l4-.8L20 7l-4-4L4 15.2Z"/>',
  layout: '<path d="M12 8v4M5 16v-4h14v4"/><rect x="9" y="3" width="6" height="5" rx="1"/><rect x="2" y="16" width="6" height="5" rx="1"/><rect x="16" y="16" width="6" height="5" rx="1"/>',
  diagram: '<rect x="3" y="4" width="18" height="16" rx="1"/><path d="M12 8v4M7 16v-4h10v4"/>',
  library: '<path d="M4 8h16v12H4zM6 4h12M8 12h8"/>',
  chevron: '<path d="m6 9 6 6 6-6"/>',
  cursor: '<path d="m5 3 14 10-7 .8-3 6.2L5 3Z"/>',
  hand: '<path d="M8 12V5a1.5 1.5 0 0 1 3 0v5-7a1.5 1.5 0 0 1 3 0v7-5a1.5 1.5 0 0 1 3 0v6-3a1.5 1.5 0 0 1 3 0v6a7 7 0 0 1-7 7h-1a6 6 0 0 1-5-2.5L3.5 14a1.7 1.7 0 0 1 2.6-2.1L8 14"/>',
  fit: '<path d="M8 4H4v4m12-4h4v4M4 16v4h4m12-4v4h-4"/><rect x="9" y="9" width="6" height="6" rx="1"/>',
  check: '<path d="m5 12 4 4L19 6"/>',
  "empty-square": '<rect x="4" y="5" width="16" height="14" rx="1" stroke-dasharray="2.5 2.5"/>',
  branch: '<rect x="3" y="3" width="7" height="5" rx="1"/><path d="M6.5 8v9H13"/><rect x="13" y="14" width="8" height="6" rx="1"/>',
  grip: '<circle cx="10" cy="6" r=".7"/><circle cx="14" cy="6" r=".7"/><circle cx="10" cy="12" r=".7"/><circle cx="14" cy="12" r=".7"/><circle cx="10" cy="18" r=".7"/><circle cx="14" cy="18" r=".7"/>',
  trash: '<path d="M4 7h16m-14 0 1 13h10l1-13M9 7V4h6v3m-5 4v5m4-5v5"/>',
  lock: '<rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3m-4 5v2"/>',
  download: '<path d="M12 3v12m-4-4 4 4 4-4M4 15v5h16v-5"/>',
};

const infantryCross = '<path d="M1 1 75 47M75 1 1 47"/>';
const tracks = '<rect class="armor-mark" x="17" y="13" width="42" height="22" rx="6" ry="6"/>';
const shieldMark = '<path d="M29 17q5 2 9-1 4 3 9 1v6q0 8-9 11-9-3-9-11Z"/>';
const types = {
  general: { name: "通用", rank: "none", drawing: "" },
  infantry: { name: "步兵", rank: "company", drawing: infantryCross },
  independent: { name: "独立步兵", rank: "regiment", drawing: '<path d="M1 1 75 47M75 1 1 47M32 5v7m-3.5-3.5h7M44 5v7m-3.5-3.5h7"/>' },
  cavalry: { name: "骑兵", rank: "battalion", drawing: '<path d="M1 47 75 1"/>' },
  artillery: { name: "炮兵", rank: "battalion", drawing: '<circle class="dot" cx="38" cy="24" r="5"/>' },
  engineer: { name: "工兵", rank: "battalion", drawing: '<path d="M25 19v10m0-5h26m0-5v10"/>' },
  headquarters: { name: "指挥部", rank: "none", drawing: '<path d="M1 13h74"/>' },
  logistics: { name: "辎重", rank: "battalion", drawing: '<circle cx="38" cy="24" r="9"/><path d="M29 24h18m-9-9v18m-6-15 12 12m0-12L32 30"/>' },
  signal: { name: "通信", rank: "company", drawing: '<path d="m42 13-12 12h12l-9 11"/>' },
  medical: { name: "医疗", rank: "company", drawing: '<path d="M38 14v20M28 24h20"/>' },
  shield: { name: "盾形标记", rank: "battalion", drawing: shieldMark },
  specialService: { name: "特务", rank: "battalion", drawing: shieldMark },
  training: { name: "教导", rank: "battalion", drawing: '<circle cx="38" cy="24" r="13"/><path class="dot" d="m38 13 2.6 7.5 8 .2-6.3 4.9 2.3 7.7-6.6-4.6-6.6 4.6 2.3-7.7-6.3-4.9 8-.2Z"/>' },
  tank: { name: mobileBranches.tank.name, rank: "company", drawing: tracks },
  truck: { name: "卡车", rank: "team", drawing: '<path d="M18 31V17h25v6h9l6 8H18Z"/><circle class="dot" cx="27" cy="34" r="3"/><circle class="dot" cx="50" cy="34" r="3"/>' },
  mechanized: { name: mobileBranches.mechanized.name, rank: "company", drawing: infantryCross + tracks },
  motorized: { name: mobileBranches.motorized.name, rank: "company", drawing: infantryCross + '<circle cx="30" cy="39" r="3"/><circle cx="46" cy="39" r="3"/>' },
  armoredRecon: { name: mobileBranches.armoredRecon.name, rank: "company", drawing: tracks + '<path d="M22 31 54 17"/>' },
  assaultGun: { name: mobileBranches.assaultGun.name, rank: "company", drawing: tracks + '<path d="M29 24h18m0-6v12"/>' },
  selfPropelledArtillery: { name: mobileBranches.selfPropelledArtillery.name, rank: "company", drawing: tracks + '<circle class="dot" cx="38" cy="24" r="5"/>' },
};

const ranks = {
  none: { name: "无级别标记" },
  team: { name: "火力小组／机组", crew: true },
  squad: { name: "班／基层队", dots: 1 },
  section: { name: "小队", dots: 2 },
  platoon: { name: "排", dots: 3 },
  company: { name: "连", bars: 1 },
  battalion: { name: "营", bars: 2 },
  regiment: { name: "团", bars: 3 },
  brigade: { name: "旅", crosses: 1 },
  division: { name: "师", crosses: 2 },
  corps: { name: "军", crosses: 3 },
  fieldArmy: { name: "野战集团军", crosses: 4 },
  armyGroup: { name: "集团军群", crosses: 5 },
  theatre: { name: "战区", crosses: 6 },
};

const groups = [
  { name: "作战单位", keys: ["infantry", "independent", "cavalry", "artillery", "engineer", "shield"] },
  { name: "装甲与机动", keys: Object.keys(mobileBranches) },
  { name: "运输装备", keys: ["truck"] },
  { name: "指挥与保障", keys: ["headquarters", "logistics", "training", "specialService", "signal", "medical"] },
];

function icon(name) {
  return `<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${icons[name]}</svg>`;
}

function rankMark(rank) {
  const { dots, bars, crosses, crew } = ranks[rank];
  const count = dots ?? bars ?? crosses ?? 0;
  const width = Math.max(32, 9 * count);
  const marks = Array.from({ length: count }, (_, index) => {
    const x = width / 2 + (index - (count - 1) / 2) * (crosses ? 9 : dots ? 10 : 6);
    if (dots) return `<circle cx="${x}" cy="8" r="1.8" fill="currentColor"/>`;
    if (bars) return `<path d="M${x} 4v8"/>`;
    return `<path d="m${x - 3} 5 6 6m0-6-6 6"/>`;
  });
  const crewMark = crew ? '<circle cx="16" cy="8" r="4"/><path d="m12 12 8-8"/>' : "";
  return `<svg class="rank-mark" viewBox="0 0 ${width} 16" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="square" aria-hidden="true">${crewMark}${marks.join("")}</svg>`;
}

function symbol(type, stacked = false) {
  const depth = displayMode === "depth";
  const layerStep = depth ? 7 : 4;
  const layers = stacked ? [2, 1].map(index => {
    const offset = 1 + index * layerStep;
    return `<rect class="stack-frame" x="${offset}" y="${offset}" width="74" height="46"/>`;
  }).join("") : "";
  // Convert a vertical height into ground coordinates: the shared camera
  // projects every connecting edge straight down, without sideways shear.
  const offset = unprojectPoint({ x: 0, y: 7 }, "depth");
  const dx = offset.x, dy = offset.y;
  const sides = depth ? `<path class="symbol-side" d="M75 1l${dx} ${dy}v46l${-dx} ${-dy}Z"/><path class="symbol-bottom" d="M1 47l${dx} ${dy}h74l${-dx} ${-dy}Z"/>` : "";
  return `<svg class="unit-symbol${depth ? " depth-symbol" : ""}" viewBox="0 0 76 48" aria-hidden="true"><g class="symbol-ink">${layers}${sides}<rect class="symbol-frame" x="1" y="1" width="74" height="46"/>${types[type].drawing}</g></svg>`;
}
