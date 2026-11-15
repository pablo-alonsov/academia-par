import { env } from "cloudflare:workers";
import { database, digest, type Profile } from "./server-auth";
import type { RecordData } from "./server-data";
import { describeStudentNotification } from "./student-notification-event";
import { renderNotificationEmail } from "./notification-email";
import { continueNotificationDelivery } from "./notification-context";

export const NOTIFICATION_RECIPIENT = "palonsovilla@gmail.com";
export const NOTIFICATION_SENDER_NAME = "academia PAR";
const EMAIL_API = "https://api.resend.com/emails";
const IDEMPOTENCY_WINDOW = 23 * 60 * 60 * 1000;
const LEASE_MS = 45_000;
const emailAddress = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;
const schema = [
  `CREATE TABLE IF NOT EXISTS notification_outbox (
    id TEXT PRIMARY KEY NOT NULL, student_id TEXT, event_json TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending', occurred_at TEXT NOT NULL,
    created_at TEXT NOT NULL, attempts INTEGER NOT NULL DEFAULT 0, generation INTEGER NOT NULL DEFAULT 0,
    first_attempt_at INTEGER, next_attempt_at INTEGER NOT NULL DEFAULT 0,
    lease_token TEXT, lease_until INTEGER NOT NULL DEFAULT 0,
    delivery_json TEXT, provider_id TEXT, accepted_at TEXT, last_error TEXT
  )`,
  "CREATE INDEX IF NOT EXISTS notification_outbox_pending ON notification_outbox(status, next_attempt_at, occurred_at)",
];
const initialized = new WeakMap<object, Promise<void>>();
export async function ensureNotificationSchema() {
  const db = database(); let ready = initialized.get(db);
  if (!ready) {
    ready = db.batch(schema.map(sql => db.prepare(sql))).then(() => {});
    initialized.set(db, ready);
    ready.catch(() => initialized.delete(db));
  }
  await ready;
}

export function notificationConfiguration() {
  const key = String(env.RESEND_API_KEY || "").trim();
  const sender = String(env.NOTIFICATION_FROM || "").trim();
  const missing: string[] = [];
  if (!key || /[\r\n]/.test(key)) missing.push("RESEND_API_KEY");
  if (!emailAddress.test(sender) || sender.length > 254) missing.push("NOTIFICATION_FROM");
  const configured = missing.length === 0;
  return { configured, enabled: configured && env.NOTIFICATIONS_ENABLED !== "false", key, sender, missing };
}

type EventInput = Parameters<typeof describeStudentNotification>[0];
type CommitInput = {
  profile: Profile; action: string; before?: RecordData | null; after?: RecordData | null;
  related?: EventInput["related"]; statements: D1PreparedStatement[];
  guard?: { sql: string; bindings?: unknown[] };
};

/** Call only with validated server rows; the event commits atomically with its write. */
export async function commitStudentNotification(input: CommitInput): Promise<D1Result[]> {
  const event = describeStudentNotification({ ...input, data: {}, result: {}, occurredAt: new Date().toISOString() });
  if (!event) return database().batch(input.statements);
  const statement = await notificationStatement(event, input.guard);
  return database().batch([...input.statements, statement]);
}

type NotificationEvent = NonNullable<ReturnType<typeof describeStudentNotification>>;
export async function notificationStatement(event: NotificationEvent, guard?: CommitInput["guard"]) {
  await ensureNotificationSchema();
  const id = await digest(`par-notification-v1:${event.groupKey || event.id}`);
  const status = notificationConfiguration().enabled ? "pending" : "held";
  const now = new Date().toISOString();
  // The default guard observes the preceding domain statement in the same D1
  // transaction. A failed ownership/CAS write or ignored replay creates no mail.
  return database().prepare(`INSERT OR IGNORE INTO notification_outbox
    (id,student_id,event_json,status,occurred_at,created_at)
    SELECT ?,?,?,?,?,? WHERE ${guard?.sql || "changes()>0"}`)
    .bind(id,event.studentId,JSON.stringify({...event,id}),status,event.occurredAt,now,...(guard?.bindings || []));
}

