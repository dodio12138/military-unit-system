const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync('src/data/poland-1939.js', 'utf8');
const scenario = vm.runInNewContext(source + '\npolandScenario');

test('scenario has a valid, bounded and acyclic hierarchy with staffed leaves', () => {
  const map = new Map(scenario.units.map(u => [u.id, u]));
  assert.equal(map.size, scenario.units.length);
  const children = new Map();
  for (const u of scenario.units) {
    assert.ok(Number.isFinite(u.lon) && Number.isFinite(u.lat));
    assert.ok(u.lon >= 12 && u.lon <= 27 && u.lat >= 48 && u.lat <= 56);
    assert.ok(['german','polish'].includes(u.side));
    assert.equal(u.estimated, true);
    assert.equal(u.positionBasis, '推定部署');
    assert.ok(Number.isSafeInteger(u.personnel) && u.personnel >= 0 && u.officers >= 0 && u.officers <= u.personnel);
    if (u.parent) { assert.ok(map.has(u.parent)); assert.equal(map.get(u.parent).side,u.side); children.set(u.parent, (children.get(u.parent) || 0) + 1); }
    const seen = new Set([u.id]); let p = u.parent;
    while (p) { assert.ok(!seen.has(p)); seen.add(p); p = map.get(p).parent; }
    if (u.equipment) assert.equal(u.equipment.count, 1);
  }
  for (const u of scenario.units) {
    if (!children.has(u.id)) assert.ok(u.personnel > 0, u.id);
    else assert.equal(u.personnel, 0, u.id);
    if (children.has(u.id) && u.rank !== 'squad') assert.ok(scenario.units.some(x => x.parent === u.id && x.type === 'headquarters'), u.id);
  }
  assert.equal(scenario.units.filter(u=>u.equipment?.kind === 'truck').length, 13);
  assert.equal(scenario.units.filter(u=>u.equipment?.kind === 'gun').length, 13);
});
