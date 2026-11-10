// Local-only checks of actual R2 upload/download access. Cleans uploaded files.
import assert from 'node:assert/strict';
const base=process.env.ARP_TEST_URL || 'http://127.0.0.1:5173';
if(!['localhost','127.0.0.1'].includes(new URL(base).hostname))throw new Error('Only loopback testing is permitted.');
if(!process.env.ARP_TEST_PIN)throw new Error('Supply ARP_TEST_PIN in the local environment.');
const jars={},ids=[];
async function request(profile,path,options={}) {
  const r=await fetch(base+path,{...options,headers:{...options.headers,Cookie:jars[profile] || '',Origin:new URL(base).origin}});
  if(r.headers.get('set-cookie'))jars[profile]=r.headers.get('set-cookie').split(';')[0];return r;
}
async function login(profile) {
  const r=await request(profile,'/api/auth',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({profile,...(profile==='teacher'?{pin:process.env.ARP_TEST_PIN}:{})})});
  assert.equal(r.status,200);
}
async function upload(profile,shared=false) {
  const body=new FormData();body.set('file',new File(['QA upload access test'],`QA-${profile}.txt`,{type:'text/plain'}));body.set('studentId','rocio');body.set('shared',String(shared));
  const r=await request(profile,'/api/files',{method:'POST',body});assert.equal(r.status,200,await r.clone().text());const data=await r.json();ids.push(data.id);return data;
}
try {
  for(const p of ['teacher','rocio','alejandra'])await login(p);
  const privateFile=await upload('teacher');
  assert.equal(privateFile.shared,false);
  assert.equal((await request('teacher',privateFile.url)).status,200);
  assert.equal((await request('rocio',privateFile.url)).status,403);
  assert.equal((await request('alejandra',privateFile.url)).status,403);
  const rocioData=await (await request('rocio','/api/data')).json();assert.ok(!rocioData.files.some(f=>f.id===privateFile.id));
  const own=await upload('rocio');assert.equal(own.shared,true);
  assert.equal((await request('rocio',own.url)).status,200);
  assert.equal((await request('alejandra',own.url)).status,403);
  assert.equal((await request('alejandra',own.url,{method:'DELETE'})).status,403);
  const bad=new FormData();bad.set('file',new File(['<script>bad</script>'],'QA.html',{type:'text/html'}));bad.set('studentId','rocio');
  assert.equal((await request('rocio','/api/files',{method:'POST',body:bad})).status,400);
  console.log('PASS R2 upload persistence, private teacher files, own pupil files, denied cross-profile reads and safe file types');
} finally {
  for(const id of ids) assert.equal((await request('teacher','/api/files/'+id,{method:'DELETE'})).status,200);
  for(const p of ['teacher','rocio','alejandra'])await request(p,'/api/auth',{method:'DELETE'});
}
