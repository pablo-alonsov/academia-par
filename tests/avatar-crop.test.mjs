import {test} from 'node:test';
import assert from 'node:assert/strict';
import {avatarCrop} from '../lib/avatar-crop.ts';

test('landscape and portrait camera photos use the centred square source',()=>{
  assert.deepEqual(avatarCrop(4032,3024),{sourceX:504,sourceY:0,sourceSize:3024,outputSize:512});
  assert.deepEqual(avatarCrop(3024,4032),{sourceX:0,sourceY:504,sourceSize:3024,outputSize:512});
  assert.deepEqual(avatarCrop(1024,1024),{sourceX:0,sourceY:0,sourceSize:1024,outputSize:512});
});
test('small photos stay sharp without enlargement and odd crops remain centred',()=>{
  assert.deepEqual(avatarCrop(320,240),{sourceX:40,sourceY:0,sourceSize:240,outputSize:240});
  assert.deepEqual(avatarCrop(129,256),{sourceX:0,sourceY:63.5,sourceSize:129,outputSize:129});
  assert.deepEqual(avatarCrop(1,1),{sourceX:0,sourceY:0,sourceSize:1,outputSize:1});
  assert.equal(avatarCrop(800,600,128).outputSize,128);
});
test('invalid dimensions and limits cannot produce an empty or unbounded canvas',()=>{
  for(const values of [[0,10],[-1,10],[10,NaN],[Infinity,10],[2.5,10],[Number.MAX_SAFE_INTEGER+1,10],[10,10,0],[10,10,-1],[10,10,Infinity],[10,10,2.5]])assert.throws(()=>avatarCrop(...values));
});
test('the crop stays inside every source and output never exceeds its source or limit',()=>{
  for(const [width,height] of [[4000,100],[100,4000],[513,512],[512,513],[511,511],[1920,1080],[1080,1920]]){
    const crop=avatarCrop(width,height);
    assert.ok(crop.sourceX>=0&&crop.sourceY>=0);
    assert.ok(crop.sourceX+crop.sourceSize<=width&&crop.sourceY+crop.sourceSize<=height);
    assert.equal(crop.sourceX*2+crop.sourceSize,width);
    assert.equal(crop.sourceY*2+crop.sourceSize,height);
    assert.ok(crop.outputSize>0&&crop.outputSize<=512&&crop.outputSize<=crop.sourceSize);
  }
});
