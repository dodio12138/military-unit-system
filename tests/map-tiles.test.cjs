const {test}=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
const {mapProjection,mapTilePlan}=vm.runInNewContext(fs.readFileSync('src/map/model.js','utf8')+'\n'+fs.readFileSync('src/map/tiles.js','utf8')+'\n({mapProjection,mapTilePlan})');
test('Mercator equator and Warsaw align with standard XYZ tile coordinates',()=>{
 const zero=mapProjection.global({lon:0,lat:0});assert.equal(zero.x,32768);assert.equal(zero.y,32768);
 const p=mapProjection.project({lon:21.012,lat:52.23});const plan=mapTilePlan({x:400-p.x,y:300-p.y,scale:1},800,600);
 const tile=plan.tiles.find(t=>p.x>=t.left&&p.x<t.left+t.size&&p.y>=t.top&&p.y<t.top+t.size);
 assert.equal(tile.x,142);assert.equal(tile.y,84);assert.equal(tile.z,8);
});
test('tile requests cover only the current viewport and honor each source native zoom',()=>{
 const p=mapProjection.project({lon:21.012,lat:52.23});
 for(const [provider,max] of [['roads',19],['terrain',17]])for(const scale of [.15,1,16,8192]){
  const camera={x:500-p.x*scale,y:350-p.y*scale,scale};const plan=mapTilePlan(camera,1000,700,provider);
  assert.ok(plan.zoom<=max);assert.ok(plan.tiles.length>0&&plan.tiles.length<80);
  for(const tile of plan.tiles){const left=tile.left*scale+camera.x,top=tile.top*scale+camera.y,size=tile.size*scale;assert.ok(left<1000&&left+size>0&&top<700&&top+size>0);}
  const corners=[[0,0],[999,0],[0,699],[999,699]];
  for(const [x,y] of corners)assert.ok(plan.tiles.some(t=>x>=t.left*scale+camera.x&&x<=(t.left+t.size)*scale+camera.x&&y>=t.top*scale+camera.y&&y<=(t.top+t.size)*scale+camera.y));
 }
});
test('tile projection and inverse keep existing geographic deployments unchanged',()=>{
 for(const lat of [48,52.23,56])for(const lon of [12,21.012,27]){
  const p=mapProjection.project({lon,lat}),q=mapProjection.invert(p);
  assert.ok(Math.abs(q.lon-lon)<1e-10&&Math.abs(q.lat-lat)<1e-10);
 }
 assert.ok(Math.abs(mapProjection.metersPerPixel(0,1)-611.4962263)<1e-6);
});
