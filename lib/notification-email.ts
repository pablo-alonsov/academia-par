export type NotificationEmailEvent = {
  id: string;
  studentId: string;
  studentName: string;
  kind: string;
  title: string;
  summary: string;
  details: Array<{ label: string; value: string }>;
  occurredAt: string;
};

export type NotificationEmail = { subject: string; html: string; text: string };

const ACADEMY_ORIGIN = "https://academia-par.movingflair1.chatgpt.site";
const ACADEMY_URL = `${ACADEMY_ORIGIN}/`;
const dateFormat = new Intl.DateTimeFormat("es-ES", {
  dateStyle: "long",
  timeStyle: "short",
  timeZone: "Europe/Madrid",
});

function content(value: string): string {
  return typeof value === "string"
    ? value.replace(/\r\n?/g, "\n").replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, "").trim()
    : "";
}

function singleLine(value: string): string {
  return content(value).replace(/\s+/gu, " ").trim();
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, character => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  })[character]!);
}

function htmlLines(value: string): string {
  return escapeHtml(value).replace(/\n/g, "<br>");
}

/** Every email opens the ordinary academy entry; it never carries an access token. */
function academyUrl(siteUrl?: string): string {
  if (siteUrl === undefined) return ACADEMY_URL;
  try {
    if (typeof siteUrl !== "string" || /[\u0000-\u0020\u007f]/.test(siteUrl)) throw new Error();
    const parsed = new URL(siteUrl);
    if (parsed.origin !== ACADEMY_ORIGIN || parsed.username || parsed.password || parsed.pathname !== "/" || parsed.search || parsed.hash) throw new Error();
    return ACADEMY_URL;
  } catch {
    throw new Error("La dirección de la academia no está permitida para los avisos.");
  }
}

/** Pure rendering only: recipients, delivery and outbox state belong to the server. */
export function renderNotificationEmail(event: NotificationEmailEvent, siteUrl?: string): NotificationEmail {
  const url = academyUrl(siteUrl);
  const name = singleLine(event.studentName) || "Alumna";
  const title = singleLine(event.title) || "Nueva actividad registrada";
  const summary = content(event.summary);
  const parsedDate = new Date(content(event.occurredAt));
  const date = Number.isFinite(parsedDate.getTime()) ? dateFormat.format(parsedDate).replace(/\u00a0/g, " ") : "Fecha no disponible";
  const details = (Array.isArray(event.details) ? event.details : [])
    .map(detail => ({ label: singleLine(detail?.label) || "Detalle", value: content(detail?.value) }))
    .filter(detail => Boolean(detail.value));
  const subject = singleLine(`academia PAR · ${name} · ${title}`).slice(0, 180).trim();

  const detailRows = details.map(detail => `<tr><td style="padding:12px 0;border-top:1px solid #e2e8f0;"><p style="margin:0 0 4px;font-size:13px;line-height:20px;font-weight:700;color:#475569;">${escapeHtml(detail.label)}</p><p style="margin:0;font-size:15px;line-height:24px;color:#0f172a;overflow-wrap:anywhere;word-break:break-word;">${htmlLines(detail.value)}</p></td></tr>`).join("");

  const html = `<!doctype html>
<html lang="es">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="format-detection" content="telephone=no"><title>${escapeHtml(title)} · academia PAR</title></head>
<body style="margin:0;padding:0;width:100%;background-color:#f4f7fc;color:#0f172a;font-family:Arial,Helvetica,sans-serif;-webkit-text-size-adjust:100%;">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%;background-color:#f4f7fc;border-collapse:collapse;">
<tr><td align="center" style="padding:24px 12px;">
<!--[if mso]><table role="presentation" width="600" cellspacing="0" cellpadding="0" border="0"><tr><td><![endif]-->
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%;max-width:600px;border-collapse:separate;background-color:#ffffff;border:1px solid #e2e8f0;border-radius:12px;">
<tr><td style="padding:24px;border-top:4px solid #2563eb;border-bottom:1px solid #e2e8f0;border-radius:12px 12px 0 0;"><p style="margin:0;font-size:21px;line-height:28px;color:#0f172a;">academia <strong style="font-weight:700;color:#2563eb;">PAR</strong></p></td></tr>
<tr><td style="padding:28px 24px 24px;">
<p style="margin:0 0 10px;font-size:13px;line-height:20px;color:#475569;">Aviso de actividad</p>
<h1 style="margin:0 0 16px;font-size:24px;line-height:32px;font-weight:700;color:#0f172a;overflow-wrap:anywhere;word-break:break-word;">${escapeHtml(title)}</h1>
${summary ? `<p style="margin:0 0 22px;font-size:16px;line-height:26px;color:#334155;overflow-wrap:anywhere;word-break:break-word;">${htmlLines(summary)}</p>` : ""}
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%;border-collapse:collapse;margin:0 0 12px;">
<tr><td style="padding:12px 0;border-top:1px solid #e2e8f0;"><p style="margin:0 0 4px;font-size:13px;line-height:20px;font-weight:700;color:#475569;">Alumna</p><p style="margin:0;font-size:15px;line-height:24px;color:#0f172a;overflow-wrap:anywhere;word-break:break-word;">${escapeHtml(name)}</p></td></tr>
<tr><td style="padding:12px 0;border-top:1px solid #e2e8f0;"><p style="margin:0 0 4px;font-size:13px;line-height:20px;font-weight:700;color:#475569;">Fecha y hora</p><p style="margin:0;font-size:15px;line-height:24px;color:#0f172a;">${escapeHtml(date)}</p></td></tr>
${detailRows}
</table>
<table role="presentation" cellspacing="0" cellpadding="0" border="0" style="border-collapse:separate;margin-top:22px;"><tr><td bgcolor="#2563eb" style="background-color:#2563eb;border-radius:8px;text-align:center;mso-padding-alt:14px 20px;"><a href="${url}" style="display:inline-block;padding:14px 20px;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:20px;font-weight:700;text-decoration:none;color:#ffffff;border:1px solid #2563eb;border-radius:8px;">Abrir academia PAR</a></td></tr></table>
<p style="margin:14px 0 0;font-size:13px;line-height:21px;color:#475569;">El panel docente requiere tu contraseña habitual.</p>
</td></tr>
<tr><td style="padding:18px 24px;border-top:1px solid #e2e8f0;"><p style="margin:0;font-size:12px;line-height:20px;color:#64748b;">Aviso automático de academia PAR.</p></td></tr>
</table>
<!--[if mso]></td></tr></table><![endif]-->
</td></tr></table>
</body></html>`;

  const text = [
    "academia PAR",
    title,
    ...(summary ? [summary] : []),
    `Alumna: ${name}`,
    `Fecha y hora: ${date}`,
    ...details.map(detail => `${detail.label}: ${detail.value}`),
    `Abrir academia PAR: ${url}`,
    "El panel docente requiere tu contraseña habitual.",
    "Aviso automático de academia PAR.",
  ].join("\n\n");

  return { subject, html, text };
}
