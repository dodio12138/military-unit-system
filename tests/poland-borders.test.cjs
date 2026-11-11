const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const source=fs.readFileSync('src/data/poland-borders-1939.js','utf8');
const data=vm.runInNewContext(source+'\npolandBorders1939');
const lines=feature=>feature.geometry.type==='LineString'?[feature.geometry.coordinates]:feature.geometry.coordinates;
const near=(a,b)=>Math.abs(a-b)<1e-7;

test('historical outlines contain genuine line geometry without artificial clipping-box edges',()=>{
  assert.equal(data.processing.boundaryBeforeClip,true);
  assert.ok(Buffer.byteLength(source)<500000);
  const [west,south,east,north]=data.processing.clipBounds;
  for(const feature of data.features){
    assert.ok(['LineString','MultiLineString'].includes(feature.geometry.type));
    for(const line of lines(feature)){
      assert.ok(line.length>=2);
      for(let i=0;i<line.length;i++){
        const p=line[i];assert.equal(p.length,2);
        assert.ok(p.every(Number.isFinite));
        assert.ok(p[0]>=west-1e-7&&p[0]<=east+1e-7&&p[1]>=south-1e-7&&p[1]<=north+1e-7);
        if(i===0)continue;
        const a=line[i-1],b=p;
        const onClipEdge=([west,east].some(x=>near(a[0],x)&&near(b[0],x))||[south,north].some(y=>near(a[1],y)&&near(b[1],y)));
        assert.equal(onClipEdge,false,`${feature.id} contains a fabricated clipping edge`);
      }
    }
  }
  // The clipped Soviet outline must actually contain open ends; a closed
  // ring would reintroduce a synthetic cut edge across this large country.
  const soviet=data.features.find(f=>f.id==='soviet-union');
  assert.ok(lines(soviet).some(line=>!near(line[0][0],line.at(-1)[0])||!near(line[0][1],line.at(-1)[1])));
});

test('historical Poland east, separated East Prussia, and Danzig are preserved',()=>{
  const poland=data.features.find(f=>f.id==='poland');
  assert.ok(lines(poland).flat().some(([lon])=>lon>28));
  const germany=data.features.find(f=>f.id==='germany');
  assert.equal(germany.sourcePolygon.type,'MultiPolygon');
  const eastPrussia=germany.sourcePolygon.components.find(({bounds:[west,south,east,north]})=>west>18&&south>53&&east>22&&north>55);
  assert.ok(eastPrussia);
  assert.ok(lines(germany).some(line=>line.every(([lon,lat])=>lon>=18&&lat>=53)&&line.some(([lon])=>lon>22)));
  const danzig=data.features.find(f=>f.id==='danzig');
  assert.ok(danzig&&lines(danzig).flat().some(([lon,lat])=>lon>18&&lon<20&&lat>54));
  assert.equal(danzig.sourcePeriod.end,'1938-08-31');
  assert.ok(danzig.temporalCaveat,'out-of-period geometry must explicitly disclose its date caveat');
});

test('source attribution, derivative license and temporal limits accompany the geometry',()=>{
  const main=data.sources.find(source=>source.id==='cshapes-2.0');
  assert.equal(main.license,'CC BY-NC-SA 4.0');
  assert.match(main.licenseUrl,/creativecommons\.org\/licenses\/by-nc-sa\/4\.0/);
  assert.match(main.sha256,/^[0-9a-f]{64}$/);
  assert.ok(main.attribution.includes('Schvitz'));
  assert.equal(data.processing.license,main.license);
  assert.match(fs.readFileSync('docs/licenses/CC-BY-NC-SA-4.0.txt','utf8'),/Attribution-NonCommercial-ShareAlike 4.0/);
  assert.ok(data.accuracy&&data.note&&data.referenceInstant);
  for(const f of data.features){
    assert.ok(data.sources.some(s=>s.id===f.source));
    assert.match(f.sourcePeriod.start,/^\d{4}-\d{2}-\d{2}$/);
    assert.match(f.sourcePeriod.end,/^\d{4}-\d{2}-\d{2}$/);
  }
});

test('optional German and Polish area tints retain closed polygon rings and geographic extent',()=>{
  for(const feature of data.features){
    if(!['germany','poland'].includes(feature.id)){assert.equal(feature.fillGeometry,undefined);continue;}
    const fill=feature.fillGeometry;
    assert.ok(['Polygon','MultiPolygon'].includes(fill.type));
    const polygons=fill.type==='Polygon'?[fill.coordinates]:fill.coordinates;
    for(const polygon of polygons)for(const ring of polygon){
      assert.ok(ring.length>=4);
      assert.deepEqual(ring[0],ring.at(-1));
      assert.ok(ring.every(point=>point.length===2&&point.every(Number.isFinite)));
    }
    if(feature.id==='germany'){
      assert.equal(fill.type,'MultiPolygon');
      assert.ok(polygons.some(p=>p[0].every(([lon,lat])=>lon>18&&lat>53)&&p[0].some(([lon])=>lon>22)));
    } else assert.ok(polygons.some(p=>p[0].some(([lon])=>lon>28)));
  }
});
