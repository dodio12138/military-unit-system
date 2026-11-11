"use strict";

const mapStorageKey = "military-unit-system:command-map:v1";
const mapProjection = {
  xScale: 240 * Math.cos(52 * Math.PI / 180), yScale: 240,
  project({lon,lat}) { return {x:(lon-12)*this.xScale,y:(56-lat)*this.yScale}; },
  invert({x,y}) { return {lon:x/this.xScale+12,lat:56-y/this.yScale}; }
};

class CommandMapModel {
  constructor(scenario, saved = {}) {
    this.scenario = scenario;
    this.units = new Map(scenario.units.map(unit => [unit.id,unit]));
    this.children = new Map();
    for (const unit of this.units.values()) {
      if (!this.children.has(unit.parent)) this.children.set(unit.parent,[]);
      this.children.get(unit.parent).push(unit.id);
    }
    const validIds = values => Array.isArray(values) ? values.filter(id=>this.units.has(id)) : [];
    this.expanded = new Set(Array.isArray(saved.expanded) ? validIds(saved.expanded) : this.children.get(null));
    this.locks = new Set(validIds(saved.locks));
    this.positions = {};
    for (const [id,position] of Object.entries(saved.positions ?? {})) {
      if(this.units.has(id) && this.validPosition(position)) this.positions[id] = {lon:position.lon,lat:position.lat};
    }
    this.side = ['german','polish'].includes(saved.side) ? saved.side : 'both';
    this.focus = this.units.has(saved.focus) ? saved.focus : null;
    this.selected = this.units.has(saved.selected) ? saved.selected : null;
    this.showLinks = saved.showLinks !== false;
    this.moveSubtree = saved.moveSubtree !== false;
    this.totals = new Map();
  }
  validPosition(point) {
    const b=this.scenario.bounds;
    return point && Number.isFinite(point.lon) && Number.isFinite(point.lat) && point.lon>=b.west && point.lon<=b.east && point.lat>=b.south && point.lat<=b.north;
  }
  position(id) { return this.positions[id] ?? this.units.get(id); }
  descendants(id) {
    const result=[]; const visit=key=>{for(const child of this.children.get(key) ?? []) {result.push(child);visit(child);}};visit(id);return result;
  }
  ancestors(id) {
    const result=[];let unit=this.units.get(id);
    while(unit?.parent) {result.unshift(unit.parent);unit=this.units.get(unit.parent);}return result;
  }
  locked(id) {return this.locks.has(id) || this.ancestors(id).some(parent=>this.locks.has(parent));}
  visible() {
    const result=[];
    const visit=id=>{
      const unit=this.units.get(id);
      if(this.side!=='both' && unit.side!==this.side)return;
      result.push(id);
      if(this.expanded.has(id))for(const child of this.children.get(id) ?? [])visit(child);
    };
    if(this.focus) visit(this.focus);else for(const id of this.children.get(null) ?? [])visit(id);
    return result;
  }
  toggle(id) {
    if(this.locked(id) || !this.children.has(id))return false;
    if(this.expanded.has(id))this.expanded.delete(id);else this.expanded.add(id);
    return true;
  }
  expandLayer() {
    const added=this.visible().filter(id=>this.children.has(id) && !this.expanded.has(id) && !this.locked(id));
    for(const id of added)this.expanded.add(id);
    if(this.visible().length>450){for(const id of added)this.expanded.delete(id);return false;}return true;
  }
  collapseLayer() {
    const visible=this.visible();
    const deepest=visible.filter(id=>this.expanded.has(id) && !this.locked(id) && !(this.children.get(id) ?? []).some(child=>this.expanded.has(child) && this.children.has(child)));
    for(const id of deepest)this.expanded.delete(id);
  }
  reveal(id) {
    this.side='both';this.focus=null;this.selected=id;
    for(const ancestor of this.ancestors(id))if(!this.locked(ancestor))this.expanded.add(ancestor);
    if(!this.visible().includes(id))this.focus=id;
  }
  move(id,lon,lat,withChildren=this.moveSubtree) {
    const before=this.position(id);const dx=lon-before.lon,dy=lat-before.lat;
    const ids=[id,...(withChildren?this.descendants(id):[])];
    const next=ids.map(key=>({id:key,lon:this.position(key).lon+dx,lat:this.position(key).lat+dy}));
    if(next.some(point=>!this.validPosition(point)))return false;
    for(const point of next)this.positions[point.id]={lon:point.lon,lat:point.lat};return true;
  }
  stats(id) {
    if(this.totals.has(id))return this.totals.get(id);
    const unit=this.units.get(id);const stats={people:unit.personnel,officers:unit.officers,units:1,equipment:{}};
    if(unit.equipment)stats.equipment[unit.equipment.kind]=unit.equipment.count;
    for(const child of this.children.get(id) ?? []) {
      const next=this.stats(child);stats.people+=next.people;stats.officers+=next.officers;stats.units+=next.units;
      for(const [kind,count] of Object.entries(next.equipment))stats.equipment[kind]=(stats.equipment[kind] ?? 0)+count;
    }
    this.totals.set(id,stats);return stats;
  }
  snapshot() {
    return {expanded:[...this.expanded],locks:[...this.locks],positions:structuredClone(this.positions),side:this.side,focus:this.focus,selected:this.selected,showLinks:this.showLinks,moveSubtree:this.moveSubtree};
  }
}
