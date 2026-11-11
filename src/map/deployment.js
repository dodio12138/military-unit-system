"use strict";

// Fixed geographic estimates, built once from evidence and hierarchy. Never
// called by zoom/layout; saved user coordinates still override them in the model.
function applyPolandDeployment(scenario,tables,borders) {
  const anchors=Object.assign({},...tables.map(table=>table.anchors));
  const excluded=Object.assign({},...tables.map(table=>table.excluded));
  const units=scenario.units.map(unit=>({...unit})),byId=new Map(units.map(unit=>[unit.id,unit]));
  const valid=p=>p&&Number.isFinite(p.lon)&&Number.isFinite(p.lat);
  const inBounds=p=>valid(p)&&p.lon>=scenario.bounds.west&&p.lon<=scenario.bounds.east&&p.lat>=scenario.bounds.south&&p.lat<=scenario.bounds.north;
  const hash=id=>{let h=2166136261;for(const c of id){h^=c.charCodeAt(0);h=Math.imul(h,16777619);}return h>>>0;};
  const offset=(p,distance,bearing)=>{
    const r=Math.PI/180,a=bearing*r,d=distance/6371,lat=p.lat*r,lon=p.lon*r;
    const y=Math.asin(Math.sin(lat)*Math.cos(d)+Math.cos(lat)*Math.sin(d)*Math.cos(a));
    const x=lon+Math.atan2(Math.sin(a)*Math.sin(d)*Math.cos(lat),Math.cos(d)-Math.sin(lat)*Math.sin(y));
    return {lon:Number((x/r).toFixed(5)),lat:Number((y/r).toFixed(5))};
  };
  const inRing=(p,ring)=>{let inside=false;for(let i=0,j=ring.length-1;i<ring.length;j=i++){
    const [xi,yi]=ring[i],[xj,yj]=ring[j];if((yi>p.lat)!==(yj>p.lat)&&p.lon<(xj-xi)*(p.lat-yi)/(yj-yi)+xi)inside=!inside;
  }return inside;};
  const inGeometry=(p,g)=>{const polygons=g?.type==='MultiPolygon'?g.coordinates:g?.type==='Polygon'?[g.coordinates]:[];
    return polygons.some(rings=>inRing(p,rings[0])&&!rings.slice(1).some(ring=>inRing(p,ring)));};
  const regions=(borders?.features??[]).filter(f=>f.fillGeometry);
  const placeNear=(center,distance,bearing)=>{
    // Preserve the anchor's broad land region where national geometry exists.
    // This is a coarse constraint, not a claim about the invasion-day front.
    const region=regions.find(f=>inGeometry(center,f.fillGeometry));
    for(const turn of [0,25,-25,55,-55,90,-90,135,-135,180])for(const scale of [1,.65,.3,.1]){
      const point=offset(center,distance*scale,bearing+turn);
      if(inBounds(point)&&(!region||inGeometry(point,region.fillGeometry)))return point;
    }
    return null;
  };
  const finished=new Set(),visiting=new Set();
  const blocked=unit=>{const seen=new Set();for(let u=unit;u&&!seen.has(u.id);u=byId.get(u.parent)){seen.add(u.id);if(excluded[u.id])return excluded[u.id];}return null;};
  const resolve=id=>{
    const unit=byId.get(id);if(!unit||finished.has(id))return unit;
    if(visiting.has(id))return unit;visiting.add(id);
    const finish=()=>{visiting.delete(id);finished.add(id);return unit;};
    if(valid(unit))return finish();
    const exclusion=blocked(unit);if(exclusion){unit.inferenceExclusion=exclusion;return finish();}
    const anchor=anchors[id],parent=resolve(unit.parent);
    let center,radius,bearing,method,basis,sources,place,parentRadius=0,distance;
    const h=hash(id),fraction=(h%65536)/65535;
    if(anchor&&valid(anchor)&&anchor.sources?.length){
      center=anchor;radius=anchor.radiusKm;method='historical-sector';bearing=anchor.bearing??0;
      // A map symbol already defines a geographic estimate. Only shared broad
      // region centers need individual estimated points within that region.
      const shared=Object.values(anchors).filter(a=>a.lon===anchor.lon&&a.lat===anchor.lat).length>1;
      distance=shared?Math.min(18,radius*.22)*(.4+.6*fraction):0;
      basis=anchor.inferenceBasis+(shared?' 同地域单位按固定方位分配推定点；具体方位不是史料记载。':'');
      sources=anchor.sources;place=anchor.place;
    }else if(valid(parent)&&['corps','division','brigade','regiment','battalion','company','platoon','squad','team'].includes(unit.rank)){
      // A headquarters city alone cannot establish a different army's front.
      center=parent;method='parent-sector';bearing=parent.deploymentBearing??anchors[parent.id]?.bearing??(unit.side==='german'?90:270);
      const spans={corps:30,division:18,brigade:12,regiment:7,battalion:3,company:1,platoon:.3,squad:.1,team:.05};
      distance=spans[unit.rank]*(.55+.45*fraction);parentRadius=parent.inferenceRadiusKm??anchors[parent.id]?.radiusKm??15;
      radius=parentRadius+distance;place=`${parent.name}所属部署地域`;
      basis=`依据${parent.name}的${parent.positionAccuracy==='inferred'?'推定':'史料参考'}部署地域及已录入隶属关系，按固定方位推定下属点。团级步兵位于地域内，炮兵按后侧配置；方位与间距是建模假设，史料没有给出此单位的精确坐标。`;
      sources=parent.deploymentSources??parent.sources;
    }else return finish();
    if(!sources?.length||!Number.isFinite(radius)||radius<=0)return finish();
    const direction=bearing+(unit.type==='artillery'?180:0)+(fraction-.5)*160;
    const point=distance?placeNear(center,distance,direction):(inBounds(center)?{lon:center.lon,lat:center.lat}:null);
    if(!point)return finish();
    unit.positionOriginal={lon:unit.lon,lat:unit.lat,positionAccuracy:unit.positionAccuracy,positionBasis:unit.positionBasis,place:unit.place};
    Object.assign(unit,point,{positionAccuracy:'inferred',positionBasis:`推定部署 · ${method==='historical-sector'?'史料地域标绘':'依据上级部署'} · 非核实驻地`,place,
      inferenceMethod:method,inferenceBasis:basis,inferenceRadiusKm:Math.ceil(radius),inferenceAnchor:{id:method==='parent-sector'?parent.id:id,lon:center.lon,lat:center.lat},
      deploymentBearing:bearing,deploymentSources:sources,inferenceConfidence:'low',
      sources:[...new Map([...(unit.sources??[]),...sources].map(source=>[source.url,source])).values()]});
    return finish();
  };
  for(const unit of units)resolve(unit.id);
  return {...scenario,revision:scenario.revision+'-deployment-1',units,
    description:'1939年9月1日德波编制。兵牌直接按真实参考点或推定部署显示；推定点依据战史地域与上级隶属，带“推”标记，具体间距和方位不代表史料实测。明确尚未就绪且无可靠地域的单位继续待定位。展开后以同位置指挥部连接下级。',
    sources:[...new Map([...scenario.sources,...tables.flatMap(table=>table.sources??[])].map(source=>[source.url,source])).values()]};
}
