"use strict";

const displayMode = "flat";
const $ = id => document.getElementById(id);
const svg = $("map-svg");
const world = $("map-world");
const deploymentMode="history";
const scenario=polandHistoricalScenario;
const activeStorageKey=`${mapStorageKey}:history:v1`;
let stored = {};
try { stored = JSON.parse(localStorage.getItem(activeStorageKey)) ?? {}; } catch { /* Start from the scenario if storage is unavailable. */ }
let model = new CommandMapModel(scenario,stored);
let visibleIds = [];
let visibleExpanded = new Set();
let reachableIds = [];
let detailRoot = null, detailSignature = '';
let autoDetail = stored.autoDetail !== false;
const zoomCollapsed = new Set(Array.isArray(stored.zoomCollapsed)?stored.zoomCollapsed.filter(id=>model.units.has(id)):[]);
const tiles = new CommandMapTiles($("map-tiles"),$("map-tile-status"),$("map-basemap-attribution"),stored.basemap);
let showBorders=stored.showBorders!==false;
let showTerritories=stored.showTerritories!==false;
const catalogExpanded=new Set(Array.isArray(stored.catalogExpanded)?stored.catalogExpanded:scenario.defaultExpanded);
let catalogSignature="";
$("map-tile-status").addEventListener('click',()=>tiles.retry());
let camera = {x:0,y:0,scale:.5};
let gesture = null, spaceHeld = false, suppressClick = false, saveTimer = null;
const history = [];
let lastClick = null;
$("map-board").append($("map-tooltip"),$("map-context"));
const emptyInspector = $("map-inspector").innerHTML;
const equipmentNames = {gun:"门火炮",truck:"辆卡车",tank:"辆坦克"};
const number = value => value.toLocaleString("zh-CN");
function positionLabel(unit) {return model.positions[unit.id]?"用户调整坐标 · 非史料定位":unit.positionBasis??"示例推定坐标";}
function locationStatus(unit) {
  return model.positions[unit.id]?'自定位置':!model.hasPosition(unit.id)?'待定位':unit.positionAccuracy==='inferred'?'推定地域':unit.positionAccuracy==='area'?'作战地域':'城镇参考';
}
function isExpanded(id) {return visibleExpanded.has(id)||(!model.hasPosition(id)&&model.expanded.has(id));}
function representation(id) {return mapUnitRepresentation(model.units.get(id),isExpanded(id),model.children.has(id));}
function colocated(id) {const p=model.position(id);if(!model.hasPosition(id))return [];return visibleIds.filter(key=>{const q=model.position(key);return Math.abs(p.lon-q.lon)<.00001&&Math.abs(p.lat-q.lat)<.00001;});}
function mapRankName(unit) {return unit.commandCategory==='highCommand'?'最高指挥机关':unit.commandCategory==='operationalGroup'?'作战集群':ranks[unit.rank].name;}
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
  try {localStorage.setItem(activeStorageKey,JSON.stringify({...model.snapshot(),camera,cameraProjection:"web-mercator-v1",basemap:tiles.provider,autoDetail,showBorders,showTerritories,catalogExpanded:[...catalogExpanded],zoomCollapsed:[...zoomCollapsed]}));$("map-save-status").textContent="部署已保存在本浏览器";}
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
    const texts=node.querySelectorAll(':scope > text:not(.map-inference-badge)');let chosen=null;
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
  if(next===camera.scale)return;
  // A manual fold lasts until the next zoom. Expansion locks remain persistent.
  if(autoDetail)for(const id of zoomCollapsed)if(!model.locked(id))zoomCollapsed.delete(id);
  const nearby=visibleIds.filter(id=>model.children.has(id)).map(id=>{
    const p=mapProjection.project(model.position(id));return {id,distance:Math.hypot(p.x*camera.scale+camera.x-x,p.y*camera.scale+camera.y-y)};
  }).filter(item=>item.distance<220).sort((a,b)=>a.distance-b.distance);
  if(nearby.length)detailRoot=nearby[0].id;
  camera.x=x-(x-camera.x)*ratio;camera.y=y-(y-camera.y)*ratio;camera.scale=next;applyCamera();clearTimeout(saveTimer);saveTimer=setTimeout(save,200);
  renderZoomDetail();
}
function screenGeo(clientX,clientY) {const rect=svg.getBoundingClientRect();return mapProjection.invert({x:(clientX-rect.left-camera.x)/camera.scale,y:(clientY-rect.top-camera.y)/camera.scale});}
function renderGeography() {
  renderMapTerritories($("map-territories"),showTerritories);
  renderHistoricalBorders($("map-geography"),showBorders);
  $("map-borders").checked=showBorders;
  $("map-territories-toggle").checked=showTerritories;
  $("map-boundary-credit").hidden=!showBorders&&!showTerritories;
  $("map-detail-grid").replaceChildren();
}

