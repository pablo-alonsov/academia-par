'use client';

import { useEffect, useRef, useState } from 'react';
import DateInput from './DateInput';
import { ArrowRight, BookOpen, CalendarDays, Check, ChevronLeft, ChevronRight, Clock3, List, Plus, Save, Target, Trash2 } from 'lucide-react';
import Dialog from './Dialog';
import {usePlatformNavigation} from './PlatformNavigation';
import './calendar.css';
import {ACADEMY_START_DATE,trackingToday} from '@/lib/academy-config';
import {examSubjectsForStudent,retainedExamSubject} from '@/lib/exam-subjects';

type Item = Record<string, any>;
type Props = { data: Item; profile: string; act: (action: string, data: Item) => Promise<any>; notify: (message: string) => void };
const madridToday = () => new Date().toLocaleDateString('sv-SE', { timeZone: 'Europe/Madrid' });
const dateOf = (date: string) => new Date(`${date.slice(0, 10)}T12:00:00`);
const iso = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
const label = (date: string, options: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'long' }) => new Intl.DateTimeFormat('es-ES', options).format(dateOf(date));
const contentText = (value: any) => Array.isArray(value) ? value.join(', ') : typeof value === 'string' ? value : '';

export default function CalendarView({ data, profile, act, notify }: Props) {
  const teacher = profile === 'teacher';
  const navigation=usePlatformNavigation();
  const openClass=(record:Item)=>{void navigation.navigate({tab:teacher?'Hoy y esta semana':'Mis clases',detail:{kind:teacher?'teacher-session':'student-session',id:record.id}})};
  const today = madridToday();
  const [month, setMonth] = useState(() => { const value = dateOf(trackingToday()); return new Date(value.getFullYear(), value.getMonth(), 1, 12); });
  const [studentFilter, setStudentFilter] = useState('');
  const [view, setView] = useState<'month' | 'agenda'>('month');
  const [focusDay,setFocusDay]=useState(trackingToday);
  const pendingDayFocus=useRef(false);
  useEffect(()=>{try{const saved=localStorage.getItem(`arp-calendar-view:${profile}`);setView(saved==='month'||saved==='agenda'?saved:matchMedia('(max-width:600px)').matches?'agenda':'month')}catch{}},[profile]);
  const chooseView=(value:'month'|'agenda')=>{setView(value);try{localStorage.setItem(`arp-calendar-view:${profile}`,value)}catch{}};
  const monthScrollRef=useRef<HTMLDivElement>(null);
  const [monthCanScroll,setMonthCanScroll]=useState(false);
  const [exam, setExam] = useState<Item | null>(null);
  const [newEntry, setNewEntry] = useState(false);
  const [editing, setEditing] = useState(false);
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
  const allSubjects:string[] = (data.subjects || []).map((s: Item) => s.name).filter((name:unknown):name is string=>typeof name==='string'&&Boolean(name.trim()));
  const subjects = examSubjectsForStudent(allSubjects,teacher?exam?.studentId || studentFilter || students[0]?.id || 'rocio':profile);
  const retainedSubject=retainedExamSubject(allSubjects,teacher?exam?.studentId||'rocio':profile,exam?.subject||'');
  if(retainedSubject&&!subjects.includes(retainedSubject))subjects.push(retainedSubject);
  const days: Date[] = [];
  const firstDayOffset = (month.getDay() + 6) % 7;
  const totalDays = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const cellCount = Math.ceil((firstDayOffset + totalDays) / 7) * 7;
  for (let i = 0; i < cellCount; i++) days.push(new Date(month.getFullYear(), month.getMonth(), i - firstDayOffset + 1, 12));
  const activeDay=days.some(day=>iso(day)===focusDay)?focusDay:iso(month);
  useEffect(()=>{if(!pendingDayFocus.current||view!=='month')return;pendingDayFocus.current=false;monthScrollRef.current?.querySelector<HTMLButtonElement>(`[data-calendar-date="${focusDay}"]`)?.focus()},[focusDay,month,view]);
  const moveDay=(event:React.KeyboardEvent<HTMLButtonElement>,value:string)=>{
    if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home','End','PageUp','PageDown'].includes(event.key))return;
    event.preventDefault();const target=dateOf(value),weekday=(target.getDay()+6)%7;
    if(event.key==='PageUp'||event.key==='PageDown'){const day=target.getDate();target.setDate(1);target.setMonth(target.getMonth()+(event.key==='PageUp'?-1:1));target.setDate(Math.min(day,new Date(target.getFullYear(),target.getMonth()+1,0).getDate()))}
    else target.setDate(target.getDate()+({ArrowLeft:-1,ArrowRight:1,ArrowUp:-7,ArrowDown:7,Home:-weekday,End:6-weekday}[event.key]||0));
    pendingDayFocus.current=true;setFocusDay(iso(target));if(target.getMonth()!==month.getMonth()||target.getFullYear()!==month.getFullYear())setMonth(new Date(target.getFullYear(),target.getMonth(),1,12));
  };
  const changeMonth = (delta: number) => setMonth(value => new Date(value.getFullYear(), value.getMonth() + delta, 1, 12));
  useEffect(()=>{
    const region=monthScrollRef.current;if(!region){setMonthCanScroll(false);return;}
    const measure=()=>setMonthCanScroll(region.scrollWidth>region.clientWidth+1);
    measure();const observer=new ResizeObserver(measure);observer.observe(region);
    return()=>observer.disconnect();
  },[view]);
  const closeExam = () => { if (busy) return; setExam(null); setError(''); setConfirmDelete(false); };
  const newExam = (date = '') => { setExam({ id: crypto.randomUUID(), studentId: teacher ? studentFilter || students[0]?.id || 'rocio' : profile, date, title: '', subject: '', topics: '' }); setNewEntry(true); setEditing(true); setError(''); setConfirmDelete(false); };
  const openExam = (value: Item) => { setExam({ ...value, topics: contentText(value.topics) }); setNewEntry(false); setEditing(false); setError(''); setConfirmDelete(false); };
  const changeExamStudent=(studentId:string)=>setExam(current=>current?{...current,studentId,subject:retainedExamSubject(allSubjects,studentId,current.subject || '')}:null);
  const editExam=()=>{setExam(current=>current?{...current,subject:retainedExamSubject(allSubjects,teacher?current.studentId:profile,current.subject || '')}:null);setEditing(true);};
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
      await act('upsertSession', { id: reviewSessionId, studentId: preparing.studentId, date: reviewDate, schoolwork: reviewObjective.trim(), content: '', duration: 60, status: 'por preparar', examId: preparing.id });
      setPreparing(null); notify('Clase de repaso guardada en «Hoy y esta semana».');
    } catch (e: any) { setError(e.message || 'No se ha podido crear el repaso.'); }
    finally { setBusy(false); }
  };

  return <div className="calendar-view">
    <div className="page-heading"><div><span className="eyebrow">CLASES Y EXÁMENES</span><h1>Calendario</h1><p className="muted">{teacher ? 'Registra exámenes, consulta sus temas y programa clases de repaso.' : 'Añade la fecha y los temas del examen y consulta tus clases.'}</p></div><button className="btn primary" onClick={() => newExam()}><Plus size={18}/>Añadir examen</button></div>
    <div className="calendar-layout">
      <section className="card calendar-card" aria-label="Calendario de exámenes y clases">
        <div className="calendar-toolbar"><div className="row"><h2 aria-live="polite">{new Intl.DateTimeFormat('es-ES', { month: 'long', year: 'numeric' }).format(month)}</h2></div><div className="row"><button className="btn quiet cal-today" onClick={() => { const d = dateOf(trackingToday()); setMonth(new Date(d.getFullYear(), d.getMonth(), 1, 12)); }}>{today<ACADEMY_START_DATE?'Inicio':'Hoy'}</button><button className="icon-btn" aria-label="Mes anterior" onClick={() => changeMonth(-1)}><ChevronLeft size={19}/></button><button className="icon-btn" aria-label="Mes siguiente" onClick={() => changeMonth(1)}><ChevronRight size={19}/></button></div></div>
        <div className="cal-controls"><div className="cal-view-toggle" aria-label="Vista del calendario"><button aria-pressed={view === 'month'} className={view === 'month' ? 'selected' : ''} onClick={() => chooseView('month')}><CalendarDays size={15}/>Mes</button><button aria-pressed={view === 'agenda'} className={view === 'agenda' ? 'selected' : ''} onClick={() => chooseView('agenda')}><List size={15}/>Agenda</button></div>{teacher && <label className="cal-filter"><span className="sr-only">Filtrar por alumna</span><select value={studentFilter} onChange={event => setStudentFilter(event.target.value)}><option value="">Ambas alumnas</option>{students.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select></label>}</div>
        {view === 'month' ? <>
          <div ref={monthScrollRef} className={`cal-month-scroll ${monthCanScroll?'has-overflow':''}`} role="region" aria-label="Calendario mensual, desplazamiento horizontal" tabIndex={monthCanScroll?0:undefined}>
          <div className="calendar-week-labels">{['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map(day => <span key={day}>{day}</span>)}</div>
          <p className="cal-keyboard-help" id="calendar-keyboard-help">Con teclado: flechas para moverte por los días; Intro para añadir un examen.</p><div className="calendar-grid" role="group" aria-describedby="calendar-keyboard-help" aria-label="Días del mes">{days.map(day => { const dayIso = iso(day); const outside = day.getMonth() !== month.getMonth(); const dayExams = exams.filter(e => e.date?.slice(0, 10) === dayIso); const daySessions = sessions.filter(s => s.date?.slice(0, 10) === dayIso); return <div key={dayIso} className={`calendar-day ${outside ? 'outside' : ''} ${dayIso<ACADEMY_START_DATE?'before-start':''}`}>
            <button className="calendar-day-target" data-calendar-date={dayIso} tabIndex={dayIso===activeDay?0:-1} onFocus={()=>setFocusDay(dayIso)} onKeyDown={event=>moveDay(event,dayIso)} aria-label={`Añadir examen el ${label(dayIso, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}`} onClick={() => newExam(dayIso)}/>
            <span className={`day-number ${dayIso === today ? 'is-today' : ''}`} aria-current={dayIso === today ? 'date' : undefined}>{day.getDate()}</span>{dayIso===ACADEMY_START_DATE&&<span className="calendar-start-label">Inicio</span>}
            {dayExams.map(e => <button key={e.id} className={`calendar-event ${e.studentId}`} title={`${studentName(e.studentId)} · ${e.title}`} aria-label={`${e.title}, ${studentName(e.studentId)}, ${label(dayIso)}`} onClick={() => openExam(e)}><span className="cal-event-dot"/><span className="cal-event-title">{e.title}</span></button>)}
            {daySessions.map(s => <button key={s.id} className="calendar-event session" title={`Clase de ${studentName(s.studentId)} · ${label(s.date)}`} onClick={() => openClass(s)}><BookOpen size={11}/><span>{teacher ? `${studentName(s.studentId)} · ` : ''}Clase</span></button>)}
          </div>; })}</div>
          </div><p className="cal-month-help">Desliza el calendario o utiliza Agenda.</p>
        </> : <div className="cal-agenda">{monthEvents.length ? monthEvents.map(event => <button className="cal-agenda-item" key={`${event.kind}-${event.id}`} onClick={() => event.kind === 'exam' ? openExam(event) : openClass(event)}><span className="exam-date"><strong>{dateOf(event.date).getDate()}</strong>{label(event.date, { month: 'short' })}</span><span><span className={`badge ${event.kind === 'exam' ? event.studentId === 'rocio' ? 'violet' : 'green' : ''}`}>{event.kind === 'exam' ? 'Examen' : 'Clase'}{teacher ? ` · ${studentName(event.studentId)}` : ''}</span><strong>{event.kind==='exam'?event.title:'Clase'}</strong><small>{event.kind==='exam'?(event.subject||'Asignatura por indicar'):(contentText(event.content)||event.sharedSummary||'Abrir clase').slice(0,180)}</small></span><ChevronRight size={17}/></button>) : <div className="empty-state"><CalendarDays size={28}/><h3>Sin eventos este mes</h3><p>{teacher ? 'Añade un examen o registra una clase. Solo aparecerán las fechas que registres.' : 'Todavía no hay clases ni exámenes registrados para este mes. Puedes añadir la fecha de un examen.'}</p></div>}</div>}
        <div className="calendar-legend">{teacher ? <><span><i className="legend-dot"/>Rocío</span><span><i className="legend-dot teal"/>Alejandra</span></> : <span><i className={`legend-dot ${profile === 'alejandra' ? 'teal' : ''}`}/>Mis exámenes</span>}<span><i className="legend-dot cal-session-dot"/>Clases</span></div>
      </section>
      <aside className="calendar-side"><section className="card cal-upcoming"><div className="card-head"><h3>Próximos exámenes</h3><CalendarDays size={18}/></div>{upcoming.length ? upcoming.slice(0, 6).map(e => <article className="cal-upcoming-item" key={e.id}><button className="cal-upcoming-open" onClick={() => openExam(e)}><span className="exam-date"><strong>{dateOf(e.date).getDate()}</strong>{label(e.date, { month: 'short' })}</span><span>{teacher && <small className={e.studentId === 'rocio' ? 'cal-rocio-text' : 'cal-alejandra-text'}>{studentName(e.studentId)}</small>}<strong>{e.title}</strong><small>{e.subject || 'Asignatura por indicar'}</small></span></button>{contentText(e.topics) && <p className="cal-topics">{contentText(e.topics)}</p>}{teacher && <button className="btn quiet cal-review-btn" onClick={() => startReview(e)}>Preparar repaso<ArrowRight size={15}/></button>}</article>) : <div className="empty-state"><CalendarDays size={26}/><h3>Sin exámenes próximos</h3><p>{teacher ? 'Añade solo las fechas confirmadas. Los temas te ayudarán a enfocar las próximas clases.' : 'Añade la fecha y los temas del examen. También verás los que registre tu docente.'}</p></div>}</section><section className="card cal-tip"><span className="icon-tile"><Target size={20}/></span><h3>Preparación de exámenes</h3><p className="muted">{teacher ? 'Anota los temas concretos de cada examen y prepara una clase a partir de las dudas. El repaso se adapta a lo que cada alumna necesita.' : 'Los temas del examen nos ayudan a elegir qué repasar juntos en clase.'}</p><span className="cal-local-note"><Check size={13}/>Calendario propio de la academia</span></section></aside>
    </div>

    {exam && <Dialog title={editing ? newEntry ? 'Nuevo examen' : 'Editar examen' : exam.title} onClose={closeExam} className="cal-exam-dialog">
      {editing ? <form onSubmit={saveExam} className="cal-exam-form">
        <div className="form-grid cal-form-grid">
          {teacher ? <label className="field">Alumna<select value={exam.studentId} onChange={e => changeExamStudent(e.target.value)} required>{students.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select></label> : <label className="field">Alumna<input readOnly value={studentName(profile)} aria-readonly="true"/></label>}
          <label className="field">Fecha confirmada<DateInput name="exam-date" value={exam.date} required onValueChange={date => setExam({ ...exam, date })}/></label>
          <label className="field span-2">Nombre del examen<input value={exam.title} onChange={e => setExam({ ...exam, title: e.target.value })} required maxLength={180} placeholder="Por ejemplo: Examen de fracciones"/></label>
          <label className="field span-2">Asignatura<select value={exam.subject || ''} onChange={e => setExam({ ...exam, subject: e.target.value })}><option value="">Por indicar</option>{subjects.map((subject: string) => <option key={subject}>{subject}</option>)}</select></label>
          <label className="field span-2">Temas que entran<textarea value={exam.topics || ''} onChange={e => setExam({ ...exam, topics: e.target.value })} rows={4} maxLength={5000} placeholder="Contenidos concretos, tipos de ejercicio o dudas para repasar"/><small>{teacher ? 'Estos temas se mostrarán a la alumna y servirán para preparar el repaso.' : 'La fecha y los temas se comparten con tu docente para preparar el repaso.'}</small></label>
        </div>
        {error && <p className="error-text" role="alert">{error}</p>}
        <div className="row wrap cal-form-actions"><button type="submit" className="btn primary" disabled={busy}><Save size={16}/>{busy ? 'Guardando…' : 'Guardar examen'}</button><button type="button" className="btn secondary" onClick={closeExam} disabled={busy}>Cancelar</button></div>
      </form> : <div className="cal-exam-detail">
        <div className="row wrap"><span className={`badge ${exam.studentId === 'rocio' ? 'violet' : 'green'}`}>{studentName(exam.studentId)}</span><span className="muted">{label(exam.date, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</span></div>
        <p><strong>{exam.subject || 'Asignatura por indicar'}</strong></p><h3>Qué conviene preparar</h3><p className="cal-preline">{contentText(exam.topics) || 'Todavía no hay temas anotados. Los concretaremos al revisar el examen.'}</p>
        {(teacher || exam.studentId === profile) && <>
          <div className="row wrap cal-detail-actions">{teacher && <button className="btn primary" onClick={() => startReview(exam)}><Target size={16}/>Preparar repaso</button>}<button className="btn secondary" onClick={editExam}>Editar examen</button></div>
          {confirmDelete ? <div className="cal-delete-confirm"><p>¿Eliminar este examen del calendario? Las clases de repaso ya creadas se conservarán.</p><div className="row"><button className="btn danger" disabled={busy} onClick={deleteExam}>Sí, eliminar examen</button><button className="btn quiet" disabled={busy} onClick={() => setConfirmDelete(false)}>Cancelar</button></div></div> : <button className="btn quiet cal-delete" onClick={() => setConfirmDelete(true)}><Trash2 size={15}/>Eliminar examen</button>}
        </>}
        {error && <p className="error-text" role="alert">{error}</p>}
      </div>}
    </Dialog>}
    {teacher && preparing && <Dialog title="Programar clase de repaso" className="cal-review-dialog" onClose={() => { if (!busy) { setPreparing(null); setError(''); } }}><p className="muted">{studentName(preparing.studentId)} · {preparing.title} · {label(preparing.date)}</p><form onSubmit={prepareReview} className="cal-review-form"><label className="field">¿Qué día haremos el repaso?<DateInput required min={ACADEMY_START_DATE} value={reviewDate} onValueChange={setReviewDate}/><small>Elige la fecha de la clase. No se asigna una hora.</small></label><p className="cal-local-note"><Clock3 size={14}/>60 minutos.</p>{reviewDate && reviewDate > preparing.date && <p className="cal-date-note">La fecha elegida es posterior al examen. Puedes usarla para revisar errores o cambiarla para repasar antes.</p>}{error && <p className="error-text" role="alert">{error}</p>}<div className="row wrap cal-form-actions"><button type="submit" className="btn primary" disabled={busy}><Plus size={17}/>{busy ? 'Creando…' : 'Guardar clase de repaso'}</button><button type="button" className="btn secondary" disabled={busy} onClick={()=>{setPreparing(null);setError('');}}>Cancelar</button></div></form></Dialog>}
  </div>;
}
