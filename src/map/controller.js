"use strict";

const displayMode = "flat";
const $ = id => document.getElementById(id);
const svg = $("map-svg");
const world = $("map-world");
let stored = {};
try { stored = JSON.parse(localStorage.getItem(mapStorageKey)) ?? {}; } catch { /* Start from the scenario if storage is unavailable. */ }
let model = new CommandMapModel(polandScenario,stored);
let visibleIds = [];
let camera = {x:0,y:0,scale:.5};
let gesture = null, spaceHeld = false, suppressClick = false, saveTimer = null;
const history = [];
let lastClick = null;
const markerOffsets = new Map();
const emptyInspector = $("map-inspector").innerHTML;
const equipmentNames = {gun:"门火炮",truck:"辆卡车",tank:"辆坦克"};
const number = value => value.toLocaleString("zh-CN");
function equipmentText(stats) {return Object.entries(stats.equipment).map(([kind,count])=>`${count} ${equipmentNames[kind] ?? kind}`).join(" · ") || "无";}
function element(tag,attrs={},text) {
  const node=document.createElementNS(svgNamespace,tag);
  for(const [key,value] of Object.entries(attrs))node.setAttribute(key,String(value));
  if(text!==undefined)node.textContent=text;return node;
}
function html(tag,className,text) {const node=document.createElement(tag);if(className)node.className=className;if(text!==undefined)node.textContent=text;return node;}
function say(text) {$("map-announcement").textContent=text;$("map-status").textContent=text;}
function save() {
  clearTimeout(saveTimer);
  try {localStorage.setItem(mapStorageKey,JSON.stringify({...model.snapshot(),camera}));$("map-save-status").textContent="部署已保存在本浏览器";}
  catch {$("map-save-status").textContent="保存失败：浏览器存储不可用";}
}
function boundsOf(ids) {
  const points=ids.map(id=>mapProjection.project(model.position(id)));
  if(!points.length)return {left:0,right:2200,top:0,bottom:1920};
  return {left:Math.min(...points.map(p=>p.x)),right:Math.max(...points.map(p=>p.x)),top:Math.min(...points.map(p=>p.y)),bottom:Math.max(...points.map(p=>p.y))};
}
function fit(ids=visibleIds,overview=false) {
  const box=overview?{left:0,right:15*mapProjection.xScale,top:0,bottom:8*240}:boundsOf(ids);
  const w=svg.clientWidth,h=svg.clientHeight;
  camera.scale=Math.max(.15,Math.min(8192,(w-260)/Math.max(.01,box.right-box.left),(h-180)/Math.max(.01,box.bottom-box.top)));
  camera.x=w/2-(box.left+box.right)*camera.scale/2-40;
  camera.y=h/2-(box.top+box.bottom)*camera.scale/2;
  applyCamera();save();
}
function applyCamera() {
  world.setAttribute("transform",`translate(${camera.x} ${camera.y}) scale(${camera.scale})`);
  const grid=$("map-detail-grid");grid.replaceChildren();
  if(camera.scale>2){
    const rough=100/camera.scale,power=10**Math.floor(Math.log10(rough));const step=[1,2,5,10].map(n=>n*power).find(n=>n>=rough);
    const left=-camera.x/camera.scale,top=-camera.y/camera.scale,right=left+svg.clientWidth/camera.scale,bottom=top+svg.clientHeight/camera.scale;
    let path='';for(let x=Math.floor(left/step)*step;x<=right;x+=step)path+=`M${x} ${top}V${bottom}`;
    for(let y=Math.floor(top/step)*step;y<=bottom;y+=step)path+=`M${left} ${y}H${right}`;
    grid.append(element('path',{d:path,class:'map-grid',fill:'none'}));
  }
  const occupied=[];const leaders=$("map-anchors");leaders.replaceChildren();
  const nodes=new Map([...$("map-markers").children].map(node=>[node.dataset.unit,node]));
  for(const id of visibleIds){
    const node=nodes.get(id);if(!node)continue;const p=mapProjection.project(model.position(id));
    const sx=p.x*camera.scale+camera.x,sy=p.y*camera.scale+camera.y;
    let dx=0,dy=0,placed=false;
    if(gesture && markerOffsets.has(id)){({dx,dy}=markerOffsets.get(id));placed=true;}
    for(let ring=0;ring<10&&!placed;ring++){
      const candidates=ring===0?[[0,0]]:[[0,-ring*58],[0,ring*58],[ring*248,0],[-ring*248,0],[ring*160,-ring*58],[-ring*160,ring*58]];
      for(const [cx,cy] of candidates){const box={x:sx+cx-28,y:sy+cy-32,w:236,h:60};
        if(ring>0&&(box.x<8||box.y<8||box.x+box.w>svg.clientWidth-8||box.y+box.h>svg.clientHeight-8))continue;
        if(occupied.every(b=>box.x+box.w<=b.x||box.x>=b.x+b.w||box.y+box.h<=b.y||box.y>=b.y+b.h)){dx=cx;dy=cy;occupied.push(box);placed=true;break;}
      }
    }
    markerOffsets.set(id,{dx,dy});
    node.setAttribute("transform",`translate(${p.x+dx/camera.scale} ${p.y+dy/camera.scale}) scale(${1/camera.scale})`);
    if(dx||dy){leaders.append(element('path',{d:`M${p.x} ${p.y}l${dx/camera.scale} ${dy/camera.scale}`,class:'map-position-leader'}));}
    leaders.append(element('circle',{cx:p.x,cy:p.y,r:2.5/camera.scale,class:'map-position-anchor'}));
  }
  for(const city of $("map-geography").querySelectorAll(".map-city")){city.setAttribute("transform",`translate(${city.dataset.x} ${city.dataset.y}) scale(${1/camera.scale})`);city.style.display=camera.scale>40?"none":"";}
  for(const label of $("map-geography").querySelectorAll('.map-region-name')){label.setAttribute('font-size',16/camera.scale);label.style.fontSize=`${16/camera.scale}px`;label.style.display=camera.scale>4?'none':'';}
  const km=100/camera.scale/240*111;
  $("map-scale").textContent=`100 px ≈ ${km<1?`${Math.round(km*1000)} m`:`${km.toFixed(km<10?1:0)} km`}`;
}
function zoom(factor,x=svg.clientWidth/2,y=svg.clientHeight/2) {
  const next=Math.max(.15,Math.min(8192,camera.scale*factor));const ratio=next/camera.scale;
  camera.x=x-(x-camera.x)*ratio;camera.y=y-(y-camera.y)*ratio;camera.scale=next;applyCamera();clearTimeout(saveTimer);saveTimer=setTimeout(save,200);
}
function screenGeo(clientX,clientY) {const rect=svg.getBoundingClientRect();return mapProjection.invert({x:(clientX-rect.left-camera.x)/camera.scale,y:(clientY-rect.top-camera.y)/camera.scale});}
function renderGeography() {
  const layer=$("map-geography");layer.replaceChildren();
  layer.append(element("rect",{x:0,y:0,width:15*mapProjection.xScale,height:1920,fill:"#e8ece4"}));
  const pointString=coordinates=>coordinates.map(([lon,lat])=>{const p=mapProjection.project({lon,lat});return `${p.x},${p.y}`;}).join(" ");
  const coast=polandScenario.features.find(f=>f.kind==='coast');
  if(coast)layer.append(element("polygon",{class:"map-water",points:pointString([[12,56],[27,56],[27,55.4],...coast.coordinates.slice().reverse()])}));
  for(const feature of polandScenario.features){
    const shape=element(feature.kind==='border'?'polygon':'polyline',{points:pointString(feature.coordinates),class:feature.kind==='border'?'map-land':feature.kind==='river'?'map-river':'map-coast'});
    shape.append(element('title',{},feature.name));layer.append(shape);
  }
  for(let lon=12;lon<=27;lon++){const p=mapProjection.project({lon,lat:56});layer.append(element('line',{x1:p.x,x2:p.x,y1:0,y2:1920,class:'map-grid'}));}
  for(let lat=48;lat<=56;lat++){const p=mapProjection.project({lon:12,lat});layer.append(element('line',{x1:0,x2:15*mapProjection.xScale,y1:p.y,y2:p.y,class:'map-grid'}));}
  for(const [text,lon,lat] of [['波 兰',23.6,52.8],['德 国',14.6,51.5],['东普鲁士',21.2,54.5],['波罗的海',16.2,55.3],['斯洛伐克',19.8,48.4]]){const p=mapProjection.project({lon,lat});layer.append(element('text',{x:p.x,y:p.y,class:'map-region-name'},text));}
  for(const city of polandScenario.cities){const p=mapProjection.project(city);const node=element('g',{class:'map-city','data-x':p.x,'data-y':p.y});node.append(element('circle',{r:2.5}),element('text',{x:7,y:4},city.name));layer.append(node);}
}
function renderLinks() {
  const layer=$("map-connections");layer.replaceChildren();if(!model.showLinks)return;
  const visible=new Set(visibleIds);const selectedPath=new Set([...model.ancestors(model.selected),model.selected]);
  for(const id of visibleIds){const unit=model.units.get(id);if(!visible.has(unit.parent))continue;
    const a=mapProjection.project(model.position(unit.parent)),b=mapProjection.project(model.position(id));
    layer.append(element('path',{d:`M${a.x} ${a.y}L${b.x} ${b.y}`,class:`map-command-link${selectedPath.has(id)||unit.parent===model.selected?' active':''}`,stroke:unit.side==='german'?'#3e737a':'#936448','data-parent':unit.parent,'data-child':id}));
  }
}
function renderMarkers() {
  const layer=$("map-markers");layer.replaceChildren();
  const ordered=visibleIds.slice().sort((a,b)=>(model.selected===a?1:0)-(model.selected===b?1:0));
  for(const id of ordered){const unit=model.units.get(id);const children=model.children.get(id) ?? [];
    const node=element('g',{class:`map-marker ${unit.side}`,'data-unit':id,role:'button',tabindex:'0','aria-label':`${unit.name}，${ranks[unit.rank].name}，推定部署`,'aria-pressed':String(model.selected===id)});
    if(children.length)node.setAttribute('aria-expanded',String(model.expanded.has(id)));
    node.innerHTML=symbol(unit.type)+rankMark(unit.rank);
    const plate=node.querySelector('.unit-symbol');for(const [key,value] of Object.entries({x:-22,y:-14,width:44,height:28}))plate.setAttribute(key,value);
    const rank=node.querySelector('.rank-mark');const rankWidth=Math.max(24,Number(rank.getAttribute('viewBox').split(' ')[2])*.75);rank.style.width=`${rankWidth}px`;for(const [key,value] of Object.entries({x:-rankWidth/2,y:-28,width:rankWidth,height:12}))rank.setAttribute(key,value);
    node.append(element('rect',{x:-27,y:-32,width:54,height:51,class:'map-selection'}));
    const short=Array.from(unit.name);node.append(element('text',{x:30,y:4},short.length>13?short.slice(0,12).join('')+'…':unit.name));
    if(children.length)node.append(element('text',{x:30,y:20,'font-size':10},`${model.expanded.has(id)?'已展开':'下辖'} ${children.length}`));
    if(model.locks.has(id))node.append(element('rect',{x:18,y:-28,width:5,height:6,class:'map-lock'}));
    layer.append(node);
  }
  applyCamera();
}
function render() {
  const focused=document.activeElement?.closest('[data-unit]')?.dataset.unit;
  visibleIds=model.visible();$("map-side").value=model.side;$("map-links").checked=model.showLinks;
  $("map-focus").hidden=!model.focus;$("map-focus-name").textContent=model.units.get(model.focus)?.name ?? '';
  $("map-status").textContent=`显示 ${number(visibleIds.length)} / ${number(model.units.size)} 个单位 · 坐标均为推定`;
  renderLinks();renderMarkers();renderInspector();
  if(focused){const node=[...$("map-markers").children].find(item=>item.dataset.unit===focused);node?.focus({preventScroll:true});}
}
function select(id) {model.selected=id;render();save();}
function showBranch(id) {
  model.selected=id;model.focus=id;if(!model.locked(id))model.expanded.add(id);
  model.side=model.units.get(id).side;render();fit();save();
}
function locate(id) {
  model.reveal(id);render();
  // The immediate unit and its children set a useful local scale without
  // changing any stored geographic positions.
  fit([id,...(model.children.get(id) ?? [])]);save();
}
function button(label,action,className='button hud-btn') {const node=html('button',className,label);node.type='button';node.addEventListener('click',action);return node;}
function section(title){const node=html('section','map-section');node.append(html('h3','',title));return node;}
function renderInspector() {
  const container=$("map-inspector");if(!model.selected || !model.units.has(model.selected)){container.innerHTML=emptyInspector;return;}
  const unit=model.units.get(model.selected),stats=model.stats(unit.id),children=model.children.get(unit.id) ?? [],position=model.position(unit.id);container.replaceChildren();
  const header=html('div','map-unit-header');header.append(html('h2','',unit.name),html('p','',`${unit.side==='german'?'德军':'波军'} · ${ranks[unit.rank].name} · ${types[unit.type].name}`),html('p','',unit.historical?'历史名称 · 位置推定':'示例编成 · 位置推定'));if(unit.parent)header.append(html('p','map-note',model.ancestors(unit.id).map(id=>model.units.get(id).name).join(' / ')));container.append(header);
  const strength=section('本示例编制');const list=html('dl','map-stats');
  for(const [key,value] of [['本部人员',`${unit.personnel} 人`],['含下级合计',`${number(stats.people)} 人`],['军官',`${stats.officers} 人`],['装备',equipmentText(stats)],['直属下级',`${children.length} 个`]])list.append(html('dt','',key),html('dd','',value));strength.append(list);container.append(strength);
  const location=section('部署位置');const form=html('form');form.id='map-coordinate-form';const fields=html('div','map-coordinates');
  for(const [name,label,min,max] of [['lon','经度',12,27],['lat','纬度',48,56]]){const wrapper=html('label','',label);const input=html('input');input.type='number';input.name=name;input.id=`map-${name}`;input.step='0.000001';input.min=min;input.max=max;input.required=true;input.value=position[name].toFixed(6);wrapper.append(input);fields.append(wrapper);}
  const move=html('label','map-check');const checkbox=html('input');checkbox.type='checkbox';checkbox.checked=model.moveSubtree;checkbox.id='map-move-subtree';checkbox.addEventListener('change',()=>{model.moveSubtree=checkbox.checked;save();});move.append(checkbox,document.createTextNode('移动时带动全部下属'));
  const update=button('更新位置',()=>{});update.type='submit';form.append(fields,move,html('div','map-actions'));form.lastChild.append(update);
  form.addEventListener('submit',event=>{event.preventDefault();const lon=Number(form.elements.lon.value),lat=Number(form.elements.lat.value);const before=model.snapshot();if(!model.move(unit.id,lon,lat)){say('位置超出当前地图范围，未修改部署');return;}history.push(before);$("map-undo").disabled=false;save();render();fit([unit.id]);say('部署位置已更新');});location.append(form,html('p','map-note','推定坐标可编辑；本部与每个下级单位分别保存位置。'));container.append(location);
  const chain=section('指挥关系');if(unit.parent)chain.append(button(`上级 · ${model.units.get(unit.parent).name}`,()=>locate(unit.parent),'map-unit-row'));
  const actions=html('div','map-actions');const expand=button(model.expanded.has(unit.id)?'折叠下级':'展开下级',()=>toggle(unit.id));expand.disabled=!children.length || model.locked(unit.id);actions.append(expand,button('查看下属部署',()=>showBranch(unit.id)));chain.append(actions);
  const lock=html('label','map-check');lock.style.marginTop='12px';const check=html('input');check.type='checkbox';check.checked=model.locks.has(unit.id);check.id='map-expansion-lock';check.addEventListener('change',()=>{check.checked?model.locks.add(unit.id):model.locks.delete(unit.id);save();render();});lock.append(check,document.createTextNode('锁定此分支展开状态'));chain.append(lock);
  for(const childId of children){const child=model.units.get(childId);const row=button('',()=>locate(childId),'map-unit-row');row.append(html('span','',child.name),html('small','',`${model.stats(childId).people} 人`));chain.append(row);}
  if(!children.length)chain.append(html('p','map-note','最基层单位 · 已有独立部署坐标'));
  container.append(chain);
}
function toggle(id) {
  if(!model.toggle(id)){say('该单位已锁定，或已经是最基层单位');return;}
  if(model.visible().length>450){model.toggle(id);say('单位较多，请选择“查看下属部署”后继续展开');return;}
  render();save();
}
function hideTooltip() {$("map-tooltip").hidden=true;}
function tooltip(id,x,y) {
  if(gesture)return;const unit=model.units.get(id),stats=model.stats(id),position=model.position(id);const tip=$("map-tooltip");tip.replaceChildren(html('strong','',unit.name),html('div','',`下辖汇总 ${number(stats.people)} 人 · ${equipmentText(stats)}`),html('div','',`${position.lat.toFixed(5)}° N / ${position.lon.toFixed(5)}° E`),html('div','',`${model.positions[id]?'已调整':'初始'}推定位置 · 双击展开`));tip.hidden=false;
  tip.style.left=`${Math.max(8,Math.min(x+16,innerWidth-tip.offsetWidth-8))}px`;tip.style.top=`${Math.max(8,Math.min(y+16,innerHeight-tip.offsetHeight-8))}px`;
}
svg.addEventListener('pointerdown',event=>{
  if(event.button!==0)return;$("map-context").hidden=true;hideTooltip();const id=event.target.closest('[data-unit]')?.dataset.unit;
  const dragging=id&&!spaceHeld;gesture={id:dragging?id:null,pointer:event.pointerId,startX:event.clientX,startY:event.clientY,camera:{...camera},geo:screenGeo(event.clientX,event.clientY),snapshot:dragging?model.snapshot():null,origin:dragging?{lon:model.position(id).lon,lat:model.position(id).lat}:null,moved:false};svg.setPointerCapture(event.pointerId);
});
svg.addEventListener('pointermove',event=>{
  if(!gesture){const id=event.target.closest('[data-unit]')?.dataset.unit;if(id)tooltip(id,event.clientX,event.clientY);else hideTooltip();return;}
  if(event.pointerId!==gesture.pointer)return;const dx=event.clientX-gesture.startX,dy=event.clientY-gesture.startY;if(Math.hypot(dx,dy)<4&&!gesture.moved)return;gesture.moved=true;
  if(gesture.id){const point=screenGeo(event.clientX,event.clientY);model.move(gesture.id,gesture.origin.lon+point.lon-gesture.geo.lon,gesture.origin.lat+point.lat-gesture.geo.lat);applyCamera();renderLinks();}
  else {camera.x=gesture.camera.x+dx;camera.y=gesture.camera.y+dy;applyCamera();}
});
svg.addEventListener('pointerup',event=>{
  if(!gesture||event.pointerId!==gesture.pointer)return;const finished=gesture;gesture=null;suppressClick=finished.moved;if(svg.hasPointerCapture(event.pointerId))svg.releasePointerCapture(event.pointerId);
  if(finished.moved&&finished.id){history.push(finished.snapshot);if(history.length>40)history.shift();$("map-undo").disabled=false;model.selected=finished.id;render();}
  else if(finished.id){const double=lastClick?.id===finished.id&&performance.now()-lastClick.at<400;lastClick={id:finished.id,at:performance.now()};select(finished.id);if(double){toggle(finished.id);lastClick=null;}suppressClick=true;}save();
});
svg.addEventListener('pointercancel',()=>{if(gesture?.snapshot)model=new CommandMapModel(polandScenario,gesture.snapshot);gesture=null;render();});
svg.addEventListener('click',event=>{if(suppressClick){suppressClick=false;return;}const id=event.target.closest('[data-unit]')?.dataset.unit;if(id)select(id);});

