"use client";

import { useEffect, useRef, useState } from "react";
import { AlertCircle, Check, LoaderCircle, RefreshCw, RotateCcw } from "lucide-react";
import "./teacher-pdf-work.css";

type Props = {
  resource: any;
  file: any;
  act: (action: string, payload: any) => Promise<any>;
  notify: (message: string) => void;
  onRefresh: () => Promise<void>;
};
type Recovery = { desiredWorked: boolean; message: string; needsRefresh: boolean };

function workedDate(value: unknown): string {
  const date = typeof value === "string" ? new Date(value) : null;
  return date && Number.isFinite(date.getTime())
    ? new Intl.DateTimeFormat("es-ES", { day: "numeric", month: "short", year: "numeric", timeZone: "Europe/Madrid" }).format(date)
    : "";
}

/** This records classroom use of the exact PDF; it never submits student work. */
export default function TeacherPdfWork({ resource, file, act, notify, onRefresh }: Props) {
  const worked = Boolean(file?._pdfWorkedAt), date = workedDate(file?._pdfWorkedAt);
  const pupilName = file.studentId === "rocio" ? "Rocío" : file.studentId === "alejandra" ? "Alejandra" : "";
  const context = `${resource.title}${pupilName ? ` · ${pupilName}` : ""}`;
  const identity = `${resource.id}:${file.id}:${file.studentId || ""}`;
  const identityRef = useRef(identity), busyRef = useRef(false), mounted = useRef(false), operation = useRef(0);
  identityRef.current = identity;
  const [busy, setBusy] = useState(false), [refreshing, setRefreshing] = useState(false), [recovery, setRecovery] = useState<Recovery | null>(null);

  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  useEffect(() => {
    operation.current++;
    busyRef.current = false;
    setBusy(false); setRefreshing(false); setRecovery(null);
  }, [identity]);
  useEffect(() => {
    if (recovery && !recovery.needsRefresh && worked === recovery.desiredWorked) setRecovery(null);
  }, [worked, file?._pdfWorkRevision, recovery]);

  const save = async (desiredWorked: boolean) => {
    if (busyRef.current || recovery?.needsRefresh) return;
    busyRef.current = true; setBusy(true); setRefreshing(false); setRecovery(null);
    const job = ++operation.current, owner = identity;
    const current = () => mounted.current && operation.current === job && identityRef.current === owner;
    try {
      const result = await act("setPdfWorked", { resourceId: resource.id, fileId: file.id, worked: desiredWorked, expectedRevision: file._pdfWorkRevision || null });
      if (result?.ok === false || result?.conflict === true) throw new Error("No se ha podido confirmar el cambio.");
      // The successful patch can remove this card from a filtered list before
      // this continuation runs. The parent act already checks the session.
      notify(desiredWorked ? "Ficha marcada como hecha." : "Ficha pendiente de nuevo.");
    } catch (reason: any) {
      if (!current()) return;
      const message = reason?.message || "No se ha podido confirmar el cambio.";
      // Refresh first after an ambiguous response. A retry keeps the same
      // desired state, rather than reversing a write that already succeeded.
      setRefreshing(true);
      try {
        await onRefresh();
        if (current()) setRecovery({ desiredWorked, message, needsRefresh: false });
      } catch {
        if (current()) setRecovery({ desiredWorked, message: "No se ha podido comprobar el estado guardado. Actualízalo antes de volver a marcar la ficha.", needsRefresh: true });
      }
    } finally {
      if (current()) { busyRef.current = false; setBusy(false); setRefreshing(false); }
    }
  };

  const refreshState = async () => {
    if (busyRef.current || !recovery) return;
    const pending = recovery, job = ++operation.current, owner = identity;
    const current = () => mounted.current && operation.current === job && identityRef.current === owner;
    busyRef.current = true; setBusy(true); setRefreshing(true);
    try {
      await onRefresh();
      if (current()) setRecovery({ ...pending, message: "Estado actualizado. Puedes volver a guardar el cambio.", needsRefresh: false });
    } catch {
      if (current()) setRecovery({ ...pending, message: "No se ha podido actualizar el estado. Comprueba la conexión e inténtalo de nuevo.", needsRefresh: true });
    } finally {
      if (current()) { busyRef.current = false; setBusy(false); setRefreshing(false); }
    }
  };

  return <div className="teacher-pdf-work" aria-label={`Seguimiento de la ficha: ${context}`} aria-busy={busy}>
    <div className="teacher-pdf-work-row">
      <span className={`badge ${worked ? "green" : ""}`}>
        {worked && <Check size={14} aria-hidden="true"/>}
        {worked ? <>Hecha{date && <> · <time dateTime={file._pdfWorkedAt}>{date}</time></>}</> : "Pendiente"}
      </span>
      <button type="button" className={`btn ${worked ? "quiet" : "secondary"}`} disabled={busy || Boolean(recovery)} aria-label={`${worked ? "Deshacer marca de hecha" : "Marcar como hecha"}: ${context}`} onClick={() => void save(!worked)}>
        {busy ? <LoaderCircle size={16} className="teacher-pdf-work-spinner" aria-hidden="true"/> : worked ? <RotateCcw size={16} aria-hidden="true"/> : <Check size={16} aria-hidden="true"/>}
        {busy ? refreshing ? "Actualizando…" : "Guardando…" : worked ? "Deshacer" : "Marcar como hecha"}
      </button>
    </div>
    {recovery && <div className="teacher-pdf-work-error" role="alert">
      <AlertCircle size={18} aria-hidden="true"/><p>{recovery.message}</p>
      <button type="button" className="btn secondary" disabled={busy} onClick={() => recovery.needsRefresh ? void refreshState() : void save(recovery.desiredWorked)}>
        {recovery.needsRefresh && <RefreshCw size={15} aria-hidden="true"/>}{recovery.needsRefresh ? "Actualizar estado" : "Reintentar"}
      </button>
    </div>}
  </div>;
}
