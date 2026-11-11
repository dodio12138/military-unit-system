"use strict";

const presetStorageKey = "military-unit-system:presets:v1";

function personnelTotal(personnel) {
  return (personnel ?? []).reduce((sum, entry) => sum + entry.count, 0);
}

function officerTotal(personnel) {
  return personnelTotal((personnel ?? []).filter((entry) => entry.officer));
}

function headquartersPreset(name, rank, personnel) {
  const count = personnelTotal(personnel);
  return { name, rank, type: "headquarters", role: "指挥与参谋", strength: [count, count], personnel };
}

// Editable sample crews, not a historical or model-specific establishment.
const equipmentKinds = {
  signal: { name: "电台", unit: "部", roles: [["报务员", 1], ["机务员", 1]] },
  tank: { name: "坦克", unit: "辆", roles: [["车长", 1], ["炮长", 1], ["装填手", 1], ["驾驶员", 1], ["无线电员", 1]] },
  artillery: { name: "火炮", unit: "门", roles: [["炮长", 1], ["瞄准手", 1], ["装填手", 2], ["弹药手", 2]] },
  truck: { name: "卡车", unit: "辆", roles: [["驾驶员", 1], ["副驾驶员", 1]] },
  armoredRecon: { name: "装甲侦察车", unit: "辆", roles: [["车长", 1], ["驾驶员", 1], ["炮手", 1], ["无线电员", 1]] },
  assaultGun: { name: "突击炮", unit: "辆", roles: [["车长", 1], ["炮长", 1], ["装填手", 1], ["驾驶员", 1]] },
  selfPropelledArtillery: { name: "自行火炮", unit: "辆", roles: [["车长", 1], ["炮长", 1], ["装填手", 2], ["驾驶员", 1]] },
};

function equipmentPreset(kind) {
  const definition = equipmentKinds[kind];
  const personnel = definition.roles.map(([role, count]) => ({ role, count, officer: false }));
  const people = personnelTotal(personnel);
  return { name: definition.name, type: kind, rank: "team", equipment: { kind },
    role: "单件装备 · 示例定员，可按型号修改", strength: [people, people], personnel };
}

function ownEquipment(item) {
  return equipmentKinds[item.equipment?.kind] ? { [item.equipment.kind]: 1 } : {};
}

function addEquipment(target, source, quantity = 1) {
  for (const [kind, count] of Object.entries(source)) target[kind] = (target[kind] ?? 0) + count * quantity;
}

function equipmentSummary(counts) {
  return Object.entries(counts).map(([kind, count]) => `${equipmentKinds[kind].name} ${count.toLocaleString()} ${equipmentKinds[kind].unit}`).join(" · ");
}

const mobileBranches = {
  tank: { name: "坦克", crew: 5 },
  mechanized: { name: "装甲步兵" },
  motorized: { name: "摩托化步兵" },
  armoredRecon: { name: "装甲侦察", crew: 4 },
  assaultGun: { name: "突击炮", crew: 4 },
  selfPropelledArtillery: { name: "自行火炮", crew: 5 },
};

