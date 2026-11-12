"use client";
const key = (studentId: string) => `arp-review-read-v1:${studentId}`;
const version = (item: any) => item.reviewedAt || item.resolvedAt || item.updatedAt || item.createdAt || "";
function load(studentId: string): Record<string, string> | null { try { return JSON.parse(localStorage.getItem(key(studentId)) || "null"); } catch { return null; } }
function save(studentId: string, values: Record<string, string>) { try { localStorage.setItem(key(studentId), JSON.stringify(values)); window.dispatchEvent(new Event("arp-review-read-changed")); } catch { /* No unread claims when browser storage is unavailable. */ } }
export function initializeReadState(studentId: string, responses: any[], doubts: any[]) {
  if (load(studentId)) return;
  const values: Record<string, string> = {};
  // Existing history is a baseline, so an older review is never presented as newly received.
  for (const response of responses.filter(item => item.studentId === studentId && item.reviewStatus === "reviewed")) values[`response:${response.id}`] = version(response);
  for (const doubt of doubts.filter(item => item.studentId === studentId && (item.status === "resolved" || item.resolvedAt))) values[`doubt:${doubt.id}`] = version(doubt);
  save(studentId, values);
}
export function isUnread(studentId: string, item: any, kind = "response") { const values = load(studentId); return Boolean(values && values[`${kind}:${item.id}`] !== version(item)); }
export function markRead(studentId: string, items: any[], kind = "response") { const values = load(studentId); if (!values) return; let changed = false; for (const item of items) { if (values[`${kind}:${item.id}`] !== version(item)) { values[`${kind}:${item.id}`] = version(item); changed = true; } } if (changed) save(studentId, values); }
