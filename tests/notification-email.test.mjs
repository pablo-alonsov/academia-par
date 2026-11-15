import {test} from 'node:test';
import assert from 'node:assert/strict';
import {renderNotificationEmail} from '../lib/notification-email.ts';

const event = (extra = {}) => ({
  id:'event-internal-123',studentId:'rocio-internal',studentName:'Rocío',kind:'response.submitted',
  title:'Actividad entregada',summary:'Hay una entrega pendiente de revisión.',
  details:[{label:'Actividad',value:'Detective de tildes'},{label:'Autoevaluación',value:'Con alguna duda'}],
  occurredAt:'2026-11-15T14:05:00.000Z',...extra,
});
const ROOT = 'https://academia-par.movingflair1.chatgpt.site/';

test('email HTML and text retain the same useful event information without internal identifiers',()=>{
  const result=renderNotificationEmail(event());
  assert.equal(result.subject,'academia PAR · Rocío · Actividad entregada');
  for(const value of ['Rocío','Actividad entregada','Hay una entrega pendiente de revisión.','Detective de tildes','Con alguna duda','15 de noviembre de 2026','15:05','Fecha y hora','Abrir academia PAR','El panel docente requiere tu contraseña habitual.']) {
    assert.ok(result.html.includes(value),`missing HTML content: ${value}`);
    assert.ok(result.text.includes(value),`missing text content: ${value}`);
  }
  for(const value of ['event-internal-123','rocio-internal','response.submitted']) {
    assert.ok(!result.html.includes(value));assert.ok(!result.text.includes(value));
  }
  assert.deepEqual([...result.html.matchAll(/href="([^"]*)"/g)].map(match=>match[1]),[ROOT]);
  assert.ok(result.text.includes(ROOT));
});

test('all event content is escaped in HTML and remains plain content in the text alternative',()=>{
  const result=renderNotificationEmail(event({
    studentName:'Rocío <img src=x onerror="alert(1)">',title:'<script>alert("title")</script>',
    summary:'A & B\n<script>bad()</script>',details:[{label:'<b>Etiqueta</b>',value:'"dato" & \'texto\'\n<a href="https://evil.example">enlace</a>'}],
  }));
  assert.ok(!/<script\b|<img\b|<a href="https:\/\/evil/.test(result.html));
  assert.ok(result.html.includes('&lt;script&gt;alert(&quot;title&quot;)&lt;/script&gt;'));
  assert.ok(result.html.includes('A &amp; B<br>&lt;script&gt;bad()&lt;/script&gt;'));
  assert.ok(result.html.includes('&lt;b&gt;Etiqueta&lt;/b&gt;'));
  assert.ok(result.html.includes('&quot;dato&quot; &amp; &#39;texto&#39;<br>&lt;a href=&quot;https://evil.example&quot;&gt;enlace&lt;/a&gt;'));
  assert.ok(result.text.includes('A & B\n<script>bad()</script>'));
  assert.ok(result.text.includes('"dato" & \'texto\''));
  assert.equal((result.html.match(/<a\s/g)||[]).length,1);
});

test('subject strips line breaks and control characters so event text cannot add mail headers',()=>{
  const result=renderNotificationEmail(event({studentName:'Rocío\r\nBcc: otro@example.test',title:'Entregada\u0000\r\nReply-To: otro@example.test'}));
  assert.ok(!/[\r\n\u0000-\u001f\u007f]/.test(result.subject));
  assert.ok(result.subject.startsWith('academia PAR · Rocío Bcc:'));
  assert.ok(result.subject.length<=180);
});

test('the only permitted link is the canonical HTTPS academy root, with or without trailing slash',()=>{
  assert.ok(renderNotificationEmail(event(),ROOT.slice(0,-1)).html.includes(`href="${ROOT}"`));
  assert.ok(renderNotificationEmail(event(),ROOT).html.includes(`href="${ROOT}"`));
  for(const address of [
    'https://evil.example/','http://academia-par.movingflair1.chatgpt.site/',
    'https://academia-par.movingflair1.chatgpt.site.evil.example/',
    'https://academia-par.movingflair1.chatgpt.site@evil.example/',
    'https://user:password@academia-par.movingflair1.chatgpt.site/',
    `${ROOT}?token=secret`,`${ROOT}#token`,`${ROOT}api/files/private`,
    'javascript:alert(1)',`${ROOT}\r\n`,''
  ]) assert.throws(()=>renderNotificationEmail(event(),address),/no está permitida/);
});

test('Madrid dates account for winter and summer offsets and invalid dates never invent a timestamp',()=>{
  assert.ok(renderNotificationEmail(event({occurredAt:'2026-07-15T14:05:00.000Z'})).text.includes('16:05'));
  assert.ok(renderNotificationEmail(event({occurredAt:'not-a-date'})).text.includes('Fecha no disponible'));
  assert.ok(renderNotificationEmail(event({occurredAt:'not-a-date'})).html.includes('Fecha no disponible'));
});

test('unknown kinds and explicit test notices render safely without inventing an event-specific action',()=>{
  const unknown=renderNotificationEmail(event({kind:'future.action',title:'Aviso de actividad',summary:'Se ha registrado una acción.',details:[]}));
  assert.ok(unknown.text.includes('Se ha registrado una acción.'));
  assert.ok(!unknown.text.includes('future.action'));
  const demonstration=renderNotificationEmail(event({kind:'test',title:'Aviso de prueba',summary:'Ejemplo ficticio. No representa una entrega real.',details:[]}));
  assert.ok(demonstration.html.includes('Aviso de prueba'));
  assert.ok(demonstration.text.includes('Ejemplo ficticio. No representa una entrega real.'));
  const fallback=renderNotificationEmail(event({kind:'unknown',title:' ',studentName:'',summary:'',details:[{label:'Vacío',value:''}]}));
  assert.ok(fallback.text.includes('Nueva actividad registrada'));
  assert.ok(fallback.text.includes('Alumna: Alumna'));
  assert.ok(!fallback.html.includes('Vacío'));
});

test('the fluid inline layout has no remote images, stylesheets, scripts or forms',()=>{
  const result=renderNotificationEmail(event());
  assert.ok(result.html.includes('<html lang="es">'));
  assert.ok(result.html.includes('max-width:600px'));
  assert.ok(result.html.includes('width="100%"'));
  assert.ok(result.html.includes('role="presentation"'));
  assert.ok(!/<img\b|<script\b|<form\b|<link\b|<style\b|url\(/i.test(result.html));
  const source=event();const before=JSON.stringify(source);
  assert.deepEqual(renderNotificationEmail(source),renderNotificationEmail(source));
  assert.equal(JSON.stringify(source),before);
});