function renderLinks() {
  const layer=$("map-connections");layer.replaceChildren();if(!model.showLinks)return;
  const visible=new Set(visibleIds);const selectedPath=new Set([...model.ancestors(model.selected),model.selected]);
  for(const id of visibleIds){
    const unit=model.units.get(id);let source=unit.parent;const skipped=[];
    while(source&&!visible.has(source)&&!model.hasPosition(source)){skipped.unshift(source);source=model.units.get(source)?.parent;}
    if(!visible.has(source))continue;
    const a=mapProjection.project(model.position(source)),b=mapProjection.project(model.position(id));
    const path=element('path',{d:`M${a.x} ${a.y}L${b.x} ${b.y}`,class:`map-command-link${unit.commandStatus==='disputed'?' disputed':''}${skipped.length?' indirect':''}${selectedPath.has(id)||source===model.selected?' active':''}`,stroke:unit.side==='german'?'#3e737a':'#936448','data-parent':unit.parent,'data-child':id,'data-source-unit':source,'data-source-node':representation(source).key,'data-target-node':representation(id).key});
    path.append(element('title',{},[source,...skipped,id].map(key=>model.units.get(key).name).join(' → ')+(skipped.length?'（中间指挥机关待定位，显示压缩链路）':'')));
    layer.append(path);
  }
}
function renderMarkers() {
  const layer=$("map-markers");layer.replaceChildren();
  const ordered=visibleIds.slice().sort((a,b)=>(model.selected===a?1:0)-(model.selected===b?1:0));
  for(const id of ordered){const unit=model.units.get(id);const children=model.children.get(id) ?? [];const displayed=representation(id);
    const node=element('g',{class:`map-marker ${unit.side}${unit.positionAccuracy==='inferred'&&!model.positions[id]?' inferred-position':''}`,'data-unit':id,'data-representation':displayed.headquarters?'headquarters':'formation','data-display-node':displayed.key,role:'button',tabindex:'0','aria-label':`${displayed.name}，${mapRankName(unit)}，${positionLabel(unit)}`,'aria-pressed':String(model.selected===id)});
    if(children.length)node.setAttribute('aria-expanded',String(visibleExpanded.has(id)));
    node.innerHTML=symbol(displayed.type)+rankMark(unit.rank);
    const plate=node.querySelector('.unit-symbol');for(const [key,value] of Object.entries({x:-22,y:-14,width:44,height:28}))plate.setAttribute(key,value);
    const rank=node.querySelector('.rank-mark');const rankWidth=Math.max(24,Number(rank.getAttribute('viewBox').split(' ')[2])*.75);rank.style.width=`${rankWidth}px`;for(const [key,value] of Object.entries({x:-rankWidth/2,y:-28,width:rankWidth,height:12}))rank.setAttribute(key,value);
    if(unit.commandCategory){rank.replaceChildren(element('text',{x:16,y:12,'text-anchor':'middle',fill:'currentColor',stroke:'none','font-size':11},unit.commandCategory==='highCommand'?'最高':'集群'));}
    node.append(element('rect',{x:-27,y:-32,width:54,height:51,class:'map-selection'}));
    const short=Array.from(displayed.name);node.append(element('text',{x:30,y:4},short.length>17?short.slice(0,16).join('')+'…':displayed.name));
    if(children.length)node.append(element('text',{x:30,y:20,'font-size':10},`${visibleExpanded.has(id)?'已展开':'下辖'} ${children.length}`));
    if(unit.positionAccuracy==='inferred'&&!model.positions[id])node.append(element('text',{x:-18,y:8,class:'map-inference-badge'},'推'));
    const same=colocated(id);if(same.length>1){const badge=element('g',{class:'map-colocated-badge'});badge.append(element('rect',{x:17,y:-19,width:15,height:13,fill:'#f3f4f1',stroke:'currentColor'}),element('text',{x:24.5,y:-9,'text-anchor':'middle','font-size':9},String(same.length)));node.append(badge);}
    if(model.locks.has(id))node.append(element('rect',{x:18,y:-28,width:5,height:6,class:'map-lock'}));
    layer.append(node);
  }
  applyCamera(false);
}
function render() {
  const focused=document.activeElement?.closest('[data-unit]')?.dataset.unit;
  const visibility=mapVisibility();visibleIds=visibility.ids;visibleExpanded=visibility.expanded;reachableIds=visibility.reachableIds;$("map-auto-detail").checked=autoDetail;$("map-basemap").value=tiles.provider;$("map-side").value=model.side;$("map-links").checked=model.showLinks;
  $("map-focus").hidden=!model.focus;$("map-focus-name").textContent=model.units.get(model.focus)?.name ?? '';
  $("map-status").textContent=`显示 ${number(visibleIds.length)} / ${number(model.units.size)} 个单位 · ${deploymentMode==="history"?"真实番号 · 参考点与待定位":"虚构基层示例"}${visibility.limited?' · 请继续放大查看局部':''}`;
  renderLinks();renderMarkers();renderInspector();renderHistoryCatalog();renderZoomDetail();
  if(focused){const node=[...$("map-markers").children].find(item=>item.dataset.unit===focused);node?.focus({preventScroll:true});}
}
function select(id) {model.selected=id;if(model.children.has(id))detailRoot=id;render();save();}
function showBranch(id) {
  model.selected=id;model.focus=id;detailRoot=id;if(!model.locked(id)){zoomCollapsed.delete(id);model.expanded.add(id);}
  model.side=model.units.get(id).side;render();fit([id,...model.descendants(id)]);save();
}
function locate(id) {
  model.reveal(id);for(const ancestor of model.ancestors(id))if(!model.locked(ancestor))zoomCollapsed.delete(ancestor);render();
  // The immediate unit and its children set a useful local scale without
  // changing any stored geographic positions.
  for(const ancestor of model.ancestors(id))catalogExpanded.add(ancestor);
  if(model.hasPosition(id))fit([id,...(model.children.get(id) ?? [])]);else say("该单位待定位；指挥关系保留在编制目录中");renderHistoryCatalog();save();
}
function button(label,action,className='button hud-btn') {const node=html('button',className,label);node.type='button';node.addEventListener('click',action);return node;}
function section(title){const node=html('section','map-section');node.append(html('h3','',title));return node;}
function renderInspector() {
  const container=$("map-inspector");if(!model.selected || !model.units.has(model.selected)){container.innerHTML=emptyInspector;return;}
  const unit=model.units.get(model.selected),stats=model.stats(unit.id),children=model.children.get(unit.id) ?? [],position=model.position(unit.id);container.replaceChildren();
  const header=html('div','map-unit-header');header.append(html('h2','',representation(unit.id).name),html('p','',`${unit.side==='german'?'德军':'波军'} · ${mapRankName(unit)} · ${types[unit.type].name}`),html('p','',positionLabel(unit)));if(unit.parent)header.append(html('p','map-note',model.ancestors(unit.id).map(id=>model.units.get(id).name).join(' / ')));container.append(header);
  const strength=section('本示例编制');const list=html('dl','map-stats');
  for(const [key,value] of [['本部人员',`${unit.personnel} 人`],['含下级合计',`${number(stats.people)} 人`],['军官',`${stats.officers} 人`],['装备',equipmentText(stats)],['直属下级',`${children.length} 个`]])list.append(html('dt','',key),html('dd','',value));strength.append(list);if(deploymentMode==="example")container.append(strength);
  if(deploymentMode==="history"){const evidence=section("史料定位");evidence.append(html("p","map-note",unit.place??"驻地待核"),html("p","map-note",unit.timeNote??""),html("p","map-note",unit.organizationBasis??"番号与隶属参照所列来源；员额尚未核实，不按零人统计。"));if(unit.inferenceBasis)evidence.append(html('p','map-inference-note',`推定依据：${unit.inferenceBasis}`));
    if(unit.commandStatus==='disputed')evidence.append(html('p','map-inference-note',`军级隶属资料存在分歧。其他记载：${(unit.alternateParents??[]).map(id=>model.units.get(id)?.name??id).join('、')||'见来源说明'}。`));
    if(unit.commandStatus==='inferred')evidence.append(html('p','map-inference-note','隶属关系由相邻日期史料推断，9月1日尚未独立证实。'));
    if(representation(unit.id).headquarters)evidence.append(html('p','map-note','展开后以指挥部兵牌代替总兵牌，沿用原坐标；若原点仅为作战地域，不代表已核实的指挥部驻地。'));
    if(unit.organizationStatus==='planned')evidence.append(html('p','map-inference-note','计划／存在争议的隶属；不等于开战时已经到位。'));
    for(const source of [...(unit.sources??[]),...(unit.geoSource?[{title:"城镇坐标 · GeoNames",url:unit.geoSource}]:[])]){const link=html("a","map-evidence-link",source.title);link.href=source.url;link.target="_blank";link.rel="noopener noreferrer";evidence.append(link);}container.append(evidence);}
  const location=section('部署位置');const form=html('form');form.id='map-coordinate-form';const fields=html('div','map-coordinates');
  for(const [name,label,min,max] of [['lon','经度',scenario.bounds.west,scenario.bounds.east],['lat','纬度',scenario.bounds.south,scenario.bounds.north]]){const wrapper=html('label','',label);const input=html('input');input.type='number';input.name=name;input.id=`map-${name}`;input.step='0.000001';input.min=min;input.max=max;input.required=true;input.value=model.hasPosition(unit.id)?position[name].toFixed(6):"";input.disabled=!$("map-edit-deployment").checked;wrapper.append(input);fields.append(wrapper);}
  const move=html('label','map-check');const checkbox=html('input');checkbox.type='checkbox';checkbox.checked=model.moveSubtree;checkbox.id='map-move-subtree';checkbox.addEventListener('change',()=>{model.moveSubtree=checkbox.checked;save();});move.append(checkbox,document.createTextNode('移动时带动全部下属'));
  const update=button('更新位置',()=>{});update.type='submit';update.disabled=!$("map-edit-deployment").checked;form.append(fields,move,html('div','map-actions'));form.lastChild.append(update);
  form.addEventListener('submit',event=>{event.preventDefault();if(!$("map-edit-deployment").checked)return;const lon=Number(form.elements.lon.value),lat=Number(form.elements.lat.value);const before=model.snapshot();if(!model.move(unit.id,lon,lat)){say('位置超出当前地图范围，未修改部署');return;}history.push(before);$("map-undo").disabled=false;save();render();fit([unit.id]);say('部署位置已更新');});location.append(form,html('p','map-note',deploymentMode==='history'?'参考点精度见上方依据；作战地域点不是总部驻地。推定单独标记，待定位单位不自动分配坐标。':'当前为虚构示例坐标，不是历史驻地。'));if(model.positions[unit.id])location.append(button('恢复原始参考位置',()=>{history.push(model.snapshot());delete model.positions[unit.id];$("map-undo").disabled=false;render();save();}));container.append(location);
  const chain=section('指挥关系');if(unit.parent)chain.append(button(`上级 · ${model.units.get(unit.parent).name}`,()=>locate(unit.parent),'map-unit-row'));
  const actions=html('div','map-actions');const expand=button(isExpanded(unit.id)?'折叠下级':'展开下级',()=>toggle(unit.id));expand.disabled=!children.length || model.locked(unit.id);actions.append(expand,button('查看下属部署',()=>showBranch(unit.id)));chain.append(actions);
  const lock=html('label','map-check');lock.style.marginTop='12px';const check=html('input');check.type='checkbox';check.checked=model.locks.has(unit.id);check.id='map-expansion-lock';check.addEventListener('change',()=>{setExpansionLock(unit.id,check.checked);save();render();});lock.append(check,document.createTextNode('锁定此分支展开状态'));chain.append(lock);
  for(const childId of children){const child=model.units.get(childId);const row=button('',()=>locate(childId),'map-unit-row');row.append(html('span','',child.name),html('small','',deploymentMode==='history'?locationStatus(child):`${model.stats(childId).people} 人`));chain.append(row);}
  if(!children.length)chain.append(html('p','map-note',deploymentMode==='history'?(unit.rank==='regiment'?'本次编制细化至团级':'更下级的历史编制尚未录入'):'最基层单位 · 已有独立部署坐标'));
  container.append(chain);
  const neighbors=colocated(unit.id).filter(id=>id!==unit.id);
  if(neighbors.length){const same=section('同一地域参考点');for(const id of neighbors){const other=model.units.get(id);same.append(button(`${other.side==='german'?'德军':'波军'} · ${other.name}`,()=>select(id),'map-unit-row'));}same.append(html('p','map-note','参考点相同不代表双方实际共处一地；未挪动兵牌。'));container.append(same);}
}
function setExpansionLock(id,locked) {
  if(locked){
    for(const key of [id,...model.descendants(id)])if(visibleExpanded.has(key)||visibleIds.includes(key)){visibleExpanded.has(key)?model.expanded.add(key):model.expanded.delete(key);}
    model.locks.add(id);
  } else model.locks.delete(id);
}
function toggle(id) {
  if(model.locked(id) || !model.children.has(id)){say('该单位已锁定，或已经是最基层单位');return;}
  detailRoot=id;
  if(isExpanded(id)){zoomCollapsed.add(id);model.expanded.delete(id);catalogExpanded.delete(id);}
  else {zoomCollapsed.delete(id);model.expanded.add(id);catalogExpanded.add(id);}
  render();save();
}

