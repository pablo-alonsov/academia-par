import test, {beforeEach, afterEach} from 'node:test';
import assert from 'node:assert/strict';
import {registerHooks} from 'node:module';
import {existsSync, readFileSync, readdirSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {DatabaseSync} from 'node:sqlite';
import ts from 'typescript';

// Actual HTTP handlers and SQL transactions; only Cloudflare bindings and the
// outbound Resend request are substituted. No request can reach a live service.
const root = new URL('../', import.meta.url);
globalThis.__parNotificationIntegrationEnv = {};
registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === 'cloudflare:workers') return {url:'data:text/javascript,export const env=globalThis.__parNotificationIntegrationEnv;', shortCircuit:true};
    if (specifier.startsWith('@/')) return nextResolve(new URL(specifier.slice(2) + '.ts', root).href, context);
    if (specifier.startsWith('.') && context.parentURL?.startsWith(root.href)) {
      const url = new URL(specifier, context.parentURL);
      if (!url.pathname.endsWith('.ts') && existsSync(fileURLToPath(url) + '.ts')) return nextResolve(url.href + '.ts', context);
    }
    return nextResolve(specifier, context);
  },
  load(url, context, nextLoad) {
    if (url.startsWith(root.href) && url.endsWith('.ts')) return {format:'module', source:ts.transpileModule(readFileSync(fileURLToPath(url), 'utf8'), {compilerOptions:{module:ts.ModuleKind.ESNext, target:ts.ScriptTarget.ES2020}}).outputText, shortCircuit:true};
    return nextLoad(url, context);
  },
});

class D1Statement {
  constructor(adapter, sql, bindings = []) { this.adapter = adapter; this.sql = sql; this.bindings = bindings; }
  bind(...bindings) { return new D1Statement(this.adapter, this.sql, bindings); }
  async run() {
    this.adapter.beforeRun?.(this);
    if (this.adapter.failStatement?.(this)) throw Error('Simulated notification transaction failure');
    const result = this.adapter.db.prepare(this.sql).run(...this.bindings);
    return {success:true, results:[], meta:{changes:Number(result.changes)}};
  }
  async first(column) {
    const row = this.adapter.db.prepare(this.sql).get(...this.bindings);
    return column ? row?.[column] ?? null : row ?? null;
  }
  async all() { return {success:true, results:this.adapter.db.prepare(this.sql).all(...this.bindings), meta:{}}; }
}
class D1Adapter {
  constructor(db) { this.db = db; this.writer = Promise.resolve(); }
  prepare(sql) { return new D1Statement(this, sql); }
  async batch(statements) {
    const task = this.writer.catch(() => {}).then(async () => {
      this.db.exec('BEGIN');
      try {
        const results = [];
        for (const statement of statements) results.push(await statement.run());
        this.db.exec('COMMIT'); return results;
      } catch (error) { this.db.exec('ROLLBACK'); throw error; }
    });
    this.writer = task; return task;
  }
}

const auth = await import('../app/api/auth/route.ts');
const data = await import('../app/api/data/route.ts');
const action = await import('../app/api/action/route.ts');
const notificationRoute = await import('../app/api/notifications/route.ts');
const {hashPin} = await import('../lib/server-auth.ts');
const {notificationStatement, dispatchNotifications} = await import('../lib/server-notifications.ts');
const pin = 'notification-local-test-only', pinHash = await hashPin(pin);
const origin = 'https://academy-notifications.example';
const nativeFetch = globalThis.fetch;
let sqlite, adapter, calls, unexpectedRequests, provider;
const env = globalThis.__parNotificationIntegrationEnv;

