const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const represent = vm.runInNewContext(fs.readFileSync('src/map/representation.js','utf8')+'\nmapUnitRepresentation');

test('expanding changes only representation, preserving model anchor and parent', () => {
  const unit = {id:'division-1',parent:'army-1',name:'第1步兵师',type:'infantry',lon:19.123,lat:50.45,personnel:82,officers:12};
  const snapshot = JSON.stringify(unit);
  const folded = represent(unit,false,true);
  const expanded = represent(unit,true,true);
  assert.equal(folded.key,'division-1');
  assert.equal(folded.type,'infantry');
  assert.equal(folded.headquarters,false);
  assert.equal(expanded.key,'hq:division-1');
  assert.equal(expanded.type,'headquarters');
  assert.equal(expanded.name,'第1步兵师指挥部');
  assert.equal(expanded.headquarters,true);
  assert.equal(JSON.stringify(unit),snapshot);
  assert.equal(unit.parent,'army-1');
  assert.deepEqual([unit.lon,unit.lat,unit.personnel,unit.officers],[19.123,50.45,82,12]);
});

test('leaf does not acquire an expanded command post and existing command name is not doubled', () => {
  const leaf={id:'team',name:'小组',type:'infantry'};
  assert.equal(represent(leaf,true,false).key,'team');
  assert.equal(represent(leaf,true,false).type,'infantry');
  assert.equal(represent(leaf,true,false).headquarters,false);
  assert.equal(represent({id:'staff',name:'最高统帅部',type:'general'},true,true).name,'最高统帅部');
});