function renderZoomDetail() {
  const panel=$("map-zoom-detail");
  const root=model.units.get(detailRoot);
  const rows=root?mapZoomPendingBranch(model,root.id,visibleExpanded):[];
  const pending=rows.filter(row=>row.pending).length;
  const inScope=root&&(model.side==='both'||root.side===model.side)&&reachableIds.includes(root.id);
  panel.hidden=!inScope||!visibleExpanded.has(root?.id)||!pending;
  if(panel.hidden){detailSignature='';return;}
  const signature=JSON.stringify([root.id,rows,model.selected,autoDetail,[...visibleExpanded]]);
  if(signature===detailSignature)return;detailSignature=signature;
  panel.replaceChildren();
  const heading=html('header','map-detail-heading');
  heading.append(html('strong','',representation(root.id).name),html('small','',`展开编制 · ${pending} 个待定位`));
  const dismiss=button('收起',()=>{detailRoot=null;renderZoomDetail();},'map-detail-dismiss');dismiss.setAttribute('aria-label','收起待定位编制');heading.append(dismiss);
  panel.append(heading,html('p','map-detail-caption',`下方仅表示隶属，非地图位置；${autoDetail?'继续放大逐层展开。':'双击兵牌展开下级。'}`));
  const list=html('ul','map-detail-tree');panel.append(list);const containers=new Map([[root.id,list]]);
  for(const row of rows){
    const unit=model.units.get(row.id),shown=representation(row.id);
    const item=html('li'),control=button('',()=>select(row.id),'map-detail-unit');control.replaceChildren();
    control.dataset.detailUnit=row.id;control.dataset.pending=String(row.pending);control.setAttribute('aria-pressed',String(model.selected===row.id));
    const icon=element('svg',{viewBox:'-27 -32 54 51',width:40,height:38,class:`map-marker ${unit.side}`,'aria-hidden':'true'});
    icon.innerHTML=symbol(shown.type)+rankMark(unit.rank);
    const plate=icon.querySelector('.unit-symbol');for(const [key,value]of Object.entries({x:-22,y:-14,width:44,height:28}))plate.setAttribute(key,value);
    const rank=icon.querySelector('.rank-mark');for(const [key,value]of Object.entries({x:-18,y:-29,width:36,height:12}))rank.setAttribute(key,value);
    const label=html('span','');label.append(html('span','',shown.name),html('small','',`${mapRankName(unit)} · ${row.pending?'待定位':'地图有参考点'}`));
    control.append(icon,label);control.title='点击查看资料，双击展开或折叠下级';control.addEventListener('dblclick',()=>toggle(row.id));item.append(control);
    (containers.get(row.parent)??list).append(item);const children=html('ul');item.append(children);containers.set(row.id,children);
  }
}

