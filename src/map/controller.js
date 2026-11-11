"use strict";

const displayMode = "flat";
const $ = id => document.getElementById(id);
const svg = $("map-svg");
const world = $("map-world");
let deploymentMode="history";
try {if(localStorage.getItem(`${mapStorageKey}:mode`)==="example")deploymentMode="example";} catch {}
const scenario=deploymentMode==="history"?polandHistoricalScenario:polandScenario;
const activeStorageKey=deploymentMode==="history"?`${mapStorageKey}:history:v1`:mapStorageKey;
let stored = {};
try { stored = JSON.parse(localStorage.getItem(activeStorageKey)) ?? {}; } catch { /* Start from the scenario if storage is unavailable. */ }
let model = new CommandMapModel(scenario,stored);
let visibleIds = [];
let visibleExpanded = new Set();
let autoDetail = stored.autoDetail !== false;
const zoomCollapsed = new Set(Array.isArray(stored.zoomCollapsed)?stored.zoomCollapsed.filter(id=>model.units.has(id)):[]);
const tiles = new CommandMapTiles($("map-tiles"),$("map-tile-status"),$("map-attribution"),stored.basemap);
$("map-tile-status").addEventListener('click',()=>tiles.retry());
let camera = {x:0,y:0,scale:.5};
let gesture = null, spaceHeld = false, suppressClick = false, saveTimer = null;
const history = [];
let lastClick = null;
const emptyInspector = $("map-inspector").innerHTML;
const equipmentNames = {gun:"门火炮",truck:"辆卡车",tank:"辆坦克"};
const number = value => value.toLocaleString("zh-CN");
function positionLabel(unit) {return model.positions[unit.id]?"用户调整坐标 · 非史料定位":unit.positionBasis??"示例推定坐标";}
function mapRankName(unit) {return unit.commandCategory==='highCommand'?'最高指挥机关':unit.commandCategory==='operationalGroup'?'独立作战集群':ranks[unit.rank].name;}
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
  try {localStorage.setItem(activeStorageKey,JSON.stringify({...model.snapshot(),camera,cameraProjection:"web-mercator-v1",basemap:tiles.provider,autoDetail,zoomCollapsed:[...zoomCollapsed]}));$("map-save-status").textContent="部署已保存在本浏览器";}
  catch {$("map-save-status").textContent="保存失败：浏览器存储不可用";}
}
function boundsOf(ids) {
  const points=ids.filter(id=>model.hasPosition(id)).map(id=>mapProjection.project(model.position(id)));
  if(!points.length)return scenarioBounds();
  return {left:Math.min(...points.map(p=>p.x)),right:Math.max(...points.map(p=>p.x)),top:Math.min(...points.map(p=>p.y)),bottom:Math.max(...points.map(p=>p.y))};
}
function scenarioBounds() {const b=scenario.bounds,a=mapProjection.project({lon:b.west,lat:b.north}),z=mapProjection.project({lon:b.east,lat:b.south});return {left:a.x,right:z.x,top:a.y,bottom:z.y};}
function mapVisibility() {
  const a=screenGeo(svg.getBoundingClientRect().left-200,svg.getBoundingClientRect().top-200);
  const b=screenGeo(svg.getBoundingClientRect().right+200,svg.getBoundingClientRect().bottom+200);
  return mapVisibleAtZoom(model,{zoom:8+Math.log2(camera.scale),west:a.lon,east:b.lon,south:b.lat,north:a.lat,autoDetail,collapsed:zoomCollapsed});
}
function fit(ids=visibleIds,overview=false) {
  const box=overview?scenarioBounds():boundsOf(ids);
  const w=svg.clientWidth,h=svg.clientHeight;
  camera.scale=Math.max(.04,Math.min(8192,(w-Math.min(260,w*.2))/Math.max(deploymentMode==="history"?8:.01,box.right-box.left),(h-Math.min(180,h*.2))/Math.max(deploymentMode==="history"?8:.01,box.bottom-box.top)));
  camera.x=w/2-(box.left+box.right)*camera.scale/2;
  camera.y=h/2-(box.top+box.bottom)*camera.scale/2;
  applyCamera();save();
}
function applyCamera(refresh=true) {
  if(refresh && !gesture){
    const next=mapVisibility();
    if(next.ids.join('|')!==visibleIds.join('|') || [...next.expanded].join('|')!==[...visibleExpanded].join('|')){render();return;}
  }
  world.setAttribute("transform",`translate(${camera.x} ${camera.y}) scale(${camera.scale})`);
  tiles.update(camera,svg.clientWidth,svg.clientHeight);
  const leaders=$("map-anchors");leaders.replaceChildren();
  const nodes=new Map([...$("map-markers").children].map(node=>[node.dataset.unit,node]));
  const points=new Map(visibleIds.map(id=>{const p=mapProjection.project(model.position(id));return [id,{...p,sx:p.x*camera.scale+camera.x,sy:p.y*camera.scale+camera.y}];}));
  const occupied=[...points.values()].map(p=>({x:p.sx-24,y:p.sy-30,w:48,h:48}));
  const order=visibleIds.slice().sort((a,b)=>(b===model.selected?1:0)-(a===model.selected?1:0));
  for(const id of order){
    const node=nodes.get(id);if(!node)continue;const p=points.get(id);
    // The counter itself always stays at its exact geographic anchor. Only
    // labels move or hide when crowded; zooming reveals the local details.
    node.setAttribute('transform',`translate(${p.x} ${p.y}) scale(${1/camera.scale})`);
    const texts=node.querySelectorAll(':scope > text');let chosen=null;
    const hasCount=(model.children.get(id)??[]).length>0&&(id===model.selected||8+Math.log2(camera.scale)>=10);
    for(const candidate of [{x:30,y:4,anchor:'start'},{x:-30,y:4,anchor:'end'},{x:30,y:-36,anchor:'start'},{x:30,y:44,anchor:'start'}]){
      const box={x:p.sx+candidate.x-(candidate.anchor==='end'?156:0),y:p.sy+candidate.y-14,w:156,h:hasCount?34:18};
      if(box.x<4||box.y<4||box.x+box.w>svg.clientWidth-4||box.y+box.h>svg.clientHeight-4)continue;
      if(occupied.every(b=>box.x+box.w<=b.x||box.x>=b.x+b.w||box.y+box.h<=b.y||box.y>=b.y+b.h)){chosen=candidate;occupied.push(box);break;}
    }
    if(!chosen&&id===model.selected)chosen={x:30,y:4,anchor:'start'};
    texts.forEach((text,index)=>{text.style.display=chosen&&(index===0||hasCount)?'':'none';if(chosen){text.setAttribute('x',chosen.x);text.setAttribute('y',chosen.y+index*16);text.setAttribute('text-anchor',chosen.anchor);}});
  }
  const center=mapProjection.invert({x:(svg.clientWidth/2-camera.x)/camera.scale,y:(svg.clientHeight/2-camera.y)/camera.scale});
  const meters=100*mapProjection.metersPerPixel(center.lat,camera.scale);
  const overzoom=8+Math.log2(camera.scale)>mapTileProviders[tiles.provider].maxZoom+.5;
  $("map-scale").textContent=`100 px ≈ ${meters<1000?`${Math.round(meters)} m`:`${(meters/1000).toFixed(1)} km`}${overzoom?' · 底图已至最大精度':''}`;
}
function zoom(factor,x=svg.clientWidth/2,y=svg.clientHeight/2) {
  const next=Math.max(.04,Math.min(8192,camera.scale*factor));const ratio=next/camera.scale;
  camera.x=x-(x-camera.x)*ratio;camera.y=y-(y-camera.y)*ratio;camera.scale=next;applyCamera();clearTimeout(saveTimer);saveTimer=setTimeout(save,200);
}
function screenGeo(clientX,clientY) {const rect=svg.getBoundingClientRect();return mapProjection.invert({x:(clientX-rect.left-camera.x)/camera.scale,y:(clientY-rect.top-camera.y)/camera.scale});}
function renderGeography() {
  // Raster basemaps carry the geography. Do not overlay the old schematic
  // borders, rivers or city positions on top of surveyed map data.
  $("map-geography").replaceChildren();$("map-detail-grid").replaceChildren();
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
    const node=element('g',{class:`map-marker ${unit.side}`,'data-unit':id,role:'button',tabindex:'0','aria-label':`${unit.name}，${mapRankName(unit)}，${positionLabel(unit)}`,'aria-pressed':String(model.selected===id)});
    if(children.length)node.setAttribute('aria-expanded',String(visibleExpanded.has(id)));
    node.innerHTML=symbol(unit.type)+rankMark(unit.rank);
    const plate=node.querySelector('.unit-symbol');for(const [key,value] of Object.entries({x:-22,y:-14,width:44,height:28}))plate.setAttribute(key,value);
    const rank=node.querySelector('.rank-mark');const rankWidth=Math.max(24,Number(rank.getAttribute('viewBox').split(' ')[2])*.75);rank.style.width=`${rankWidth}px`;for(const [key,value] of Object.entries({x:-rankWidth/2,y:-28,width:rankWidth,height:12}))rank.setAttribute(key,value);
    if(unit.commandCategory){rank.replaceChildren(element('text',{x:16,y:12,'text-anchor':'middle',fill:'currentColor',stroke:'none','font-size':11},unit.commandCategory==='highCommand'?'最高':'集群'));}
    node.append(element('rect',{x:-27,y:-32,width:54,height:51,class:'map-selection'}));
    const short=Array.from(unit.name);node.append(element('text',{x:30,y:4},short.length>13?short.slice(0,12).join('')+'…':unit.name));
    if(children.length)node.append(element('text',{x:30,y:20,'font-size':10},`${visibleExpanded.has(id)?'已展开':'下辖'} ${children.length}`));
    if(model.locks.has(id))node.append(element('rect',{x:18,y:-28,width:5,height:6,class:'map-lock'}));
    layer.append(node);
  }
  applyCamera(false);
}
function render() {
  const focused=document.activeElement?.closest('[data-unit]')?.dataset.unit;
  const visibility=mapVisibility();visibleIds=visibility.ids;visibleExpanded=visibility.expanded;$("map-auto-detail").checked=autoDetail;$("map-basemap").value=tiles.provider;$("map-side").value=model.side;$("map-links").checked=model.showLinks;
  $("map-focus").hidden=!model.focus;$("map-focus-name").textContent=model.units.get(model.focus)?.name ?? '';
  $("map-status").textContent=`显示 ${number(visibleIds.length)} / ${number(model.units.size)} 个单位 · ${deploymentMode==="history"?"总部驻地 · 城镇参考点":"虚构基层示例"}${visibility.limited?' · 请继续放大查看局部':''}`;
  renderLinks();renderMarkers();renderInspector();
  if(focused){const node=[...$("map-markers").children].find(item=>item.dataset.unit===focused);node?.focus({preventScroll:true});}
}
function select(id) {model.selected=id;render();save();}
function showBranch(id) {
  model.selected=id;model.focus=id;if(!model.locked(id)){zoomCollapsed.delete(id);model.expanded.add(id);}
  model.side=model.units.get(id).side;render();fit();save();
}
function locate(id) {
  model.reveal(id);for(const ancestor of model.ancestors(id))if(!model.locked(ancestor))zoomCollapsed.delete(ancestor);render();
  // The immediate unit and its children set a useful local scale without
  // changing any stored geographic positions.
  if(model.hasPosition(id))fit([id,...(model.children.get(id) ?? [])]);else say("该单位驻地尚未核实，已显示指挥关系");save();
}
function button(label,action,className='button hud-btn') {const node=html('button',className,label);node.type='button';node.addEventListener('click',action);return node;}
function section(title){const node=html('section','map-section');node.append(html('h3','',title));return node;}
function renderInspector() {
  const container=$("map-inspector");if(!model.selected || !model.units.has(model.selected)){container.innerHTML=emptyInspector;if(deploymentMode==="history"){container.querySelector(".map-empty p").textContent="点击兵牌查看总部驻地依据和指挥关系。城镇点不代表总部建筑；待定位机关保留在下方列表。";renderHistoryCatalog(container);}return;}
  const unit=model.units.get(model.selected),stats=model.stats(unit.id),children=model.children.get(unit.id) ?? [],position=model.position(unit.id);container.replaceChildren();
  const header=html('div','map-unit-header');header.append(html('h2','',unit.name),html('p','',`${unit.side==='german'?'德军':'波军'} · ${mapRankName(unit)} · ${types[unit.type].name}`),html('p','',positionLabel(unit)));if(unit.parent)header.append(html('p','map-note',model.ancestors(unit.id).map(id=>model.units.get(id).name).join(' / ')));container.append(header);
  const strength=section('本示例编制');const list=html('dl','map-stats');
  for(const [key,value] of [['本部人员',`${unit.personnel} 人`],['含下级合计',`${number(stats.people)} 人`],['军官',`${stats.officers} 人`],['装备',equipmentText(stats)],['直属下级',`${children.length} 个`]])list.append(html('dt','',key),html('dd','',value));strength.append(list);if(deploymentMode==="example")container.append(strength);
  if(deploymentMode==="history"){const evidence=section("史料定位");evidence.append(html("p","map-note",unit.place??"驻地待核"),html("p","map-note",unit.timeNote??""),html("p","map-note","只列已核查指挥机关。实际下级编成与员额尚未录入，不以示例人数填充。"));for(const source of [...(unit.sources??[]),...(unit.geoSource?[{title:"城镇坐标 · GeoNames",url:unit.geoSource}]:[])]){const link=html("a","map-evidence-link",source.title);link.href=source.url;link.target="_blank";link.rel="noopener noreferrer";evidence.append(link);}container.append(evidence);}
  const location=section('部署位置');const form=html('form');form.id='map-coordinate-form';const fields=html('div','map-coordinates');
  for(const [name,label,min,max] of [['lon','经度',12,27],['lat','纬度',48,56]]){const wrapper=html('label','',label);const input=html('input');input.type='number';input.name=name;input.id=`map-${name}`;input.step='0.000001';input.min=min;input.max=max;input.required=true;input.value=model.hasPosition(unit.id)?position[name].toFixed(6):"";input.disabled=!$("map-edit-deployment").checked;wrapper.append(input);fields.append(wrapper);}
  const move=html('label','map-check');const checkbox=html('input');checkbox.type='checkbox';checkbox.checked=model.moveSubtree;checkbox.id='map-move-subtree';checkbox.addEventListener('change',()=>{model.moveSubtree=checkbox.checked;save();});move.append(checkbox,document.createTextNode('移动时带动全部下属'));
  const update=button('更新位置',()=>{});update.type='submit';update.disabled=!$("map-edit-deployment").checked;form.append(fields,move,html('div','map-actions'));form.lastChild.append(update);
  form.addEventListener('submit',event=>{event.preventDefault();if(!$("map-edit-deployment").checked)return;const lon=Number(form.elements.lon.value),lat=Number(form.elements.lat.value);const before=model.snapshot();if(!model.move(unit.id,lon,lat)){say('位置超出当前地图范围，未修改部署');return;}history.push(before);$("map-undo").disabled=false;save();render();fit([unit.id]);say('部署位置已更新');});location.append(form,html('p','map-note',deploymentMode==='history'?'坐标为史料所述城镇的参考点，不是总部建筑或部队占地。未核实驻地不在地图上落点。':'当前为虚构示例坐标，不是历史驻地。'));if(model.positions[unit.id])location.append(button('恢复原始参考位置',()=>{history.push(model.snapshot());delete model.positions[unit.id];$("map-undo").disabled=false;render();save();}));container.append(location);
  const chain=section('指挥关系');if(unit.parent)chain.append(button(`上级 · ${model.units.get(unit.parent).name}`,()=>locate(unit.parent),'map-unit-row'));
  const actions=html('div','map-actions');const expand=button(visibleExpanded.has(unit.id)?'折叠下级':'展开下级',()=>toggle(unit.id));expand.disabled=!children.length || model.locked(unit.id);actions.append(expand,button('查看下属部署',()=>showBranch(unit.id)));chain.append(actions);
  const lock=html('label','map-check');lock.style.marginTop='12px';const check=html('input');check.type='checkbox';check.checked=model.locks.has(unit.id);check.id='map-expansion-lock';check.addEventListener('change',()=>{setExpansionLock(unit.id,check.checked);save();render();});lock.append(check,document.createTextNode('锁定此分支展开状态'));chain.append(lock);
  for(const childId of children){const child=model.units.get(childId);const row=button('',()=>locate(childId),'map-unit-row');row.append(html('span','',child.name),html('small','',deploymentMode==='history'?(model.hasPosition(childId)?'城镇定位':'待定位'):`${model.stats(childId).people} 人`));chain.append(row);}
  if(!children.length)chain.append(html('p','map-note',deploymentMode==='history'?'下级历史编制尚未录入':'最基层单位 · 已有独立部署坐标'));
  container.append(chain);
}
function setExpansionLock(id,locked) {
  if(locked){
    for(const key of [id,...model.descendants(id)])if(visibleIds.includes(key)){visibleExpanded.has(key)?model.expanded.add(key):model.expanded.delete(key);}
    model.locks.add(id);
  } else model.locks.delete(id);
}
function toggle(id) {
  if(model.locked(id) || !model.children.has(id)){say('该单位已锁定，或已经是最基层单位');return;}
  if(visibleExpanded.has(id)){zoomCollapsed.add(id);model.expanded.delete(id);}
  else {zoomCollapsed.delete(id);model.expanded.add(id);}
  render();save();
}

