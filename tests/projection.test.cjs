const {test}=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
const path=require('node:path');
const {projectPoint,unprojectPoint,projectBounds}=vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../src/render/projection.js'),'utf8')+'\n({projectPoint,unprojectPoint,projectBounds})');
test('isometric ground axes have equal scale and 30-degree slopes',()=>{
 const x=projectPoint({x:1,y:0},'depth');const y=projectPoint({x:0,y:1},'depth');
 assert.ok(Math.abs(Math.hypot(x.x,x.y)-Math.hypot(y.x,y.y))<1e-12);
 assert.ok(Math.abs(Math.atan2(x.y,x.x)-Math.PI/6)<1e-12);
 assert.ok(Math.abs(Math.atan2(y.y,y.x)-5*Math.PI/6)<1e-12);
 const height=projectPoint(unprojectPoint({x:0,y:7},'depth'),'depth');
 assert.ok(Math.abs(height.x)<1e-12);assert.ok(Math.abs(height.y-7)<1e-12);
});
test('camera inverse preserves pointer positions across positive and negative model coordinates',()=>{
 for(const mode of ['flat','depth'])for(const point of [{x:0,y:0},{x:123.5,y:-42},{x:-400,y:3000}]){
  const restored=unprojectPoint(projectPoint(point,mode),mode);
  assert.ok(Math.abs(restored.x-point.x)<1e-9);assert.ok(Math.abs(restored.y-point.y)<1e-9);
 }
});
test('projected fit and export bounds contain all four corners',()=>{
 const box={left:-130,top:-78,right:1700,bottom:2500};const bounds=projectBounds(box,'depth');
 for(const [x,y] of [[box.left,box.top],[box.right,box.top],[box.right,box.bottom],[box.left,box.bottom]]){
  const p=projectPoint({x,y},'depth');assert.ok(p.x>=bounds.left&&p.x<=bounds.right&&p.y>=bounds.top&&p.y<=bounds.bottom);
 }
});