beforeEach(() => {
  sqlite = new DatabaseSync(':memory:');
  for (const name of readdirSync(new URL('../drizzle/', import.meta.url)).filter(name => name.endsWith('.sql')).sort()) sqlite.exec(readFileSync(new URL('../drizzle/' + name, import.meta.url), 'utf8'));
  for (const key of Object.keys(env)) delete env[key];
  adapter = new D1Adapter(sqlite); env.DB = adapter; env.TEACHER_PIN_HASH = pinHash;
  calls = []; unexpectedRequests = [];
  provider = async () => Response.json({id:`resend-test-${calls.length}`});
  globalThis.fetch = async (input, init = {}) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
    if (url !== 'https://api.resend.com/emails') { unexpectedRequests.push(url); throw Error('Network forbidden in notification tests'); }
    const call = {url, method:init.method, headers:new Headers(init.headers), body:init.body, signal:init.signal};
    calls.push(call); return provider(call);
  };
});
afterEach(async () => {
  await adapter.writer.catch(() => {});
  globalThis.fetch = nativeFetch;
  sqlite.close();
  assert.deepEqual(unexpectedRequests, [], 'only the simulated Resend endpoint may be requested');
});

function request(path, {cookie, body, siteOrigin = origin} = {}) {
  const headers = {};
  if (cookie) headers.Cookie = cookie;
  if (body !== undefined) { headers.Origin = siteOrigin; headers['Content-Type'] = 'application/json'; }
  return new Request(origin + path, {method:body === undefined ? 'GET' : 'POST', headers, ...(body === undefined ? {} : {body:JSON.stringify(body)})});
}
async function login(profile) {
  const response = await auth.POST(request('/api/auth', {body:{profile, ...(profile === 'teacher' ? {pin} : {})}}));
  assert.equal(response.status, 200); return response.headers.get('set-cookie').split(';')[0];
}
async function mutate(cookie, name, input, expectedStatus = 200) {
  const response = await action.POST(request('/api/action', {cookie, body:{action:name, data:input}}));
  const result = await response.json(); assert.equal(response.status, expectedStatus, JSON.stringify(result)); return result;
}
async function notificationPost(cookie, body, expectedStatus = 200, siteOrigin = origin) {
  const response = await notificationRoute.POST(request('/api/notifications', {cookie, body, siteOrigin}));
  const result = await response.json(); assert.equal(response.status, expectedStatus, JSON.stringify(result)); return result;
}
function configured() { env.RESEND_API_KEY = 're_local_only_placeholder'; env.NOTIFICATION_FROM = 'avisos@notify.example'; env.NOTIFICATIONS_ENABLED = 'true'; }
function rows() { return sqlite.prepare('SELECT * FROM notification_outbox ORDER BY occurred_at,id').all(); }
function count(table) { return sqlite.prepare(`SELECT count(*) AS total FROM ${table}`).get().total; }
function stored(table, id) { const row = sqlite.prepare(`SELECT data FROM ${table} WHERE id=?`).get(id); return row ? JSON.parse(row.data) : null; }
function engineEvent(id = 'engine-event', extra = {}) {
  return {id, studentId:'rocio', studentName:'Rocío', kind:'response.submitted', title:'Entrega de prueba local', summary:'Dato del fixture para comprobar el envío.', details:[{label:'Actividad', value:'Ejercicio del fixture'}], occurredAt:'2026-11-15T10:00:00.000Z', entityType:'response', entityId:id, ...extra};
}
async function queue(event = engineEvent()) { await (await notificationStatement(event, {sql:'1=1'})).run(); return rows().find(row => JSON.parse(row.event_json).entityId === event.entityId); }
function deferred() { let resolve; const promise = new Promise(done => { resolve = done; }); return {promise, resolve}; }

test('notification GET and POST require the teacher and a read never sends mail', async () => {
  configured(); await queue();
  for (const cookie of [undefined, await login('rocio'), await login('alejandra')]) {
    const expected = cookie ? 403 : 401;
    assert.equal((await notificationRoute.GET(request('/api/notifications', {cookie}))).status, expected);
    await notificationPost(cookie, {action:'retry'}, expected);
  }
  const teacher = await login('teacher');
  await notificationPost(teacher, {action:'retry'}, 403, 'https://another.example');
  const status = await notificationRoute.GET(request('/api/notifications', {cookie:teacher}));
  assert.equal(status.status, 200);
  const body = await status.json();
  assert.equal(body.configured, true); assert.equal(body.counts.pending, 1);
  assert.equal(calls.length, 0);
  assert.ok(!JSON.stringify(body).includes(env.RESEND_API_KEY));
  assert.ok(!JSON.stringify(body).includes('delivery_json'));
});

