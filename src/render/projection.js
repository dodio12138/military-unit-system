"use strict";

// One affine camera for the board, links, labels and counters. Keep its inverse
// in the same module so screen-space gestures always resolve to model coordinates.
function projectionMatrix(mode = "flat") {
  // Equal ground-axis scale, ±30° to the horizontal; height is screen-vertical.
  const axis = Math.sqrt(3) / 2;
  return mode === "depth" ? [axis, .5, -axis, .5] : [1, 0, 0, 1];
}
function projectPoint({ x, y }, mode = "flat") {
  const [a,b,c,d] = projectionMatrix(mode);
  return { x:a*x+c*y, y:b*x+d*y };
}
function unprojectPoint({ x, y }, mode = "flat") {
  const [a,b,c,d] = projectionMatrix(mode);
  const determinant = a*d-b*c;
  return { x:(d*x-c*y)/determinant, y:(a*y-b*x)/determinant };
}
function projectBounds({ left, top, right, bottom }, mode = "flat") {
  const points = [[left,top],[right,top],[right,bottom],[left,bottom]].map(([x,y])=>projectPoint({x,y},mode));
  return {left:Math.min(...points.map(p=>p.x)),right:Math.max(...points.map(p=>p.x)),
    top:Math.min(...points.map(p=>p.y)),bottom:Math.max(...points.map(p=>p.y))};
}