function hideTooltip() {$("map-tooltip").hidden=true;}
function tooltip(id,x,y) {
  if(gesture)return;const unit=model.units.get(id),stats=model.stats(id),position=model.position(id);const tip=$("map-tooltip");
  tip.replaceChildren(html('strong','',representation(id).name),html('div','',`${mapRankName(unit)} · ${positionLabel(unit)}`));
  if(deploymentMode==='example')tip.append(html('div','',`示例汇总 ${number(stats.people)} 人 · ${equipmentText(stats)}`));
  if(model.hasPosition(id))tip.append(html('div','',`${position.lat.toFixed(5)}° N / ${position.lon.toFixed(5)}° E`));
  const same=colocated(id);if(same.length>1)tip.append(html('div','',`同一地域参考点 ${same.length} 个单位，点击后可在侧栏选择`));
  if(representation(id).headquarters&&unit.positionAccuracy!=='city')tip.append(html('div','map-note','指挥节点沿用地域参考点，非已核实总部驻地'));
  if(unit.place)tip.append(html('div','',unit.place));tip.hidden=false;
  tip.style.left=`${Math.max(8,Math.min(x+16,innerWidth-tip.offsetWidth-8))}px`;tip.style.top=`${Math.max(8,Math.min(y+16,innerHeight-tip.offsetHeight-8))}px`;
}
function renderHistoryCatalog() {
  const container=$("map-catalog");
  const signature=`${model.side}|${JSON.stringify(model.positions)}`;
  if(signature!==catalogSignature){
    catalogSignature=signature;container.replaceChildren();
    const visit=(id,host)=>{
      const unit=model.units.get(id);if(model.side!=='both'&&unit.side!==model.side)return;
      const children=model.children.get(id)??[], row=button('',()=>locate(id),'map-unit-row map-tree-unit');row.dataset.catalogUnit=id;row.setAttribute('aria-current',String(id===model.selected));
      row.append(html('span','',unit.name),html('small',unit.positionAccuracy==='inferred'?'map-inference-note':'',locationStatus(unit)));
      if(children.length){
        const branch=html('details','map-tree-branch');branch.dataset.catalogBranch=id;branch.open=catalogExpanded.has(id);
        const heading=html('summary');heading.append(row);branch.append(heading);
        const nested=html('div','map-tree-children');branch.append(nested);let populated=false;
        const populate=()=>{if(!populated){populated=true;for(const child of children)visit(child,nested);}};
        if(branch.open)populate();
        branch.addEventListener('toggle',()=>{
          if(branch.open){catalogExpanded.add(id);populate();}else catalogExpanded.delete(id);
          if(!model.locked(id)&&branch.open!==isExpanded(id)){
            if(branch.open){model.expanded.add(id);zoomCollapsed.delete(id);}else{model.expanded.delete(id);zoomCollapsed.add(id);}
            render();
          }
          save();
        });
        host.append(branch);
      }else host.append(row);
    };
    for(const root of model.children.get(null)??[])visit(root,container);
  }
  for(const branch of container.querySelectorAll('[data-catalog-branch]'))if(catalogExpanded.has(branch.dataset.catalogBranch))branch.open=true;
  for(const row of container.querySelectorAll('[data-catalog-unit]'))row.setAttribute('aria-current',String(row.dataset.catalogUnit===model.selected));
  const pending=[...model.units.values()].filter(unit=>(model.side==='both'||unit.side===model.side)&&!model.hasPosition(unit.id)).length;
  $("map-catalog-count").textContent=`${pending} 个待定位`;
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
$("map-expand").addEventListener('click',()=>{for(const id of reachableIds)if(!model.locked(id)&&model.children.has(id)&&!visibleExpanded.has(id)){zoomCollapsed.delete(id);model.expanded.add(id);}render();save();});
$("map-collapse").addEventListener('click',()=>{const deepest=reachableIds.filter(id=>visibleExpanded.has(id)&&!model.locked(id)&&!(model.children.get(id)??[]).some(child=>visibleExpanded.has(child)));for(const id of deepest){model.expanded.delete(id);zoomCollapsed.add(id);}render();save();});
$("map-fullscreen-tools").addEventListener("click",event=>{const target=event.target.closest("[data-map-control]")?.dataset.mapControl;if(target)$(target)?.click();});
$("map-borders").addEventListener('change',event=>{showBorders=event.target.checked;renderGeography();save();});
$("map-territories-toggle").addEventListener('change',event=>{showTerritories=event.target.checked;renderGeography();save();});
$("map-edit-deployment").addEventListener('change',()=>{renderInspector();svg.classList.toggle('editing-deployment',$("map-edit-deployment").checked);});
$("map-basemap").addEventListener('change',event=>{tiles.setProvider(event.target.value);applyCamera();save();});
$("map-auto-detail").addEventListener('change',event=>{autoDetail=event.target.checked;if(autoDetail)for(const id of zoomCollapsed)if(!model.locked(id))zoomCollapsed.delete(id);render();save();});
$("map-side").addEventListener('change',event=>{model.side=event.target.value;model.focus=null;render();fit();save();});
$("map-links").addEventListener('change',event=>{model.showLinks=event.target.checked;renderLinks();save();});
$("map-fit").addEventListener('click',()=>fit());
$("map-overview").addEventListener('click',()=>{model.focus=null;detailRoot=null;render();fit(visibleIds,true);save();});
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
  clone.append(element('rect',{x:8,y:8,width:460,height:30,fill:'#f2f1e7'}),element('text',{x:16,y:28,fill:'#465951','font-size':12},`波兰战役 · 1939-09-01 · ${deploymentMode==='history'?'史料地域 / 推定 / 待定位':'虚构基层示例'} / 现代底图`));
  clone.append(element('rect',{x:0,y:svg.clientHeight-38,width:svg.clientWidth,height:38,fill:'#ffffff'}),element('text',{x:8,y:svg.clientHeight-22,fill:'#465951','font-size':11},mapTileProviders[tiles.provider].attribution));
  if(showBorders||showTerritories)clone.append(element('text',{x:8,y:svg.clientHeight-7,fill:'#465951','font-size':10},'概化战前国界 / 着色：CShapes 2 · Schvitz et al. · 裁剪与简化 · CC BY-NC-SA 4.0 · https://creativecommons.org/licenses/by-nc-sa/4.0/'));
  const url=URL.createObjectURL(new Blob([new XMLSerializer().serializeToString(clone)],{type:'image/svg+xml'}));const link=document.createElement('a');link.href=url;link.download='波兰战役指挥地图.svg';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);say('已保存当前地图视野，锁定标记已过滤');
});
$("map-scope").textContent=scenario.description+" "+scenario.coverage.join(" ");
$("map-border-note").textContent=polandBorders1939.note+" 指挥连线中的短虚线表示经过待定位机关的压缩链路，完整上级见目录；黄色虚线表示隶属资料分歧。";
$("map-dataset-note").textContent=deploymentMode==="history"?"军 · 师 · 团真实番号 / 地域参考 · 推定 · 待定位":"虚构基层示例 · 不代表历史部署";
$("map-precision-legend").textContent=deploymentMode==="history"?"虚线国界为概化参考":"示例推定";
for(const source of [...scenario.sources,...polandBorders1939.sources]){const link=html('a','',source.title);link.href=source.url;link.target='_blank';link.rel='noopener noreferrer';$("map-source-links").append(link);}
initMapFullscreen($("map-board"),$("map-fullscreen"));
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