test('a teacher request cannot override recipient, sender or API key, and test retry sends once', async () => {
  configured(); const teacher = await login('teacher'), requestId = crypto.randomUUID();
  const result = await notificationPost(teacher, {action:'sendTest', requestId, to:'attacker@example.test', from:'attacker@example.test', apiKey:'attacker-key', RESEND_API_KEY:'attacker-key'});
  assert.equal(result.accepted, 1); assert.equal(calls.length, 1);
  assert.equal(calls[0].method, 'POST'); assert.equal(calls[0].headers.get('authorization'), `Bearer ${env.RESEND_API_KEY}`);
  const delivery = JSON.parse(calls[0].body);
  assert.deepEqual(delivery.to, ['palonsovilla@gmail.com']); assert.equal(delivery.from, 'academia PAR <avisos@notify.example>');
  assert.ok(!calls[0].body.includes('attacker'));
  const replay = await notificationPost(teacher, {action:'sendTest', requestId});
  assert.equal(replay.accepted, 0); assert.equal(calls.length, 1); assert.equal(rows().length, 1);
  assert.equal(rows()[0].status, 'accepted'); assert.equal(rows()[0].provider_id, 'resend-test-1'); assert.ok(rows()[0].accepted_at);
});

test('without configuration, pupil exam, doubt and submission persist with held notices and no sensitive pupil DTO', async () => {
  const pupil = await login('rocio'), teacher = await login('teacher');
  await mutate(pupil, 'upsertExam', {id:'held-exam', title:'Examen del fixture', date:'2026-11-20', subject:'Lengua', topics:'Tildes'});
  await mutate(pupil, 'saveDoubt', {submissionId:crypto.randomUUID(), question:'¿Cómo reconozco la sílaba tónica?'});
  await mutate(pupil, 'submitResponse', {activityId:'r-tonica-telefono', answer:'lé', comment:'PRIVATE COMPLETE COMMENT MARKER', selfAssessment:'Con alguna duda', submissionId:'held-submission'});
  assert.equal(count('exams'), 1); assert.equal(count('doubts'), 1); assert.equal(count('responses'), 1);
  assert.equal(rows().length, 3); assert.ok(rows().every(row => row.status === 'held'));
  assert.deepEqual(rows().map(row => JSON.parse(row.event_json).kind).sort(), ['doubt.created','exam.created','response.submitted']);
  assert.ok(!JSON.stringify(rows()).includes('PRIVATE COMPLETE COMMENT MARKER'));
  assert.equal(calls.length, 0);
  const snapshot = await (await data.GET(request('/api/data', {cookie:pupil}))).json();
  for (const secret of ['notification_outbox','event_json','delivery_json','provider_id','palonsovilla@gmail.com','RESEND_API_KEY']) assert.ok(!JSON.stringify(snapshot).includes(secret), secret);
  assert.equal(snapshot.responses.length, 1); assert.ok(!snapshot.skills.some(skill => skill.lastCheck));
  const status = await (await notificationRoute.GET(request('/api/notifications', {cookie:teacher}))).json();
  assert.equal(status.configured, false); assert.equal(status.enabled, false); assert.equal(status.counts.pending, 3);
  await notificationPost(teacher, {action:'sendTest', requestId:crypto.randomUUID()}, 409);
  assert.equal(rows().length, 3); assert.equal(calls.length, 0);
});

