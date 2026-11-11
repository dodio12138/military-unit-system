const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const vm = require('node:vm');
function model() {
  const source = ['presets.js','migrations.js'].map(name=>readFileSync(join(__dirname,'..','src','data',name),'utf8')).join('\n');
  return vm.runInNewContext(source+'\n({newFourthDirectPresets,newFourthDirectBranches,presetStats,migrateNewFourthDirectUnits});',{structuredClone});
}
test('New Fourth Army direct units resolve to staffed leaves and separate equipment crews',()=>{
  const {newFourthDirectPresets,newFourthDirectBranches,presetStats}=model();
  const defs=newFourthDirectPresets();
  const expected=[48,390,41,32];
  Object.values(newFourthDirectBranches).forEach((key,index)=>{
    const stat=presetStats(defs,key);assert.equal(stat.people,expected[index]);assert.equal(stat.incomplete,false);
    const visit=key=>{const unit=defs[key];if(!unit.parts?.length)assert.ok(unit.strength[0]>0);else unit.parts.forEach(([child])=>visit(child));};visit(key);
  });
  assert.equal(presetStats(defs,'n4-direct-hq').equipment.signal,3);
  assert.equal(presetStats(defs,'n4-direct-logistics').equipment.truck,3);
});
test('legacy direct branches migrate once, retaining named posts and independent detachments',()=>{
  const {migrateNewFourthDirectUnits}=model();
  const doc={referenceNewFourthArmy:true,units:[
    {id:'new-fourth-army-hq',name:'军部',parent:'new-fourth-army',x:8,y:12,personnel:[{role:'军长 叶挺',count:1,officer:true}],rosterOnly:true},
    {id:'n4-general-staff',parent:'new-fourth-army-hq',personnel:[{role:'参谋长 张云逸',count:1,officer:true}],rosterOnly:true},
    {id:'n4-school',parent:'new-fourth-army',name:'教导队',personnel:[{role:'筹办 周子昆',count:1,officer:true}]},
    {id:'n4-logistics',parent:'new-fourth-army',name:'总兵站',personnel:[{role:'站长 张元寿',count:1,officer:true}]},
    {id:'n4-special-battalion',parent:'new-fourth-army',name:'特务营'},
    {id:'n4-detachment-1',parent:'new-fourth-army',name:'第一支队',x:37,y:40},
  ],folded:['n4-detachment-1']};
  const detachment=JSON.stringify(doc.units.at(-1));assert.equal(migrateNewFourthDirectUnits(doc),true);
  assert.equal(doc.units.length,5);assert.equal(JSON.stringify(doc.units.at(-1)),detachment);
  const defs=doc.recipes['new-fourth-direct-v1'];
  assert.equal(defs['n4-direct-staff'].personnel[0].role,'参谋长 张云逸');
  assert.equal(doc.units[0].personnel[0].role,'军长 叶挺');assert.equal(doc.units[0].rosterOnly,undefined);
  assert.equal(doc.units[0].x,8);assert.ok(doc.folded.includes('n4-logistics'));
  const serialized=JSON.stringify(doc);assert.equal(migrateNewFourthDirectUnits(doc),false);assert.equal(JSON.stringify(doc),serialized);
});
