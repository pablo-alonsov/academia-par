import test from 'node:test';
import assert from 'node:assert/strict';
import {requiresWrittenReview} from '../lib/review-priority.ts';

test('correct fraction results still prioritize their written reasoning',()=>{
  assert.equal(requiresWrittenReview({autoResult:'correct',procedure:{calculation:'Dividí ambos términos entre 6'}},{type:'fraction'}),true);
  assert.equal(requiresWrittenReview({autoResult:'correct',procedure:{calculation:''}},{type:'fraction'}),false);
});
test('a question accompanying a correct result remains visible in the review priority',()=>{
  assert.equal(requiresWrittenReview({autoResult:'correct',comment:'¿Por qué son equivalentes?'},{type:'numeric'}),true);
  assert.equal(requiresWrittenReview({autoResult:'correct',comment:'   '},{type:'numeric'}),false);
});
test('open work and external resources always require a person to review the text',()=>{
  assert.equal(requiresWrittenReview({autoResult:null},{type:'open'}),true);
  assert.equal(requiresWrittenReview({autoResult:'correct',kind:'resource-use'}),true);
});