test('held rows are released after configuration and acceptance requires a nonempty provider receipt', async () => {
  const row = await queue(); assert.equal(row.status, 'held');
  configured(); provider = async () => Response.json({});
  const unconfirmed = await dispatchNotifications({manual:true});
  assert.equal(unconfirmed.accepted, 0); assert.equal(unconfirmed.failed, 1);
  const failed = rows()[0];
  assert.equal(failed.status, 'failed'); assert.equal(failed.provider_id, null); assert.equal(failed.accepted_at, null);
  assert.ok(failed.delivery_json); assert.ok(failed.first_attempt_at); assert.ok(failed.last_error);
  provider = async () => Response.json({id:'accepted-after-missing-receipt'});
  const confirmed = await dispatchNotifications({manual:true});
  assert.equal(confirmed.accepted, 1); assert.equal(rows()[0].provider_id, 'accepted-after-missing-receipt');
  assert.equal(calls[0].headers.get('idempotency-key'), calls[1].headers.get('idempotency-key'));
  assert.equal(calls[0].body, calls[1].body);
});

test('concurrent dispatchers claim one persisted lease and never replay an accepted row', async () => {
  configured(); await queue();
  const entered = deferred(), release = deferred();
  provider = async () => { entered.resolve(); await release.promise; return Response.json({id:'single-concurrent-receipt'}); };
  const first = dispatchNotifications({manual:true}); await entered.promise;
  assert.equal(rows()[0].status, 'sending'); assert.ok(rows()[0].lease_token);
  assert.ok(rows()[0].lease_until > Date.now());
  const competing = await dispatchNotifications({manual:true});
  assert.equal(competing.accepted, 0); assert.equal(calls.length, 1);
  release.resolve(); assert.equal((await first).accepted, 1);
  assert.equal(rows()[0].attempts, 1); assert.equal(rows()[0].status, 'accepted');
  assert.equal((await dispatchNotifications({manual:true})).accepted, 0); assert.equal(calls.length, 1);
});

test('provider failures retain the same idempotency key and immutable delivery through retry', async () => {
  configured(); const row = await queue();
  provider = async () => Response.json({message:'provider temporarily unavailable'}, {status:503});
  assert.equal((await dispatchNotifications()).failed, 1);
  const first = rows()[0];
  assert.equal(first.status, 'failed'); assert.equal(first.lease_token, null); assert.equal(first.lease_until, 0);
  assert.ok(first.next_attempt_at > Date.now());
  const replacement = engineEvent('different', {title:'Altered after first attempt'});
  sqlite.prepare('UPDATE notification_outbox SET event_json=? WHERE id=?').run(JSON.stringify(replacement), row.id);
  env.NOTIFICATION_FROM = 'changed@notify.example';
  provider = async () => Response.json({id:'retry-stable-delivery'});
  assert.equal((await dispatchNotifications({manual:true})).accepted, 1);
  assert.equal(calls.length, 2); assert.equal(calls[0].body, calls[1].body);
  assert.equal(calls[0].headers.get('idempotency-key'), `par/${row.id}/0`);
  assert.equal(calls[1].headers.get('idempotency-key'), `par/${row.id}/0`);
  assert.equal(JSON.parse(calls[1].body).from, 'academia PAR <avisos@notify.example>');
  assert.equal(rows()[0].attempts, 2); assert.equal(rows()[0].last_error, null);
  await dispatchNotifications({manual:true}); assert.equal(calls.length, 2);
});