const builtInPresets = {
  "form-team": { name: "火力小组", rank: "team", type: "general", role: "最小战斗单位", strength: [4, 4] },
  "form-crew": { name: "机组", rank: "team", type: "general", role: "最小操作单位", strength: [3, 3] },
  "form-squad": { name: "基层队", rank: "squad", type: "general", role: "最小指挥战斗单位", strength: [9, 9] },
  "form-section": { name: "小队", rank: "section", type: "general", role: "基层战斗分队", parts: [["form-team", 3]] },
  "form-section-squad": { name: "小队（基层队）", rank: "section", type: "general", role: "基层战斗分队", parts: [["form-squad", 2]] },
  "form-platoon": { name: "排", rank: "platoon", type: "general", role: "战斗分队", parts: [["form-platoon-hq", 1], ["form-section", 3]] },
  "form-company": { name: "连", rank: "company", type: "general", role: "基层单位", parts: [["form-company-hq", 1], ["form-platoon", 3]] },
  "form-battalion": { name: "步兵营", rank: "battalion", type: "infantry", role: "战术单位", parts: [["form-infantry-company", 3]] },
  "form-regiment": { name: "团", rank: "regiment", type: "general", role: "战术单位", parts: [["form-battalion", 3]] },
  "form-brigade": { name: "旅", rank: "brigade", type: "general", role: "战术编队", parts: [["form-regiment", 2]] },
  "form-division": { name: "师", rank: "division", type: "general", role: "战术编队", parts: [["form-brigade", 2]] },
  "form-corps": { name: "军", rank: "corps", type: "general", role: "战役编队", parts: [["form-division", 2]] },
  "form-field-army": { name: "野战集团军", rank: "fieldArmy", type: "general", role: "战役指挥层级", parts: [["form-corps", 3]] },
  "form-army-group": { name: "集团军群", rank: "armyGroup", type: "general", role: "战役指挥层级", parts: [["form-field-army", 2]] },
  "form-theatre": { name: "战区", rank: "theatre", type: "general", role: "战略指挥层级", parts: [["form-army-group", 4]] },
  "form-staff": headquartersPreset("指挥部", "none", [
    { role: "指挥官", count: 1, officer: true },
    { role: "通信员", count: 1, officer: false },
    { role: "文书", count: 1, officer: false },
  ]),
  "form-platoon-hq": headquartersPreset("排部", "platoon", [
    { role: "排长", count: 1, officer: true },
    { role: "排士官", count: 1, officer: false },
    { role: "无线电员", count: 1, officer: false },
  ]),
  "form-company-hq": headquartersPreset("连部", "company", [
    { role: "连长", count: 1, officer: true },
    { role: "副连长", count: 1, officer: true },
    { role: "连士官长", count: 1, officer: false },
    { role: "无线电员", count: 1, officer: false },
    { role: "军需员", count: 1, officer: false },
    { role: "文书", count: 1, officer: false },
  ]),
  "form-infantry-platoon": {
    name: "步兵排", rank: "platoon", type: "infantry", role: "步兵分队",
    parts: [["form-platoon-hq", 1], ["form-section", 3]],
  },
  "form-infantry-company": {
    name: "步兵连", rank: "company", type: "infantry", role: "步兵单位",
    parts: [["form-company-hq", 1], ["form-infantry-platoon", 3]],
  },
  "form-guard-platoon": {
    name: "警卫排", rank: "platoon", type: "infantry", role: "警卫分队",
    parts: [["form-platoon-hq", 1], ["form-section", 3]],
  },
  "form-guard-squad": {
    name: "警卫班", rank: "squad", type: "infantry", role: "机关警卫", strength: [9, 9], estimated: true,
  },
  "form-guard-company": {
    name: "警卫连", rank: "company", type: "infantry", role: "警卫单位",
    parts: [["form-company-hq", 1], ["form-guard-platoon", 3]],
  },
};

for (const rank of ["platoon", "company", "battalion"]) {
  const key = `form-115-guard-${rank}-hq`;
  const staff = builtInPresets[`form-${rank}-hq`];
  builtInPresets[key] = rank === "battalion"
    ? { ...headquartersPreset("警卫营部", rank, [
      { role: "指挥与参谋", count: 4, officer: true },
      { role: "通信与勤务", count: 8, officer: false },
    ]), estimated: true }
    : { ...staff, estimated: true };
}

const commandGuards = {
  battalion: "form-guard-squad",
  regiment: "form-115-regiment-guard",
  brigade: "form-115-brigade-guard",
  division: "form-115-division-guard",
};
const brigade344Guard = "form-115-brigade-344-guard";
Object.assign(builtInPresets, {
  [commandGuards.brigade]: {
    name: "警卫排", rank: "platoon", type: "infantry", estimated: true,
    role: "机关警卫分队，按排级推定",
    parts: [["form-115-guard-platoon-hq", 1], ["form-guard-squad", 3]],
  },
  [commandGuards.regiment]: {
    name: "特务连", rank: "company", type: "infantry", estimated: true,
    role: "参照第686团特务连记载，其他团参照推定",
    parts: [["form-115-guard-company-hq", 1], [commandGuards.brigade, 3]],
  },
  "form-115-guard-company": {
    name: "警卫连", rank: "company", type: "infantry", estimated: true,
    role: "警卫营下属连，编成与员额为推定",
    parts: [["form-115-guard-company-hq", 1], [commandGuards.brigade, 3]],
  },
  [brigade344Guard]: {
    name: "警卫营", rank: "battalion", type: "infantry", estimated: true,
    role: "第344旅直属警卫营有史料记载，员额与下属编成为推定",
    parts: [["form-115-guard-battalion-hq", 1], ["form-115-guard-company", 3]],
  },
  [commandGuards.division]: {
    name: "机关警卫队", rank: "platoon", type: "infantry", estimated: true,
    role: "参照一一五师后期机关警卫的排加班规模，推定改编初期员额",
    parts: [[commandGuards.brigade, 1], ["form-guard-squad", 1]],
  },
});

