"use strict";

const mapTileProviders = {
  roads: {
    name:'道路',maxZoom:19,
    url:(z,x,y)=>`https://tile.openstreetmap.org/${z}/${x}/${y}.png`,
    attribution:'© OpenStreetMap contributors',
    credits:[['© OpenStreetMap contributors','https://www.openstreetmap.org/copyright']]
  },
  terrain: {
    name:'地形',maxZoom:17,
    url:(z,x,y)=>`https://a.tile.opentopomap.org/${z}/${x}/${y}.png`,
    attribution:'© OpenStreetMap contributors, SRTM | © OpenTopoMap (CC-BY-SA 3.0)',
    credits:[['© OpenStreetMap contributors','https://www.openstreetmap.org/copyright'],['SRTM','https://www2.jpl.nasa.gov/srtm/'],['© OpenTopoMap','https://opentopomap.org'],['CC-BY-SA 3.0','https://creativecommons.org/licenses/by-sa/3.0/']]
  }
};

function mapTilePlan(camera,width,height,provider='roads') {
  const definition=mapTileProviders[provider] ?? mapTileProviders.roads;
  const zoom=Math.max(0,Math.min(definition.maxZoom,Math.round(mapProjection.baseZoom+Math.log2(camera.scale))));
  const count=2**zoom,span=mapProjection.worldSize/count,origin=mapProjection.origin;
  const left=(-camera.x/camera.scale+origin.x)/span,top=(-camera.y/camera.scale+origin.y)/span;
  const right=((width-camera.x)/camera.scale+origin.x)/span,bottom=((height-camera.y)/camera.scale+origin.y)/span;
  const tiles=[];
  for(let y=Math.max(0,Math.floor(top));y<=Math.min(count-1,Math.ceil(bottom)-1);y++) {
    for(let x=Math.max(0,Math.floor(left));x<=Math.min(count-1,Math.ceil(right)-1);x++) {
      tiles.push({key:`${provider}/${zoom}/${x}/${y}`,z:zoom,x,y,left:x*span-origin.x,top:y*span-origin.y,size:span,url:definition.url(zoom,x,y)});
    }
  }
  return {zoom,tiles};
}

class CommandMapTiles {
  constructor(layer,status,attribution,provider='roads') {
    this.layer=layer;this.status=status;this.attribution=attribution;this.cache=new Map();this.active=[];this.timer=null;
    this.setProvider(provider);
  }
  setProvider(provider) {
    this.provider=mapTileProviders[provider]?provider:'roads';
    this.active=[];this.status.hidden=false;this.status.textContent='底图加载中';
    this.attribution.replaceChildren();
    for(const [text,url] of mapTileProviders[this.provider].credits){const link=document.createElement('a');link.textContent=text;link.href=url;link.target='_blank';link.rel='noopener noreferrer';this.attribution.append(link);}
    for(const entry of this.cache.values())entry.image.hidden=true;
  }
  update(camera,width,height) {
    this.viewport={camera:{...camera},width,height};
    // Position in screen pixels: scaling fractional CSS layout coordinates
    // amplifies browser 1/64 px rounding at street zoom.
    this.layer.style.transform="none";
    for(const entry of this.cache.values())this.positionImage(entry);
    clearTimeout(this.timer);this.timer=setTimeout(()=>this.loadViewport(),120);
  }
  positionImage(entry) {
    const c=this.viewport.camera;
    entry.image.style.cssText=`position:absolute;left:${entry.left*c.scale+c.x}px;top:${entry.top*c.scale+c.y}px;width:${entry.size*c.scale+.02}px;height:${entry.size*c.scale+.02}px;max-width:none;`;
  }
  loadViewport() {
    if(!this.viewport)return;
    const {camera,width,height}=this.viewport;const plan=mapTilePlan(camera,width,height,this.provider);
    this.zoom=plan.zoom;this.active=plan.tiles;const wanted=new Set(plan.tiles.map(tile=>tile.key));
    for(const entry of this.cache.values())entry.image.hidden=!wanted.has(entry.key);
    for(const tile of plan.tiles){
      let entry=this.cache.get(tile.key);
      if(!entry){
        const image=new Image();image.alt='';image.draggable=false;image.crossOrigin='anonymous';image.referrerPolicy='strict-origin-when-cross-origin';image.decoding='async';

        entry={...tile,image,state:'loading'};this.cache.set(tile.key,entry);this.layer.append(image);
        image.onload=()=>{entry.state='loaded';this.updateStatus();};
        image.onerror=()=>{entry.state='failed';image.hidden=true;this.updateStatus();};
        image.src=tile.url;
      }
      this.positionImage(entry);entry.image.hidden=entry.state==='failed';entry.used=Date.now();
    }
    // Keep only a small in-memory reuse cache. The browser handles HTTP expiry.
    const stale=[...this.cache.values()].filter(entry=>!wanted.has(entry.key)).sort((a,b)=>(a.used??0)-(b.used??0));
    while(this.cache.size>96&&stale.length){const entry=stale.shift();entry.image.remove();this.cache.delete(entry.key);}
    this.updateStatus();
  }
  updateStatus() {
    const entries=this.active.map(tile=>this.cache.get(tile.key));
    const loaded=entries.filter(entry=>entry?.state==='loaded').length,failed=entries.filter(entry=>entry?.state==='failed').length;
    this.status.hidden=entries.length>0&&loaded===entries.length;
    this.status.textContent=failed?'部分底图未加载，点击重试或切换底图':`底图加载中 ${loaded}/${entries.length}`;
    this.status.dataset.state=failed?'failed':'loading';
  }
  retry() {
    for(const tile of this.active){const entry=this.cache.get(tile.key);if(entry?.state==='failed'){entry.image.remove();this.cache.delete(tile.key);}}
    this.loadViewport();
  }
  exportGroup() {
    clearTimeout(this.timer);this.loadViewport();
    const group=document.createElementNS(svgNamespace,'g');group.setAttribute('data-basemap',this.provider);
    for(const tile of this.active){
      const entry=this.cache.get(tile.key);
      if(entry?.state!=='loaded')throw Error('底图尚未加载完整，请加载完成后再保存地图');
      const canvas=document.createElement('canvas');canvas.width=entry.image.naturalWidth;canvas.height=entry.image.naturalHeight;
      canvas.getContext('2d').drawImage(entry.image,0,0);
      const image=document.createElementNS(svgNamespace,'image');
      for(const [key,value] of Object.entries({x:tile.left,y:tile.top,width:tile.size,height:tile.size,href:canvas.toDataURL('image/png')}))image.setAttribute(key,String(value));
      group.append(image);
    }
    return group;
  }
}