test('a definitive provider rejection advances identity before a corrected sender creates a new message', async () => {
  configured(); await queue();
  provider = async () => Response.json({message:'Sender rejected'}, {status:403});
  assert.equal((await dispatchNotifications()).failed, 1);
  assert.equal(rows()[0].generation, 1);
  assert.equal(rows()[0].delivery_json, null); assert.equal(rows()[0].first_attempt_at, null);
  env.NOTIFICATION_FROM = 'corrected@notify.example';
  provider = async () => Response.json({id:'corrected-config-receipt'});
  assert.equal((await dispatchNotifications({manual:true})).accepted, 1);
  assert.equal(calls.length, 2);
  assert.notEqual(calls[0].headers.get('idempotency-key'), calls[1].headers.get('idempotency-key'));
  assert.ok(calls[0].headers.get('idempotency-key').endsWith('/0'));
  assert.ok(calls[1].headers.get('idempotency-key').endsWith('/1'));
  assert.equal(JSON.parse(calls[0].body).from, 'academia PAR <avisos@notify.example>');
  assert.equal(JSON.parse(calls[1].body).from, 'academia PAR <corrected@notify.example>');
  assert.equal(rows()[0].generation, 1); assert.equal(rows()[0].status, 'accepted');
  await dispatchNotifications({manual:true}); assert.equal(calls.length, 2);
});

test('a dispatcher with a stale selected generation re-reads its owned lease before constructing delivery', async () => {
  configured(); const row = await queue();
  provider = async () => Response.json({message:'Temporary error'}, {status:503});
  await dispatchNotifications();
  env.NOTIFICATION_FROM = 'corrected@notify.example';
  let injected = false;
  adapter.beforeRun = statement => {
    if (!injected && /UPDATE notification_outbox SET status='sending'/.test(statement.sql)) {
      injected = true;
      // Another dispatcher completed an explicit rejection after this dispatcher's
      // SELECT but before its claim. Its prior snapshot must not restore generation 0.
      sqlite.prepare("UPDATE notification_outbox SET generation=generation+1,status='failed',delivery_json=NULL,first_attempt_at=NULL,lease_token=NULL,lease_until=0 WHERE id=?").run(row.id);
    }
  };
  provider = async () => Response.json({id:'fresh-owned-generation'});
  assert.equal((await dispatchNotifications({manual:true})).accepted, 1);
  assert.equal(injected, true); assert.equal(calls.length, 2);
  assert.equal(calls[1].headers.get('idempotency-key'), `par/${row.id}/1`);
  assert.equal(JSON.parse(calls[1].body).from, 'academia PAR <corrected@notify.example>');
  assert.equal(rows()[0].generation, 1); assert.equal(rows()[0].provider_id, 'fresh-owned-generation');
});

test('a simulated provider timeout persists uncertain delivery and retries with its original identity', async () => {
  configured(); await queue();
  provider = async call => { assert.ok(call.signal instanceof AbortSignal); throw new DOMException('Simulated provider timeout', 'TimeoutError'); };
  assert.equal((await dispatchNotifications()).failed, 1);
  const failed = rows()[0];
  assert.equal(failed.status, 'failed'); assert.equal(failed.provider_id, null); assert.ok(failed.delivery_json); assert.ok(failed.last_error);
  // A worker that disappears after a claim is also recoverable once its lease expires.
  sqlite.prepare("UPDATE notification_outbox SET status='sending',lease_token='abandoned-worker',lease_until=? WHERE id=?").run(Date.now() - 1, failed.id);
  provider = async () => Response.json({id:'timeout-retry-confirmed'});
  assert.equal((await dispatchNotifications({manual:true})).accepted, 1);
  assert.equal(calls[0].body, calls[1].body);
  assert.equal(calls[0].headers.get('idempotency-key'), calls[1].headers.get('idempotency-key'));
  assert.equal(rows()[0].provider_id, 'timeout-retry-confirmed');
});

test('an uncertain delivery outside its idempotency window blocks rather than sending a possible duplicate', async () => {
  configured(); await queue(); provider = async () => { throw Error('Simulated lost HTTP response'); };
  await dispatchNotifications();
  sqlite.prepare('UPDATE notification_outbox SET first_attempt_at=?').run(Date.now() - 24 * 60 * 60 * 1000);
  const result = await dispatchNotifications({manual:true});
  assert.equal(result.accepted, 0); assert.equal(result.failed, 1); assert.equal(calls.length, 1);
  assert.equal(rows()[0].status, 'blocked'); assert.equal(rows()[0].provider_id, null);
  assert.match(rows()[0].last_error, /Resend/);
});

