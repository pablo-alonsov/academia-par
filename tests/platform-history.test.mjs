import {test} from 'node:test';
import assert from 'node:assert/strict';
import {PlatformHistory,normalizePlatformRoute,platformRouteHash,platformRouteFromHash} from '../lib/platform-history.ts';

const ORIGIN='https://academia.test';
const route=tab=>({tab});
const exercise={tab:'Practicar',detail:{kind:'activity',id:'a-fracciones',assignmentId:'encargo-1',source:'resources',sourceAssignmentId:'encargo-1'}};
const deferred=()=>{let resolve,reject;const promise=new Promise((yes,no)=>{resolve=yes;reject=no;});return {promise,resolve,reject};};

// Native traversals update the address before delivering popstate, just as browsers do.
function browser({preceding=true,hash=''}={}){
  const entries=preceding?[{url:'https://outside.test/',state:{outside:true}},{url:`${ORIGIN}/${hash}`,state:{framework:'keep-me'}}]:[{url:`${ORIGIN}/${hash}`,state:{framework:'keep-me'}}];
  let index=entries.length-1;
  const events=[],listeners=new Map(),storage=new Map();
  const win={
    location:{pathname:'/',search:'',hash},
    sessionStorage:{getItem:key=>storage.get(key)||null,setItem:(key,value)=>storage.set(key,value)},
    addEventListener(type,fn){if(!listeners.has(type))listeners.set(type,new Set());listeners.get(type).add(fn);},
    removeEventListener(type,fn){listeners.get(type)?.delete(fn);},
    history:{
      get state(){return structuredClone(entries[index].state);},
      get length(){return entries.length;},
      replaceState(state,unused,url){entries[index]={state:structuredClone(state),url:new URL(url,ORIGIN).href};address();},
      pushState(state,unused,url){entries.splice(index+1);entries.push({state:structuredClone(state),url:new URL(url,ORIGIN).href});index++;address();},
      go(delta){if(index+delta<0||index+delta>=entries.length)return;index+=delta;address();if(entries[index].url.startsWith(ORIGIN))events.push({type:'popstate',state:structuredClone(entries[index].state)});},
    },
  };
  function address(){const current=new URL(entries[index].url);win.location.pathname=current.pathname;win.location.search=current.search;win.location.hash=current.hash;}
  address();
  return {win,entries,storage,get index(){return index;},get url(){return entries[index].url;},nativeBack(){win.history.go(-1);},nativeForward(){win.history.go(1);},emit(type,data={}){for(const fn of listeners.get(type)||[])fn(data);},
    async settle(){for(let round=0;round<16;round++){while(events.length){const event=events.shift();for(const fn of listeners.get(event.type)||[])fn(event);}await Promise.resolve();}},
  };
}

function fixture(browserOptions){
  const b=browser(browserOptions),routes=[],changes=[],errors=[],flushes=[],left=[];
  let before=()=>{flushes.push(true);};
  const options={window:b.win,beforeNavigate:()=>before(),onRoute:value=>routes.push(value),onChange:value=>changes.push(value),onError:value=>errors.push(value),onLeave:()=>left.push(true)};
  const controller=new PlatformHistory(options);
  return {b,controller,options,routes,changes,errors,flushes,left,setBefore:fn=>{before=fn;},get latest(){return changes.at(-1);}};
}

test('routes round-trip IDs and assignment context without serializing answers or private objects',()=>{
  const input={...exercise,answer:'private answer',detail:{...exercise.detail,privateNotes:'private note'}};
  const clean=normalizePlatformRoute(input,'alejandra');
  assert.deepEqual(clean,exercise);
  assert.deepEqual(platformRouteFromHash(platformRouteHash(clean),'alejandra'),exercise);
  assert.doesNotMatch(platformRouteHash(clean),/private|answer|note/);
  assert.deepEqual(platformRouteFromHash('#unknown/anything','alejandra'),route('Inicio'));
  assert.deepEqual(platformRouteFromHash('#practicar/ejercicio/%E0%A4%A','alejandra'),route('Inicio'));
  assert.deepEqual(normalizePlatformRoute({tab:'Biblioteca',detail:{kind:'teacher-session',id:'private-session'}},'rocio'),route('Inicio'));
});

test('initial entry creates one boundary and preserves framework history keys',()=>{
  const f=fixture();f.controller.init('alejandra','Inicio');
  assert.equal(f.b.entries.length,3);
  assert.equal(f.b.win.history.state.framework,'keep-me');
  assert.deepEqual(f.routes.at(-1),route('Inicio'));
  assert.deepEqual(f.latest,{canBack:true,canForward:false,busy:false,exitRequested:false});
});