const higherCommands = [
  { formation: "form-battalion", name: "营部", commander: "营长", deputy: "副营长", staff: [1, 1, 1, 3, 1, 2] },
  { formation: "form-regiment", name: "团部", commander: "团长", deputy: "副团长", staff: [2, 1, 1, 4, 2, 3] },
  { formation: "form-brigade", name: "旅部", commander: "旅长", deputy: "副旅长", staff: [3, 2, 2, 6, 3, 5] },
  { formation: "form-division", name: "师部", commander: "师长", deputy: "副师长", staff: [5, 3, 3, 8, 4, 6] },
  { formation: "form-corps", name: "军部", commander: "军长", deputy: "副军长", staff: [8, 5, 5, 12, 6, 9] },
  { formation: "form-field-army", name: "集团军司令部", commander: "司令员", deputy: "副司令员", staff: [11, 7, 7, 16, 8, 12] },
  { formation: "form-army-group", name: "集团军群司令部", commander: "司令员", deputy: "副司令员", staff: [14, 9, 9, 20, 10, 15] },
  { formation: "form-theatre", name: "战区司令部", commander: "司令员", deputy: "副司令员", staff: [17, 11, 11, 24, 12, 18] },
];

for (const { formation, name, commander, deputy, staff } of higherCommands) {
  const key = `${formation}-hq`;
  const roster = [
    { role: commander, count: 1, officer: true },
    { role: deputy, count: 1, officer: true },
    { role: "参谋长", count: 1, officer: true },
    ...["作战参谋", "情报参谋", "后勤参谋", "通信员", "文书", "勤务员"].map((role, index) => ({
      role, count: staff[index], officer: index < 3,
    })),
  ];
  builtInPresets[key] = {
    ...headquartersPreset(name, builtInPresets[formation].rank, roster),
    parts: [[commandGuards[builtInPresets[formation].rank] ?? "form-guard-company", 1]],
  };
  builtInPresets[formation].parts.unshift([key, 1]);
}

for (const [type, { name, crew }] of Object.entries(mobileBranches)) {
  const crewKey = `form-${type}-team`;
  const platoonKey = `form-${type}-platoon`;
  if (crew) {
    builtInPresets[crewKey] = equipmentPreset(type);
  }
  builtInPresets[platoonKey] = {
    name: `${name}排`, type, rank: "platoon", role: "机动分队",
    parts: crew ? [[crewKey, 3]] : [["form-platoon-hq", 1], ["form-section", 3]],
  };
  builtInPresets[`form-${type}-company`] = {
    name: `${name}连`, type, rank: "company", role: "机动单位", parts: [["form-company-hq", 1], [platoonKey, 3]],
  };
}

builtInPresets["form-artillery-team"] = equipmentPreset("artillery");
builtInPresets["form-truck-team"] = equipmentPreset("truck");
builtInPresets["form-signal-team"] = equipmentPreset("signal");

