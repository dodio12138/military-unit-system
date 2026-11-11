"use strict";

function initMapFullscreen(board,button) {
  let usedNative=false;
  const set=(open)=>{
    board.classList.toggle('map-fullscreen',open);document.body.classList.toggle('map-fullscreen-open',open);
    button.textContent=open?'退出全屏':'地图全屏';button.setAttribute('aria-pressed',String(open));
  };
  const close=async()=>{
    set(false);
    if(document.fullscreenElement===board){try{await document.exitFullscreen();}catch{/* CSS fullscreen is already closed. */}}
    usedNative=false;
  };
  button.addEventListener('click',async()=>{
    if(board.classList.contains('map-fullscreen')){await close();return;}
    set(true);
    try{if(board.requestFullscreen){await board.requestFullscreen();usedNative=document.fullscreenElement===board;}}
    catch{/* Embedded browsers may deny native fullscreen; fill the window instead. */}
  });
  document.addEventListener('fullscreenchange',()=>{if(usedNative&&document.fullscreenElement!==board){usedNative=false;set(false);}});
  document.addEventListener('keydown',event=>{if(event.key==='Escape'&&board.classList.contains('map-fullscreen')){event.preventDefault();close();}});
}
