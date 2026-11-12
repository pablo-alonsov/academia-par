"use client";
import { useEffect, useRef, useState } from "react";
import DateInput from './DateInput';
import { BookOpen, Camera, Check, ChevronDown, LoaderCircle, Palette, Pencil, Plus, Search, Trash2, X } from "lucide-react";
import ProfileAvatar, { avatarOptions } from "./ProfileAvatar";
import { studentColors } from "@/lib/profile-customization";
import { prepareProfilePhoto, AVATAR_PHOTO_ACCEPT } from "@/lib/client-profile-photo";
export { studentColors } from "@/lib/profile-customization";
import { LocalFormRecovery, useStudentLocalForms } from "./StudentLocalForms";
import "./student-tools.css";

export function StudentAvatar({ student, small = false }: any) {
  return <ProfileAvatar student={student} size={small ? "small" : "normal"} className={`st-avatar ${small ? "small" : ""}`}/>;
}

type PendingPhoto = { file: File; url: string; uploadId: string };
export function PersonalizationPanel({ student, act, notify }: any) {
  const [busy, setBusy] = useState(false), [preparing, setPreparing] = useState(false), [error, setError] = useState(""), [showAllIcons, setShowAllIcons] = useState(false), [photo, setPhoto] = useState<PendingPhoto | null>(null), [busyMessage, setBusyMessage] = useState("");
  const preview = useRef<HTMLDivElement>(null), fileInput = useRef<HTMLInputElement>(null), choosePhoto = useRef<HTMLButtonElement>(null), photoUrl = useRef(""), sequence = useRef(0), mounted = useRef(true), saving = useRef(false);
  const working = busy || preparing;
  const colorId = studentColors[student.color] ? student.color : student.id === "alejandra" ? "teal" : "violet";
  const avatarId = student.avatar === "photo" || avatarOptions.some(item => item.id === student.avatar) ? student.avatar : "initials";
  const hasSavedPhoto = Boolean(student.avatarFileId);
  const firstIcons = avatarOptions.slice(0, 8), selectedIcon = avatarOptions.find(item => item.id === avatarId);
  const visibleIcons = showAllIcons ? avatarOptions : selectedIcon && !firstIcons.some(item => item.id === avatarId) ? [...firstIcons, selectedIcon] : firstIcons;
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; sequence.current++; if (photoUrl.current) URL.revokeObjectURL(photoUrl.current); }; }, []);
  const clearPhoto = (restoreFocus = false) => {
    sequence.current++; if (photoUrl.current) URL.revokeObjectURL(photoUrl.current); photoUrl.current = "";
    setPhoto(null); setPreparing(false); if (fileInput.current) fileInput.current.value = "";
    if (restoreFocus) requestAnimationFrame(() => choosePhoto.current?.focus({ preventScroll: true }));
  };
  const runSave = async (action: string, payload: any, message: string, onSuccess?: () => void) => {
    if (saving.current || preparing) return;
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    saving.current = true; setBusy(true); setError(""); setBusyMessage(action === "uploadProfilePhoto" ? "Guardando foto…" : "Guardando preferencias…");
    try { await act(action, payload); if (mounted.current) { onSuccess?.(); notify(message); } }
    catch (reason: any) { if (mounted.current) setError(reason.message || "No se ha podido confirmar el cambio. Vuelve a intentarlo."); }
    finally { saving.current = false; if (mounted.current) { setBusy(false); setBusyMessage(""); requestAnimationFrame(() => { const target = previous?.isConnected && previous.getClientRects().length ? previous : choosePhoto.current; target?.focus({ preventScroll: true }); }); } }
  };
  const save = (patch: any, message = "Preferencias guardadas.") => runSave("updatePreferences", { studentId: student.id, ...patch }, message);
  const selectPhoto = async (file: File) => {
    const current = ++sequence.current; let preparedSuccessfully = false; setPreparing(true); setError("");
    try {
      const prepared = await prepareProfilePhoto(file);
      if (!mounted.current || sequence.current !== current) return;
      const url = URL.createObjectURL(prepared); if (photoUrl.current) URL.revokeObjectURL(photoUrl.current); photoUrl.current = url;
      setPhoto({ file: prepared, url, uploadId: crypto.randomUUID() }); preparedSuccessfully = true;
    } catch (reason: any) { if (mounted.current && sequence.current === current) setError(reason.message || "No se ha podido preparar la foto. Elige otra imagen."); }
    finally { if (mounted.current && sequence.current === current) { setPreparing(false); requestAnimationFrame(() => { if (!mounted.current || sequence.current !== current) return; const target = preparedSuccessfully ? preview.current : choosePhoto.current; target?.focus({ preventScroll: true }); if (preparedSuccessfully) target?.scrollIntoView({ block: "nearest", behavior: "auto" }); }); } }
  };
  const savePhoto = () => {
    if (!photo || working) return;
    const body = new FormData(); body.set("file", photo.file); body.set("studentId", student.id); body.set("uploadId", photo.uploadId);
    return runSave("uploadProfilePhoto", body, "Foto de perfil guardada.", () => clearPhoto());
  };
  return <details className="st-personalization"><summary><Palette size={17}/>Personalizar presentación</summary><div className="card st-personalization-content">
    <div className="row st-current-profile"><StudentAvatar student={student} small/><div><strong>{student.name}</strong><span className="muted">Presentación actual del perfil</span></div></div>
    <fieldset disabled={working}><legend>Color <span className="muted">· {studentColors[colorId].label}</span></legend><div className="st-colors">{Object.entries(studentColors).map(([id, value]) => <button type="button" key={id} aria-pressed={colorId === id} aria-label={value.label} title={value.label} style={{ background: value.color }} onClick={() => save({ color: id })}>{colorId === id && <Check size={20} aria-hidden="true"/>}<span className="sr-only">{value.label}</span></button>)}</div></fieldset>
    <fieldset disabled={working}><legend>Iniciales e iconos</legend><div className="st-avatars" id="profile-avatar-options">{visibleIcons.map(({ id, label, icon: Icon }) => <button key={id} type="button" aria-pressed={avatarId === id} onClick={() => save({ avatar: id })}><Icon size={19} aria-hidden="true"/><span>{label}</span>{avatarId === id && <Check size={15} className="st-avatar-selected" aria-hidden="true"/>}</button>)}</div>{avatarOptions.length > 8 && <button type="button" className="btn quiet st-more-icons" aria-expanded={showAllIcons} aria-controls="profile-avatar-options" onClick={() => setShowAllIcons(value => !value)}>{showAllIcons ? "Mostrar menos iconos" : `Mostrar todos los iconos (${avatarOptions.length})`}<ChevronDown size={16} aria-hidden="true"/></button>}</fieldset>
    <section className="st-photo-section" aria-labelledby="profile-photo-title"><h3 id="profile-photo-title">Foto del perfil</h3><p className="muted st-photo-help">Elige una imagen y revisa el recorte antes de guardarla. Se verá en el selector de perfiles y en tu espacio.</p><input ref={fileInput} type="file" accept={AVATAR_PHOTO_ACCEPT} hidden disabled={working} onChange={event => { const file = event.currentTarget.files?.[0]; event.currentTarget.value = ""; if (file) void selectPhoto(file); }}/><div className="st-photo-actions"><button ref={choosePhoto} type="button" className="btn secondary" disabled={working} onClick={() => fileInput.current?.click()}><Camera size={17} aria-hidden="true"/>{photo ? "Elegir otra foto" : hasSavedPhoto ? "Cambiar foto" : "Elegir foto"}</button>{hasSavedPhoto && avatarId !== "photo" && <button type="button" className="btn secondary" disabled={working} onClick={() => save({ avatar: "photo" }, "Foto de perfil activada.")}>Usar mi foto</button>}{hasSavedPhoto && <button type="button" className="btn quiet" disabled={working} onClick={() => save({ removePhoto: true }, "Foto de perfil retirada.")}><Trash2 size={16} aria-hidden="true"/>Quitar foto</button>}</div>
      {(photo || preparing) && <div ref={preview} tabIndex={-1} role="group" aria-label="Vista previa de la foto seleccionada" className="st-photo-preview">{photo && <img src={photo.url} alt={`Vista previa de la nueva foto de perfil de ${student.name || "la alumna"}`} width={112} height={112}/>}<div>{preparing ? <p role="status"><LoaderCircle size={16} className="st-photo-spinner" aria-hidden="true"/>Preparando imagen…</p> : <><strong>Vista previa</strong><p className="muted">Esta imagen se aplicará al guardar.</p></>}<div className="st-photo-actions">{photo && <button type="button" className="btn primary" disabled={working} onClick={savePhoto}><Check size={17} aria-hidden="true"/>Guardar foto</button>}<button type="button" className="btn secondary" disabled={busy} onClick={() => { setError(""); clearPhoto(true); }}><X size={16} aria-hidden="true"/>Cancelar selección</button></div></div></div>}
      <p className="muted st-photo-formats">JPG, PNG, WebP o HEIC/HEIF compatible con el dispositivo.</p>
    </section>
    {busy && <p role="status" className="st-saving"><LoaderCircle size={16} className="st-photo-spinner" aria-hidden="true"/>{busyMessage}</p>}{error && <p role="alert" className="error-text">{error}</p>}
  </div></details>;
}

