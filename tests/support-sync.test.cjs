const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const vm = require('node:vm');
function migration() {
  const editor = readFileSync(join(__dirname, '..', 'src', 'data', 'migrations.js'), 'utf8');
  const source = readFileSync(join(__dirname, '..', 'src', 'data', 'presets.js'), 'utf8') + '\n'
    + editor.slice(editor.indexOf('function migrateSupportEquipment('), editor.indexOf('function addDefaultHeadquarters('));
  return vm.runInNewContext(source + '\n({migrateSupportEquipment,presetStats});', { structuredClone });
}

test('saved divisions and combined army replace expanded support branches without moving other units', () => {
  const { migrateSupportEquipment, presetStats } = migration();
  for (const prefix of ['', '115:', '120:', '129:']) {
    const artillery = { id: prefix+'artillery', name:'自定炮兵番号', plateLabel:'炮营', type:'artillery', rank:'battalion', x:417, y:502, parent:prefix+'division', strength:[999,999], personnel:[{role:'旧人员',count:999}], recipe:{snapshot:'old',key:'old'} };
    const logistics = { id:prefix+'logistics', name:'辎重营',type:'logistics',rank:'battalion',parent:prefix+'division',x:418,y:700 };
    const unrelated = {id:'keep',name:'通信连',type:'signal',rank:'company',x:10,y:20};
    const doc = {reference:true,units:[artillery,logistics,unrelated,{id:'old-company',parent:artillery.id},{id:'old-gun',parent:'old-company'},{id:'old-truck',parent:logistics.id}], recipes:{old:{old:{name:'untouched snapshot'}}},folded:['old-company','keep'],expansionLocks:['old-gun','keep'],stacks:{'old-gun':['old-gun','old-truck'],keep:['keep','other']}};
    assert.equal(migrateSupportEquipment(doc),true);
    assert.equal(doc.units.length,3);
    assert.deepEqual(doc.units.find(unit=>unit.id==='keep'),unrelated);
    assert.equal(artillery.name,'自定炮兵番号');assert.equal(artillery.plateLabel,'炮营');assert.equal(artillery.x,417);assert.equal(artillery.y,502);
    assert.equal(artillery.strength,undefined);assert.equal(artillery.personnel,undefined);
    for(const root of [artillery,logistics]) assert.ok(doc.folded.includes(root.id));
    assert.deepEqual(Array.from(doc.expansionLocks),['keep']);
    assert.equal(doc.stacks['old-gun'],undefined);
    assert.equal(doc.recipes.old.old.name,'untouched snapshot');
    const gun = presetStats(doc.recipes[artillery.recipe.snapshot],artillery.recipe.key);
    const truck = presetStats(doc.recipes[logistics.recipe.snapshot],logistics.recipe.key);
    assert.equal(gun.people,153);assert.equal(gun.equipment.artillery,12);assert.equal(gun.equipment.truck,12);
    assert.equal(truck.people,120);assert.equal(truck.equipment.truck,27);
    const snapshot=JSON.stringify(doc);
    assert.equal(migrateSupportEquipment(doc),false);
    assert.equal(JSON.stringify(doc),snapshot);
  }
});

test('custom unrelated charts are not migrated', () => {
  const {migrateSupportEquipment}=migration();
  const doc={units:[{id:'artillery',type:'artillery',rank:'battalion',strength:[10,10]}]};
  const before=JSON.stringify(doc);assert.equal(migrateSupportEquipment(doc),false);assert.equal(JSON.stringify(doc),before);
});
