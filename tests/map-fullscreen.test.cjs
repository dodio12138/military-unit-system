const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
function setup(nativeMode) {
  function target() {
    const events = new Map(), classes = new Set(), attrs = {};
    return {events,attrs,classList:{toggle(k,v){v?classes.add(k):classes.delete(k);},contains:k=>classes.has(k)},
      addEventListener(k,fn){events.set(k,fn);},setAttribute(k,v){attrs[k]=v;},async emit(k,event={}){return events.get(k)?.(event);}};
  }
  const board=target(),button=target(),document=target();document.body=target();document.fullscreenElement=null;
  document.exitFullscreen=async()=>{document.fullscreenElement=null;await document.emit('fullscreenchange');};
  board.requestFullscreen=async()=>{if(nativeMode==='reject') throw Error('denied');document.fullscreenElement=board;await document.emit('fullscreenchange');};
  const init=vm.runInNewContext(fs.readFileSync('src/map/fullscreen.js','utf8')+'\ninitMapFullscreen',{document});
  init(board,button);return {board,button,document};
}
test('native fullscreen opens and exits when the browser leaves fullscreen',async()=>{
  const {board,button,document}=setup('native');await button.emit('click');
  assert.equal(document.fullscreenElement,board);assert.equal(button.attrs['aria-pressed'],'true');assert.ok(board.classList.contains('map-fullscreen'));
  await document.exitFullscreen();assert.equal(button.attrs['aria-pressed'],'false');assert.ok(!board.classList.contains('map-fullscreen'));
});
test('rejected native request falls back to window and Escape exits',async()=>{
  const {board,button,document}=setup('reject');await button.emit('click');
  assert.equal(document.fullscreenElement,null);assert.ok(board.classList.contains('map-fullscreen'));assert.equal(button.textContent,'退出全屏');
  let prevented=false;await document.emit('keydown',{key:'Escape',preventDefault(){prevented=true;}});
  assert.ok(prevented);assert.ok(!board.classList.contains('map-fullscreen'));assert.equal(button.attrs['aria-pressed'],'false');assert.equal(button.textContent,'地图全屏');
});
