"use strict";

function previousExample() {
  return {
    title: "一一五师",
    example: true,
    units: [
      { id: "115", name: "一一五师", type: "infantry", rank: "division", x: 412, y: 64, parent: null },
      { id: "343", name: "第343旅", type: "infantry", rank: "brigade", x: 100, y: 208, parent: "115" },
      { id: "344", name: "第344旅", type: "infantry", rank: "brigade", x: 300, y: 208, parent: "115" },
      { id: "independent", name: "独立团", type: "infantry", rank: "regiment", x: 500, y: 208, parent: "115" },
      { id: "staff", name: "师部", type: "headquarters", rank: "division", x: 700, y: 208, parent: "115" },
      { id: "685", name: "第685团", type: "infantry", rank: "regiment", x: 124, y: 320, parent: "343" },
      { id: "686", name: "第686团", type: "infantry", rank: "regiment", x: 124, y: 424, parent: "343" },
      { id: "687", name: "第687团", type: "infantry", rank: "regiment", x: 324, y: 320, parent: "344" },
      { id: "688", name: "第688团", type: "infantry", rank: "regiment", x: 324, y: 424, parent: "344" },
      { id: "battalion", name: "步兵营", type: "infantry", rank: "battalion", x: 524, y: 320, parent: "independent" },
      { id: "cavalry", name: "骑兵营", type: "cavalry", rank: "battalion", x: 724, y: 320, parent: "staff" },
      { id: "artillery", name: "炮兵营", type: "artillery", rank: "battalion", x: 724, y: 424, parent: "staff" },
    ],
  };
}

const divisionReferences = {
  "115": { name: "一一五师", brigades: [["343", "685", "686"], ["344", "687", "688"]], central: ["independent", "独立团", "independent"], support: "training" },
  "120": { name: "一二〇师", brigades: [["358", "715", "716"], ["359", "717", "718"]], central: ["training-regiment", "教导团", "training"], support: "specialService" },
  "129": { name: "一二九师", brigades: [["385", "769", "770"], ["386", "771", "772"]], central: ["training-regiment", "教导团", "training"], support: "specialService" },
};

function exampleChart(division = "115") {
  const { name, brigades, central, support } = divisionReferences[division];
  const units = [];
  const stacks = {};
  function plate(id, unitName, type, rank, x, y, parent, connector, plateLabel = "") {
    units.push({ id, name: unitName, type, rank, x, y, parent, connector, plateLabel });
  }
  function battalions(parent, x, y) {
    const ids = [];
    for (let i = 0; i < 3; i++) {
      const id = `${parent}-b${i + 1}`;
      ids.push(id);
      plate(id, `步兵营 ${i + 1}`, "infantry", "battalion", x, y + i * 96, parent, "left-rail");
    }
    stacks[ids[0]] = ids;
  }
  plate(division, name, "infantry", "division", 460, 76, null, "reference-root");
  plate("staff", "师部指挥部", "headquarters", "none", 584, 176, division, "stem");
  for (const [column, [brigade]] of brigades.entries()) {
    plate(brigade, `第${brigade}旅`, "infantry", "brigade", 40 + column * 280, 304, division, "bus", brigade);
  }
  plate(...central, "regiment", 600, 304, division, "bus");
  for (const [column, [brigade, ...regiments]] of brigades.entries()) {
    for (const [row, regiment] of regiments.entries()) {
      const x = 64 + column * 280;
      const y = 400 + row * 192;
      plate(regiment, `第${regiment}团`, "infantry", "regiment", x, y, brigade, "left-rail", regiment);
      battalions(regiment, x + 24, y + 96);
    }
  }
  battalions(central[0], 624, 400);
  if (division === "115") plate("shield", "盾形标记营", "shield", "battalion", 344, 784, "344", "left-rail");
  for (const [i, type] of ["cavalry", "artillery", "engineer", "logistics", support].entries()) {
    plate(type, types[type].name + "营", type, "battalion", 904, 304 + i * 96, division, "right-rail");
  }
  return { id: `reference-${division}`, title: name, example: true, reference: true, referenceDivision: division, referenceLayoutVersion: 2, units, stacks };
}

