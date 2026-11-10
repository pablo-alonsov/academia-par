'use client';

import { useState } from 'react';
import { ArrowRight, BookOpen, CalendarDays, Check, ChevronLeft, ChevronRight, Clock3, List, Plus, Save, Target, Trash2 } from 'lucide-react';
import Dialog from './Dialog';
import './calendar.css';

type Item = Record<string, any>;
type Props = { data: Item; profile: string; act: (action: string, data: Item) => Promise<any>; notify: (message: string) => void };
const madridToday = () => new Date().toLocaleDateString('sv-SE', { timeZone: 'Europe/Madrid' });
const dateOf = (date: string) => new Date(`${date.slice(0, 10)}T12:00:00`);
const iso = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
const label = (date: string, options: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'long' }) => new Intl.DateTimeFormat('es-ES', options).format(dateOf(date));
const contentText = (value: any) => Array.isArray(value) ? value.join(', ') : typeof value === 'string' ? value : '';
const sessionStates: Item = { 'por preparar': 'Por preparar', preparada: 'Preparada', 'en curso': 'En curso', realizada: 'Realizada' };

export default function CalendarView({ data, profile, act, notify }: Props) {
  const teacher = profile === 'teacher';
  const today = madridToday();
  const [month, setMonth] = useState(() => { const value = dateOf(today); return new Date(value.getFullYear(), value.getMonth(), 1, 12); });
  const [studentFilter, setStudentFilter] = useState('');
  const [view, setView] = useState<'month' | 'agenda'>('month');
  const [exam, setExam] = useState<Item | null>(null);
  const [newEntry, setNewEntry] = useState(false);
  const [editing, setEditing] = useState(false);
  const [session, setSession] = useState<Item | null>(null);
  const [preparing, setPreparing] = useState<Item | null>(null);
  const [reviewDate, setReviewDate] = useState('');
  const [reviewObjective, setReviewObjective] = useState('');
  const [reviewSessionId, setReviewSessionId] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const students: Item[] = data.students || [];
  const studentName = (id: string) => students.find(s => s.id === id)?.name || (id === 'rocio' ? 'Rocío' : 'Alejandra');
  const allowed = (item: Item) => teacher ? !studentFilter || item.studentId === studentFilter : item.studentId === profile;
  const exams: Item[] = (data.exams || []).filter(allowed).sort((a: Item, b: Item) => a.date.localeCompare(b.date));
  const sessions: Item[] = (data.sessions || []).filter(allowed);
  const monthKey = iso(month).slice(0, 7);
  const monthEvents: Item[] = [...exams.map((e): Item => ({ ...e, kind: 'exam' })), ...sessions.map((s): Item => ({ ...s, kind: 'session' }))].filter(e => e.date?.slice(0, 7) === monthKey).sort((a, b) => a.date.localeCompare(b.date));
  const upcoming = exams.filter(e => e.date >= today);
  const subjects = (data.subjects || []).map((s: Item) => s.name).filter(Boolean);
  const days: Date[] = [];
  const firstDayOffset = (month.getDay() + 6) % 7;
  const totalDays = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const cellCount = Math.ceil((firstDayOffset + totalDays) / 7) * 7;
  for (let i = 0; i < cellCount; i++) days.push(new Date(month.getFullYear(), month.getMonth(), i - firstDayOffset + 1, 12));
  const changeMonth = (delta: number) => setMonth(value => new Date(value.getFullYear(), value.getMonth() + delta, 1, 12));
  const closeExam = () => { if (busy) return; setExam(null); setError(''); setConfirmDelete(false); };
  const newExam = (date = '') => { setExam({ id: crypto.randomUUID(), studentId: teacher ? studentFilter || students[0]?.id || 'rocio' : profile, date, title: '', subject: '', topics: '' }); setNewEntry(true); setEditing(true); setError(''); setConfirmDelete(false); };
  const openExam = (value: Item) => { setExam({ ...value, topics: contentText(value.topics) }); setNewEntry(false); setEditing(false); setError(''); setConfirmDelete(false); };
  const saveExam = async (event: React.FormEvent) => {
    event.preventDefault(); if (!exam) return; setBusy(true); setError('');
    try { await act('upsertExam', { id: exam.id, studentId: teacher ? exam.studentId : profile, title: exam.title.trim(), date: exam.date, subject: exam.subject || '', topics: contentText(exam.topics).trim() }); setExam(null); notify(newEntry ? 'Examen guardado.' : 'Examen actualizado.'); }
    catch (e: any) { setError(e.message || 'No se ha podido guardar el examen.'); }
    finally { setBusy(false); }
  };
  const deleteExam = async () => {
    if (!exam?.id) return; setBusy(true); setError('');
    try { await act('deleteExam', { id: exam.id }); setExam(null); notify('Examen eliminado del calendario.'); }
    catch (e: any) { setError(e.message || 'No se ha podido eliminar el examen.'); }
    finally { setBusy(false); }
  };
  const startReview = (value: Item) => { if (!teacher) return; setPreparing(value); setReviewDate(''); setReviewSessionId(crypto.randomUUID()); setReviewObjective(`Repasar ${contentText(value.topics) || value.subject || 'los contenidos del examen'} para ${value.title}`); setExam(null); setError(''); };
  const prepareReview = async (event: React.FormEvent) => {
    event.preventDefault(); if (!teacher || !preparing) return; setBusy(true); setError('');
    try {
      await act('upsertSession', { id: reviewSessionId, studentId: preparing.studentId, date: reviewDate, subject: preparing.subject || '', objective: reviewObjective.trim(), duration: 60, status: 'por preparar', nextStep: 'Elegir una comprobación breve y actividades de repaso a partir de las dudas detectadas.', examId: preparing.id });
      setPreparing(null); notify('Sesión de repaso creada. Puedes prepararla en «Hoy y esta semana».');
    } catch (e: any) { setError(e.message || 'No se ha podido crear el repaso.'); }
    finally { setBusy(false); }
  };

  return <div className="calendar-view">
    <div className="page-heading"><div><span className="eyebrow">CLASES Y EXÁMENES</span><h1>Calendario</h1><p className="muted">{teacher ? 'Registra exámenes, consulta sus temas y programa sesiones de repaso.' : 'Añade la fecha y los temas del examen y consulta tus clases.'}</p></div><button className="btn primary" onClick={() => newExam()}><Plus size={18}/>Añadir examen</button></div>
    <div className="calendar-layout">
      <section className="card calendar-card" aria-label="Calendario de exámenes y clases">
        <div className="calendar-toolbar"><div className="row"><h2 aria-live="polite">{new Intl.DateTimeFormat('es-ES', { month: 'long', year: 'numeric' }).format(month)}</h2></div><div className="row"><button className="btn quiet cal-today" onClick={() => { const d = dateOf(today); setMonth(new Date(d.getFullYear(), d.getMonth(), 1, 12)); }}>Hoy</button><button className="icon-btn" aria-label="Mes anterior" onClick={() => changeMonth(-1)}><ChevronLeft size={19}/></button><button className="icon-btn" aria-label="Mes siguiente" onClick={() => changeMonth(1)}><ChevronRight size={19}/></button></div></div>
        <div className="cal-controls"><div className="cal-view-toggle" aria-label="Vista del calendario"><button aria-pressed={view === 'month'} className={view === 'month' ? 'selected' : ''} onClick={() => setView('month')}><CalendarDays size={15}/>Mes</button><button aria-pressed={view === 'agenda'} className={view === 'agenda' ? 'selected' : ''} onClick={() => setView('agenda')}><List size={15}/>Agenda</button></div>{teacher && <label className="cal-filter"><span className="sr-only">Filtrar por alumna</span><select value={studentFilter} onChange={event => setStudentFilter(event.target.value)}><option value="">Ambas alumnas</option>{students.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select></label>}</div>
        {view === 'month' ? <>
          <div className="calendar-week-labels">{['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map(day => <span key={day}>{day}</span>)}</div>
          <div className="calendar-grid">{days.map(day => { const dayIso = iso(day); const outside = day.getMonth() !== month.getMonth(); const dayExams = exams.filter(e => e.date?.slice(0, 10) === dayIso); const daySessions = sessions.filter(s => s.date?.slice(0, 10) === dayIso); return <div key={dayIso} className={`calendar-day ${outside ? 'outside' : ''}`}>
            <button className="calendar-day-target" aria-label={`Añadir examen el ${label(dayIso, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}`} onClick={() => newExam(dayIso)}/>
            <span className={`day-number ${dayIso === today ? 'is-today' : ''}`} aria-current={dayIso === today ? 'date' : undefined}>{day.getDate()}</span>
            {dayExams.map(e => <button key={e.id} className={`calendar-event ${e.studentId}`} title={`${studentName(e.studentId)} · ${e.title}`} aria-label={`${e.title}, ${studentName(e.studentId)}, ${label(dayIso)}`} onClick={() => openExam(e)}><span className="cal-event-dot"/>{e.title}</button>)}
            {daySessions.map(s => <button key={s.id} className="calendar-event session" title={`${studentName(s.studentId)} · ${s.objective || 'Clase'} · ${sessionStates[s.status] || s.status}`} onClick={() => setSession(s)}><BookOpen size={11}/><span>{teacher ? `${studentName(s.studentId)} · ` : ''}{s.objective || 'Clase'}</span></button>)}
          </div>; })}</div>
        </> : <div className="cal-agenda">{monthEvents.length ? monthEvents.map(event => <button className="cal-agenda-item" key={`${event.kind}-${event.id}`} onClick={() => event.kind === 'exam' ? openExam(event) : setSession(event)}><span className="exam-date"><strong>{dateOf(event.date).getDate()}</strong>{label(event.date, { month: 'short' })}</span><span><span className={`badge ${event.kind === 'exam' ? event.studentId === 'rocio' ? 'violet' : 'green' : ''}`}>{event.kind === 'exam' ? 'Examen' : 'Clase'}{teacher ? ` · ${studentName(event.studentId)}` : ''}</span><strong>{event.title || event.objective || 'Clase'}</strong><small>{event.subject || contentText(event.subjects) || (event.kind === 'exam' ? 'Asignatura por indicar' : sessionStates[event.status])}</small></span><ChevronRight size={17}/></button>) : <div className="empty-state"><CalendarDays size={28}/><h3>Sin eventos este mes</h3><p>{teacher ? 'Añade un examen o prepara una clase. Solo aparecerán las fechas que registres.' : 'Todavía no hay clases ni exámenes registrados para este mes. Puedes añadir la fecha de un examen.'}</p></div>}</div>}
        <div className="calendar-legend">{teacher ? <><span><i className="legend-dot"/>Rocío</span><span><i className="legend-dot teal"/>Alejandra</span></> : <span><i className={`legend-dot ${profile === 'alejandra' ? 'teal' : ''}`}/>Mis exámenes</span>}<span><i className="legend-dot cal-session-dot"/>Clases</span></div>
      </section>
      <aside className="calendar-side"><section className="card cal-upcoming"><div className="card-head"><h3>Próximos exámenes</h3><CalendarDays size={18}/></div>{upcoming.length ? upcoming.slice(0, 6).map(e => <article className="cal-upcoming-item" key={e.id}><button className="cal-upcoming-open" onClick={() => openExam(e)}><span className="exam-date"><strong>{dateOf(e.date).getDate()}</strong>{label(e.date, { month: 'short' })}</span><span>{teacher && <small className={e.studentId === 'rocio' ? 'cal-rocio-text' : 'cal-alejandra-text'}>{studentName(e.studentId)}</small>}<strong>{e.title}</strong><small>{e.subject || 'Asignatura por indicar'}</small></span></button>{contentText(e.topics) && <p className="cal-topics">{contentText(e.topics)}</p>}{teacher && <button className="btn quiet cal-review-btn" onClick={() => startReview(e)}>Preparar repaso<ArrowRight size={15}/></button>}</article>) : <div className="empty-state"><CalendarDays size={26}/><h3>Sin exámenes próximos</h3><p>{teacher ? 'Añade solo las fechas confirmadas. Los temas te ayudarán a enfocar las próximas clases.' : 'Añade la fecha y los temas del examen. También verás los que registre tu docente.'}</p></div>}</section><section className="card cal-tip"><span className="icon-tile"><Target size={20}/></span><h3>Preparación de exámenes</h3><p className="muted">{teacher ? 'Anota los temas concretos de cada examen y prepara una clase a partir de las dudas. El repaso se adapta a lo que cada alumna necesita.' : 'Los temas del examen nos ayudan a elegir qué repasar. Puedes guardar tus dudas desde Inicio para verlas en clase.'}</p><span className="cal-local-note"><Check size={13}/>Calendario propio de la academia</span></section></aside>
    </div>

    {exam && <Dialog title={editing ? newEntry ? 'Nuevo examen' : 'Editar examen' : exam.title} onClose={closeExam}>
      {editing ? <form onSubmit={saveExam}>
        <div className="form-grid">
          {teacher ? <label className="field">Alumna<select value={exam.studentId} onChange={e => setExam({ ...exam, studentId: e.target.value })} required>{students.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select></label> : <label className="field">Alumna<input readOnly value={studentName(profile)} aria-readonly="true"/></label>}
          <label className="field">Fecha confirmada<input type="date" value={exam.date} required onChange={e => setExam({ ...exam, date: e.target.value })}/></label>
          <label className="field span-2">Nombre del examen<input value={exam.title} onChange={e => setExam({ ...exam, title: e.target.value })} required maxLength={180} placeholder="Por ejemplo: Examen de fracciones"/></label>
          <label className="field span-2">Asignatura<select value={exam.subject || ''} onChange={e => setExam({ ...exam, subject: e.target.value })}><option value="">Por indicar</option>{subjects.map((subject: string) => <option key={subject}>{subject}</option>)}</select></label>
          <label className="field span-2">Temas que entran<textarea value={exam.topics || ''} onChange={e => setExam({ ...exam, topics: e.target.value })} rows={4} maxLength={5000} placeholder="Contenidos concretos, tipos de ejercicio o dudas para repasar"/><small>{teacher ? 'Estos temas se mostrarán a la alumna y servirán para preparar el repaso.' : 'La fecha y los temas se comparten con tu docente para preparar el repaso.'}</small></label>
        </div>
        {error && <p className="error-text" role="alert">{error}</p>}
        <div className="row wrap"><button type="submit" className="btn primary" disabled={busy}><Save size={16}/>{busy ? 'Guardando…' : 'Guardar examen'}</button><button type="button" className="btn secondary" onClick={closeExam} disabled={busy}>Cancelar</button></div>
      </form> : <div className="cal-exam-detail">
        <div className="row wrap"><span className={`badge ${exam.studentId === 'rocio' ? 'violet' : 'green'}`}>{studentName(exam.studentId)}</span><span className="muted">{label(exam.date, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</span></div>
        <p><strong>{exam.subject || 'Asignatura por indicar'}</strong></p><h3>Qué conviene preparar</h3><p className="cal-preline">{contentText(exam.topics) || 'Todavía no hay temas anotados. Los concretaremos al revisar el examen.'}</p>
        {(teacher || exam.studentId === profile) && <>
          <div className="row wrap cal-detail-actions">{teacher && <button className="btn primary" onClick={() => startReview(exam)}><Target size={16}/>Preparar repaso</button>}<button className="btn secondary" onClick={() => setEditing(true)}>Editar examen</button></div>
          {confirmDelete ? <div className="cal-delete-confirm"><p>¿Eliminar este examen del calendario? Las clases de repaso ya creadas se conservarán.</p><div className="row"><button className="btn danger" disabled={busy} onClick={deleteExam}>Sí, eliminar examen</button><button className="btn quiet" disabled={busy} onClick={() => setConfirmDelete(false)}>Cancelar</button></div></div> : <button className="btn quiet cal-delete" onClick={() => setConfirmDelete(true)}><Trash2 size={15}/>Eliminar examen</button>}
        </>}
        {error && <p className="error-text" role="alert">{error}</p>}
      </div>}
    </Dialog>}
    {teacher && preparing && <Dialog title="Preparar sesión de repaso" onClose={() => { if (!busy) { setPreparing(null); setError(''); } }}><p className="muted">{studentName(preparing.studentId)} · {preparing.title} · {label(preparing.date)}</p><form onSubmit={prepareReview}><label className="field">¿Qué día haremos el repaso?<input type="date" required value={reviewDate} onChange={e => setReviewDate(e.target.value)}/><small>Elige la fecha de la clase. No se asigna una hora.</small></label><label className="field">Objetivo de la sesión<textarea required value={reviewObjective} onChange={e => setReviewObjective(e.target.value)} rows={4} maxLength={5000}/></label><p className="cal-local-note"><Clock3 size={14}/>Duración inicial: 60 minutos. Podrás ajustarla al preparar la sesión.</p>{reviewDate && reviewDate > preparing.date && <p className="cal-date-note">La fecha elegida es posterior al examen. Puedes usarla para revisar errores o cambiarla para repasar antes.</p>}{error && <p className="error-text" role="alert">{error}</p>}<button className="btn primary" disabled={busy}><Plus size={17}/>{busy ? 'Creando…' : 'Crear sesión de repaso'}</button></form></Dialog>}
    {session && <Dialog title={session.objective || 'Clase'} onClose={() => setSession(null)}><div className="row wrap"><span className="badge">{studentName(session.studentId)}</span><span className="badge">{sessionStates[session.status] || session.status}</span></div><p className="muted cal-session-meta">{label(session.date, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })} · {session.duration || 60} minutos</p><h3>{session.subject || contentText(session.subjects) || 'Contenido por elegir'}</h3><p className="cal-preline">{session.status === 'realizada' ? session.sharedSummary || session.content || 'Consulta el diario para volver a la explicación.' : session.objective || 'Elegiremos el objetivo durante la preparación.'}</p>{session.nextStep && <><h3>Siguiente paso</h3><p className="cal-preline">{session.nextStep}</p></>}{teacher && <p className="muted">Puedes abrir y preparar esta clase desde «Hoy y esta semana».</p>}</Dialog>}
  </div>;
}
