'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowRight, ArrowUp, CalendarDays, Check, ChevronLeft, ChevronRight, Compass, Home, LayoutDashboard, Library, LogOut, Menu, Moon, PanelLeftClose, PanelLeftOpen, ShieldCheck, Sparkles, Sun, Users, X, Bell, NotebookPen, FolderOpen, LockKeyhole, BookOpen, Star, Orbit, Flower2, Rocket } from 'lucide-react';
import StudentViews from './StudentViews';
import TeacherViews from './TeacherViews';
import CalendarView from './CalendarView';
import Dialog from './Dialog';
import ProfileMenu from './ProfileMenu';
import MenuGuide from './MenuGuide';
import {authorizedFetch, invalidateSessionRequests, requestError, setSessionExpiryHandler, setSessionAccessCheck, setRequestProfile} from '@/lib/client-request';
import {applyDataPatch} from '@/lib/data-patch';
import {lockPageScroll} from '@/lib/page-scroll';
import {freshSnapshot} from '@/lib/fresh-snapshot';
import ProfileAvatar from './ProfileAvatar';
import {createSessionExpiry,sessionAccessFrom,type SessionAccess} from '@/lib/session-expiry';
import {PlatformHistory,type PlatformRoute} from '@/lib/platform-history';
import {PlatformNavigationContext} from './PlatformNavigation';
import './navigation-history.css';
import {getResultVersion,setResultVersion,storedResultVersion} from '@/lib/client-result-state';