function infantryExample(id, key, title, rootId) {
  const definitions = presetTree(builtInPresets, key);
  if (key === "form-company") {
    definitions[key] = { ...definitions[key], name: "步兵连", type: "infantry" };
    definitions["form-platoon"] = { ...definitions["form-platoon"], name: "步兵排", type: "infantry" };
  }
  const root = makePresetUnit(definitions[key], 0, 0, null, { snapshot: id, key });
  root.id = rootId;
  return {
    id,
    title,
    headquartersVersion: 1,
    showComposition: true,
    units: [root],
    recipes: { [id]: definitions },
  };
}

function infantryCompanyExample() {
  return infantryExample(infantryExampleId, "form-company", "步兵连编制示例", "infantry-company");
}

function infantryBattalionExample() {
  return { ...infantryExample(battalionExampleId, "form-battalion", "步兵营编制示例", "infantry-battalion"), commandGuardVersion: 1 };
}

function supportBattalionExample(type) {
  const id = type === "artillery" ? artilleryBattalionExampleId : logisticsBattalionExampleId;
  return { ...infantryExample(id, `form-${type}-battalion`, `${builtInPresets[`form-${type}-battalion`].name}编制示例`, `${type}-battalion`),
    equipmentFormation: true };
}

function completeDivisionExample(division = "115") {
  const document = exampleChart(division);
  const snapshot = `example-${division}-complete`;
  document.id = snapshot;
  document.title += "完整编制";
  document.referenceComplete = true;
  document.commandGuardVersion = 1;
  document.referenceLayoutVersion = 2;
  const definitions = presetTree(builtInPresets, "form-division");
  if (division === "115") {
    Object.assign(definitions, presetTree(builtInPresets, brigade344Guard));
    definitions["reference-344-hq"] = { ...definitions["form-brigade-hq"], parts: [[brigade344Guard, 1]] };
  } else {
    definitions["form-division-hq"] = { ...definitions["form-division-hq"], parts: [], role: "师部机关 · 本部员额为示例" };
  }
  document.recipes = { [snapshot]: definitions };
  const equipmentSupport = { artillery: "form-artillery-battalion", logistics: "form-logistics-battalion" };
  for (const key of Object.values(equipmentSupport)) Object.assign(definitions, structuredClone(presetTree(builtInPresets, key)));
  const support = {
    cavalry: { name: "骑兵", team: "骑兵班", rank: "squad", count: 9 },
    engineer: { name: "工兵", team: "工兵班", rank: "squad", count: 9 },
    training: { name: "教导", team: "教导班", rank: "squad", count: 9 },
    shield: { name: "直属", team: "直属班", rank: "squad", count: 9 },
    specialService: { name: "特务", team: "特务班", rank: "squad", count: 9 },
  };
  for (const [type, { name, team, rank, count }] of Object.entries(support)) {
    const keys = ["team", "platoon", "company", "battalion"].map((level) => `reference-${type}-${level}`);
    definitions[keys[0]] = { name: team, type, rank, strength: [count, count] };
    definitions[keys[1]] = { name: `${name}排`, type, rank: "platoon", parts: [["form-platoon-hq", 1], [keys[0], 3]] };
    definitions[keys[2]] = { name: `${name}连`, type, rank: "company", parts: [["form-company-hq", 1], [keys[1], 3]] };
    definitions[keys[3]] = { name: `${name}营`, type, rank: "battalion", parts: [["form-battalion-hq", 1], [keys[2], 3]] };
  }
  const added = [];
  for (const unit of document.units) {
    if (unit.id === "staff") {
      const hq = definitions["form-division-hq"];
      unit.rank = hq.rank;
      unit.plateLabel = hq.name;
      unit.strength = [...hq.strength];
      unit.personnel = structuredClone(hq.personnel);
      unit.role = hq.role;
      if (hq.parts.length) unit.recipe = { snapshot, key: "form-division-hq" };
    }
    if (unit.rank === "battalion") {
      const key = unit.parent === "training-regiment" ? "reference-training-battalion"
        : equipmentSupport[unit.type] ?? (support[unit.type] ? `reference-${unit.type}-battalion` : "form-battalion");
      unit.recipe = { snapshot, key };
      if (unit.parent === "training-regiment") {
        unit.type = "training";
        unit.name = unit.name.replace("步兵", "教导");
      } else if (support[unit.type] || equipmentSupport[unit.type]) unit.plateLabel = unit.name;
    }
    if (unit.id === "independent") unit.plateLabel = unit.name;
    if (unit.rank === "brigade" || unit.rank === "regiment") {
      const key = unit.id === "344" ? "reference-344-hq" : `form-${unit.rank}-hq`;
      const hq = makePresetUnit(definitions[key], unit.x + 136, unit.y, unit.id, { snapshot, key });
      hq.id = `${unit.id}-hq`;
      hq.plateLabel = definitions[key].name;
      added.push(hq);
    }
  }
  document.units.push(...added);
  migrateSupportEquipment(document);
  return document;
}