function hideTooltip() {$("map-tooltip").hidden=true;}
function tooltip(id,x,y) {
  if(gesture)return;const unit=model.units.get(id),stats=model.stats(id),position=model.position(id);const tip=$("map-tooltip");
  tip.replaceChildren(html('strong','',unit.name),html('div','',`${mapRankName(unit)} · ${positionLabel(unit)}`));
  if(deploymentMode==='example')tip.append(html('div','',`示例汇总 ${number(stats.people)} 人 · ${equipmentText(stats)}`));
  if(model.hasPosition(id))tip.append(html('div','',`${position.lat.toFixed(5)}° N / ${position.lon.toFixed(5)}° E`));
  if(unit.place)tip.append(html('div','',unit.place));tip.hidden=false;
  tip.style.left=`${Math.max(8,Math.min(x+16,innerWidth-tip.offsetWidth-8))}px`;tip.style.top=`${Math.max(8,Math.min(y+16,innerHeight-tip.offsetHeight-8))}px`;
}
function renderHistoryCatalog(container) {
  const catalog=section('已核查指挥机关');
  const ordered=[];const visit=id=>{ordered.push(model.units.get(id));for(const child of model.children.get(id)??[])visit(child);};for(const root of model.children.get(null)??[])visit(root);
  for(const unit of ordered){
    const row=button('',()=>locate(unit.id),'map-unit-row');row.style.paddingLeft=`${model.ancestors(unit.id).length*12}px`;
    const label=html('span','',unit.name);label.append(html('small','map-catalog-note',model.hasPosition(unit.id)?unit.place:'驻地待核 · 保留隶属'));row.append(label);catalog.append(row);
  }
  container.append(catalog);
}
svg.addEventListener('pointerdown',event=>{
  if(event.button!==0)return;$("map-context").hidden=true;hideTooltip();const id=event.target.closest('[data-unit]')?.dataset.unit;
  const dragging=id&&!spaceHeld&&$("map-edit-deployment").checked;gesture={id:dragging?id:null,hitId:id,pointer:event.pointerId,startX:event.clientX,startY:event.clientY,camera:{...camera},geo:screenGeo(event.clientX,event.clientY),snapshot:dragging?model.snapshot():null,origin:dragging?{lon:model.position(id).lon,lat:model.position(id).lat}:null,moved:false};svg.setPointerCapture(event.pointerId);
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
  else if(!finished.moved&&finished.hitId){const id=finished.hitId;const double=lastClick?.id===id&&performance.now()-lastClick.at<400;lastClick={id,at:performance.now()};select(id);if(double){toggle(id);lastClick=null;}suppressClick=true;}applyCamera();save();
});
svg.addEventListener('pointercancel',()=>{if(gesture?.snapshot)model=new CommandMapModel(scenario,gesture.snapshot);gesture=null;render();});
svg.addEventListener('click',event=>{if(suppressClick){suppressClick=false;return;}const id=event.target.closest('[data-unit]')?.dataset.unit;if(id)select(id);});

