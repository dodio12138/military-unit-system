const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const {projection,plan}=vm.runInNewContext(
  fs.readFileSync('src/map/model.js','utf8')+'\n'+fs.readFileSync('src/map/tiles.js','utf8')+'\n({projection:mapProjection,plan:mapTilePlan})'
);
const close=(a,b,tolerance=1e-6)=>assert.ok(Math.abs(a-b)<tolerance,`${a} differs from ${b}`);

// Independently compute the OSM slippy-map pixel coordinate rather than
// deriving tile offsets through the production projection.
function tileCoordinate(lon,lat,z) {
  const n=2**z,radians=lat*Math.PI/180;
  return {x:(lon+180)/360*n,y:(1-Math.log(Math.tan(radians)+1/Math.cos(radians))/Math.PI)/2*n};
}
test('geographic marker and basemap tile coincide across zooms, overzoom and pans',()=>{
  for(const provider of ['roads','terrain'])for(const scale of [.04,.5,1,3.7,64,1024,8192]) {
    for(const point of [{lon:21.01,lat:52.23},{lon:16.9,lat:52.5},{lon:20.7,lat:53.5}]) {
      const p=projection.project(point);
      for(const offset of [{x:0,y:0},{x:113.25,y:-48.75}]) {
        const camera={scale,x:600-p.x*scale+offset.x,y:400-p.y*scale+offset.y};
        const planned=plan(camera,1200,800,provider),t=tileCoordinate(point.lon,point.lat,planned.zoom);
        const tile=planned.tiles.find(tile=>tile.x===Math.floor(t.x)&&tile.y===Math.floor(t.y));
        assert.ok(tile,'tile covering marker must be in viewport');
        close((tile.left+(t.x-tile.x)*tile.size)*scale+camera.x,600+offset.x);
        close((tile.top+(t.y-tile.y)*tile.size)*scale+camera.y,400+offset.y);
      }
    }
  }
});

test('production zoom keeps geographic point beneath cursor and never modifies unit positions',()=>{
  const source=fs.readFileSync('src/map/controller.js','utf8');
  const start=source.indexOf('function zoom('),end=source.indexOf('\nfunction screenGeo',start);
  assert.ok(start>=0&&end>start);
  const positions={sample:{lon:21.01,lat:52.23}};
  const context=vm.createContext({camera:{x:-500,y:-1000,scale:.7},svg:{clientWidth:1200,clientHeight:800},autoDetail:true,zoomCollapsed:new Set(['manual','locked']),model:{positions,locked:id=>id==='locked'},applyCamera(){},clearTimeout(){},setTimeout(){},save(){},saveTimer:null});
  vm.runInContext(source.slice(start,end),context);
  for(const factor of [1.5,.66,100,.001,1e8]) {
    const before={...context.camera},cursor={x:324,y:217};
    const p={x:(cursor.x-before.x)/before.scale,y:(cursor.y-before.y)/before.scale};
    context.zoom(factor,cursor.x,cursor.y);
    close(p.x*context.camera.scale+context.camera.x,cursor.x);
    close(p.y*context.camera.scale+context.camera.y,cursor.y);
  }
  assert.deepEqual([...context.zoomCollapsed],['locked'],'zoom clears temporary folds but preserves locks');
  assert.deepEqual(positions,{sample:{lon:21.01,lat:52.23}});
  context.autoDetail=false;context.zoomCollapsed.add('manual');context.zoom(.5);
  assert.ok(context.zoomCollapsed.has('manual'),'manual mode must retain explicit folds');
});

test('tile renderer lays out cached and new images in screen pixels at every camera update',()=>{
  const context=vm.createContext({clearTimeout(){},setTimeout(){},Date,Image:class {constructor(){this.style={};}remove(){}}});
  const Tiles=vm.runInContext(fs.readFileSync('src/map/model.js','utf8')+'\n'+fs.readFileSync('src/map/tiles.js','utf8')+'\nCommandMapTiles',context);
  const tiles=Object.create(Tiles.prototype);
  tiles.layer={style:{},append(){}};tiles.status={dataset:{}};tiles.provider='roads';tiles.cache=new Map();tiles.active=[];
  for(const scale of [.5,3.7,64,1024,8192]) {
    const p=projection.project({lon:21.01,lat:52.23});
    const camera={scale,x:600-p.x*scale,y:400-p.y*scale};
    tiles.update(camera,1200,800);
    assert.equal(tiles.layer.style.transform,'none','base-space CSS scaling amplifies fractional layout rounding');
    tiles.loadViewport();
    for(const entry of tiles.cache.values()) {
      const css=Object.fromEntries(entry.image.style.cssText.split(';').filter(Boolean).map(rule=>rule.split(':')));
      close(parseFloat(css.left),entry.left*scale+camera.x);
      close(parseFloat(css.top),entry.top*scale+camera.y);
      assert.ok(Math.abs(parseFloat(css.width)-entry.size*scale)<.1);
      assert.equal(css['max-width'],'none');
    }
  }
});

test('wheel during pointer gesture cannot change camera or invalidate drag origin',()=>{
  const source=fs.readFileSync('src/map/controller.js','utf8');
  const line=source.split('\n').find(line=>line.startsWith("svg.addEventListener('wheel'"));
  assert.ok(line);
  let handler,zooms=0,prevented=0;
  const context=vm.createContext({gesture:{pointer:1},svg:{addEventListener(type,callback){handler=callback;},getBoundingClientRect(){return {left:10,top:20};}},hideTooltip(){},zoom(){zooms++;}});
  vm.runInContext(line,context);
  const event={deltaY:-100,clientX:300,clientY:200,preventDefault(){prevented++;}};
  handler(event);assert.equal(zooms,0);assert.equal(prevented,1);
  context.gesture=null;handler(event);assert.equal(zooms,1);
});