function historicalCommand(name, rank, roles) {
  return { ...headquartersPreset(name, rank, roles.map((role) => ({ role, count: 1, officer: true }))),
    role: "仅录入史料所列主要岗位", rosterOnly: true };
}

function eighthRouteArmyExample() {
  const root = { id: "eighth-route-army", name: "八路军", type: "general", rank: "fieldArmy",
    x: 460, y: 76, parent: null, connector: "reference-root", plateLabel: "八路军" };
  const chart = { id: armyExampleId, title: "八路军总编制", reference: true, referenceArmy: true,
    referenceLayoutVersion: 2, units: [root], recipes: {}, stacks: {}, folded: [] };

  function add(id, definition, recipe) {
    const unit = makePresetUnit(definition, 0, 0, root.id, recipe);
    unit.id = id;
    unit.plateLabel = unit.name;
    chart.units.push(unit);
    return unit;
  }

  add("army-hq", historicalCommand("总指挥部", "fieldArmy", [
    "总指挥 朱德", "副总指挥 彭德怀", "参谋长 叶剑英", "副参谋长 左权",
    "政治部主任 任弼时", "政治部副主任 邓小平",
  ]));

  for (const division of Object.keys(divisionReferences)) {
    const example = completeDivisionExample(division);
    const ids = new Map(example.units.map((unit) => [unit.id, `${division}:${unit.id}`]));
    for (const unit of example.units) {
      chart.units.push({ ...unit, id: ids.get(unit.id), parent: unit.parent ? ids.get(unit.parent) : root.id });
    }
    for (const [id, members] of Object.entries(example.stacks)) {
      chart.stacks[ids.get(id)] = members.map((member) => ids.get(member));
    }
    Object.assign(chart.recipes, example.recipes);
    chart.folded.push(ids.get(division));
  }

  const definitions = presetTree(builtInPresets, "form-battalion");
  const regimentHQ = builtInPresets["form-regiment-hq"];
  definitions["army-special-hq"] = { ...regimentHQ, parts: [], estimated: true };
  definitions["army-special-regiment"] = {
    name: "总部特务团", type: "specialService", rank: "regiment", estimated: true,
    role: "总部直属部队，营以下编成及员额为示例",
    parts: [["army-special-hq", 1], ["form-battalion", 3]],
  };
  chart.recipes[armyExampleId] = definitions;
  add("army-special", definitions["army-special-regiment"], { snapshot: armyExampleId, key: "army-special-regiment" });
  add("army-school", historicalCommand("总部随营学校", "none", ["校长 韦国清", "政治委员 张平凯"]));
  add("army-rear", historicalCommand("后方总留守处", "none", ["主任 萧劲光"])).role =
    "统一指挥留陕部队，相关部队按原建制列在各师";
  arrangeReference(chart);
  migrateSupportEquipment(chart);
  return chart;
}