type OutboxRow = { id: string; student_id: string | null; event_json: string; status: string;
  occurred_at: string; attempts: number; generation: number; first_attempt_at: number | null; delivery_json: string | null;
  lease_token: string | null; lease_until: number; accepted_at: string | null; last_error: string | null };

function providerError(status: number) {
  if (status === 401) return "Resend ha rechazado la clave de envío. Revisa la configuración.";
  if (status === 403) return "Resend ha rechazado el remitente o destinatario. Revisa el dominio verificado y los permisos de la cuenta.";
  if (status === 409) return "Resend no ha podido confirmar este reintento. Comprueba el registro de Resend antes de volver a enviarlo.";
  if (status === 429) return "Resend ha limitado temporalmente los envíos. El aviso queda pendiente de reintento.";
  return status >= 500 ? "Resend no está disponible temporalmente. El aviso queda pendiente de reintento." : "Resend ha rechazado el envío. Revisa la configuración del servicio.";
}

/** Persisted leases serialize requests; provider idempotency also covers a lost HTTP response. */
export async function dispatchNotifications({ manual = false, limit = 5 }: { manual?: boolean; limit?: number } = {}) {
  const config = notificationConfiguration();
  if (!config.enabled) return { accepted: 0, failed: 0, configured: config.configured };
  await ensureNotificationSchema();
  const db = database(), now = Date.now();
  const { results } = await db.prepare(`SELECT * FROM notification_outbox
    WHERE status IN ('pending','failed','held','sending') AND lease_until<=?
      AND (next_attempt_at<=? OR ?=1)
    ORDER BY occurred_at,id LIMIT ?`).bind(now,now,manual?1:0,Math.min(10,Math.max(1,limit))).all<OutboxRow>();
  let accepted=0,failed=0;
  const deadline=Date.now()+23_000;
  for (const selected of results) {
    if (Date.now()>=deadline) break;
    const token=crypto.randomUUID(), started=Date.now();
    const claim=await db.prepare(`UPDATE notification_outbox SET status='sending',lease_token=?,lease_until=?,attempts=attempts+1
      WHERE id=? AND status IN ('pending','failed','held','sending') AND lease_until<=?`).bind(token,started+LEASE_MS,selected.id,started).run();
    if (!claim.meta.changes) continue;
    // A worker may have updated this row since SELECT. Only the currently
    // leased generation/payload is authoritative for the provider request.
    const row=await db.prepare("SELECT * FROM notification_outbox WHERE id=? AND lease_token=?").bind(selected.id,token).first<OutboxRow>();
    if (!row) continue;
    if (row.first_attempt_at && row.delivery_json && Date.now()-row.first_attempt_at>IDEMPOTENCY_WINDOW) {
      await db.prepare("UPDATE notification_outbox SET status='blocked', last_error=?, lease_until=0,lease_token=NULL WHERE id=? AND lease_token=?")
        .bind("No se puede confirmar un envío anterior. Consulta Resend antes de enviarlo otra vez para evitar duplicados.",row.id,token).run();
      failed++;continue;
    }
    try {
      let delivery=row.delivery_json;
      if (!delivery) {
        const mail=renderNotificationEmail(JSON.parse(row.event_json));
        delivery=JSON.stringify({from:`${NOTIFICATION_SENDER_NAME} <${config.sender}>`,to:[NOTIFICATION_RECIPIENT],...mail});
        await db.prepare("UPDATE notification_outbox SET delivery_json=?,first_attempt_at=? WHERE id=? AND lease_token=?")
          .bind(delivery,started,row.id,token).run();
      }
      const response=await fetch(EMAIL_API,{method:"POST",headers:{Authorization:`Bearer ${config.key}`,"Content-Type":"application/json","Idempotency-Key":`par/${row.id}/${row.generation}`},body:delivery,signal:AbortSignal.timeout(5_000)});
      let body: any;try {body=await response.json();} catch {body=null;}
      if (!response.ok || typeof body?.id!=="string" || !/^[A-Za-z0-9_-]{5,200}$/.test(body.id)) {
        const definitive=!response.ok && response.status<500 && response.status!==409 && response.status!==429;
        await db.prepare(`UPDATE notification_outbox SET status='failed',last_error=?,next_attempt_at=?,lease_token=NULL,lease_until=0
          ${definitive?",delivery_json=NULL,first_attempt_at=NULL,generation=generation+1":""} WHERE id=? AND lease_token=?`)
          .bind(response.ok?"Resend no ha confirmado la aceptación. El aviso se conserva para comprobarlo.":providerError(response.status),Date.now()+60_000,row.id,token).run();
        failed++;continue;
      }
      await db.prepare("UPDATE notification_outbox SET status='accepted',provider_id=?,accepted_at=?,last_error=NULL,lease_token=NULL,lease_until=0 WHERE id=? AND lease_token=?")
        .bind(body.id,new Date().toISOString(),row.id,token).run();
      accepted++;
    } catch {
      await db.prepare("UPDATE notification_outbox SET status='failed',last_error=?,next_attempt_at=?,lease_token=NULL,lease_until=0 WHERE id=? AND lease_token=?")
        .bind("No se ha podido confirmar el envío. El aviso se conserva y se reintentará sin duplicar el correo.",Date.now()+60_000,row.id,token).run();
      failed++;
    }
  }
  return {accepted,failed,configured:true};
}

