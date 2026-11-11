const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const files=['src/data/poland-oob-german.js','src/data/poland-oob-polish.js','src/data/poland-history.js','src/data/poland-deployment-german.js','src/data/poland-deployment-polish.js','src/data/poland-borders-1939.js','src/map/deployment.js','src/map/model.js','src/map/visibility.js'];
const api=vm.runInNewContext(files.map(path=>fs.readFileSync(path,'utf8')).join('\n')+'\n({raw:polandHistoricalScenario,tables:[polandGermanDeployment,polandPolishDeployment],borders:polandBorders1939,apply:applyPolandDeployment,Model:CommandMapModel,visible:mapVisibleAtZoom})',{structuredClone});
const plain=v=>JSON.parse(JSON.stringify(v));
const located=u=>Number.isFinite(u.lon)&&Number.isFinite(u.lat);
const byId=scenario=>new Map(scenario.units.map(u=>[u.id,u]));
const coords=scenario=>scenario.units.map(({id,lon,lat})=>({id,lon,lat})).sort((a,b)=>a.id.localeCompare(b.id));
const deploy=()=>api.apply(api.raw,api.tables,api.borders);
function deepFreeze(value){if(value&&typeof value==='object'&&!Object.isFrozen(value)){Object.freeze(value);Object.values(value).forEach(deepFreeze);}return value;}
function distanceKm(a,b){const r=Math.PI/180,dlat=(b.lat-a.lat)*r,dlon=(b.lon-a.lon)*r;const h=Math.sin(dlat/2)**2+Math.cos(a.lat*r)*Math.cos(b.lat*r)*Math.sin(dlon/2)**2;return 6371*2*Math.asin(Math.sqrt(h));}

test('deployment is pure, preserves all existing reference positions and is position-idempotent',()=>{
 const input=deepFreeze(plain(api.raw)),before=JSON.stringify(input),tables=deepFreeze(plain(api.tables)),borders=deepFreeze(plain(api.borders));
 const result=api.apply(input,tables,borders),lookup=byId(result);
 assert.notEqual(result,input);assert.equal(JSON.stringify(input),before);
 const references=input.units.filter(located);assert.equal(references.length,24);
 for(const unit of references)assert.deepEqual(plain(lookup.get(unit.id)),plain(unit),unit.id);
 assert.deepEqual(plain(coords(api.apply(result,tables,borders))),plain(coords(result)));
 const reordered=api.apply({...input,units:[...input.units].reverse()},tables,borders);
 assert.deepEqual(plain(coords(reordered)),plain(coords(result)),'ID placement must be independent of scenario array order');
});

test('new estimates retain original nulls, source evidence and explicit geographic uncertainty',()=>{
 const result=deploy(),raw=byId(api.raw);let added=0;
 for(const unit of result.units){
  if(located(raw.get(unit.id))||!located(unit))continue;added++;
  assert.equal(unit.positionAccuracy,'inferred',unit.id);
  assert.equal(unit.positionOriginal.lon,raw.get(unit.id).lon);
  assert.equal(unit.positionOriginal.lat,raw.get(unit.id).lat);
  assert.equal(unit.positionOriginal.positionAccuracy,raw.get(unit.id).positionAccuracy);
  assert.ok(unit.inferenceBasis?.length>20);assert.ok(unit.deploymentSources?.length);
  assert.ok(unit.deploymentSources.every(source=>source.title&&/^https?:/.test(source.url)));
  assert.ok(Number.isFinite(unit.inferenceRadiusKm)&&unit.inferenceRadiusKm>0);
  assert.ok(unit.inferenceAnchor.id&&located(unit.inferenceAnchor));
  assert.ok(distanceKm(unit,unit.inferenceAnchor)<=unit.inferenceRadiusKm+.01);
  assert.ok(unit.lon>=result.bounds.west&&unit.lon<=result.bounds.east&&unit.lat>=result.bounds.south&&unit.lat<=result.bounds.north);
  assert.equal(unit.inferenceConfidence,'low');
 }
 assert.ok(added>250,`expected substantial map deployment, got ${added}`);
});

test('exclusions propagate to every unlocated descendant and units lacking an eligible anchor stay unlocated',()=>{
 const result=deploy(),lookup=byId(result),raw=byId(api.raw),excluded=Object.assign({},...api.tables.map(t=>t.excluded));let checked=0;
 for(const unit of result.units){
  let cursor=unit,reason;
  while(cursor){if(excluded[cursor.id]){reason=excluded[cursor.id];break;}cursor=lookup.get(cursor.parent);}
  if(reason&&!located(raw.get(unit.id))){checked++;assert.equal(located(unit),false,unit.id);assert.equal(unit.inferenceExclusion,reason);assert.equal(unit.positionOriginal,undefined);}
 }
 assert.ok(checked>10);
 const sample={id:'isolation',revision:'1',bounds:api.raw.bounds,sources:[],units:[{id:'unknown',parent:null,rank:'fieldArmy',side:'german',lon:null,lat:null},{id:'unknown-child',parent:'unknown',rank:'regiment',side:'german',lon:null,lat:null}]};
 assert.ok(api.apply(sample,[],api.borders).units.every(u=>!located(u)));
});

test('saved user overrides win over estimates and survive snapshot restoration',()=>{
 const scenario=deploy(),estimate=scenario.units.find(u=>u.inferenceMethod==='parent-sector');
 const saved={positions:{[estimate.id]:{lon:20,lat:52}}};
 const model=new api.Model(scenario,saved);
 assert.deepEqual(plain(model.position(estimate.id)),{lon:20,lat:52});
 const restored=new api.Model(scenario,model.snapshot());
 assert.deepEqual(plain(restored.position(estimate.id)),{lon:20,lat:52});
 assert.deepEqual(plain(byId(scenario).get(estimate.id)),plain(estimate));
});

test('zoom, pan, filters and inherited locks affect visibility without relocating units',()=>{
 const scenario=deploy(),model=new api.Model(scenario),before=plain(coords(scenario));
 model.expanded=new Set(scenario.units.map(u=>u.id));
 for(const zoom of [6,9,12,18])for(const side of ['both','german','polish']){
  model.side=side;
  const view=api.visible(model,{zoom,west:12,east:30,south:47.5,north:56,limit:450});
  assert.ok(view.ids.length<=450);
  assert.ok(view.ids.every(id=>model.hasPosition(id)&&(side==='both'||model.units.get(id).side===side)));
  api.visible(model,{zoom,west:19,east:22,south:50,north:53,limit:450});
 }
 model.side='both';model.expanded.clear();model.expanded.add('de-okh');model.locks.add('de-north');
 const locked=api.visible(model,{zoom:18,west:12,east:30,south:47.5,north:56});
 assert.equal(locked.expanded.has('de-north'),false);
 assert.deepEqual(plain(coords(scenario)),before);assert.deepEqual(plain(model.positions),{});
});

test('deployment places substantially more real regiment counters directly on the map',()=>{
 const original=new api.Model(api.raw),deployed=new api.Model(deploy());
 for(const model of [original,deployed])model.expanded=new Set(model.units.keys());
 const viewport={zoom:14,west:12,east:30,south:47.5,north:56,limit:10000};
 const oldRegiments=api.visible(original,viewport).ids.filter(id=>original.units.get(id).rank==='regiment').length;
 const newRegiments=api.visible(deployed,viewport).ids.filter(id=>deployed.units.get(id).rank==='regiment').length;
 assert.ok(newRegiments>oldRegiments+200,`${oldRegiments} -> ${newRegiments}`);
});
