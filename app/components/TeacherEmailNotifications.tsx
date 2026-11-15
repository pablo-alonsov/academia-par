"use client";

import { useEffect, useRef, useState } from "react";
import { AlertCircle, CheckCircle2, Clock3, ExternalLink, Mail, RefreshCw, Send, WifiOff } from "lucide-react";
import { authorizedFetch } from "@/lib/client-request";
import "./teacher-email-notifications.css";

const TEST_REQUEST_KEY = "par:notification-test-request";
const isUUID = (value: unknown): value is string => typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
type NotificationStatus = "pending" | "accepted" | "failed" | "held";
type Notification = { id: string; studentName?: string; title: string; occurredAt: string; status: NotificationStatus; attempts: number; lastError?: string; acceptedAt?: string };
type Snapshot = { configured: boolean; enabled: boolean; recipient: string; senderName: string; from: string | null; missing: string[]; counts: { pending: number; accepted: number; failed: number }; notifications: Notification[]; lastCheckedAt?: string };
type Props = { notify?: (message: string) => void };
const statuses: Record<NotificationStatus, { label: string; className: string }> = {
  pending: { label: "Pendiente", className: "pending" },
  accepted: { label: "Aceptado por Resend", className: "accepted" },
  failed: { label: "Error", className: "failed" },
  held: { label: "En espera", className: "pending" },
};
const isRecord = (value: unknown): value is Record<string, any> => Boolean(value && typeof value === "object" && !Array.isArray(value));
const countIsValid = (value: unknown) => typeof value === "number" && Number.isInteger(value) && value >= 0;
const errorMessage = (value: unknown, fallback: string) => isRecord(value) && typeof value.message === "string" ? value.message : isRecord(value) && typeof value.error === "string" ? value.error : fallback;
function date(value?: string) {
  const parsed = value ? new Date(value) : null;
  return parsed && Number.isFinite(parsed.getTime()) ? new Intl.DateTimeFormat("es-ES", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Madrid" }).format(parsed) : "Fecha no disponible";
}
function snapshotFrom(value: unknown): Snapshot {
  const raw = isRecord(value) && isRecord(value.state) ? value.state : value;
  if (!isRecord(raw) || typeof raw.configured !== "boolean" || typeof raw.enabled !== "boolean" || typeof raw.recipient !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(raw.recipient) || raw.recipient.length > 254 || !isRecord(raw.counts) || ![raw.counts.pending, raw.counts.accepted, raw.counts.failed].every(countIsValid) || !Array.isArray(raw.notifications)) throw new Error("El servidor no ha devuelto un estado válido de los avisos.");
  if (raw.notifications.some((row: unknown) => !isRecord(row) || typeof row.id !== "string" || !row.id || typeof row.title !== "string" || typeof row.occurredAt !== "string" || !Object.hasOwn(statuses, row.status) || !countIsValid(row.attempts))) throw new Error("No se ha podido interpretar la lista de avisos.");
  return {
    configured: raw.configured, enabled: raw.enabled, recipient: raw.recipient, senderName: typeof raw.senderName === "string" ? raw.senderName : "academia PAR", from: typeof raw.from === "string" ? raw.from : null,
    missing: Array.isArray(raw.missing) ? raw.missing.filter((item: unknown): item is string => typeof item === "string") : [],
    counts: { pending: raw.counts.pending, accepted: raw.counts.accepted, failed: raw.counts.failed },
    notifications: raw.notifications.map((row: Record<string, any>) => ({ id: row.id, title: row.title, occurredAt: row.occurredAt, status: row.status as NotificationStatus, attempts: row.attempts, studentName: typeof row.studentName === "string" ? row.studentName : undefined, lastError: typeof row.lastError === "string" ? row.lastError : undefined, acceptedAt: typeof row.acceptedAt === "string" ? row.acceptedAt : undefined })).sort((a: Notification, b: Notification) => b.occurredAt.localeCompare(a.occurredAt)).slice(0, 20), lastCheckedAt: typeof raw.lastCheckedAt === "string" ? raw.lastCheckedAt : undefined,
  };
}
async function responseJSON(response: Response): Promise<Record<string, any>> {
  let value: unknown;
  try { value = await response.json(); } catch { throw new Error(response.ok ? "El servidor no ha devuelto una respuesta válida." : `No se ha podido consultar el servicio de avisos (${response.status}).`); }
  if (!isRecord(value)) throw new Error("El servidor no ha devuelto una respuesta válida.");
  if (!response.ok) throw Object.assign(new Error(errorMessage(value, `No se ha podido completar la petición (${response.status}).`)), { status: response.status });
  return value;
}

export default function TeacherEmailNotifications({ notify }: Props) {
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null), [loading, setLoading] = useState(true), [busy, setBusy] = useState<"retry" | "sendTest" | null>(null), [error, setError] = useState(""), [message, setMessage] = useState(""), [online, setOnline] = useState(true), [reachable, setReachable] = useState(false), [checkedAt, setCheckedAt] = useState("");
  const mounted = useRef(false), operation = useRef(false), notifyRef = useRef(notify), currentSnapshot = useRef(snapshot), testRequest = useRef<string | null>(null), retryButton = useRef<HTMLButtonElement>(null), testButton = useRef<HTMLButtonElement>(null), refreshButton = useRef<HTMLButtonElement>(null);
  notifyRef.current = notify; currentSnapshot.current = snapshot;
  const update = async () => {
    const response = await authorizedFetch("/api/notifications", { cache: "no-store" });
    const next = snapshotFrom(await responseJSON(response));
    if (mounted.current) { setSnapshot(next); setReachable(true); setCheckedAt(next.lastCheckedAt || new Date().toISOString()); }
    return next;
  };
  const refresh = async () => {
    if (operation.current) return;
    const restoreFocus = document.activeElement === refreshButton.current;
    operation.current = true; if (mounted.current) { setLoading(true); setError(""); setMessage(""); }
    try { await update(); }
    catch (reason: any) { if (mounted.current) { setReachable(false); setError(reason.message || "No se ha podido consultar el estado de los avisos."); } }
    finally { operation.current = false; if (mounted.current) { setLoading(false); if (restoreFocus) requestAnimationFrame(() => refreshButton.current?.focus({ preventScroll: true })); } }
  };
  const refreshRef = useRef(refresh); refreshRef.current = refresh;
  useEffect(() => {
    mounted.current = true; setOnline(navigator.onLine !== false); void refreshRef.current();
    const offline = () => { setOnline(false); setReachable(false); };
    const onlineAgain = () => { setOnline(true); setReachable(false); };
    const resume = (event: Event) => { if ((event as CustomEvent).detail?.profile === "teacher" && document.visibilityState === "visible") void refreshRef.current(); };
    window.addEventListener("offline", offline); window.addEventListener("online", onlineAgain); window.addEventListener("arp:resume-ready", resume);
    return () => { mounted.current = false; window.removeEventListener("offline", offline); window.removeEventListener("online", onlineAgain); window.removeEventListener("arp:resume-ready", resume); };
  }, []);
  const canSend = Boolean(snapshot?.configured && snapshot.enabled && online && reachable && !loading && !busy);
  const retryable = Boolean(snapshot && (snapshot.counts.pending || snapshot.counts.failed || snapshot.notifications.some(item => item.status === "held")));
  const send = async (action: "retry" | "sendTest") => {
    const current = currentSnapshot.current;
    if (operation.current || !current?.configured || !current.enabled || !online || !reachable || action === "retry" && !retryable) return;
    operation.current = true; setBusy(action); setError(""); setMessage("");
    let acknowledged = false, confirmedMessage = "";
    try {
      let requestId: string | undefined;
      if (action === "sendTest") {
        if (!testRequest.current) {
          try { const saved = localStorage.getItem(TEST_REQUEST_KEY); if (isUUID(saved)) testRequest.current = saved; } catch { /* The in-memory token also protects a retry in this visit. */ }
          testRequest.current ||= crypto.randomUUID();
        }
        requestId = testRequest.current;
        try { localStorage.setItem(TEST_REQUEST_KEY, requestId); } catch { /* Storage can be unavailable in a private browser. */ }
      }
      const response = await authorizedFetch("/api/notifications", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action, ...(requestId ? { requestId } : {}) }) });
      const result = await responseJSON(response);
      if (result.ok !== true) throw new Error(errorMessage(result, "El servicio no ha confirmado la acción."));
      acknowledged = true;
      if (action === "sendTest") { testRequest.current = null; try { localStorage.removeItem(TEST_REQUEST_KEY); } catch { /* A confirmed action does not depend on local storage. */ } }
      confirmedMessage = typeof result.message === "string" ? result.message : "Acción registrada. Consulta el estado actualizado.";
      await update();
      if (mounted.current) { setMessage(confirmedMessage); notifyRef.current?.(confirmedMessage); }
    } catch (reason: any) {
      let readSucceeded = false;
      try { await update(); readSucceeded = true; } catch { /* Preserve the last confirmed snapshot and show the action error. */ }
      if (mounted.current) {
        if (!readSucceeded) setReachable(false);
        if (acknowledged) { setMessage(confirmedMessage); if (!readSucceeded) setError("La acción se ha registrado, pero no se ha podido actualizar el estado. Pulsa Actualizar estado para consultarlo."); }
        else setError(reason.message || "No se ha confirmado la acción. Actualiza el estado antes de volver a intentarlo.");
      }
    } finally {
      operation.current = false;
      if (mounted.current) { setBusy(null); requestAnimationFrame(() => { const button = action === "retry" ? retryButton.current : testButton.current; (button?.isConnected && !button.disabled ? button : refreshButton.current)?.focus({ preventScroll: true }); }); }
    }
  };
  const unavailable = !online || !reachable;
  const stateLabel = loading && !snapshot ? "Comprobando…" : !snapshot || !reachable ? "Estado no disponible" : !snapshot.configured ? "Pendiente de configuración" : snapshot.enabled ? "Activo" : "Envíos desactivados";
  const StateIcon = !online ? WifiOff : !snapshot || loading ? Clock3 : !reachable ? AlertCircle : snapshot.configured && snapshot.enabled ? CheckCircle2 : Clock3;
  return <section className="card teacher-email-notifications" aria-labelledby="teacher-email-title" aria-busy={loading || Boolean(busy)}>
    <div className="ten-heading"><div className="ten-title"><Mail size={20} aria-hidden="true"/><h2 id="teacher-email-title">Avisos por correo</h2></div><span className={`ten-state ${snapshot?.configured && snapshot.enabled && reachable && online ? "active" : "pending"}`}><StateIcon size={15} aria-hidden="true"/>{stateLabel}</span></div>
    <p className="ten-recipient">Destinatario: <strong>{snapshot?.recipient || "Pendiente de consulta"}</strong></p>
    {snapshot && <div className="ten-counts" aria-label="Estado de los avisos"><span><Clock3 size={14} aria-hidden="true"/>{snapshot.counts.pending} pendientes</span><span><CheckCircle2 size={14} aria-hidden="true"/>{snapshot.counts.accepted} aceptados por Resend</span><span className={snapshot.counts.failed ? "has-errors" : undefined}><AlertCircle size={14} aria-hidden="true"/>{snapshot.counts.failed} con error</span></div>}
    {!online && <p className="ten-offline" role="status">Sin conexión. Los envíos están deshabilitados en este panel.</p>}
    {error && <p className="error-text ten-message" role="alert">{error}</p>}{message && <p className="ten-message" role="status">{message}</p>}
    <div className="ten-actions"><button ref={refreshButton} type="button" className="btn quiet" disabled={loading || Boolean(busy) || !online} onClick={() => void refresh()}><RefreshCw size={16} className={loading ? "ten-spinner" : undefined} aria-hidden="true"/>{loading ? "Consultando…" : "Actualizar estado"}</button><button ref={retryButton} type="button" className="btn secondary" disabled={!canSend || !retryable} onClick={() => void send("retry")}><RefreshCw size={16} className={busy === "retry" ? "ten-spinner" : undefined} aria-hidden="true"/>{busy === "retry" ? "Reintentando…" : "Reintentar avisos"}</button><button ref={testButton} type="button" className="btn secondary" disabled={!canSend} onClick={() => void send("sendTest")}><Send size={16} aria-hidden="true"/>{busy === "sendTest" ? "Enviando prueba…" : "Correo de prueba"}</button></div>
    {checkedAt && <p className="ten-checked">Última consulta: {date(checkedAt)}{unavailable ? " · Mostrando el último estado consultado" : ""}</p>}
    <details className="ten-details"><summary>Últimos avisos{snapshot ? ` (${snapshot.notifications.length})` : ""}</summary>{snapshot ? snapshot.notifications.length ? <ul className="ten-list">{snapshot.notifications.map(item => <li key={item.id}><div className="ten-notification-main">{item.studentName && <strong>{item.studentName}</strong>}<span>{item.title}</span><small><time dateTime={item.occurredAt}>{date(item.occurredAt)}</time>{item.attempts ? ` · ${item.attempts} ${item.attempts === 1 ? "intento" : "intentos"}` : ""}</small></div><span className={`ten-notification-status ${statuses[item.status].className}`}>{statuses[item.status].label}</span>{item.acceptedAt && item.status === "accepted" && <p className="ten-notification-detail">Aceptado: {date(item.acceptedAt)}</p>}{item.lastError && <p className="ten-notification-error">{item.lastError}</p>}</li>)}</ul> : <p className="ten-empty">Sin avisos registrados.</p> : <p className="ten-empty">Actualiza el estado para consultar los avisos.</p>}<p className="ten-service-note">La aceptación de Resend no confirma la llegada a la bandeja de entrada.</p></details>
    <details className="ten-details"><summary>{snapshot?.configured ? "Configuración del servicio" : "Cómo activar los avisos"}</summary><div className="ten-configuration"><dl><div><dt>Nombre del remitente</dt><dd>{snapshot?.senderName || "academia PAR"}</dd></div><div><dt>Remitente configurado</dt><dd>{snapshot?.from || "Pendiente de configurar"}</dd></div></dl>{snapshot?.missing.length ? <p>Pendiente en el servidor: {snapshot.missing.map((name, index) => <span key={name}>{index > 0 ? ", " : ""}<code>{name}</code></span>)}.</p> : null}<ol><li>Crea tu cuenta en Resend y <a href="https://resend.com/docs/dashboard/domains/introduction" target="_blank" rel="noopener noreferrer">verifica un dominio de envío<ExternalLink size={12} aria-hidden="true"/></a>.</li><li><a href="https://resend.com/docs/dashboard/api-keys/introduction" target="_blank" rel="noopener noreferrer">Crea una clave API<ExternalLink size={12} aria-hidden="true"/></a> y configura <code>RESEND_API_KEY</code> como secreto del servidor.</li><li>Configura <code>NOTIFICATION_FROM</code> con una dirección de ese dominio y vuelve a publicar la web para aplicar los cambios. Después, actualiza el estado y envía un correo de prueba.</li></ol></div></details>
  </section>;
}
