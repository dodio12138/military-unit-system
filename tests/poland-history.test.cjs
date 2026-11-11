const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const {scenario,CommandMapModel,mapVisibleAtZoom,ranks}=vm.runInNewContext([
 'src/core/config.js','src/data/presets.js','src/render/symbols.js','src/data/poland-1939.js','src/data/poland-history.js','src/map/model.js','src/map/visibility.js'
].map(p=>fs.readFileSync(p,'utf8')).join('\n')+'\n({scenario:polandHistoricalScenario,CommandMapModel,mapVisibleAtZoom,ranks})',{structuredClone});
test('historical headquarters have explicit precision, sources and valid command categories',()=>{
 assert.equal(scenario.units.length,17);
 const m=new CommandMapModel(scenario);
 assert.equal(scenario.units.filter(u=>m.hasPosition(u.id)).length,13);
 for(const u of scenario.units){
  assert.ok(ranks[u.rank],u.id);assert.equal(u.personnelKnown,false);assert.equal(u.type,'headquarters');
  assert.ok(!u.id.includes('sample'));assert.ok(!u.id.endsWith('-hq'));
  if(m.hasPosition(u.id)){assert.equal(u.positionAccuracy,'city');assert.ok(u.sources.length);assert.ok(u.geoSource);}
  else {assert.equal(u.lon,null);assert.equal(u.lat,null);assert.equal(u.positionAccuracy,'unlocated');}
 }
 assert.equal(m.units.get('pl-narew').commandCategory,'operationalGroup');
 assert.equal(m.units.get('pl-high').commandCategory,'highCommand');
 for(const id of ['de-3','de-4'])assert.equal(m.units.get(id).parent,'de-north');
 for(const id of ['de-8','de-10','de-14'])assert.equal(m.units.get(id).parent,'de-south');
 for(const u of scenario.units.filter(u=>u.side==='polish'&&u.parent))assert.equal(u.parent,'pl-high');
});
test('unlocated headquarters retain hierarchy but never gain invented geographic markers',()=>{
 const m=new CommandMapModel(scenario);
 const view=mapVisibleAtZoom(m,{zoom:10,west:12,east:27,south:48,north:56});
 assert.equal(view.ids.length,13);
 for(const id of ['de-okh','pl-modlin','pl-narew','pl-prusy'])assert.ok(!view.ids.includes(id));
 assert.ok(view.ids.includes('de-3'),'unlocated ancestor must not hide positioned descendants');
 assert.equal(m.move('pl-high',21.1,52.2),true);
 assert.equal(m.position('pl-narew').lon,null,'moving parent must not invent missing locations');
 assert.equal(m.move('pl-narew',22.1,53.2),true);
 assert.equal(m.position('pl-narew').lon,22.1);
 assert.equal(m.units.get('pl-narew').lon,null,'user overrides must not rewrite historical evidence');
});