export async function triggerNotificationDelivery() {
  if (!notificationConfiguration().enabled) return;
  await continueNotificationDelivery(()=>dispatchNotifications());
}

export async function notificationStatus() {
  await ensureNotificationSchema();
  const config=notificationConfiguration(),db=database();
  const counts=await db.prepare("SELECT status,count(*) AS total FROM notification_outbox GROUP BY status").all<{status:string;total:number}>();
  const byStatus=Object.fromEntries(counts.results.map(row=>[row.status,row.total]));
  const rows=await db.prepare("SELECT * FROM notification_outbox ORDER BY occurred_at DESC,id DESC LIMIT 20").all<OutboxRow>();
  return {configured:config.configured,enabled:config.enabled,recipient:NOTIFICATION_RECIPIENT,senderName:NOTIFICATION_SENDER_NAME,from:config.configured?config.sender:null,missing:config.missing,
    counts:{pending:(byStatus.pending||0)+(byStatus.held||0)+(byStatus.sending||0),accepted:byStatus.accepted||0,failed:(byStatus.failed||0)+(byStatus.blocked||0)},
    notifications:rows.results.map(row=>{const event=JSON.parse(row.event_json);return {id:row.id,studentName:event.studentName,title:event.title,occurredAt:row.occurred_at,status:row.status==="sending"?"pending":row.status==="blocked"?"failed":row.status,attempts:row.attempts,lastError:row.last_error,acceptedAt:row.accepted_at};}),lastCheckedAt:new Date().toISOString()};
}

export async function queueTestNotification(requestId: string) {
  const config=notificationConfiguration();if(!config.enabled)throw Error("Conecta y activa Resend antes de enviar un correo de prueba.");
  const event={id:`test:${requestId}`,studentId:"teacher",studentName:"Panel docente",kind:"test",title:"Aviso de prueba",summary:"Este correo comprueba la conexión de academia PAR. No corresponde a una actividad de Rocío ni de Alejandra.",details:[],occurredAt:new Date().toISOString(),entityType:"test",entityId:requestId};
  await (await notificationStatement(event as NotificationEvent,{sql:"1=1"})).run();
}
