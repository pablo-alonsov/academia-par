import test from 'node:test';
import assert from 'node:assert/strict';
import {photoDimensions,jpegName} from '../lib/photo-preparation.ts';

test('camera photos fit the upload without stretching or upscaling',()=>{
  assert.deepEqual(photoDimensions(4032,3024),{width:2560,height:1920});
  assert.deepEqual(photoDimensions(3024,4032),{width:1920,height:2560});
  assert.deepEqual(photoDimensions(800,600),{width:800,height:600});
  assert.deepEqual(photoDimensions(12000,9000),{width:2560,height:1920});
});
test('invalid dimensions cannot create an empty or unsafe canvas',()=>{
  for(const values of [[0,0],[-2,5],[Infinity,4],[1,NaN]])assert.throws(()=>photoDimensions(...values));
});
test('converted mobile photos use a truthful JPG filename',()=>{
  assert.equal(jpegName('IMG_1234.HEIC'),'IMG_1234.jpg');assert.equal(jpegName('foto'),'foto.jpg');assert.equal(jpegName('...'),'foto.jpg');
});
