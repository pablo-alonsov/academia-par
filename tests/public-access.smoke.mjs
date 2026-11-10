// Read-only production smoke test: creates and revokes access tokens only.
// It never creates, modifies or deletes teaching records.
import assert from 'node:assert/strict';
const base = process.env.ARP_PUBLIC_URL;
const pin = process.env.ARP_TEST_PIN;
if (!base || !pin) throw new Error('Supply ARP_PUBLIC_URL and ARP_TEST_PIN in the process environment.');
const origin = new URL(base).origin;
assert.equal(origin, 'https://academia-arp-privada.movingflair1.chatgpt.site');
const jars = {rocio:'',alejandra:'',teacher:''};
async function api(profile,path,{body,method=body?'POST':'GET'}={}) {
  const res=await fetch(origin+path,{redirect:'manual',method,headers:{Origin:origin,...(jars[profile]?{Cookie:jars[profile]}:{}),...(body?{'Content-Type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{})});
  if(res.headers.get('set-cookie')) jars[profile]=res.headers.get('set-cookie').split(';')[0];
  let data;try{data=await res.json()}catch{throw Error(`Expected JSON from ${path}; received ${res.status}`)}
  return {status:res.status,data};
}
try {
  const shell=await fetch(origin,{redirect:'manual'});
  assert.equal(shell.status,200,'Anonymous shell must not redirect to ChatGPT sign-in');
  const html=await shell.text();assert.match(html, /Academia ARP/);assert.doesNotMatch(html,/Inicia sesión para acceder/);
  assert.deepEqual((await api('rocio','/api/auth')).data,{profile:null});
  assert.equal((await api('rocio','/api/data')).status,401);
  for(const profile of ['rocio','alejandra']) {
    const entered=await api(profile,'/api/auth',{body:{profile}});assert.equal(entered.status,200);assert.equal(entered.data.profile,profile);
    const snapshot=await api(profile,'/api/data');assert.equal(snapshot.status,200);
    assert.deepEqual(snapshot.data.students.map(s=>s.id),[profile]);
    assert.ok(snapshot.data.skills.every(s=>s.studentId===profile));
    assert.deepEqual(snapshot.data.observations,[]);
    assert.ok(snapshot.data.sessions.every(s=>!Object.hasOwn(s,'privateNotes')&&!Object.hasOwn(s,'autonomy')));
    assert.ok(snapshot.data.activities.every(a=>!Object.hasOwn(a,'answer')&&!Object.hasOwn(a,'expectedAnswer')));
    assert.equal((await api(profile,'/api/action',{body:{action:'upsertSession',data:{}}})).status,403);
  }
  console.log('PASS anonymous entry, both profile scopes, private-field redaction and denied teacher actions');
  assert.equal((await api('teacher','/api/auth',{body:{profile:'teacher',pin:'invalid-smoke-test'}})).status,401);
  assert.equal((await api('teacher','/api/auth',{body:{profile:'teacher',pin}})).status,200);
  const teacher=await api('teacher','/api/data');assert.equal(teacher.status,200);assert.equal(teacher.data.students.length,2);
  assert.equal((await api('teacher','/api/auth')).data.profile,'teacher');
  console.log('PASS teacher password validation and management access without ChatGPT identity');
} finally {
  for(const profile of Object.keys(jars)) if(jars[profile]) {
    await api(profile,'/api/auth',{method:'DELETE'});
    assert.equal((await api(profile,'/api/auth')).data.profile,null);
  }
}
console.log('PASS logout revokes all smoke-test tokens; teaching records unchanged');
