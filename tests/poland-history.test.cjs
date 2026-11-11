const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const {scenario,CommandMapModel,mapVisibleAtZoom,mapZoomPendingBranch,ranks,types}=vm.runInNewContext([
 'src/core/config.js','src/data/presets.js','src/render/symbols.js','src/data/poland-oob-german.js','src/data/poland-oob-polish.js','src/data/poland-history.js','src/map/model.js','src/map/visibility.js'
].map(p=>fs.readFileSync(p,'utf8')).join('\n')+'\n({scenario:polandHistoricalScenario,CommandMapModel,mapVisibleAtZoom,mapZoomPendingBranch,ranks,types})',{structuredClone});
test('historical headquarters have explicit precision, sources and valid command categories',()=>{
 assert.ok(scenario.units.length>=500);
 const m=new CommandMapModel(scenario);
 assert.equal(scenario.units.filter(u=>u.positionAccuracy==='city').length,13);
 assert.ok(scenario.units.some(u=>u.positionAccuracy==='area'));
 assert.ok(scenario.units.some(u=>u.positionAccuracy==='inferred'));
 for(const u of scenario.units){
  assert.ok(ranks[u.rank],u.id);assert.equal(u.personnelKnown,false);assert.ok(types[u.type],u.id);assert.ok(u.sources.length||u.id==='pl-modlin');
  assert.ok(!u.id.includes('sample'));assert.ok(!u.id.endsWith('-hq'));
  if(m.hasPosition(u.id)){assert.ok(['city','area','inferred'].includes(u.positionAccuracy));assert.ok(u.sources.length);assert.ok(u.geoSource);}
  else {assert.equal(u.lon,null);assert.equal(u.lat,null);assert.equal(u.positionAccuracy,'unlocated');}
 }
 assert.equal(m.units.get('pl-narew').commandCategory,'operationalGroup');
 assert.equal(m.units.get('pl-high').commandCategory,'highCommand');
 for(const id of ['de-3','de-4'])assert.equal(m.units.get(id).parent,'de-north');
 for(const id of ['de-8','de-10','de-14'])assert.equal(m.units.get(id).parent,'de-south');
 for(const u of scenario.units.filter(u=>u.side==='polish'&&u.rank==='fieldArmy'))assert.equal(u.parent,'pl-high');
 for(const u of scenario.units){
  const seen=new Set([u.id]);let parent=u.parent;
  while(parent){assert.ok(m.units.has(parent),u.id);assert.ok(!seen.has(parent),'cycle');seen.add(parent);parent=m.units.get(parent).parent;}
  if(u.positionAccuracy==='inferred')assert.ok(u.inferenceBasis);
  if(u.commandStatus==='disputed'){assert.ok(u.alternateParents?.length);for(const id of u.alternateParents)assert.ok(m.units.has(id));}
 }
 for(const side of ['polish','german'])assert.ok(scenario.units.some(u=>u.side===side&&u.rank==='regiment'));
 assert.ok(scenario.units.filter(u=>u.side==='german'&&u.rank==='division').every(u=>m.children.has(u.id)));
});
test('unlocated headquarters retain hierarchy but never gain invented geographic markers',()=>{
 const m=new CommandMapModel(scenario);
 const view=mapVisibleAtZoom(m,{zoom:10,west:12,east:27,south:48,north:56});
 assert.ok(view.ids.length>=13);
 for(const id of ['de-okh','pl-modlin','pl-narew','pl-prusy'])assert.ok(!view.ids.includes(id));
 assert.ok(view.ids.includes('de-3'),'unlocated ancestor must not hide positioned descendants');
 assert.equal(m.move('pl-high',21.1,52.2),true);
 assert.equal(m.position('pl-narew').lon,null,'moving parent must not invent missing locations');
 assert.equal(m.move('pl-narew',22.1,53.2),true);
 assert.equal(m.position('pl-narew').lon,22.1);
 assert.equal(m.units.get('pl-narew').lon,null,'user overrides must not rewrite historical evidence');
});

test('unknown intermediate commands preserve geographic descendants and their complete hierarchy',()=>{
 const m=new CommandMapModel(scenario);m.reveal('de-pz-4');
 const view=mapVisibleAtZoom(m,{zoom:12,west:12,east:30,south:47.5,north:56});
 assert.ok(view.ids.includes('de-pz-4'));assert.ok(m.ancestors('de-pz-4').includes('de-corps-16'));
 assert.ok(!view.ids.includes('de-corps-16'));
 assert.ok(view.expanded.has('de-corps-16'),'unknown position does not mean a closed command');
 const snapshot=JSON.stringify(m.snapshot());
 mapVisibleAtZoom(m,{zoom:18,west:18,east:20,south:50,north:52});
 assert.equal(JSON.stringify(m.snapshot()),snapshot);
});


test('historical zoom exposes unlocated commands and regiments in the logical branch',()=>{
 const m=new CommandMapModel(scenario); m.focus='de-10';
 const options={west:12,east:30,south:47,north:56};
 const at=z=>mapVisibleAtZoom(m,{zoom:z,...options});
 const rows=z=>mapZoomPendingBranch(m,'de-10',at(z).expanded);
 const branch=z=>rows(z).filter(row=>row.id==='de-corps-16'||m.ancestors(row.id).includes('de-corps-16'));
 assert.deepEqual(Array.from(branch(8),row=>row.id),['de-corps-16']);
 assert.ok(branch(9).some(row=>m.units.get(row.id).rank==='division'));
 assert.ok(!branch(9).some(row=>m.units.get(row.id).rank==='regiment'));
 assert.ok(branch(10).some(row=>m.units.get(row.id).rank==='regiment'));
 const pending=rows(10).find(row=>row.id==='de-corps-16');
 assert.ok(pending?.pending); assert.ok(at(10).reachableIds.includes(pending.id));
 assert.ok(!at(10).ids.includes(pending.id));
 const p=m.position(pending.id); assert.equal(p.lon,null); assert.equal(p.lat,null);
});

test('locked historical subtree stays at saved expansion through zoom changes',()=>{
 const m=new CommandMapModel(scenario); m.focus='de-10'; m.locks.add('de-corps-16');
 const view=mapVisibleAtZoom(m,{zoom:18,west:12,east:30,south:47,north:56});
 const rows=mapZoomPendingBranch(m,'de-10',view.expanded);
 assert.ok(rows.some(row=>row.id==='de-corps-16'));
 assert.ok(!rows.some(row=>row.parent==='de-corps-16'));
 m.expanded.add('de-corps-16');
 const next=mapVisibleAtZoom(m,{zoom:18,west:12,east:30,south:47,north:56});
 const openRows=mapZoomPendingBranch(m,'de-10',next.expanded);
 assert.ok(openRows.some(row=>row.parent==='de-corps-16'));
 assert.ok(!openRows.some(row=>row.depth>2 && m.ancestors(row.id).includes('de-corps-16')));
});
