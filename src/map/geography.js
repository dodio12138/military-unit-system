"use strict";

// All geographic overlays use the same projection as counters and raster tiles.
function mapGeometryPaths(geometry) {
  if(!geometry)return [];
  const line=(points,closed=false)=>points.map((point,i)=>{const p=mapProjection.project({lon:point[0],lat:point[1]});return `${i?'L':'M'}${p.x} ${p.y}`;}).join('')+(closed?'Z':'');
  switch(geometry.type){
    case 'LineString':return [line(geometry.coordinates)];
    case 'MultiLineString':return geometry.coordinates.map(points=>line(points));
    case 'Polygon':return geometry.coordinates.map(points=>line(points,true));
    case 'MultiPolygon':return geometry.coordinates.flatMap(polygon=>polygon.map(points=>line(points,true)));
    default:return [];
  }
}
function renderHistoricalBorders(layer,enabled) {
  layer.replaceChildren();if(!enabled)return;
  // Adjacent polygons share edges; keep the main Polish perimeter on top.
  const features=polandBorders1939.features.slice().sort((a,b)=>(a.id==='poland'?1:0)-(b.id==='poland'?1:0));
  for(const feature of features){
    for(const d of mapGeometryPaths(feature.geometry)){
      const path=document.createElementNS(svgNamespace,'path');
      path.setAttribute('d',d);path.setAttribute('class',`map-historical-border ${feature.id}`);path.dataset.border=feature.id;
      const title=document.createElementNS(svgNamespace,'title');title.textContent=`${feature.name} · 概化历史边界${feature.temporalCaveat?' · '+feature.temporalCaveat:''}`;path.append(title);layer.append(path);
    }
  }
}

// Territory polygons are separate from deployment pins and command links.
// A future timeline can supply dated control polygons through this renderer.
function renderMapTerritories(layer,enabled,features=polandBorders1939.features) {
  layer.replaceChildren();if(!enabled)return;
  for(const feature of features){
    if(!feature.fillGeometry)continue;
    const path=document.createElementNS(svgNamespace,'path');
    path.setAttribute('d',mapGeometryPaths(feature.fillGeometry).join(''));
    path.setAttribute('fill-rule','evenodd');
    path.setAttribute('class',`map-territory ${feature.id}`);
    path.dataset.territory=feature.id;
    layer.append(path);
  }
}
