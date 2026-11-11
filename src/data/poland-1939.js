"use strict";

// A schematic exercise: formation names at army level are historical; all
// subordinate units, strengths, equipment and coordinates are illustrative.
const polandScenario = (() => {
  const units = [];
  function add(id, parent, name, rank, side, lon, lat, type = 'general', personnel = 0, officers = 0, historical = false, equipment) {
    units.push({ id, parent, name, type, rank, side, lon: +lon.toFixed(6), lat: +lat.toFixed(6), personnel, officers,
      estimated: true, positionBasis: '推定部署', ...(historical ? { historical: true } : {}), ...(equipment ? { equipment } : {}) });
  }
  function formation(id, parent, name, rank, side, lon, lat, historical = false) {
    add(id, parent, name, rank, side, lon, lat, ['division','regiment','battalion','company','platoon'].includes(rank) ? 'infantry' : 'general', 0, 0, historical);
    const offset = ({theatre:0.12, armyGroup:0.09, fieldArmy:0.06, division:0.025, regiment:0.012, battalion:0.006, company:0.002, platoon:0.0005})[rank] || 0.003;
    add(`${id}-hq`, id, `${name}指挥部`, rank, side, lon + offset, lat + offset, 'headquarters', 12, 4);
  }
  const groups = [
    ['de-okh', '德国陆军最高统帅部（OKH）', 'theatre', 'german', 13.4, 52.5, null],
    ['pl-high', '波兰最高统帅部', 'theatre', 'polish', 21.01, 52.23, null],
    ['de-north', '北方集团军群', 'armyGroup', 'german', 18.0, 54.1, 'de-okh'],
    ['de-south', '南方集团军群', 'armyGroup', 'german', 17.4, 50.5, 'de-okh'],
    ['de-3', '德军第3集团军', 'fieldArmy', 'german', 20.7, 53.5, 'de-north'],
    ['de-4', '德军第4集团军', 'fieldArmy', 'german', 17.3, 53.6, 'de-north'],
    ['de-8', '德军第8集团军', 'fieldArmy', 'german', 17.4, 51.9, 'de-south'],
    ['de-10', '德军第10集团军', 'fieldArmy', 'german', 18.1, 51.0, 'de-south'],
    ['de-14', '德军第14集团军', 'fieldArmy', 'german', 18.5, 49.8, 'de-south'],
    ['pl-pomorze', '波美拉尼亚集团军', 'fieldArmy', 'polish', 18.1, 53.2, 'pl-high'],
    ['pl-poznan', '波兹南集团军', 'fieldArmy', 'polish', 16.9, 52.5, 'pl-high'],
    ['pl-lodz', '罗兹集团军', 'fieldArmy', 'polish', 19.1, 51.6, 'pl-high'],
    ['pl-krakow', '克拉科夫集团军', 'fieldArmy', 'polish', 19.4, 50.2, 'pl-high'],
    ['pl-karpaty', '喀尔巴阡集团军', 'fieldArmy', 'polish', 21.3, 49.8, 'pl-high'],
    ['pl-modlin', '莫德林集团军', 'fieldArmy', 'polish', 20.7, 52.9, 'pl-high'],
    ['pl-narew', '纳雷夫独立作战集群', 'fieldArmy', 'polish', 22.3, 53.1, 'pl-high'],
    ['pl-prusy', '普鲁士集团军', 'fieldArmy', 'polish', 20.5, 51.4, 'pl-high'],
  ];
  for (const [id, name, rank, side, lon, lat, parent] of groups) formation(id, parent, name, rank, side, lon, lat, true);
  // One fictional representative division for each army; it is deliberately
  // not named after a real division or represented as a complete order of battle.
  for (const [army, , rank, side, x, y] of groups.filter(g => g[2] === 'fieldArmy')) {
    const d = `${army}-sample`; formation(d, army, '示例步兵师（虚构编成）', 'division', side, x + 0.06, y + 0.04);
    for (let r = 1; r <= 2; r++) {
      const reg = `${d}-r${r}`, rx = x + 0.05 + r * 0.045, ry = y + 0.02 + r * 0.025;
      formation(reg, d, `示例步兵第${r}团`, 'regiment', side, rx, ry);
      for (let b = 1; b <= 2; b++) {
        const bat = `${reg}-b${b}`, bx = rx + b * 0.012, by = ry + b * 0.009;
        formation(bat, reg, `示例第${b}营`, 'battalion', side, bx, by);
        for (let c = 1; c <= 2; c++) {
          const co = `${bat}-c${c}`, cx = bx + c * 0.004, cy = by + c * 0.003;
          formation(co, bat, `示例第${c}连`, 'company', side, cx, cy);
          for (let p = 1; p <= 2; p++) {
            const pl = `${co}-p${p}`, px = cx + p * 0.0015, py = cy + p * 0.001;
            formation(pl, co, `示例第${p}排`, 'platoon', side, px, py);
            for (let s = 1; s <= 3; s++) {
              const squad = `${pl}-s${s}`, sx = px + s * 0.0003, sy = py + s * 0.0002;
              add(squad, pl, `示例第${s}班`, 'squad', side, sx, sy, 'infantry');
              for (let t = 1; t <= 3; t++) add(`${squad}-t${t}`, squad, `示例第${t}小组`, 'team', side, sx + t * 0.00005, sy + t * 0.00004, 'infantry', 3);
            }
          }
        }
      }
    }
    add(`${d}-truck`, d, '示例运输车组', 'team', side, x + 0.065, y + 0.045, 'truck', 2, 0, false, {kind:'truck',count:1});
    add(`${d}-gun`, d, '示例炮组', 'team', side, x + 0.066, y + 0.046, 'artillery', 6, 0, false, {kind:'gun',count:1});
  }
  return {
    id: 'poland-1939', title: '1939年9月1日：波兰战役示意', date: '1939-09-01',
    description: '德波双方集团军级名称为历史背景；每个集团军仅展开一个虚构示例师。全部坐标、下级编制、员额及装备均为推定示意，不构成完整战斗序列或精确部署。边界、河流和海岸线为粗略示意。',
    bounds: {west:12,east:27,south:48,north:56},
    sources: [
      {title:'美国陆军历史研究：1939年德国波兰战役',url:'https://www.ibiblio.org/hyperwar/USA/DAP-Poland/Campaign-II.html'},
      {title:'美国大屠杀纪念馆：1939年秋入侵波兰',url:'https://encyclopedia.ushmm.org/content/en/article/invasion-of-poland-fall-1939'},
      {title:'美国大屠杀纪念馆：但泽',url:'https://encyclopedia.ushmm.org/content/en/article/danzig'}
    ],
    cities: [ ['华沙',21.012,52.23],['但泽',18.647,54.352],['波兹南',16.925,52.406],['罗兹',19.456,51.759],['克拉科夫',19.945,50.064],['布雷斯劳',17.038,51.107],['托伦',18.599,53.013],['柯尼斯堡',20.452,54.71],['布列斯特',23.7,52.1],['利沃夫',24.03,49.84],['比亚韦斯托克',23.16,53.13] ].map(([name,lon,lat])=>({name,lon,lat})),
    features: [
      {kind:'coast',name:'波罗的海海岸（示意）',coordinates:[[12,54.3],[14,54.0],[15.5,54.2],[16.8,54.5],[18.0,54.8],[18.6,54.4],[19.3,54.4],[20.2,54.6],[21.2,55.1]]},
      {kind:'border',name:'1939年波兰边界（粗略示意）',coordinates:[[18.6,54.4],[19.5,54.3],[20.6,53.4],[22.8,53.9],[23.5,54.3],[24.4,54.2],[25.8,54.5],[26.5,53.7],[26.2,52.1],[25.0,51.5],[24.2,50.6],[24.4,49.5],[22.5,49.0],[21,49.4],[19.5,49.5],[18.7,49.9],[18.6,50.3],[17.8,50.9],[18.2,51.3],[17.2,51.6],[16,51.6],[15.7,52.6],[16.3,53.1],[17.2,53.5],[17.6,54.0],[18.1,54.6],[18.6,54.4]]},
      {kind:'river',name:'维斯瓦河（示意）',coordinates:[[19,49.6],[19.9,50.1],[21.0,50.7],[21.6,51.3],[21.0,52.2],[20.3,52.5],[19.1,52.6],[18.6,53.0],[18.6,54.3]]},
      {kind:'river',name:'奥得河（示意）',coordinates:[[18.3,49.7],[18.2,50.4],[17,51.1],[15.7,51.8],[14.7,52.5],[14.4,53.4]]},
      {kind:'river',name:'布格河（示意）',coordinates:[[24.9,49.9],[24.0,50.5],[23.8,51.2],[23.6,52.1],[23.1,52.6],[22.0,52.6],[21.0,52.5]]}
    ], units
  };
})();