test('notification SQL failure rolls back the exam, doubt and complete response transaction without sending', async () => {
  const pupil = await login('rocio');
  await mutate(pupil, 'saveDraft', {activityId:'r-tonica-telefono', answer:'lé', clientRevision:'rollback-draft', baseRevision:''});
  sqlite.exec('DELETE FROM notification_outbox');
  adapter.failStatement = statement => /INSERT OR IGNORE INTO notification_outbox/.test(statement.sql);
  for (const [name, payload] of [
    ['upsertExam', {id:'rollback-exam', title:'No confirmar', date:'2026-11-20'}],
    ['saveDoubt', {submissionId:crypto.randomUUID(), question:'No confirmar esta duda'}],
    ['submitResponse', {activityId:'r-tonica-telefono', answer:'lé', selfAssessment:'Fácil', submissionId:'rollback-response', draftRevision:'rollback-draft'}],
  ]) await mutate(pupil, name, payload, 500);
  assert.equal(count('exams'), 0); assert.equal(count('doubts'), 0); assert.equal(count('responses'), 0); assert.equal(count('assignments'), 0);
  assert.equal(count('drafts'), 1); assert.equal(stored('drafts','draft:rocio:activity:r-tonica-telefono').answer, 'lé');
  assert.equal(rows().length, 0); assert.equal(calls.length, 0);
});

test('ownership rejection and stale draft CAS create no notices for writes that did not happen', async () => {
  const teacher = await login('teacher'), pupil = await login('rocio');
  await mutate(teacher, 'upsertExam', {id:'foreign-exam', studentId:'alejandra', title:'Examen de Alejandra', date:'2026-11-20'});
  await mutate(pupil, 'upsertExam', {id:'foreign-exam', title:'Cambio prohibido'}, 403);
  assert.equal(rows().length, 0);
  const first = await mutate(pupil, 'saveDraft', {activityId:'r-tonica-telefono', answer:'Borrador inicial', clientRevision:'first', baseRevision:''});
  assert.equal(rows().length, 1);
  const stale = await mutate(pupil, 'saveDraft', {activityId:'r-tonica-telefono', answer:'Borrador rezagado', clientRevision:'stale', baseRevision:''});
  assert.equal(stale.conflict, true);
  const replay = await mutate(pupil, 'saveDraft', {activityId:'r-tonica-telefono', answer:'Texto alterado de un retry', clientRevision:'first', baseRevision:''});
  assert.equal(replay.alreadySaved, true);
  await mutate(pupil, 'deleteDraft', {activityId:'r-tonica-telefono', draftRevision:'wrong-revision'});
  assert.equal(stored('drafts',first.id).answer, 'Borrador inicial'); assert.equal(rows().length, 1);
  let injected = false;
  adapter.beforeRun = statement => {
    if (!injected && /^UPDATE drafts SET/.test(statement.sql)) {
      injected = true;
      const current = stored('drafts', first.id), now = new Date().toISOString();
      sqlite.prepare('UPDATE drafts SET data=?,updated_at=? WHERE id=?').run(JSON.stringify({...current,answer:'Otra pestaña ganó',clientRevision:'remote-winner',updatedAt:now}), now, first.id);
    }
  };
  const raced = await mutate(pupil, 'saveDraft', {activityId:'r-tonica-telefono', answer:'No sobrescribir', clientRevision:'raced', baseRevision:'first'});
  assert.equal(raced.conflict, true); assert.equal(injected, true);
  assert.equal(stored('drafts', first.id).clientRevision, 'remote-winner'); assert.equal(rows().length, 1); assert.equal(calls.length, 0);
});