const emptyWord = () => ({ id: crypto.randomUUID(), isNew: true, original: "", corrected: "", reason: "", sentence: "", reviewDate: "" });
export function WordCollection({ studentId, entries = [], act, notify }: any) {
  const localForms = useStudentLocalForms(studentId, "word");
  const [editing, setEditing] = useState<any>(null), [search, setSearch] = useState(""), [busy, setBusy] = useState(false), [error, setError] = useState(""), [deleting, setDeleting] = useState(""), [limit, setLimit] = useState(5);
  const heading = useRef<HTMLHeadingElement>(null), originalInput = useRef<HTMLInputElement>(null), addButton = useRef<HTMLButtonElement>(null);
  const today = new Date().toLocaleDateString("sv-SE", { timeZone: "Europe/Madrid" });
  const words = entries.filter((word: any) => word.studentId === studentId).sort((a: any, b: any) => (b.updatedAt || "").localeCompare(a.updatedAt || ""));
  const normalize = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("es");
  const filtered = words.filter((word: any) => normalize(`${word.original} ${word.corrected} ${word.reason}`).includes(normalize(search)));
  const edit = (word?: any) => { const next = word ? { ...word, isNew: false } : emptyWord(); setEditing({ ...next, localFormId: crypto.randomUUID() }); setError(""); requestAnimationFrame(() => originalInput.current?.focus({ preventScroll: true })); };
  const changeEditing = (patch: any) => { const next = { ...editing, ...patch }; localForms.save(next.localFormId, next); setEditing(next); };
  const restore = (copy: any) => { setEditing({ ...copy.value, localFormId: copy.id }); setError(""); requestAnimationFrame(() => originalInput.current?.focus({ preventScroll: true })); };
  const endEditing = () => { setEditing(null); setError(""); requestAnimationFrame(() => addButton.current?.focus({ preventScroll: true })); };
  const save = async (event: React.FormEvent) => { event.preventDefault(); const copy = localForms.save(editing.localFormId, editing); setBusy(true); setError(""); try { await act("upsertWord", { id: editing.id, studentId, original: editing.original, corrected: editing.corrected, reason: editing.reason, sentence: editing.sentence, reviewDate: editing.reviewDate }); localForms.remove(copy); notify("Palabra guardada."); endEditing(); } catch (reason: any) { setError(reason.message); } finally { setBusy(false); } };
  const remove = async (id: string) => { setBusy(true); setError(""); try { await act("deleteWord", { id, studentId }); setDeleting(""); notify("Entrada eliminada."); requestAnimationFrame(() => addButton.current?.focus({ preventScroll: true })); } catch (reason: any) { setError(reason.message); } finally { setBusy(false); } };
  return <section className="st-words sv-stack" aria-labelledby="word-collection-title"><div className="sv-section-heading"><div><h2 className="sw-section-title" id="word-collection-title">Palabras para revisar</h2><p className="muted">Escritura original, corrección, regla y una frase propia.</p></div><button ref={addButton} className="btn secondary" disabled={busy || Boolean(editing)} onClick={() => edit()}><Plus size={17}/>Añadir palabra</button></div>{!editing && <LocalFormRecovery copies={localForms.copies} title="Formularios de palabras pendientes" onRestore={restore} onDiscard={localForms.remove} busy={busy}/>}<span className="sr-only" role="status">{localForms.error}</span>{editing && <form className="card st-word-form" onSubmit={save}><h3 ref={heading} tabIndex={-1}>{editing.isNew ? "Añadir palabra" : "Editar palabra"}</h3><p className="muted sv-small">El formulario se conserva en este dispositivo. Se enviará al pulsar Guardar palabra.</p>{localForms.error && <p className="error-text" role="alert">{localForms.error}</p>}<fieldset disabled={busy}><div className="grid-2"><label className="field">Escritura original<input ref={originalInput} autoFocus required autoCorrect="off" autoCapitalize="none" spellCheck={false} value={editing.original} maxLength={200} onChange={e => changeEditing({ original: e.target.value })}/></label><label className="field">Escritura corregida<input required autoCorrect="off" autoCapitalize="none" spellCheck={false} value={editing.corrected} maxLength={200} onChange={e => changeEditing({ corrected: e.target.value })}/></label></div><label className="field">Motivo o regla<textarea value={editing.reason} maxLength={2000} onChange={e => changeEditing({ reason: e.target.value })}/></label><label className="field">Frase propia<textarea value={editing.sentence} maxLength={3000} onChange={e => changeEditing({ sentence: e.target.value })}/></label><label className="field">Fecha de revisión (opcional)<DateInput value={editing.reviewDate || ""} onValueChange={reviewDate => changeEditing({ reviewDate })}/></label><div className="row wrap"><button className="btn primary" type="submit"><Check size={17}/>{busy ? "Guardando…" : "Guardar palabra"}</button><button className="btn quiet" type="button" onClick={endEditing}>Cerrar y conservar</button></div></fieldset></form>}{error && <p className="error-text" role="alert">{error}</p>}{words.length > 0 && <label className="sv-search"><Search size={17}/><input aria-label="Buscar en la colección de palabras" placeholder="Buscar una palabra o regla…" value={search} onChange={e => { setSearch(e.target.value); setLimit(5); }}/></label>}{!words.length && !editing && <div className="sv-empty"><BookOpen size={25}/><h3>Sin palabras registradas</h3><p>Añade una palabra que necesites revisar y conserva la corrección razonada.</p></div>}{filtered.slice(0, limit).map((word: any) => <article className="card st-word" key={word.id}><div className="st-word-versions"><div><span className="eyebrow">ORIGINAL</span><p>{word.original}</p></div><div><span className="eyebrow">CORREGIDA</span><p>{word.corrected}</p></div></div>{word.reason && <p className="sv-preline"><strong>Motivo:</strong> {word.reason}</p>}{word.sentence && <p className="sv-preline"><strong>Frase:</strong> {word.sentence}</p>}{word.reviewDate && <p className="muted">Revisión: {new Date(`${word.reviewDate}T12:00:00`).toLocaleDateString("es-ES")}{word.reviewDate <= today && <span className="badge amber">Pendiente de repaso</span>}</p>}<div className="row wrap"><button className="btn quiet" disabled={busy || Boolean(editing)} onClick={() => edit(word)}><Pencil size={16}/>Editar</button><button className="btn quiet" disabled={busy || Boolean(editing)} onClick={() => setDeleting(word.id)}><Trash2 size={16}/>Eliminar</button></div>{deleting === word.id && <div className="st-delete-confirm"><p>¿Eliminar esta entrada de la colección?</p><div className="row wrap"><button className="btn danger" disabled={busy} onClick={() => remove(word.id)}>Eliminar entrada</button><button className="btn secondary" disabled={busy} onClick={() => setDeleting("")}>Cancelar</button></div></div>}</article>)}{words.length > 0 && !filtered.length && <div className="sv-empty"><h3>Sin coincidencias</h3><button className="btn quiet" onClick={() => setSearch("")}>Limpiar búsqueda</button></div>}{filtered.length > limit && <button className="btn secondary" onClick={() => setLimit(value => value + 5)}>Mostrar cinco palabras más</button>}</section>;
}