svg.addEventListener('pointerleave',hideTooltip);
svg.addEventListener('wheel',event=>{event.preventDefault();hideTooltip();const rect=svg.getBoundingClientRect();zoom(Math.exp(-event.deltaY/350),event.clientX-rect.left,event.clientY-rect.top);},{passive:false});
svg.addEventListener('contextmenu',event=>{const id=event.target.closest('[data-unit]')?.dataset.unit;if(!id)return;event.preventDefault();select(id);hideTooltip();const menu=$("map-context");menu.hidden=false;menu.style.left=`${Math.max(8,Math.min(event.clientX,innerWidth-menu.offsetWidth-8))}px`;menu.style.top=`${Math.max(8,Math.min(event.clientY,innerHeight-menu.offsetHeight-8))}px`;});
$("map-context").addEventListener('click',event=>{const action=event.target.dataset.mapAction;const id=model.selected;if(!id)return;if(action==='toggle')toggle(id);if(action==='focus')showBranch(id);if(action==='lock'){model.locks.has(id)?model.locks.delete(id):model.locks.add(id);render();save();}$("map-context").hidden=true;});
document.addEventListener('pointerdown',event=>{if(!$("map-context").contains(event.target))$("map-context").hidden=true;});
document.addEventListener('keydown',event=>{if(event.target.closest('input,textarea,select,button,a,summary'))return;if(event.code==='Space'){spaceHeld=true;event.preventDefault();}if(event.key==='Escape'){hideTooltip();$("map-context").hidden=true;}const id=event.target.closest('[data-unit]')?.dataset.unit;if(id&&(event.key==='Enter'||event.key===' ')){event.preventDefault();select(id);if(event.key==='Enter')toggle(id);}});
document.addEventListener('keyup',event=>{if(event.code==='Space')spaceHeld=false;});window.addEventListener('blur',()=>{spaceHeld=false;});
$("map-expand").addEventListener('click',()=>{if(!model.expandLayer()){say('单位较多，请进入一个分支后继续展开');return;}render();save();});
$("map-collapse").addEventListener('click',()=>{model.collapseLayer();render();save();});
$("map-side").addEventListener('change',event=>{model.side=event.target.value;model.focus=null;render();fit();save();});
$("map-links").addEventListener('change',event=>{model.showLinks=event.target.checked;renderLinks();save();});
$("map-fit").addEventListener('click',()=>fit());
$("map-overview").addEventListener('click',()=>{model.focus=null;render();fit(visibleIds,true);save();});
$("map-exit-focus").addEventListener('click',()=>{model.focus=null;render();fit();save();});
$("map-zoom-in").addEventListener('click',()=>zoom(1.5));$("map-zoom-out").addEventListener('click',()=>zoom(1/1.5));
$("map-undo").addEventListener('click',()=>{if(!history.length)return;model=new CommandMapModel(polandScenario,history.pop());$("map-undo").disabled=!history.length;render();save();});
$("map-search").addEventListener('input',event=>{
  const query=event.target.value.trim().toLocaleLowerCase();const results=$("map-search-results");results.replaceChildren();results.hidden=!query;if(!query)return;
  const matches=[...model.units.values()].filter(unit=>`${unit.id} ${unit.name}`.toLocaleLowerCase().includes(query)).slice(0,20);
  for(const unit of matches){const row=button('',()=>{locate(unit.id);results.hidden=true;},'map-unit-row');const parent=model.units.get(unit.parent);const label=html('span','',unit.name);label.append(html('small','',` · ${parent?.name ?? (unit.side==='german'?'德军':'波军')}`));row.append(label);results.append(row);}if(!matches.length)results.append(html('p','map-note','没有匹配的单位'));
});
$("map-export").addEventListener('click',()=>{
  const clone=svg.cloneNode(true);clone.setAttribute('xmlns',svgNamespace);clone.setAttribute('width',svg.clientWidth);clone.setAttribute('height',svg.clientHeight);clone.setAttribute('viewBox',`0 0 ${svg.clientWidth} ${svg.clientHeight}`);
  const original=svg.querySelectorAll('*'),copies=clone.querySelectorAll('*');
  original.forEach((node,index)=>{const style=getComputedStyle(node);for(const property of ['fill','stroke','stroke-width','stroke-dasharray','opacity','font-family','font-size','font-weight','display','vector-effect'])copies[index].style.setProperty(property,style.getPropertyValue(property));});
  clone.querySelectorAll('.map-selection,.map-lock').forEach(node=>node.remove());clone.removeAttribute('tabindex');
  clone.append(element('rect',{x:8,y:8,width:360,height:30,fill:'#f2f1e7'}),element('text',{x:16,y:28,fill:'#465951','font-size':12},'波兰战役 · 1939-09-01 · 示意边界 / 推定部署'));
  const url=URL.createObjectURL(new Blob([new XMLSerializer().serializeToString(clone)],{type:'image/svg+xml'}));const link=document.createElement('a');link.href=url;link.download='波兰战役指挥地图.svg';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);say('已保存当前地图视野，锁定标记已过滤');
});
$("map-scope").textContent=polandScenario.description;
for(const source of polandScenario.sources){const link=html('a','',source.title);link.href=source.url;link.target='_blank';link.rel='noopener noreferrer';$("map-source-links").append(link);}
renderGeography();render();
if(stored.camera && [stored.camera.x,stored.camera.y,stored.camera.scale].every(Number.isFinite) && stored.camera.scale>=.15 && stored.camera.scale<=8192){camera=stored.camera;applyCamera();}else fit(visibleIds,true);
new ResizeObserver(()=>{svg.setAttribute('viewBox',`0 0 ${svg.clientWidth} ${svg.clientHeight}`);applyCamera();}).observe(svg);