// Equipment formations are editable examples, not a dated historical establishment.
for (const [type, name] of [["artillery", "炮兵"], ["logistics", "辎重"]]) {
  for (const rank of ["platoon", "company", "battalion"]) {
    const source = structuredClone(builtInPresets[`form-${rank}-hq`]);
    builtInPresets[`form-${type}-${rank}-hq`] = {
      ...source, name: `${name}${{ platoon: "排部", company: "连部", battalion: "营部" }[rank]}`,
      role: "指挥与勤务 · 示例定员",
    };
  }
}
Object.assign(builtInPresets, {
  "form-artillery-platoon": {
    name: "炮兵排", type: "artillery", rank: "platoon", role: "装备编成示例 · 每门炮配一辆牵引卡车",
    parts: [["form-artillery-platoon-hq", 1], ["form-artillery-team", 2], ["form-truck-team", 2]],
  },
  "form-artillery-company": {
    name: "炮兵连", type: "artillery", rank: "company", role: "装备编成示例 · 下辖两个炮兵排",
    parts: [["form-artillery-company-hq", 1], ["form-artillery-platoon", 2]],
  },
  "form-artillery-battalion": {
    name: "炮兵营", type: "artillery", rank: "battalion", role: "装备编成与定员为示例",
    parts: [["form-artillery-battalion-hq", 1], ["form-artillery-company", 3]],
  },
  "form-logistics-platoon": {
    name: "辎重排", type: "logistics", rank: "platoon", role: "汽车运输编成示例 · 下辖三辆卡车",
    parts: [["form-logistics-platoon-hq", 1], ["form-truck-team", 3]],
  },
  "form-logistics-company": {
    name: "辎重连", type: "logistics", rank: "company", role: "汽车运输编成示例 · 下辖三个辎重排",
    parts: [["form-logistics-company-hq", 1], ["form-logistics-platoon", 3]],
  },
  "form-logistics-battalion": {
    name: "辎重营", type: "logistics", rank: "battalion", role: "汽车运输编成与定员为示例",
    parts: [["form-logistics-battalion-hq", 1], ["form-logistics-company", 3]],
  },
});

const formationGroups = [
  { name: "班组与分队", keys: ["form-team", "form-crew", "form-squad", "form-guard-squad", "form-section", "form-section-squad", "form-platoon"] },
  { name: "单件装备与乘员", keys: Object.keys(equipmentKinds).map(type => `form-${type}-team`) },
  { name: "战术单位", keys: ["form-company", "form-infantry-company", "form-battalion", "form-regiment", "form-guard-company"] },
  { name: "炮兵与运输", keys: ["form-artillery-platoon", "form-artillery-company", "form-artillery-battalion", "form-logistics-platoon", "form-logistics-company", "form-logistics-battalion"] },
  { name: "指挥机构", keys: ["form-platoon-hq", "form-company-hq", ...higherCommands.map(({ formation }) => `${formation}-hq`), "form-staff"] },
  { name: "装甲与机动", keys: Object.keys(mobileBranches).map((type) => `form-${type}-company`) },
  { name: "编队与指挥", keys: ["form-brigade", "form-division", "form-corps", "form-field-army", "form-army-group", "form-theatre"] },
];

const legacyPresetRanges = {
  "form-team": [2, 4],
  "form-crew": [2, 4],
  "form-squad": [6, 12],
};

function fixedStrength(strength) {
  return Number.isSafeInteger(strength?.[0]) && strength[0] > 0 && strength[0] === strength[1];
}

function migrateDefaultStrength(item, key) {
  if (!item?.strength || fixedStrength(item.strength)) return false;
  const name = item.name?.replace(/ \d+$/, "");
  for (const [id, [min, max]] of Object.entries(legacyPresetRanges)) {
    const preset = builtInPresets[id];
    if ((key === id || name === preset.name) && item.rank === preset.rank && item.type === preset.type
        && item.strength[0] === min && item.strength[1] === max) {
      item.strength = [...preset.strength];
      return true;
    }
  }
  return false;
}

function presetTree(definitions, root) {
  const result = Object.create(null);
  const visiting = new Set();
  function visit(key) {
    if (visiting.has(key)) throw new Error("预设不能直接或间接引用自身");
    if (Object.hasOwn(result, key)) return;
    const preset = Object.hasOwn(definitions, key) && definitions[key];
    if (!preset) throw new Error("有下级预设已不存在");
    visiting.add(key);
    for (const [child] of preset.parts ?? []) visit(child);
    visiting.delete(key);
    result[key] = preset;
  }
  visit(root);
  return result;
}

