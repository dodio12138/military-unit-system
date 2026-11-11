const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const {CommandMapModel, polandScenario, mapVisibleAtZoom, mapZoomPendingBranch} = vm.runInNewContext(
  ['src/data/poland-1939.js','src/map/model.js','src/map/visibility.js'].map(p=>fs.readFileSync(p,'utf8')).join('\n') + '\n({CommandMapModel,polandScenario,mapVisibleAtZoom,mapZoomPendingBranch})', {structuredClone});
const world = {west:12,east:27,south:48,north:56};
const run = (model, zoom, extra={}) => mapVisibleAtZoom(model,{zoom,...world,...extra});

test('zoom expands to teams and coarsens on zoom out',()=>{
  const m = new CommandMapModel(polandScenario); m.focus='de-3-sample-r1-b1-c1-p1-s1';
  assert.ok(run(m,17).ids.some(id=>m.units.get(id).rank==='team' && m.units.get(id).personnel===3));
  assert.equal(run(m,16).ids.length,1);
});
test('viewport finds descendants with offscreen parents and includes their chain',()=>{
  const m = new CommandMapModel(polandScenario);
  const id='de-3-sample-r1-b1-c1-p1-s1-t1', p=m.position(id);
  const result=run(m,17,{west:p.lon-.000001,east:p.lon+.000001,south:p.lat-.000001,north:p.lat+.000001});
  assert.ok(result.ids.includes(id)); assert.ok(result.ids.includes('de-okh'));
  assert.ok(!result.ids.includes('pl-high'));
  assert.ok(result.expanded.has('de-okh'));
});
test('focus, side, locks and explicit collapse control reachable branches',()=>{
  const m=new CommandMapModel(polandScenario); m.focus='de-3'; m.side='polish';
  assert.equal(run(m,17).ids.length,0); m.side='german';
  m.locks.add('de-north'); assert.deepEqual(Array.from(run(m,17).ids),['de-3']);
  m.expanded.add('de-3'); assert.ok(run(m,17).ids.length>1);
  assert.deepEqual(Array.from(run(m,17,{collapsed:new Set(['de-3'])}).ids),['de-3']);
});
test('manual mode follows saved expansion without inventing open descendants',()=>{
  const m=new CommandMapModel(polandScenario); m.focus='de-3'; m.expanded.add('de-3');
  const result=run(m,17,{autoDetail:false});
  assert.deepEqual(Array.from(result.ids),Array.from(m.visible()));
  assert.ok(result.expanded.has('de-3')); assert.ok(!result.expanded.has('de-3-sample'));
});
test('limit preserves selected reachable chain and marks truncation',()=>{
  const m=new CommandMapModel(polandScenario); m.selected='de-3-sample-r1-b1-c1-p1-s1-t1';
  const result=run(m,17,{limit:12});
  assert.ok(result.limited); assert.ok(result.ids.length<=12); assert.ok(result.ids.includes(m.selected));
  for(const id of m.ancestors(m.selected)) assert.ok(result.ids.includes(id));
});


test('pending branch uses logical expansion, respects faction and never changes positions',()=>{
  const m=new CommandMapModel(polandScenario); m.focus='de-3';
  const view=run(m,9); const before=JSON.stringify(m.snapshot());
  const rows=mapZoomPendingBranch(m,'de-3',view.expanded);
  assert.ok(rows.some(row=>row.id==='de-3-sample' && row.depth===1 && !row.pending));
  assert.ok(!rows.some(row=>row.id==='de-3-sample-r1'));
  assert.ok(view.reachableIds.includes('de-3-sample'));
  assert.equal(mapZoomPendingBranch(m,'de-3',new Set()).length,0);
  m.side='polish'; assert.equal(mapZoomPendingBranch(m,'de-3',view.expanded).length,0);
  m.side='both'; assert.equal(JSON.stringify(m.snapshot()),before);
});
