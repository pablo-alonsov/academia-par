// Local R2/HTTP checks only. Restore the exact profile and remove only these photos.
import assert from 'node:assert/strict';
import {globSync,readFileSync} from 'node:fs';
import {DatabaseSync} from 'node:sqlite';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {png} from './upload-fixtures.mjs';
const base=process.env.ARP_TEST_URL || 'http://127.0.0.1:5173';
if(!['localhost','127.0.0.1'].includes(new URL(base).hostname))throw Error('Only loopback testing is permitted.');
if(!process.env.ARP_TEST_PIN)throw Error('Supply ARP_TEST_PIN in the local environment.');
const jars={},created=new Set();let db,original,lastVersion;
for(const path of globSync('.wrangler/state/v3/d1/**/*.sqlite')){const candidate=new DatabaseSync(path);if(candidate.prepare("SELECT name FROM sqlite_master WHERE name='students'").get()){db=candidate;break;}candidate.close();}
if(!db)throw Error('Local D1 not found.');db.exec('PRAGMA busy_timeout=5000');
async function request(profile,path,options={}){const r=await fetch(base+path,{...options,headers:{Origin:base,...(profile?{Cookie:jars[profile] || ''}:{}),...options.headers}});if(profile)for(const value of r.headers.getSetCookie())if(value.startsWith('arp_access='))jars[profile]=value.split(';')[0];return r;}
async function mutate(data){const r=await request('rocio','/api/action',{method:'POST',headers:{'Content-Type':'application/json','X-ARP-Profile':'rocio'},body:JSON.stringify({action:'updatePreferences',data})});assert.equal(r.status,200,await r.clone().text());const result=await r.json();lastVersion=result.patch.students[0].updatedAt;return result;}
async function upload(uploadId){created.add(createHash('sha256').update('profile-photo:rocio:'+uploadId).digest('hex'));const body=new FormData();body.set('file',new File([png],'QA-profile-photo.png',{type:''}));body.set('studentId','rocio');body.set('uploadId',uploadId);const r=await request('rocio','/api/profile-photo',{method:'POST',headers:{'X-ARP-Profile':'rocio'},body});const result=await r.json();if(r.ok)lastVersion=result.patch.students[0].updatedAt;return {r,result};}
try{
 for(const profile of ['teacher','rocio','alejandra']){const r=await request(profile,'/api/auth',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({profile,...(profile==='teacher'?{pin:process.env.ARP_TEST_PIN}:{})})});assert.equal(r.status,200);}
 original=db.prepare("SELECT data,updated_at FROM students WHERE id='rocio'").get();
 const id=crypto.randomUUID(),first=await upload(id);assert.equal(first.r.status,200);assert.equal(first.result.patch.students[0].avatar,'photo');assert.equal((await request(null,first.result.avatarUrl)).status,200);
 assert.deepEqual(Buffer.from(await (await request(null,first.result.avatarUrl)).arrayBuffer()),png);const retry=await upload(id);assert.equal(retry.result.id,first.result.id);assert.equal(retry.result.alreadyUploaded,true);
 const publicProfiles=await (await request(null,'/api/profiles')).json();assert.equal(publicProfiles.find(p=>p.id==='rocio').avatarUrl,first.result.avatarUrl);assert.ok(!JSON.stringify(publicProfiles).includes('avatarFileId'));
 const teacher=await (await request('teacher','/api/data')).json();assert.ok(!teacher.files.some(f=>f.id===first.result.id));assert.equal((await request('teacher','/api/files/'+first.result.id)).status,404);
 await mutate({avatar:'cat',color:'cyan'});assert.equal((await request(null,first.result.avatarUrl)).status,404);assert.equal((await upload(id)).r.status,409);
 await mutate({avatar:'photo'});assert.equal((await request(null,first.result.avatarUrl)).status,200);
 const second=await upload(crypto.randomUUID());assert.equal(second.r.status,200);assert.equal((await request(null,first.result.avatarUrl)).status,404);assert.equal((await request(null,second.result.avatarUrl)).status,200);assert.equal((await upload(id)).r.status,409);
 await mutate({removePhoto:true});assert.equal((await request(null,second.result.avatarUrl)).status,404);assert.equal((await upload(id)).r.status,409);
 const foreign=await request('alejandra','/api/action',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'updatePreferences',data:{avatar:'photo',avatarFileId:second.result.id}})});assert.equal(foreign.status,400);
 console.log('PASS local profile photos: atomic update, public current version only, retry, replacement, removal, scoped preferences and separation from classwork');
}finally{
 try{
  if(original&&lastVersion){const restored=db.prepare("UPDATE students SET data=?,updated_at=? WHERE id='rocio' AND updated_at=?").run(original.data,original.updated_at,lastVersion);if(Number(restored.changes)!==1)throw Error('Profile changed outside this test; its newer state was preserved.');}
  const config=JSON.parse(readFileSync('dist/server/wrangler.json','utf8')),bucket=config.r2_buckets.find(b=>b.binding==='BUCKET').bucket_name;
  for(const id of created){const row=db.prepare("SELECT data FROM files WHERE id=? AND json_extract(data,'$.purpose')='avatar' AND student_id='rocio'").get(id);if(!row)continue;const file=JSON.parse(row.data);if(!file.key.startsWith(`avatars/rocio/${id}/`)||file.name!=='QA-profile-photo.png')throw Error('Unexpected cleanup target.');execFileSync(process.execPath,['--import','./scripts/sites-env.mjs','./node_modules/wrangler/bin/wrangler.js','r2','object','delete',`${bucket}/${file.key}`,'--local','--config','dist/server/wrangler.json','--persist-to','.wrangler/state'],{stdio:'pipe',env:{...process.env,CI:'1'}});db.prepare('DELETE FROM files WHERE id=? AND data=?').run(id,row.data);}
 }finally{db.close();for(const profile of Object.keys(jars))await request(profile,'/api/auth',{method:'DELETE'});}
}
