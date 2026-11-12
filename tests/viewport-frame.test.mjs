import test from 'node:test';
import assert from 'node:assert/strict';
import {viewportFrame} from '../lib/viewport-frame.ts';

test('the dialog follows the visible area above the mobile keyboard',()=>{
  assert.deepEqual(viewportFrame({width:390,height:310,offsetTop:125,offsetLeft:0},390,844),{width:390,height:310,top:125,left:0});
});
test('orientation and split view use the current dimensions and discard invalid offsets',()=>{
  assert.deepEqual(viewportFrame({width:507,height:700,offsetTop:-20,offsetLeft:NaN},1194,834),{width:507,height:700,top:0,left:0});
  assert.deepEqual(viewportFrame({width:0,height:NaN,offsetTop:0,offsetLeft:0},844,390),{width:844,height:390,top:0,left:0});
});
test('browsers without VisualViewport retain a usable window-sized fallback',()=>{
  assert.deepEqual(viewportFrame(null,320,568),{width:320,height:568,top:0,left:0});
});