test('Back and Forward traverse tabs and an exact assigned exercise after saving',async()=>{
  const f=fixture();f.controller.init('alejandra','Inicio');
  await f.controller.navigate(route('Mi camino'));
  await f.controller.navigate(route('Practicar'));
  await f.controller.navigate(exercise);
  f.controller.back();await f.b.settle();assert.deepEqual(f.routes.at(-1),route('Practicar'));
  assert.equal(f.latest.canForward,true);
  f.controller.back();await f.b.settle();assert.deepEqual(f.routes.at(-1),route('Mi camino'));
  f.controller.forward();await f.b.settle();f.controller.forward();await f.b.settle();
  assert.deepEqual(f.routes.at(-1),exercise);assert.equal(f.latest.canForward,false);
  assert.equal(f.flushes.length,7);
});

test('direct resource and student session routes are restored on reload without new history entries',async()=>{
  const f=fixture();f.controller.init('rocio','Inicio');
  const detail={tab:'Mis clases',detail:{kind:'student-session',id:'clase-1'}};
  await f.controller.navigate(detail);
  const length=f.b.entries.length;f.controller.destroy();
  const restored=new PlatformHistory(f.options);restored.init('rocio','Inicio');
  assert.deepEqual(f.routes.at(-1),detail);assert.equal(f.b.entries.length,length);
  await restored.navigate({tab:'Practicar',detail:{kind:'resource',id:'recurso-1'}});
  assert.deepEqual(f.routes.at(-1),{tab:'Practicar',detail:{kind:'resource',id:'recurso-1'}});
});

test('a fresh detail URL seeds its parent so Back returns to the list rather than exiting',async()=>{
  const f=fixture({hash:platformRouteHash(exercise)});f.controller.init('alejandra','Inicio');
  assert.deepEqual(f.routes.at(-1),exercise);f.b.nativeBack();await f.b.settle();
  assert.deepEqual(f.routes.at(-1),route('Practicar'));assert.equal(f.latest.exitRequested,false);
  f.b.nativeForward();await f.b.settle();assert.deepEqual(f.routes.at(-1),exercise);
});

test('blocked ordinary navigation retains editor, URL and forward entries',async()=>{
  const f=fixture();f.controller.init('alejandra','Inicio');await f.controller.navigate(exercise);
  f.controller.back();await f.b.settle();
  const length=f.b.entries.length,url=f.b.url;
  f.setBefore(()=>{throw Error('No se ha guardado.');});
  assert.equal(await f.controller.navigate(route('Calendario')),false);
  assert.equal(f.b.url,url);assert.equal(f.b.entries.length,length);assert.equal(f.latest.canForward,true);
  assert.equal(f.errors.at(-1),'No se ha guardado.');
});

test('rejected Back restores browser position without deleting Forward',async()=>{
  const f=fixture();f.controller.init('alejandra','Inicio');await f.controller.navigate(route('Practicar'));await f.controller.navigate(exercise);
  const length=f.b.entries.length,index=f.b.index,url=f.b.url;
  f.setBefore(()=>{throw Error('Elige la copia que quieres guardar.');});
  f.b.nativeBack();await f.b.settle();
  assert.equal(f.b.index,index);assert.equal(f.b.url,url);assert.equal(f.b.entries.length,length);
  assert.deepEqual(f.routes.at(-1),exercise);assert.equal(f.latest.busy,false);
  f.setBefore(()=>{});f.b.nativeBack();await f.b.settle();assert.deepEqual(f.routes.at(-1),route('Practicar'));
  f.b.nativeForward();await f.b.settle();assert.deepEqual(f.routes.at(-1),exercise);
});

test('rapid native Back presses commit only the latest destination after asynchronous saves',async()=>{
  const f=fixture();f.controller.init('alejandra','Inicio');await f.controller.navigate(route('Mi camino'));await f.controller.navigate(route('Practicar'));await f.controller.navigate(exercise);
  const wait=deferred();f.setBefore(()=>wait.promise);
  f.b.nativeBack();await f.b.settle();assert.equal(f.latest.busy,true);assert.deepEqual(f.routes.at(-1),exercise);
  f.b.nativeBack();await f.b.settle();wait.resolve();await f.b.settle();
  assert.deepEqual(f.routes.at(-1),route('Mi camino'));assert.equal(f.latest.busy,false);
  f.b.nativeForward();await f.b.settle();assert.deepEqual(f.routes.at(-1),route('Practicar'));
});

test('cancelling root exit repeatedly does not grow history or remove Forward',async()=>{
  const f=fixture();f.controller.init('alejandra','Inicio');await f.controller.navigate(route('Practicar'));f.b.nativeBack();await f.b.settle();
  const length=f.b.entries.length,index=f.b.index;
  for(let count=0;count<4;count++){
    f.b.nativeBack();await f.b.settle();assert.equal(f.latest.exitRequested,true);assert.equal(f.b.index,index);
    f.controller.cancelExit();assert.equal(f.latest.exitRequested,false);assert.equal(f.b.entries.length,length);
  }
  assert.equal(f.latest.canForward,true);f.b.nativeForward();await f.b.settle();assert.deepEqual(f.routes.at(-1),route('Practicar'));
});

