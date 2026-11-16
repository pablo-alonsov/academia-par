import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createExerciseReturn, EXERCISE_SUCCESS_DELAY_MS} from '../lib/exercise-return.ts';

function fixture() {
  let now = 0, next = 0;
  const timers = new Map(), cancelled = [];
  const flow = createExerciseReturn({
    setTimer(callback, delay) { const id=++next; timers.set(id,{callback,due:now+delay}); return id; },
    clearTimer(id) { cancelled.push(id); timers.delete(id); },
  });
  return {flow,timers,cancelled,advance(ms){now+=ms;for(const [id,timer]of [...timers])if(timer.due<=now){timers.delete(id);timer.callback();}}};
}

test('only a checked correct result returns after the full visible feedback delay',()=>{
  const {flow,advance,timers}=fixture();let returned=0;
  assert.equal(flow.schedule('correct',()=>returned++),true);
  assert.equal(timers.size,1);advance(EXERCISE_SUCCESS_DELAY_MS-1);assert.equal(returned,0);
  advance(1);assert.equal(returned,1);advance(10000);assert.equal(returned,1);
});

test('incorrect, open and failed results never schedule a return and cancel an earlier success',()=>{
  for(const result of ['incorrect',null,undefined,'saved','error']){
    const {flow,advance,timers}=fixture();let returned=0;
    flow.schedule('correct',()=>returned++);
    assert.equal(flow.schedule(result,()=>returned++),false);assert.equal(timers.size,0);
    advance(10000);assert.equal(returned,0);
  }
});

test('unmount or manual navigation cancels even a callback already queued for delivery',()=>{
  const {flow,timers}=fixture();let returned=0;
  flow.schedule('correct',()=>returned++);const callback=[...timers.values()][0].callback;
  flow.cancel();callback();assert.equal(returned,0);
});

test('a newer correct result supersedes the first timer without navigating twice',()=>{
  const {flow,advance,timers}=fixture();const returned=[];
  flow.schedule('correct',()=>returned.push('old'));const old=[...timers.values()][0].callback;
  advance(900);flow.schedule('correct',()=>returned.push('new'));old();
  advance(EXERCISE_SUCCESS_DELAY_MS-1);assert.deepEqual(returned,[]);
  advance(1);assert.deepEqual(returned,['new']);
});

test('a delivered callback is consumed before calling the navigation handler',()=>{
  const {flow,timers}=fixture();let returned=0;
  flow.schedule('correct',()=>{returned++;flow.cancel();});const callback=[...timers.values()][0].callback;
  callback();callback();assert.equal(returned,1);
});
