"use client";
import { useEffect, useState } from "react";
import { readLocalForms, removeLocalForm, writeLocalForm, type LocalFormCopy, type LocalFormKind } from "./StudentMobileState";

export function useStudentLocalForms(studentId: string, kind: LocalFormKind) {
  const [copies, setCopies] = useState<LocalFormCopy[]>([]), [error, setError] = useState("");
  const refresh = () => { try { setCopies(readLocalForms(localStorage, studentId, kind)); } catch { setError("El navegador no permite conservar este formulario en el dispositivo."); } };
  useEffect(() => { refresh(); window.addEventListener("storage", refresh); window.addEventListener("arp:local-forms", refresh); return () => { window.removeEventListener("storage", refresh); window.removeEventListener("arp:local-forms", refresh); }; }, [studentId, kind]);
  const save = (id: string, value: Record<string, any>) => {
    const copy: LocalFormCopy = { studentId, kind, id, value, updatedAt: new Date().toISOString() };
    try { writeLocalForm(localStorage, copy); setError(""); window.dispatchEvent(new Event("arp:local-forms")); return copy; }
    catch { setError("No se ha podido conservar el formulario en este dispositivo. Mantén esta página abierta hasta guardarlo."); return copy; }
  };
  const remove = (copy: LocalFormCopy) => { try { const removed = removeLocalForm(localStorage, copy); window.dispatchEvent(new Event("arp:local-forms")); return removed; } catch { setError("No se ha podido actualizar la copia de este dispositivo."); return false; } };
  return { copies, error, save, remove };
}

export function LocalFormRecovery({ copies, title, onRestore, onDiscard, busy = false }: { copies: LocalFormCopy[]; title: string; onRestore: (copy: LocalFormCopy) => void; onDiscard: (copy: LocalFormCopy) => void; busy?: boolean }) {
  if (!copies.length) return null;
  return <section className="card sv-local-recovery" aria-label={title}><h3>{title}</h3><p className="muted sv-small">Copias conservadas en este dispositivo. Continúa para revisarlas y confirmar el guardado.</p>{copies.map(copy => <div className="sv-local-recovery-row" key={copy.id}><div><strong>{String(copy.value.question || copy.value.corrected || copy.value.original || "Formulario pendiente").slice(0, 160)}</strong><p className="muted sv-small">{new Date(copy.updatedAt).toLocaleString("es-ES", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</p></div><div className="row wrap"><button type="button" className="btn secondary" disabled={busy} onClick={() => onRestore(copy)}>Continuar</button><button type="button" className="btn quiet" disabled={busy} onClick={() => onDiscard(copy)}>Descartar copia</button></div></div>)}</section>;
}