test('approved exit crosses the boundary once and permits a BFCache return',async()=>{
  const f=fixture();f.controller.init('alejandra','Inicio');f.b.nativeBack();await f.b.settle();
  f.controller.confirmExit();await f.b.settle();
  assert.equal(f.controller.leaving,true);assert.equal(f.b.url,'https://outside.test/');assert.equal(f.b.index,0);
  // The browser restores the authenticated document at the last platform entry.
  f.b.win.history.go(2);f.b.emit('pageshow',{persisted:true});await f.b.settle();
  assert.equal(f.controller.leaving,false);assert.equal(f.latest.exitRequested,false);assert.deepEqual(f.routes.at(-1),route('Inicio'));
  assert.equal(f.b.entries.length,3);
});

test('Forward to the boundary restores the site without a spurious second exit prompt',async()=>{
  const f=fixture();f.controller.init('alejandra','Inicio');f.b.nativeBack();await f.b.settle();f.controller.confirmExit();await f.b.settle();
  assert.equal(f.b.index,0);f.b.nativeForward();
  // Real browser order: pageshow at boundary, original boundary popstate, then
  // the controller's compensating Forward popstate at the original root.
  f.b.emit('pageshow',{persisted:true});await f.b.settle();
  assert.equal(f.b.index,2);assert.equal(f.latest.exitRequested,false);assert.equal(f.latest.busy,false);assert.equal(f.controller.leaving,false);
  assert.equal(f.b.entries.length,3);assert.deepEqual(f.routes.at(-1),route('Inicio'));
});

test('a newly opened tab invokes the explicit leave fallback instead of an impossible traversal',async()=>{
  const f=fixture({preceding:false});f.controller.init('rocio','Inicio');
  f.b.nativeBack();await f.b.settle();f.controller.confirmExit();await f.b.settle();
  assert.equal(f.left.length,1);assert.equal(f.controller.leaving,true);assert.equal(f.latest.exitRequested,false);
});

test('save failure at exit keeps the confirmation available and does not leave',async()=>{
  const f=fixture();f.controller.init('alejandra','Inicio');f.b.nativeBack();await f.b.settle();
  f.setBefore(()=>Promise.reject(Error('Espera a que termine el guardado.')));
  f.controller.confirmExit();await f.b.settle();
  assert.equal(f.controller.leaving,false);assert.equal(f.latest.exitRequested,true);assert.equal(f.latest.busy,false);assert.equal(f.b.index,2);
  assert.equal(f.errors.at(-1),'Espera a que termine el guardado.');
});

test('a new profile resets the route, ignores previous private details and retains the true exit distance',async()=>{
  const f=fixture();f.controller.init('teacher','Hoy y esta semana');
  await f.controller.navigate({tab:'Alumnas',detail:{kind:'teacher-session',id:'teacher-private-session'}});
  f.controller.init('rocio','Inicio',{reset:true});
  assert.deepEqual(f.routes.at(-1),route('Inicio'));assert.doesNotMatch(f.b.url,/teacher-private-session/);
  f.b.nativeBack();await f.b.settle();assert.equal(f.latest.exitRequested,true);assert.deepEqual(f.routes.at(-1),route('Inicio'));
  f.controller.confirmExit();await f.b.settle();assert.equal(f.b.url,'https://outside.test/');
});

test('explicit re-entry after expiry abandons an earlier same-profile detail',async()=>{
  const f=fixture();f.controller.init('alejandra','Inicio');await f.controller.navigate(exercise);f.controller.destroy();
  f.controller.init('alejandra','Inicio',{reset:true});assert.deepEqual(f.routes.at(-1),route('Inicio'));
  f.b.win.history.go(-2);await f.b.settle();assert.deepEqual(f.routes.at(-1),route('Inicio'));assert.equal(f.latest.exitRequested,true);
});

test('destroy or profile change during an outstanding flush cannot commit the old destination',async()=>{
  const f=fixture();f.controller.init('alejandra','Inicio');const wait=deferred();f.setBefore(()=>wait.promise);
  const pending=f.controller.navigate(exercise);f.controller.destroy();f.controller.init('rocio','Inicio',{reset:true});wait.resolve();
  assert.equal(await pending,false);assert.deepEqual(f.routes.at(-1),route('Inicio'));assert.equal(f.latest.busy,false);
});

test('expiry invalidating the controller during its initial route callback is safe',()=>{
  const f=fixture();let controller;
  controller=new PlatformHistory({...f.options,onRoute:()=>controller.destroy()});
  assert.deepEqual(controller.init('alejandra','Inicio'),route('Inicio'));
  assert.equal(f.latest.canBack,false);assert.equal(f.latest.busy,false);
});

test('a fresh navigation after Back correctly discards the old Forward branch',async()=>{
  const f=fixture();f.controller.init('alejandra','Inicio');await f.controller.navigate(route('Mi camino'));await f.controller.navigate(exercise);
  f.b.nativeBack();await f.b.settle();await f.controller.navigate(route('Calendario'));
  assert.equal(f.latest.canForward,false);f.b.nativeBack();await f.b.settle();assert.equal(f.latest.canForward,true);
  f.b.nativeForward();await f.b.settle();assert.deepEqual(f.routes.at(-1),route('Calendario'));
});