function presetStats(definitions, root, memo = new Map()) {
  if (memo.has(root)) return memo.get(root);
  const preset = definitions[root];
  const parts = preset.parts ?? [];
  const known = fixedStrength(preset.strength);
  const stat = {
    size: 1, depth: 1,
    equipment: ownEquipment(preset),
    people: known ? preset.strength[0] : 0,
    officers: officerTotal(preset.personnel),
    estimated: Boolean(preset.estimated),
    known, incomplete: !known && (Boolean(preset.strength) || !parts.length),
  };
  for (const [key, count] of parts) {
    const child = presetStats(definitions, key, memo);
    stat.size += child.size * count;
    stat.depth = Math.max(stat.depth, child.depth + 1);
    stat.people += child.people * count;
    addEquipment(stat.equipment, child.equipment, count);
    stat.officers += child.officers * count;
    stat.estimated ||= child.estimated;
    stat.known ||= child.known;
    stat.incomplete ||= child.incomplete;
  }
  memo.set(root, stat);
  return stat;
}

// These complete the existing New Fourth Army diagram with editable illustrative staffing.
const newFourthDirectBranches = {
  'new-fourth-army-hq': 'n4-direct-hq',
  'n4-special-battalion': 'n4-direct-special',
  'n4-school': 'n4-direct-school',
  'n4-logistics': 'n4-direct-logistics',
};

function newFourthDirectPresets() {
  const definitions = {};
  for (const key of ['form-battalion', 'form-logistics-platoon', 'form-signal-team', 'form-section']) {
    Object.assign(definitions, structuredClone(presetTree(builtInPresets, key)));
  }
  function staff(key, name, rank, roles, parts = []) {
    definitions[key] = { ...headquartersPreset(name, rank, roles.map(([role, count, officer = false]) => ({ role, count, officer }))),
      parts, estimated: true, role: '补充编成与定员为示例' };
  }
  function team(key, name, type, people) {
    definitions[key] = { name, type, rank:'team', strength:[people,people], estimated:true, role:'基层人员组 · 示例定员' };
  }
  team('n4-publicity-team', '宣传组', 'general', 4);
  team('n4-repair-team', '修理组', 'engineer', 4);
  team('n4-medical-team', '医疗组', 'medical', 5);
  definitions['n4-warehouse-squad'] = {name:'仓储班',type:'logistics',rank:'squad',strength:[9,9],estimated:true,role:'仓储与装卸 · 示例定员'};
  definitions['n4-signal-platoon'] = {name:'通信排',type:'signal',rank:'platoon',estimated:true,role:'电台与操作人员为示例',
    parts:[['form-platoon-hq',1],['form-signal-team',3]]};
  staff('n4-direct-hq','军部','corps', [['军长',1,true],['副军长',1,true],['勤务员',2]], [['n4-direct-staff',1],['n4-direct-political',1]]);
  staff('n4-direct-staff','司令部','none', [['参谋长',1,true],['副参谋长',1,true],['参谋',4,true],['通信员',2],['文书',4]], [['n4-signal-platoon',1]]);
  staff('n4-direct-political','政治部','none', [['主任',1,true],['副主任',1,true],['干事',4],['文书',2]], [['n4-direct-field-service',1]]);
  staff('n4-direct-field-service','战地服务团','regiment', [['团长',1,true],['勤务员',2]], [['n4-publicity-team',3]]);
  definitions['n4-direct-special'] = { ...definitions['form-battalion'], name:'军部特务营',type:'specialService',estimated:true,role:'下级编成与定员为示例' };
  staff('n4-school-staff','教导队部','company', [['教官',2,true],['勤务员',2]]);
  definitions['n4-student-section'] = { ...definitions['form-section'],name:'学员小队',type:'training',estimated:true };
  definitions['n4-direct-school'] = { ...headquartersPreset('军部教导队','company',[{role:'筹办',count:1,officer:true}]),type:'training',estimated:true,
    role:'下级编成与定员为示例', parts:[['n4-school-staff',1],['n4-student-section',3]] };
  staff('n4-direct-logistics','总兵站','none', [['站长',1,true],['军需员',2],['文书',2]],
    [['form-logistics-platoon',1],['n4-warehouse-squad',1],['n4-repair-team',1],['n4-medical-team',1]]);
  return definitions;
}