svg.addEventListener('pointerleave',hideTooltip);
svg.addEventListener('wheel',event=>{event.preventDefault();if(gesture)return;hideTooltip();const rect=svg.getBoundingClientRect();zoom(Math.exp(-event.deltaY/350),event.clientX-rect.left,event.clientY-rect.top);},{passive:false});
svg.addEventListener('contextmenu',event=>{const id=event.target.closest('[data-unit]')?.dataset.unit;if(!id)return;event.preventDefault();select(id);hideTooltip();const menu=$("map-context");menu.hidden=false;menu.style.left=`${Math.max(8,Math.min(event.clientX,innerWidth-menu.offsetWidth-8))}px`;menu.style.top=`${Math.max(8,Math.min(event.clientY,innerHeight-menu.offsetHeight-8))}px`;});
$("map-context").addEventListener('click',event=>{const action=event.target.dataset.mapAction;const id=model.selected;if(!id)return;if(action==='toggle')toggle(id);if(action==='focus')showBranch(id);if(action==='lock'){setExpansionLock(id,!model.locks.has(id));render();save();}$("map-context").hidden=true;});
document.addEventListener('pointerdown',event=>{if(!$("map-context").contains(event.target))$("map-context").hidden=true;});
document.addEventListener('keydown',event=>{if(event.target.closest('input,textarea,select,button,a,summary'))return;if(event.code==='Space'){spaceHeld=true;event.preventDefault();}if(event.key==='Escape'){hideTooltip();$("map-context").hidden=true;}const id=event.target.closest('[data-unit]')?.dataset.unit;if(id&&(event.key==='Enter'||event.key===' ')){event.preventDefault();select(id);if(event.key==='Enter')toggle(id);}});
document.addEventListener('keyup',event=>{if(event.code==='Space')spaceHeld=false;});window.addEventListener('blur',()=>{spaceHeld=false;});
$("map-expand").addEventListener('click',()=>{for(const id of visibleIds)if(!model.locked(id)&&model.children.has(id)&&!visibleExpanded.has(id)){zoomCollapsed.delete(id);model.expanded.add(id);}render();save();});
$("map-collapse").addEventListener('click',()=>{const deepest=visibleIds.filter(id=>visibleExpanded.has(id)&&!model.locked(id)&&!(model.children.get(id)??[]).some(child=>visibleExpanded.has(child)));for(const id of deepest){model.expanded.delete(id);zoomCollapsed.add(id);}render();save();});
$("map-deployment-mode").value=deploymentMode;
$("map-deployment-mode").addEventListener('change',event=>{save();try{localStorage.setItem(`${mapStorageKey}:mode`,event.target.value);location.reload();}catch{say('浏览器存储不可用，无法切换部署资料');}});
$("map-edit-deployment").addEventListener('change',()=>{renderInspector();svg.classList.toggle('editing-deployment',$("map-edit-deployment").checked);});
$("map-basemap").addEventListener('change',event=>{tiles.setProvider(event.target.value);applyCamera();save();});
$("map-auto-detail").addEventListener('change',event=>{autoDetail=event.target.checked;render();save();});
$("map-side").addEventListener('change',event=>{model.side=event.target.value;model.focus=null;render();fit();save();});
$("map-links").addEventListener('change',event=>{model.showLinks=event.target.checked;renderLinks();save();});
$("map-fit").addEventListener('click',()=>fit());
$("map-overview").addEventListener('click',()=>{model.focus=null;render();fit(visibleIds,true);save();});
$("map-exit-focus").addEventListener('click',()=>{model.focus=null;render();fit();save();});
$("map-zoom-in").addEventListener('click',()=>zoom(1.5));$("map-zoom-out").addEventListener('click',()=>zoom(1/1.5));
$("map-undo").addEventListener('click',()=>{if(!history.length)return;model=new CommandMapModel(scenario,history.pop());$("map-undo").disabled=!history.length;render();save();});
$("map-search").addEventListener('input',event=>{
  const query=event.target.value.trim().toLocaleLowerCase();const results=$("map-search-results");results.replaceChildren();results.hidden=!query;if(!query)return;
  const matches=[...model.units.values()].filter(unit=>`${unit.id} ${unit.name}`.toLocaleLowerCase().includes(query)).slice(0,20);
  for(const unit of matches){const row=button('',()=>{locate(unit.id);results.hidden=true;},'map-unit-row');const parent=model.units.get(unit.parent);const label=html('span','',unit.name);label.append(html('small','',` · ${parent?.name ?? (unit.side==='german'?'德军':'波军')}`));row.append(label);results.append(row);}if(!matches.length)results.append(html('p','map-note','没有匹配的单位'));
});
$("map-export").addEventListener('click',()=>{
  let base;try{base=tiles.exportGroup();}catch(error){say(error.message.includes('加载')?error.message:'底图暂时无法导出，请切换底图后重试');return;}
  const clone=svg.cloneNode(true);clone.setAttribute('xmlns',svgNamespace);clone.setAttribute('width',svg.clientWidth);clone.setAttribute('height',svg.clientHeight);clone.setAttribute('viewBox',`0 0 ${svg.clientWidth} ${svg.clientHeight}`);
  const original=svg.querySelectorAll('*'),copies=clone.querySelectorAll('*');
  original.forEach((node,index)=>{const style=getComputedStyle(node);for(const property of ['fill','stroke','stroke-width','stroke-dasharray','opacity','font-family','font-size','font-weight','display','vector-effect'])copies[index].style.setProperty(property,style.getPropertyValue(property));});
  clone.querySelectorAll('.map-selection,.map-lock').forEach(node=>node.remove());clone.removeAttribute('tabindex');
  clone.querySelector('#map-world').prepend(base);
  clone.append(element('rect',{x:8,y:8,width:460,height:30,fill:'#f2f1e7'}),element('text',{x:16,y:28,fill:'#465951','font-size':12},`波兰战役 · 1939-09-01 · ${deploymentMode==='history'?'总部城镇参考点':'虚构基层示例'} / 现代底图`));
  clone.append(element('rect',{x:0,y:svg.clientHeight-22,width:svg.clientWidth,height:22,fill:'#ffffff'}),element('text',{x:8,y:svg.clientHeight-7,fill:'#465951','font-size':11},mapTileProviders[tiles.provider].attribution));
  const url=URL.createObjectURL(new Blob([new XMLSerializer().serializeToString(clone)],{type:'image/svg+xml'}));const link=document.createElement('a');link.href=url;link.download='波兰战役指挥地图.svg';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);say('已保存当前地图视野，锁定标记已过滤');
});
$("map-scope").textContent=scenario.description;
$("map-dataset-note").textContent=deploymentMode==="history"?"总部驻地核查 · 城镇精度 · 待核单位不落点":"虚构基层示例 · 不代表历史部署";
$("map-precision-legend").textContent=deploymentMode==="history"?"城镇参考点":"示例推定";
for(const source of scenario.sources){const link=html('a','',source.title);link.href=source.url;link.target='_blank';link.rel='noopener noreferrer';$("map-source-links").append(link);}
renderGeography();
if(stored.camera && [stored.camera.x,stored.camera.y,stored.camera.scale].every(Number.isFinite) && stored.camera.scale>=.04 && stored.camera.scale<=8192){
  if(stored.cameraProjection==='web-mercator-v1')camera={...stored.camera};
  else {
    const old=stored.camera,legacyXScale=240*Math.cos(52*Math.PI/180);
    const center={lon:(svg.clientWidth/2-old.x)/old.scale/legacyXScale+12,lat:56-(svg.clientHeight/2-old.y)/old.scale/240};
    const point=mapProjection.project(center),scale=Math.max(.04,Math.min(8192,old.scale*legacyXScale/(mapProjection.worldSize/360)));
    camera={x:svg.clientWidth/2-point.x*scale,y:svg.clientHeight/2-point.y*scale,scale};
  }
  render();save();
} else {render();fit([],true);}
let viewportSize={width:svg.clientWidth,height:svg.clientHeight};
new ResizeObserver(()=>{
  const width=svg.clientWidth,height=svg.clientHeight;
  camera.x+=(width-viewportSize.width)/2;camera.y+=(height-viewportSize.height)/2;
  viewportSize={width,height};svg.setAttribute('viewBox',`0 0 ${width} ${height}`);applyCamera();save();
}).observe(svg);
