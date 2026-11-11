const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const vm = require('node:vm');

function catalog() {
  const source = readFileSync(join(__dirname, '..', 'src', 'data', 'presets.js'), 'utf8');
  return vm.runInNewContext(source + '\n({ builtInPresets, equipmentKinds, presetStats, personnelTotal });', { structuredClone });
}
const plain = value => JSON.parse(JSON.stringify(value));

test('every individual equipment preset has one item and a fixed, fully staffed crew', () => {
  const { builtInPresets, equipmentKinds, presetStats, personnelTotal } = catalog();
  for (const kind of Object.keys(equipmentKinds)) {
    const key = `form-${kind}-team`;
    const item = builtInPresets[key];
    assert.equal(item.rank, 'team');
    assert.equal(item.equipment.kind, kind);
    assert.ok(item.personnel.every(role => role.role && Number.isInteger(role.count) && role.count > 0));
    assert.equal(item.strength[0], item.strength[1]);
    assert.equal(personnelTotal(item.personnel), item.strength[0]);
    const stats = presetStats(builtInPresets, key);
    assert.equal(stats.size, 1, 'crew positions must not become additional unit nodes');
    assert.deepEqual(plain(stats.equipment), { [kind]: 1 });
    assert.equal(stats.people, item.strength[0]);
  }
});

test('nested tank formations count equipment once and keep headquarters personnel separate', () => {
  const { builtInPresets, presetStats } = catalog();
  const stats = presetStats(builtInPresets, 'form-tank-company');
  assert.equal(stats.people, 51); // Nine five-person crews, plus six company headquarters staff.
  assert.deepEqual(plain(stats.equipment), { tank: 9 });
  assert.equal(stats.officers, 2);
  assert.equal(stats.incomplete, false);
});

test('mixed formations retain crew and equipment totals across snapshots and roster edits', () => {
  const { builtInPresets, presetStats } = catalog();
  const definitions = structuredClone(builtInPresets);
  definitions.mixed = { name: '装备编组', rank: 'platoon', type: 'general', parts: [
    ['form-platoon-hq', 1], ['form-tank-team', 3], ['form-artillery-team', 2], ['form-truck-team', 2],
  ] };
  const snapshot = JSON.parse(JSON.stringify(definitions));
  const stats = presetStats(snapshot, 'mixed');
  assert.equal(stats.people, 34);
  assert.deepEqual(plain(stats.equipment), { tank: 3, artillery: 2, truck: 2 });
  const tank = snapshot['form-tank-team'];
  tank.personnel.pop();
  tank.strength = [4, 4];
  const edited = presetStats(snapshot, 'mixed');
  assert.equal(edited.people, 31);
  assert.deepEqual(plain(edited.equipment), { tank: 3, artillery: 2, truck: 2 });
  assert.equal(presetStats(builtInPresets, 'form-tank-team').people, 5, 'editing a snapshot must preserve stock crews');
});

test('artillery battalion supplies twelve guns with dedicated crews and towing trucks', () => {
  const { builtInPresets, presetStats } = catalog();
  const stats = presetStats(builtInPresets, 'form-artillery-battalion');
  assert.deepEqual(plain(stats.equipment), { artillery: 12, truck: 12 });
  assert.equal(stats.people, 153); // 12*6 gunners + 12*2 drivers + 57 command/guard personnel.
  assert.equal(stats.officers, 18);
  assert.equal(stats.depth, 4);
  assert.equal(stats.incomplete, false);
  const platoon = builtInPresets['form-artillery-platoon'];
  assert.deepEqual(plain(platoon.parts), [
    ['form-artillery-platoon-hq', 1], ['form-artillery-team', 2], ['form-truck-team', 2],
  ]);
});

test('logistics battalion resolves to twenty-seven staffed trucks and separate headquarters', () => {
  const { builtInPresets, presetStats } = catalog();
  const stats = presetStats(builtInPresets, 'form-logistics-battalion');
  assert.deepEqual(plain(stats.equipment), { truck: 27 });
  assert.equal(stats.people, 120); // 54 drivers + 66 command/guard personnel.
  assert.equal(stats.officers, 21);
  assert.equal(stats.depth, 4);
  assert.equal(stats.incomplete, false);
  const edited = structuredClone(builtInPresets);
  edited['form-truck-team'].personnel = [{ role: '驾驶员', count: 1, officer: false }];
  edited['form-truck-team'].strength = [1, 1];
  assert.equal(presetStats(edited, 'form-logistics-battalion').people, 93);
  assert.deepEqual(plain(presetStats(edited, 'form-logistics-battalion').equipment), { truck: 27 });
});