test('an exam ownership change between read and write fails atomically without a notification', async () => {
  const pupil = await login('rocio');
  await mutate(pupil, 'upsertExam', {id:'exam-race', title:'Primera versión', date:'2026-11-20'});
  sqlite.exec('DELETE FROM notification_outbox'); let injected = false;
  adapter.beforeRun = statement => {
    if (!injected && /INSERT INTO exams/.test(statement.sql)) {
      injected = true; const current = stored('exams', 'exam-race');
      sqlite.prepare('UPDATE exams SET student_id=?,data=? WHERE id=?').run('alejandra', JSON.stringify({...current,studentId:'alejandra'}), 'exam-race');
    }
  };
  await mutate(pupil, 'upsertExam', {id:'exam-race', title:'Cambio que no debe aplicarse'}, 403);
  assert.equal(injected, true); assert.equal(stored('exams','exam-race').title, 'Primera versión');
  assert.equal(rows().length, 0); assert.equal(calls.length, 0);
});

test('submission retries do not queue duplicate events and teacher writes do not notify as pupil activity', async () => {
  const pupil = await login('rocio'), teacher = await login('teacher');
  const payload = {activityId:'r-tonica-telefono',answer:'lé',selfAssessment:'Fácil',submissionId:'one-logical-submission'};
  const first = await mutate(pupil, 'submitResponse', payload);
  const repeated = await mutate(pupil, 'submitResponse', payload);
  assert.equal(repeated.id, first.id); assert.equal(repeated.alreadySubmitted, true);
  assert.equal(count('responses'), 1); assert.equal(rows().length, 1);
  await mutate(teacher, 'reviewResponse', {id:first.id, feedback:'Comentario docente privado de la cola', result:'Revisado'});
  await mutate(teacher, 'upsertExam', {id:'teacher-exam',studentId:'rocio',title:'Examen preparado por docente',date:'2026-11-20'});
  await mutate(teacher, 'submitResponse', {...payload, studentId:'rocio', submissionId:'teacher-recorded-response'});
  assert.equal(count('responses'), 2); assert.equal(rows().length, 1); assert.equal(calls.length, 0);
  assert.ok(rows().every(row => JSON.parse(row.event_json).studentId === 'rocio'));
});

test('two concurrent retries without a preexisting draft commit one response, optional assignment and notice', async () => {
  const pupil = await login('rocio');
  assert.equal(count('drafts'), 0);
  const payload = {activityId:'r-tonica-telefono', answer:'lé', selfAssessment:'Fácil', submissionId:'concurrent-same-attempt'};
  const results = await Promise.all([mutate(pupil, 'submitResponse', payload), mutate(pupil, 'submitResponse', payload)]);
  assert.equal(results[0].id, results[1].id);
  assert.equal(count('responses'), 1); assert.equal(count('assignments'), 1); assert.equal(rows().length, 1);
  assert.equal(JSON.parse(rows()[0].event_json).kind, 'response.submitted'); assert.equal(calls.length, 0);
});

test('empty drafts, unchanged preferences and reordered favorites do not add noise to the outbox', async () => {
  const pupil = await login('rocio');
  await mutate(pupil, 'saveDraft', {activityId:'r-tonica-telefono', answer:'', clientRevision:'empty-draft', baseRevision:''});
  assert.equal(count('drafts'), 1); assert.equal(rows().length, 0);
  await mutate(pupil, 'deleteDraft', {activityId:'r-tonica-telefono', draftRevision:'empty-draft'});
  assert.equal(rows().length, 0);
  const snapshot = await (await data.GET(request('/api/data', {cookie:pupil}))).json();
  const favoriteIds = snapshot.resources.slice(0, 2).map(resource => resource.id);
  assert.equal(favoriteIds.length, 2);
  await mutate(pupil, 'updatePreferences', {avatar:'book', favoriteResourceIds:favoriteIds});
  const baseline = rows().length; assert.equal(baseline, 1);
  await mutate(pupil, 'updatePreferences', {avatar:'book', favoriteResourceIds:[...favoriteIds].reverse()});
  await mutate(pupil, 'updatePreferences', {avatar:'book', favoriteResourceIds:favoriteIds});
  assert.equal(rows().length, baseline); assert.equal(calls.length, 0);
});