function newFourthArmyExample() {
  const rootId = "new-fourth-army";
  const snapshot = newFourthArmyExampleId;
  const definitions = presetTree(builtInPresets, "form-battalion");
  for (const key of ["form-platoon", "form-company"]) Object.assign(definitions, presetTree(builtInPresets, key));
  const document = { id: snapshot, title: "新四军总编制", reference: true, referenceNewFourthArmy: true,
    referenceLayoutVersion: 2, units: [], recipes: { [snapshot]: definitions }, stacks: {}, folded: [] };

  function add(id, parent, definition, key) {
    const unit = makePresetUnit(definition, 0, 0, parent, key ? { snapshot, key } : undefined);
    unit.id = id;
    unit.plateLabel = unit.name;
    document.units.push(unit);
    return unit;
  }

  function exampleBranch(id, parent, name, type, key, role = "下级编成与员额为示例") {
    return add(id, parent, { ...definitions[key], name, type, role, estimated: true }, key);
  }

  add(rootId, null, { name: "新四军", type: "general", rank: "corps", role: "国民革命军陆军新编第四军" });
  const headquartersId = `${rootId}-hq`;
  add(headquartersId, rootId, historicalCommand("军部", "corps", ["军长 叶挺", "副军长 项英"]));
  add("n4-general-staff", headquartersId, historicalCommand("司令部", "none", ["参谋长 张云逸", "副参谋长 周子昆"]));
  add("n4-political", headquartersId, historicalCommand("政治部", "none", ["主任 袁国平", "副主任 邓子恢"]));
  add("n4-field-service", "n4-political", historicalCommand("战地服务团", "regiment", ["团长 朱克靖"]));
  document.folded.push(headquartersId);

  const detachments = [
    { name: "第一支队", commander: "陈毅", deputy: "傅秋涛", regiments: [[1, "傅秋涛", 3], [2, "张正坤", 3]] },
    { name: "第二支队", commander: "张鼎丞", deputy: "粟裕", regiments: [[3, "黄火星", 3], [4, "卢胜", 3]] },
    { name: "第三支队", commander: "张云逸", deputy: "谭震林", regiments: [[5, "饶守坤", 3], [6, "叶飞", 3]] },
    { name: "第四支队", commander: "高敬亭", regiments: [[7, "杨克志", 2, "曹玉福"], [8, "周骏鸣", 3, "林恺"], [9, "顾士多", 2, "高志荣"]] },
  ];
  for (const [index, detachment] of detachments.entries()) {
    const id = `n4-detachment-${index + 1}`;
    add(id, rootId, { name: detachment.name, type: "infantry", rank: "brigade" });
    const roles = [`司令员 ${detachment.commander}`];
    if (detachment.deputy) roles.push(`副司令员 ${detachment.deputy}`);
    add(`${id}-hq`, id, historicalCommand("支队部", "brigade", roles));
    document.folded.push(id);
    for (const [number, commander, battalions, political] of detachment.regiments) {
      const regimentId = `n4-regiment-${number}`;
      const role = number === 8 ? "按桐柏山独立团改编时的三营记载呈现" : undefined;
      add(regimentId, id, { name: `第${number}团`, type: "infantry", rank: "regiment", role });
      const posts = [`团长 ${commander}`];
      if (political) posts.push(`政治委员 ${political}`);
      add(`${regimentId}-hq`, regimentId, historicalCommand("团部", "regiment", posts));
      for (let battalion = 1; battalion <= battalions; battalion++) {
        exampleBranch(`${regimentId}-b${battalion}`, regimentId, `第${battalion}营`, "infantry", "form-battalion");
      }
      document.folded.push(regimentId);
    }
  }
  add("n4-pistol-regiment", "n4-detachment-4", {
    name: "手枪团", type: "infantry", rank: "regiment", role: "三个分队参照方毅1938年任职时的回忆，分队以下编成与员额为示例",
  });
  add("n4-pistol-regiment-hq", "n4-pistol-regiment", historicalCommand("团部", "regiment", ["团长 詹化雨", "政治委员 汪少川"]));
  for (let number = 1; number <= 3; number++) {
    exampleBranch(`n4-pistol-company-${number}`, "n4-pistol-regiment", `第${number}分队`, "infantry", "form-company");
  }
  document.folded.push("n4-pistol-regiment");
  exampleBranch("n4-detachment-4-messenger", "n4-detachment-4", "传令排", "signal", "form-platoon");
  exampleBranch("n4-detachment-4-special", "n4-detachment-4", "特务连", "specialService", "form-company");
  exampleBranch("n4-detachment-4-student", "n4-detachment-4", "学兵连", "training", "form-company");

  exampleBranch("n4-special-battalion", rootId, "军部特务营", "specialService", "form-battalion",
    "由湘南、闽中游击队改编，营以下编成与员额为示例");
  add("n4-school", rootId, historicalCommand("军部教导队", "none", ["筹办 周子昆"])).role = "1938年2月开学";
  add("n4-logistics", rootId, historicalCommand("总兵站", "none", ["站长 张元寿"]));
  migrateNewFourthDirectUnits(document);
  arrangeReference(document);
  return document;
}

const additionalExamples = [
  [infantryExampleId, infantryCompanyExample],
  [battalionExampleId, infantryBattalionExample],
  [artilleryBattalionExampleId, () => supportBattalionExample("artillery")],
  [logisticsBattalionExampleId, () => supportBattalionExample("logistics")],
  [completeDivisionId, completeDivisionExample],
  ["example-120-complete", () => completeDivisionExample("120")],
  ["example-129-complete", () => completeDivisionExample("129")],
  [armyExampleId, eighthRouteArmyExample],
  [newFourthArmyExampleId, newFourthArmyExample],
];