const STUDENT_NAV=[{name:'Inicio',icon:Home},{name:'Mi camino',icon:Compass},{name:'Practicar',icon:Sparkles},{name:'Mis clases',icon:NotebookPen},{name:'Calendario',icon:CalendarDays}];
const TEACHER_NAV=[{name:'Hoy y esta semana',icon:LayoutDashboard},{name:'Alumnas',icon:Users},{name:'Banco de actividades',icon:FolderOpen},{name:'Biblioteca',icon:Library},{name:'Calendario',icon:CalendarDays}];
export const formatDate=(v:string,opts:any={day:'numeric',month:'short'})=>v?new Intl.DateTimeFormat('es-ES',opts).format(new Date(v.slice(0,10)+'T12:00:00')):'Sin fecha';
export function Avatar({id,size='',color,avatar,avatarUrl}:{id:string,size?:string;color?:string;avatar?:string;avatarUrl?:string}){return <ProfileAvatar student={{id,color,avatar,avatarUrl}} size={size==='large'?'large':'small'} className={`avatar avatar-${id} ${size}`}/>}
export default function Academy(){
 const [profile,setProfile]=useState<string|null>(null),[ready,setReady]=useState(false),[data,setData]=useState<any>(null),[tab,setTab]=useState('Inicio'),[login,setLogin]=useState(false),[pin,setPin]=useState(''),[error,setError]=useState(''),[busy,setBusy]=useState(false),[theme,setTheme]=useState('light'),[mobile,setMobile]=useState(false),[collapsed,setCollapsed]=useState(false),[notice,setNotice]=useState(''),[drawer,setDrawer]=useState(false);
 const [profileChoices,setProfileChoices]=useState<any[]>([{id:'alejandra',name:'Alejandra',level:'2.º de ESO'},{id:'rocio',name:'Rocío',level:'6.º de Primaria'}]);
 const [personalizationProfile,setPersonalizationProfile]=useState<string|null>(null);
 const [route,setRoute]=useState<PlatformRoute>({tab:'Inicio'}),[historyStatus,setHistoryStatus]=useState({canBack:false,canForward:false,busy:false,exitRequested:false});
 const platformHistory=useRef<PlatformHistory|null>(null),resetHistory=useRef(false);
 const personalizationIntent=useRef(0);
 const personalizationOpened=useCallback(()=>setPersonalizationProfile(null),[]);
 useEffect(()=>{personalizationIntent.current++;setPersonalizationProfile(null)},[profile]);
 const loadProfiles=()=>fetch('/api/profiles').then(r=>r.ok?r.json():null).then((rows:any)=>{if(Array.isArray(rows)&&rows.length===2)setProfileChoices(rows)}).catch(()=>{});
 useEffect(()=>{loadProfiles()},[]);
 const resumeHandler=useRef<()=>Promise<void>>(async()=>{}),resumeRunning=useRef<Promise<void>|null>(null);
 const [guide,setGuide]=useState(false),[narrow,setNarrow]=useState(false),[showBackToTop,setShowBackToTop]=useState(false);
 const authEpoch=useRef(0),mutationEpoch=useRef(0),menuButton=useRef<HTMLButtonElement>(null),navigation=useRef<HTMLElement>(null),topbar=useRef<HTMLElement>(null),mainContent=useRef<HTMLElement>(null),lastTab=useRef(tab),selectorHeading=useRef<HTMLHeadingElement>(null);
 const profileRef=useRef<string|null>(profile);profileRef.current=profile;
 const expiryHandler=useRef<()=>void>(()=>{}),expiry=useRef<ReturnType<typeof createSessionExpiry>|null>(null),cookieMutation=useRef<symbol|null>(null);
 if(!expiry.current)expiry.current=createSessionExpiry(()=>expiryHandler.current());
 const toSelector=(message='')=>{
   // Every editor already writes a local copy synchronously on each edit.
   // Invalidate before unmount so cleanup cannot start another private request.
   if(!profileRef.current&&!expiry.current?.check())return;
   platformHistory.current?.destroy();platformHistory.current=null;setHistoryStatus({canBack:false,canForward:false,busy:false,exitRequested:false});
   expiry.current?.clear();invalidateSessionRequests();authEpoch.current++;resumeRunning.current=null;personalizationIntent.current++;
   profileRef.current=null;setRequestProfile(null);setProfile(null);setData(null);setLogin(false);setPin('');setMobile(false);setDrawer(false);setGuide(false);setPersonalizationProfile(null);setNotice('');setBusy(Boolean(cookieMutation.current));setError(message);loadProfiles();
   const epoch=authEpoch.current;requestAnimationFrame(()=>{if(!profileRef.current&&epoch===authEpoch.current){window.scrollTo({top:0,behavior:'auto'});selectorHeading.current?.focus({preventScroll:true});}});
 };
 expiryHandler.current=()=>toSelector('El acceso ha caducado. Selecciona tu perfil para continuar.');
 const sessionCurrent=(p:string|null,epoch:number)=>Boolean(p&&profileRef.current===p&&authEpoch.current===epoch&&expiry.current?.check());
 const assertSession=(p:string|null,epoch:number)=>{if(!p||profileRef.current!==p||authEpoch.current!==epoch)throw requestError('El perfil ha cambiado. Vuelve a seleccionar tu perfil.',409);if(!expiry.current?.check())throw requestError('El acceso ha caducado. Vuelve a seleccionar tu perfil.',401);};
 const installAccess=(access:SessionAccess)=>{
   if(!access.profile||access.expiresAt===null)return false;
   profileRef.current=access.profile;setRequestProfile(access.profile);
   if(!expiry.current?.update(access.expiresAt,access.serverNow))return false;
   setProfile(access.profile);return true;
 };
 useEffect(()=>{setSessionExpiryHandler(()=>expiryHandler.current());setSessionAccessCheck(()=>Boolean(profileRef.current&&expiry.current?.check()));return()=>{setSessionExpiryHandler();setSessionAccessCheck();expiry.current?.clear();invalidateSessionRequests();setRequestProfile(null);};},[]);
 // Resume is announced only after the same live profile's authoritative read.
 const announceResume=(snapshot:any,p:string,epoch=authEpoch.current)=>{if(document.visibilityState==='visible'&&sessionCurrent(p,epoch))window.dispatchEvent(new CustomEvent('arp:resume-ready',{detail:{profile:p,snapshot}}));};
 useEffect(()=>{const query=matchMedia('(max-width:900px), (max-width:1200px) and (max-height:600px)');const update=()=>{setNarrow(query.matches);if(!query.matches)setMobile(false)};update();query.addEventListener('change',update);return()=>query.removeEventListener('change',update)},[]);
 useEffect(()=>{setGuide(false);if(!profile||!data)return;const key=`arp-menu-guide-v1:${profile}`;try{if(localStorage.getItem(key))return;localStorage.setItem(key,'seen')}catch{}setGuide(true)},[profile,Boolean(data)]);
 useEffect(()=>{if(!profile){setShowBackToTop(false);return;}const update=()=>setShowBackToTop(window.scrollY>320);update();window.addEventListener('scroll',update,{passive:true});return()=>window.removeEventListener('scroll',update)},[profile]);
 useEffect(()=>{const header=topbar.current;if(!profile||!header)return;const update=()=>document.documentElement.style.setProperty('--arp-header-height',(narrow||matchMedia('(pointer:coarse)').matches)?`${Math.ceil(header.getBoundingClientRect().height)}px`:'0px');update();const observer=new ResizeObserver(update);observer.observe(header);return()=>{observer.disconnect();document.documentElement.style.removeProperty('--arp-header-height')}},[profile,narrow]);
 const backToTop=()=>{mainContent.current?.focus({preventScroll:true});window.scrollTo({top:0,behavior:'auto'})};
 const openNavigation=()=>{setGuide(false);setCollapsed(false);setMobile(narrow);if(!narrow)setTimeout(()=>navigation.current?.querySelector<HTMLButtonElement>('nav button')?.focus({preventScroll:true}),0)};

 useEffect(()=>{if(!mobile||!narrow)return;const unlock=lockPageScroll();navigation.current?.querySelector<HTMLButtonElement>('nav button')?.focus({preventScroll:true});const controls=()=>Array.from(navigation.current?.querySelectorAll<HTMLElement>('a[href],button:not(:disabled)')||[]).filter(el=>el.offsetParent!==null);const key=(event:KeyboardEvent)=>{if(event.key==='Escape'){event.preventDefault();setMobile(false)}if(event.key==='Tab'){const items=controls(),first=items[0],last=items[items.length-1];if(event.shiftKey&&document.activeElement===first){event.preventDefault();last?.focus({preventScroll:true})}else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first?.focus({preventScroll:true})}}};document.addEventListener('keydown',key);return()=>{document.removeEventListener('keydown',key);unlock();menuButton.current?.focus({preventScroll:true})}},[mobile,narrow]);
 useEffect(()=>{if(lastTab.current===tab)return;lastTab.current=tab;window.scrollTo({top:0,behavior:'auto'});mainContent.current?.focus({preventScroll:true})},[tab]);
 const flushBeforeNav=async()=>{const jobs:Promise<any>[]=[];window.dispatchEvent(new CustomEvent('arp:before-navigation',{detail:{jobs}}));await Promise.all(jobs)};
 useEffect(()=>{
   if(!profile)return;
   const selected=profile,epoch=authEpoch.current;
   const controller=new PlatformHistory({beforeNavigate:async()=>{assertSession(selected,epoch);await flushBeforeNav();assertSession(selected,epoch)},onRoute:next=>{
     if(!sessionCurrent(selected,epoch))return;
     setRoute(next);setTab(next.tab);setMobile(false);setDrawer(false);setGuide(false);personalizationIntent.current++;setPersonalizationProfile(null);
   },onChange:next=>{if(profileRef.current===selected&&authEpoch.current===epoch)setHistoryStatus(next)},onError:message=>{if(sessionCurrent(selected,epoch))notify(message)},onLeave:()=>window.location.assign('about:blank')});
   platformHistory.current=controller;
   const initial=controller.init(selected,selected==='teacher'?'Hoy y esta semana':'Inicio',{reset:resetHistory.current});resetHistory.current=false;
   setRoute(initial);setTab(initial.tab);
   const beforeUnload=(event:BeforeUnloadEvent)=>{if(controller.leaving){event.stopImmediatePropagation();return;}if(sessionCurrent(selected,epoch)){event.preventDefault();event.returnValue=''}};
   window.addEventListener('beforeunload',beforeUnload,{capture:true});
   return()=>{window.removeEventListener('beforeunload',beforeUnload,{capture:true});controller.destroy();if(platformHistory.current===controller)platformHistory.current=null};
 },[profile]);
 const navigate=async(next:PlatformRoute)=>await platformHistory.current?.navigate(next)||false;
 const switchTab=async(name:string)=>{if(await navigate({tab:name})){setMobile(false);setGuide(false)}};
 const openPersonalization=async()=>{const selected=profileRef.current;if(!selected||selected==='teacher')return;if(await navigate({tab:'Inicio'})){setPersonalizationProfile(selected);setMobile(false);setGuide(false)}};
 const notify=(m:string)=>{setNotice(m);setTimeout(()=>setNotice(''),4500)};
 const refresh=async(resumed=false)=>{
   const epoch=authEpoch.current,p=profileRef.current;assertSession(p,epoch);
   return freshSnapshot(async()=>{const r=await authorizedFetch('/api/data');const value:any=await r.json();assertSession(p,epoch);if(!r.ok)throw requestError(value.error||'No se han podido cargar los datos',r.status);return value;},()=>mutationEpoch.current,()=>sessionCurrent(p,epoch),value=>{
     if(!sessionCurrent(p,epoch))return;
     const resultVersion=value.students?.find((s:any)=>p==='teacher'||s.id===p)?.resultVersion || 'initial';
     const firstReset=resultVersion!=='initial'&&storedResultVersion()!==resultVersion;
     if(getResultVersion()!==resultVersion)invalidateSessionRequests();
     // Install the generation before React unmounts old editors, whose cleanup
     // must not persist or submit work captured before this reset.
     setResultVersion(resultVersion);
     if(firstReset){resetHistory.current=true;if(platformHistory.current){platformHistory.current.init(p!,p==='teacher'?'Hoy y esta semana':'Inicio',{reset:true});resetHistory.current=false;}}
     setData(value);setError('');if(resumed&&p)announceResume(value,p,epoch);
   });
 };
 useEffect(()=>{
   if(!profile){setRequestProfile(null);resumeHandler.current=async()=>{};return;}
   setRequestProfile(profile);let disposed=false;
   const changed=()=>{if(!disposed)toSelector('El perfil ha cambiado en otra pestaña. Elige tu perfil para continuar.');};
   const resultsReset=()=>{if(!disposed)toSelector('Se han reiniciado los resultados de prueba. Selecciona tu perfil para continuar.');};
   const resume=()=>{
     if(document.visibilityState!=='visible'||disposed||!sessionCurrent(profile,authEpoch.current))return Promise.resolve();
     if(resumeRunning.current)return resumeRunning.current;
     const epoch=authEpoch.current;
     const task=(async()=>{try{
       const auth=await fetch('/api/auth',{cache:'no-store'});const raw:any=await auth.json();
       if(disposed||!sessionCurrent(profile,epoch))return;
       if(auth.status===401){expiryHandler.current();return;}
       if(!auth.ok)throw Error(raw.error||'No se ha podido comprobar el acceso.');
       let access:SessionAccess;try{access=sessionAccessFrom(raw);}catch(e:any){toSelector(e.message);return;}
       if(!access.profile){expiryHandler.current();return;}
       if(access.profile!==profile){changed();return;}
       if(!installAccess(access)||!sessionCurrent(profile,epoch))return;
       await refresh(true);
     }catch(e:any){if(!disposed&&sessionCurrent(profile,epoch))setError(e.message||'No se ha podido recuperar la conexión. Tus respuestas se conservan en este dispositivo.');}})();
     resumeRunning.current=task;task.finally(()=>{if(resumeRunning.current===task)resumeRunning.current=null;});return task;
   };
   resumeHandler.current=resume;
   const visible=()=>{if(document.visibilityState==='visible')void resume();},restored=()=>{void resume();};
   document.addEventListener('visibilitychange',visible);window.addEventListener('focus',visible);window.addEventListener('pageshow',restored);window.addEventListener('online',visible);window.addEventListener('arp:profile-changed',changed);window.addEventListener('arp:results-reset',resultsReset);
   return()=>{disposed=true;resumeRunning.current=null;document.removeEventListener('visibilitychange',visible);window.removeEventListener('focus',visible);window.removeEventListener('pageshow',restored);window.removeEventListener('online',visible);window.removeEventListener('arp:profile-changed',changed);window.removeEventListener('arp:results-reset',resultsReset);};
 },[profile]);
 useEffect(()=>{
   let disposed=false;const epoch=authEpoch.current;
   let storedTheme:string|null=null;try{storedTheme=localStorage.getItem('arp-theme')}catch{}
   const t=(storedTheme==='dark'||storedTheme==='light')?storedTheme:(matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light');setTheme(t);document.documentElement.dataset.theme=t;
   void(async()=>{try{
     const response=await fetch('/api/auth',{cache:'no-store'});const raw:any=await response.json();
     if(disposed||epoch!==authEpoch.current)return;
     if(response.status===401){setError('Selecciona tu perfil para continuar.');return;}
     if(!response.ok)throw Error(raw.error||'No se ha podido comprobar el acceso.');
     const access=sessionAccessFrom(raw);if(!access.profile)return;
     if(!installAccess(access)||disposed||epoch!==authEpoch.current)return;
     await refresh();
   }catch(e:any){if(!disposed&&epoch===authEpoch.current)setError(e.message||'No se ha podido conectar. Vuelve a intentarlo.');}finally{if(!disposed)setReady(true);}})();
   return()=>{disposed=true;};
 },[]);
 const toggleTheme=()=>{const t=theme==='light'?'dark':'light';setTheme(t);document.documentElement.dataset.theme=t;try{localStorage.setItem('arp-theme',t)}catch{}};
 const enter=async(p:string)=>{
   if(cookieMutation.current)return;
   const mutation=Symbol('login');cookieMutation.current=mutation;invalidateSessionRequests();authEpoch.current++;const epoch=authEpoch.current;
   expiry.current?.clear();profileRef.current=null;setRequestProfile(null);setBusy(true);setError('');
   try{
     const r=await fetch('/api/auth',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({profile:p,...(p==='teacher'?{pin}:{})})});const raw:any=await r.json();if(cookieMutation.current===mutation)cookieMutation.current=null;
     if(epoch!==authEpoch.current)return;
     if(!r.ok)throw requestError(raw.error||'No se ha podido entrar',r.status);
     const access=sessionAccessFrom(raw);if(access.profile!==p)throw Error('El servidor no ha confirmado el perfil seleccionado.');
     resetHistory.current=true;
     setData(null);if(!installAccess(access))return;
     setLogin(false);setPin('');await refresh();
   }catch(e:any){if(epoch===authEpoch.current)setError(e.message||'No se ha podido entrar.');}
   finally{if(cookieMutation.current===mutation)cookieMutation.current=null;if(!cookieMutation.current&&(epoch===authEpoch.current||!profileRef.current))setBusy(false);}
 };
 const act=async(action:string,payload:any)=>{
   const epoch=authEpoch.current,p=profileRef.current;assertSession(p,epoch);
   const r=await authorizedFetch(action==='uploadProfilePhoto'?'/api/profile-photo':'/api/action',action==='uploadProfilePhoto'?{method:'POST',body:payload}:{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action,data:payload})});const d:any=await r.json();assertSession(p,epoch);
   if(!r.ok)throw requestError(d.error||'No se ha podido guardar',r.status);
   mutationEpoch.current++;
   if(d.patch||d.removed)setData((current:any)=>p===profileRef.current&&epoch===authEpoch.current&&expiry.current!.remaining()>0?applyDataPatch(current,d.patch,d.removed):current);
   else {try{await refresh();}catch{if(sessionCurrent(p,epoch))notify('Guardado. La vista no se ha actualizado; recarga cuando recuperes la conexión.');}}
   assertSession(p,epoch);return d;
 };
 const logout=async()=>{
   if(cookieMutation.current)return;const p=profileRef.current,epoch=authEpoch.current,mutation=Symbol('logout');
   try{assertSession(p,epoch);await flushBeforeNav();assertSession(p,epoch);cookieMutation.current=mutation;setBusy(true);invalidateSessionRequests();const r=await fetch('/api/auth',{method:'DELETE'});if(epoch!==authEpoch.current)return;if(!r.ok)throw Error('No se ha podido salir. Vuelve a intentarlo.');if(cookieMutation.current===mutation)cookieMutation.current=null;toSelector();}
   catch(e:any){if(sessionCurrent(p,epoch))notify(e.message);}
   finally{if(cookieMutation.current===mutation)cookieMutation.current=null;if(!cookieMutation.current&&(epoch===authEpoch.current||!profileRef.current))setBusy(false);}
 };
 const nav=profile==='teacher'?TEACHER_NAV:STUDENT_NAV,pupil=data?.students?.find((s:any)=>s.id===profile),pending=(data?.responses||[]).filter((r:any)=>r.reviewStatus==='pending').length,questions=(data?.doubts||[]).filter((d:any)=>!d.resolved&&!d.resolvedAt&&d.status!=='resolved').length;
 if(!ready)return <main className="loading-screen"><div className="brand-mark">a<span>·</span></div><p>Preparando tu espacio…</p><div className="loading-line"/></main>;
 if(!profile)return <main className="profiles-screen"><header className="profiles-header"><a className="brand" href="/"><span className="brand-mark">a<span>·</span></span><span>academia <strong>PAR</strong></span></a><button className="icon-btn" onClick={toggleTheme} aria-label={theme==='light'?'Activar modo oscuro':'Activar modo claro'}>{theme==='light'?<Moon size={20}/>:<Sun size={20}/>}</button></header><div className="profile-orbit orbit-one"/><div className="profile-orbit orbit-two"/><section className="profile-main"><span className="eyebrow"><span className="tiny-dot"/> CLASES PARTICULARES</span><h1 ref={selectorHeading} tabIndex={-1}>academia PAR</h1><p className="profile-subtitle">Selecciona tu perfil para acceder.</p><div className="profile-choices">{profileChoices.map(s=><button key={s.id} className={`profile-card profile-${s.id}`} disabled={busy} onClick={()=>enter(s.id)}><Avatar id={s.id} size="large" color={s.color} avatar={s.avatar} avatarUrl={s.avatarUrl}/><h2>{s.name}</h2><span className="profile-level">{s.level}</span><span className="profile-enter">Entrar <ArrowRight size={17}/></span></button>)}</div><button className="teacher-entry" onClick={()=>{setLogin(true);setError('')}}><LockKeyhole size={16}/> Mi panel docente <ChevronRight size={16}/></button>{error&&!login&&<p role="alert" className="error-text">{error}</p>}</section>{login&&<Dialog title="Tu panel docente" onClose={()=>setLogin(false)} className="login-modal"><div className="icon-tile"><ShieldCheck/></div><span className="eyebrow">ACCESO DOCENTE</span><p className="muted">Gestión de clases, materiales y seguimiento.</p><form onSubmit={e=>{e.preventDefault();enter('teacher')}}><label className="field">Contraseña<input autoFocus type="password" inputMode="numeric" autoComplete="current-password" required value={pin} onChange={e=>setPin(e.target.value)}/></label>{error&&<p className="error-text" role="alert">{error}</p>}<button className="btn primary full" disabled={busy}>{busy?'Entrando…':'Entrar en mi panel'}<ArrowRight size={17}/></button></form></Dialog>}</main>;
 return <PlatformNavigationContext.Provider value={{route,navigate,back:()=>platformHistory.current?.back(),canBack:historyStatus.canBack,canForward:historyStatus.canForward,busy:historyStatus.busy}}><div className={`app-shell ${collapsed?'is-collapsed':''} ${narrow?'is-drawer-layout':''}`}><a className="skip-link" href="#main" onClick={e=>{e.preventDefault();backToTop()}}>Ir al contenido</a><aside ref={navigation} id="academy-navigation" className={`sidebar ${mobile?'is-open':''}`} inert={narrow&&!mobile} aria-hidden={narrow&&!mobile?true:undefined}><a className="brand" aria-label="academia PAR · Inicio" href="/" onClick={e=>{e.preventDefault();switchTab(nav[0].name)}}><span className="brand-mark">a<span>·</span></span><span>academia <strong>PAR</strong></span></a><div className="workspace-label">{profile==='teacher'?'ESPACIO DOCENTE':'MI ESPACIO'}</div><nav aria-label="Menú principal">{nav.map(n=><button className={`nav-item ${tab===n.name?'active':''}`} key={n.name} aria-current={tab===n.name?'page':undefined} onClick={()=>switchTab(n.name)} title={n.name}><n.icon size={20}/><span>{n.name}</span>{tab===n.name&&<i/>}</button>)}</nav><div className="sidebar-bottom"><button className="nav-item" aria-label="Cambiar de perfil" title="Cambiar de perfil" onClick={logout}><LogOut size={19}/><span>Cambiar de perfil</span></button><button className="collapse-btn" onClick={()=>narrow?setMobile(false):setCollapsed(!collapsed)} aria-label={!narrow&&collapsed?'Ampliar menú':'Contraer menú'} aria-controls="academy-navigation" aria-expanded={narrow?mobile:!collapsed}>{!narrow&&collapsed?<PanelLeftOpen size={18}/>:<PanelLeftClose size={18}/>}<span>{!narrow&&collapsed?'Ampliar menú':'Contraer menú'}</span></button></div></aside>{narrow&&mobile&&<button className="sidebar-scrim" aria-label="Cerrar menú" onClick={()=>setMobile(false)}/>}
 <div className="workspace" inert={narrow&&mobile}><header ref={topbar} className="topbar"><div className="row"><button ref={menuButton} className="icon-btn navigation-toggle" aria-label={(narrow?mobile:!collapsed)?"Contraer menú":"Abrir menú"} aria-controls="academy-navigation" aria-expanded={narrow?mobile:!collapsed} onClick={()=>{setGuide(false);if(narrow)setMobile(!mobile);else setCollapsed(!collapsed)}}><Menu/></button><div className="history-controls" role="group" aria-label="Historial de navegación"><button type="button" className="icon-btn" aria-label="Volver atrás" title="Volver atrás" disabled={historyStatus.busy} onClick={()=>platformHistory.current?.back()}><ChevronLeft size={20}/></button><button type="button" className="icon-btn" aria-label="Ir adelante" title="Ir adelante" disabled={!historyStatus.canForward||historyStatus.busy} onClick={()=>platformHistory.current?.forward()}><ChevronRight size={20}/></button></div><nav className="breadcrumb" aria-label="Ubicación actual"><span>Mi academia</span><ChevronRight size={14} aria-hidden="true"/><strong aria-current="page">{tab}</strong></nav></div><div className="topbar-actions">{profile==='teacher'&&<span className="privacy-pill"><ShieldCheck size={14}/> Panel protegido</span>}<button className="icon-btn" onClick={toggleTheme} aria-label={theme==='light'?'Activar modo oscuro':'Activar modo claro'}>{theme==='light'?<Moon size={19}/>:<Sun size={19}/>}</button>{profile==='teacher'&&<button className="icon-btn notification-btn" aria-label="Abrir pendientes" onClick={()=>setDrawer(true)}><Bell size={19}/>{pending+questions>0&&<i/>}</button>}<ProfileMenu key={profile} name={profile==='teacher'?'Pablo':pupil?.name||profile} level={profile==='teacher'?'Docente':pupil?.level||''} avatar={<Avatar id={profile} color={pupil?.color} avatar={pupil?.avatar} avatarUrl={pupil?.avatarUrl}/>} onSwitch={logout} onPersonalize={profile==='teacher'?undefined:openPersonalization} onHelp={()=>setGuide(true)} onOpen={()=>{setMobile(false);setGuide(false)}}/></div></header>
 <main ref={mainContent} id="main" tabIndex={-1} className="main-content">{error&&<div role="alert" className="banner">{error}<button className="btn secondary" disabled={busy} onClick={async()=>{setBusy(true);try{await resumeHandler.current()}catch(e:any){setError(e.message)}finally{setBusy(false)}}}>Reintentar conexión</button></div>}<div className="page-view" key={`${profile}:${tab}:${data?'ready':'loading'}:${data?.students?.find((s:any)=>profile==='teacher'||s.id===profile)?.resultVersion||'initial'}`}>{!data?<div className="skeleton-grid">{[1,2,3,4].map(x=><div key={x} className="skeleton card"/>)}</div>:tab==='Calendario'?<CalendarView data={data} profile={profile} act={act} notify={notify}/>:profile==='teacher'?<TeacherViews data={data} tab={tab} act={act} notify={notify}/>:<StudentViews data={data} profile={profile} tab={tab} act={act} notify={notify} onNavigate={switchTab} personalizationRequested={personalizationProfile===profile} onPersonalizationOpened={personalizationOpened}/>}</div><footer className="workspace-footer"><span>academia <strong>PAR</strong></span><span>Clases · Actividades · Seguimiento</span></footer></main></div>{showBackToTop&&!mobile&&!drawer&&<button type="button" className="back-to-top" aria-label="Volver arriba" title="Volver arriba" onClick={backToTop}><ArrowUp size={20} aria-hidden="true"/></button>}{guide&&data&&<MenuGuide key={profile} teacher={profile==='teacher'} onDismiss={(restoreFocus)=>{setGuide(false);if(restoreFocus)menuButton.current?.focus({preventScroll:true})}} onOpen={openNavigation}/>}{notice&&<div className="toast" role="status">{notice}</div>}{historyStatus.exitRequested&&<Dialog title="¿Salir de academia PAR?" onClose={()=>platformHistory.current?.cancelExit()}><p className="muted">Vas a salir de la plataforma. Puedes quedarte y continuar donde estabas.</p><div className="exit-platform-actions"><button type="button" className="btn primary" disabled={historyStatus.busy} onClick={()=>platformHistory.current?.cancelExit()}>Quedarme</button><button type="button" className="btn secondary" disabled={historyStatus.busy} onClick={()=>platformHistory.current?.confirmExit()}>Salir de la plataforma</button></div></Dialog>}{drawer&&<Dialog title="Por atender" className="pending-drawer" onClose={()=>setDrawer(false)}><p className="muted">{questions ? "Respuestas y dudas para revisar en clase." : "Respuestas para revisar en clase."}</p><div className="card"><strong>{pending} respuestas por revisar</strong><p className="muted">Consulta lo que han respondido y retómalo en clase.</p></div>{questions>0&&<div className="card"><strong>{questions} dudas pendientes</strong>{data?.doubts?.filter((d:any)=>!d.resolved&&!d.resolvedAt&&d.status!=='resolved').map((d:any)=><p key={d.id}>{d.question}</p>)}</div>}<button className="btn primary" onClick={()=>{switchTab('Hoy y esta semana');setDrawer(false)}}>Ver mi semana<ArrowRight size={16}/></button></Dialog>}</div></PlatformNavigationContext.Provider>;
}
