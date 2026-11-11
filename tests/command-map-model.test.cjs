const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const { CommandMapModel, mapProjection, polandScenario } = vm.runInNewContext(
  fs.readFileSync('src/data/poland-1939.js', 'utf8') + '\n' +
  fs.readFileSync('src/map/model.js', 'utf8') + '\n({CommandMapModel,mapProjection,polandScenario})',
  { structuredClone }
);
const plain = value => JSON.parse(JSON.stringify(value));
const close = (a,b) => assert.ok(Math.abs(a-b)<1e-10, `${a} != ${b}`);

test('subtree movement preserves every relative coordinate and leaves other formations unchanged', () => {
  const model = new CommandMapModel(polandScenario);
  const id = 'de-3-sample';
  const moved = new Set([id,...model.descendants(id)]);
  const before = new Map(polandScenario.units.map(u=>[u.id,{lon:u.lon,lat:u.lat}]));
  assert.equal(model.move(id,model.position(id).lon+.2,model.position(id).lat-.1),true);
  for (const unit of polandScenario.units) {
    close(model.position(unit.id).lon,before.get(unit.id).lon+(moved.has(unit.id)?.2:0));
    close(model.position(unit.id).lat,before.get(unit.id).lat-(moved.has(unit.id)?.1:0));
  }
  const descendant = model.descendants(id)[0], previous = {...model.position(descendant)};
  assert.equal(model.move(id,model.position(id).lon+.01,model.position(id).lat,false),true);
  assert.deepEqual(plain(model.position(descendant)),plain(previous));
});

test('out-of-bounds subtree movement rejects atomically even when parent target is in bounds', () => {
  const model = new CommandMapModel(polandScenario);
  assert.equal(model.move('de-3',21,53),true);
  const before = plain(model.snapshot());
  assert.equal(model.move('de-3',27,53),false);
  assert.deepEqual(plain(model.snapshot()),before);
  assert.equal(model.move('de-3',NaN,53),false);
  assert.deepEqual(plain(model.snapshot()),before);
});

test('side filters retain the selected side hierarchy and focus restricts its branch', () => {
  const model = new CommandMapModel(polandScenario);
  model.side='german';
  assert.ok(model.visible().length>1);
  assert.ok(model.visible().every(id=>model.units.get(id).side==='german'));
  model.side='polish';
  assert.ok(model.visible().every(id=>model.units.get(id).side==='polish'));
  model.focus='de-3';
  assert.equal(model.visible().length,0);
  model.side='both';
  assert.deepEqual(Array.from(model.visible()),['de-3']);
});

test('recursive statistics count personnel, officers and equipment once', () => {
  const model = new CommandMapModel(polandScenario);
  const ids = ['de-3',...model.descendants('de-3')];
  const expected = ids.reduce((total,id)=>{
    const u=model.units.get(id);total.people+=u.personnel;total.officers+=u.officers;
    if(u.equipment)total.equipment[u.equipment.kind]=(total.equipment[u.equipment.kind]||0)+u.equipment.count;
    return total;
  },{people:0,officers:0,units:ids.length,equipment:{}});
  assert.deepEqual(plain(model.stats('de-3')),expected);
  assert.deepEqual(plain(model.stats('de-3')),expected);
});

test('ancestor locks block toggle and layer expansion without altering expansion state', () => {
  const model = new CommandMapModel(polandScenario);
  model.focus='de-3';model.locks.add('de-north');
  const before=Array.from(model.expanded);
  assert.equal(model.locked('de-3'),true);
  assert.equal(model.toggle('de-3'),false);
  assert.equal(model.expandLayer(),true);
  model.collapseLayer();
  assert.deepEqual(Array.from(model.expanded),before);
  model.locks.clear();
  assert.equal(model.toggle('de-3'),true);
  assert.ok(model.visible().length>1);
});

test('storage restores valid positions and drops invalid coordinates and unknown IDs', () => {
  const model = new CommandMapModel(polandScenario,{positions:{
    'de-3':{lon:20,lat:53},'de-4':{lon:Infinity,lat:52},'de-8':{lon:28,lat:52},
    'de-10':null,'de-14':{lon:'20',lat:52},unknown:{lon:20,lat:52}
  },expanded:['de-3','unknown'],locks:['de-4','unknown'],side:'invalid',selected:'unknown',focus:'unknown'});
  assert.deepEqual(plain(model.positions),{'de-3':{lon:20,lat:53}});
  assert.deepEqual(Array.from(model.expanded),['de-3']);
  assert.deepEqual(Array.from(model.locks),['de-4']);
  assert.equal(model.side,'both');assert.equal(model.selected,null);assert.equal(model.focus,null);
});

test('projection and inverse round trip bounds and all initial positions', () => {
  for(const p of [{lon:12,lat:48},{lon:27,lat:56},...polandScenario.units]) {
    const result=mapProjection.invert(mapProjection.project(p));
    close(result.lon,p.lon);close(result.lat,p.lat);
  }
});


test('locating a hidden descendant focuses it without reopening a locked branch',()=>{
  const model=new CommandMapModel(polandScenario);model.locks.add('de-3');
  assert.equal(model.expanded.has('de-3'),false);
  model.reveal('de-3-sample-r1-b1-c1-p1-s1-t1');
  assert.equal(model.expanded.has('de-3'),false);
  assert.equal(model.focus,'de-3-sample-r1-b1-c1-p1-s1-t1');
  assert.ok(model.visible().includes(model.selected));
});
