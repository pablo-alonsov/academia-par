export type PlatformRoute = {
  tab: string;
  detail?: {
    kind: 'activity' | 'resource' | 'student-session' | 'teacher-session';
    id: string;
    assignmentId?: string;
    source?: 'exercises' | 'resources';
    sourceAssignmentId?: string;
  };
};

export type PlatformHistoryState = {canBack:boolean;canForward:boolean;busy:boolean;exitRequested:boolean};
type Profile = 'rocio' | 'alejandra' | 'teacher';
type Entry = {version:1;generation:string;profile:Profile;position:number;before:number;max:number;boundary:boolean;route:PlatformRoute};
type HistoryWindow = {
  history: {state:any;length:number;pushState(data:any,unused:string,url?:string):void;replaceState(data:any,unused:string,url?:string):void;go(delta:number):void};
  location: {pathname:string;search:string;hash:string};
  sessionStorage?: {getItem(key:string):string|null;setItem(key:string,value:string):void};
  addEventListener(type:'popstate'|'pageshow',listener:any):void;
  removeEventListener(type:'popstate'|'pageshow',listener:any):void;
};
type Options = {
  window?: HistoryWindow;
  beforeNavigate:()=>void|Promise<void>;
  onRoute:(route:PlatformRoute)=>void;
  onChange:(state:PlatformHistoryState)=>void;
  onError?:(message:string)=>void;
  /** Used when a newly opened tab has no preceding document to go back to. */
  onLeave?:()=>void;
};

const KEY='__parHistory', STORAGE='par-platform-history-v1';
const STUDENT_TABS=['Inicio','Mi camino','Practicar','Mis clases','Calendario'];
const TEACHER_TABS=['Hoy y esta semana','Alumnas','Banco de actividades','Biblioteca','Calendario'];
const SLUGS:Record<string,string>={'Inicio':'inicio','Mi camino':'camino','Practicar':'practicar','Mis clases':'clases','Calendario':'calendario','Hoy y esta semana':'hoy','Alumnas':'alumnas','Banco de actividades':'actividades','Biblioteca':'biblioteca'};
const DETAIL_SLUGS:Record<string,string>={'activity':'ejercicio','resource':'recurso','student-session':'clase','teacher-session':'sesion'};
const id=(value:unknown):value is string=>typeof value==='string'&&/^[a-zA-Z0-9][a-zA-Z0-9:_-]{0,159}$/.test(value);
const integer=(value:unknown):value is number=>typeof value==='number'&&Number.isSafeInteger(value)&&value>=0;
const clone=(route:PlatformRoute):PlatformRoute=>({...route,...(route.detail?{detail:{...route.detail}}:{})});

/** History is a navigation hint only. It never authenticates a profile or owns private data. */
export function normalizePlatformRoute(value:unknown,profile:string,defaultTab?:string):PlatformRoute {
  const tabs=profile==='teacher'?TEACHER_TABS:STUDENT_TABS;
  const fallback=tabs.includes(defaultTab||'')?defaultTab!:tabs[0];
  const raw=value as Partial<PlatformRoute>|null;
  const route:PlatformRoute={tab:tabs.includes(raw?.tab||'')?raw!.tab!:fallback};
  const detail=raw?.detail;
  const kinds=profile==='teacher'?['teacher-session']:['activity','resource','student-session'];
  if(detail&&kinds.includes(detail.kind)&&id(detail.id)) {
    route.detail={kind:detail.kind,id:detail.id};
    if(detail.kind==='activity'&&id(detail.assignmentId))route.detail.assignmentId=detail.assignmentId;
    if(detail.source==='exercises'||detail.source==='resources')route.detail.source=detail.source;
    if(id(detail.sourceAssignmentId))route.detail.sourceAssignmentId=detail.sourceAssignmentId;
  }
  return route;
}

export function platformRouteHash(route:PlatformRoute):string {
  const path=[SLUGS[route.tab]||'inicio'];
  const query=new URLSearchParams();
  if(route.detail){path.push(DETAIL_SLUGS[route.detail.kind],encodeURIComponent(route.detail.id));if(route.detail.assignmentId)query.set('encargo',route.detail.assignmentId);if(route.detail.source)query.set('origen',route.detail.source);if(route.detail.sourceAssignmentId)query.set('desde',route.detail.sourceAssignmentId);}
  return `#${path.join('/')}${query.size?`?${query}`:''}`;
}

export function platformRouteFromHash(hash:string,profile:string,defaultTab?:string):PlatformRoute {
  try {
    const [path,search='']=hash.replace(/^#/,'').split('?');
    const [slug,kindSlug,encodedId,...extra]=path.split('/');
    const tab=Object.keys(SLUGS).find(key=>SLUGS[key]===slug);
    if(!tab||extra.length)return normalizePlatformRoute(null,profile,defaultTab);
    const kind=Object.keys(DETAIL_SLUGS).find(key=>DETAIL_SLUGS[key]===kindSlug);
    const params=new URLSearchParams(search);
    return normalizePlatformRoute({tab,...(kind&&encodedId?{detail:{kind,id:decodeURIComponent(encodedId),assignmentId:params.get('encargo'),source:params.get('origen'),sourceAssignmentId:params.get('desde')}}:{})},profile,defaultTab);
  }catch{return normalizePlatformRoute(null,profile,defaultTab);}
}

function entryFrom(state:any):Entry|null {
  const raw=state?.[KEY];
  if(!raw||raw.version!==1||!id(raw.generation)||!['rocio','alejandra','teacher'].includes(raw.profile)||!integer(raw.before)||!integer(raw.max)||!Number.isSafeInteger(raw.position)||raw.position< -1||typeof raw.boundary!=='boolean'||raw.boundary!==(raw.position===-1))return null;
  return {version:1,generation:raw.generation,profile:raw.profile,position:raw.position,before:raw.before,max:raw.max,boundary:raw.boundary,route:normalizePlatformRoute(raw.route,raw.profile)};
}

/**
 * Indexed same-document history with one exit boundary per explicit profile entry.
 * Restoring a rejected traversal uses go(), preserving the browser's Forward list.
 */
export class PlatformHistory {
  private win:HistoryWindow;
  private options:Options;
  private current:Entry|null=null;
  private profile:Profile|null=null;
  private defaultTab='Inicio';
  private furthest=0;
  private serial=0;
  private active=false;
  private busy=false;
  private exitRequested=false;
  private restoration:{depth:number;fromDepth:number;exit:boolean;error?:string}|null=null;
  private _leaving=false;
  private attached=false;

  constructor(options:Options){this.options=options;this.win=options.window||(window as unknown as HistoryWindow);}
  get leaving(){return this._leaving;}
  private depth(entry:Entry){return entry.before+entry.position+1;}
  private state(entry:Entry){const previous=this.win.history.state;return {...(previous&&typeof previous==='object'&&!Array.isArray(previous)?previous:{}),[KEY]:entry};}
  private url(route:PlatformRoute){return `${this.win.location.pathname}${this.win.location.search}${platformRouteHash(route)}`;}
  private replace(entry:Entry){this.win.history.replaceState(this.state(entry),'',this.url(entry.route));}
  private remember(){if(!this.current)return;try{this.win.sessionStorage?.setItem(STORAGE,JSON.stringify({generation:this.current.generation,max:this.furthest}));}catch{}}
  private emit(){this.options.onChange({canBack:Boolean(this.active&&this.current),canForward:Boolean(this.active&&this.current&&this.current.position<this.furthest),busy:this.busy,exitRequested:this.exitRequested});}
  private attach(){if(this.attached)return;this.attached=true;this.win.addEventListener('popstate',this.pop);this.win.addEventListener('pageshow',this.pageShow);}
  private message(error:unknown){return error instanceof Error?error.message:'No se pudo guardar. Reintenta antes de salir.';}

  init(profile:string,defaultTab:string,{reset=false}:{reset?:boolean}={}):PlatformRoute {
    if(!['rocio','alejandra','teacher'].includes(profile))throw Error('Selecciona un perfil válido.');
    this.serial++;this.active=true;this._leaving=false;this.busy=false;this.exitRequested=false;this.restoration=null;this.profile=profile as Profile;this.defaultTab=defaultTab;this.attach();
    const existing=entryFrom(this.win.history.state);
    let stored:{generation?:string;max?:number}|null=null;try{stored=JSON.parse(this.win.sessionStorage?.getItem(STORAGE)||'null');}catch{}
    if(!reset&&existing&&!existing.boundary&&existing.profile===profile&&(!stored?.generation||stored.generation===existing.generation)){
      const route=platformRouteFromHash(this.win.location.hash,profile,defaultTab);
      this.furthest=Math.max(existing.position,stored?.generation===existing.generation&&integer(stored.max)?stored.max:existing.max);
      this.current={...existing,route,max:this.furthest};this.replace(this.current);
    }else{
      const route=reset?normalizePlatformRoute(null,profile,defaultTab):platformRouteFromHash(this.win.location.hash,profile,defaultTab);
      // Preserve the distance to the original preceding document across profile changes.
      const before=existing?this.depth(existing):this.win.history.length>1?1:0;
      const generation=`par-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,12)}`;
      const boundary:Entry={version:1,generation,profile:profile as Profile,position:-1,before,max:0,boundary:true,route:normalizePlatformRoute(null,profile,defaultTab)};
      const parent=route.detail?{tab:route.tab}:route;
      this.replace(boundary);this.current={...boundary,position:0,boundary:false,route:parent};this.furthest=0;
      this.win.history.pushState(this.state(this.current),'',this.url(parent));
      if(route.detail){this.furthest=1;this.replace({...this.current,max:1});this.current={...this.current,position:1,max:1,route};this.win.history.pushState(this.state(this.current),'',this.url(route));}
    }
    const result=clone(this.current.route);
    this.remember();this.options.onRoute(clone(result));this.emit();return result;
  }

  async navigate(value:PlatformRoute):Promise<boolean> {
    if(!this.active||!this.current||!this.profile||this.busy||this.exitRequested||this._leaving)return false;
    const route=normalizePlatformRoute(value,this.profile,this.defaultTab);
    if(JSON.stringify(route)===JSON.stringify(this.current.route))return true;
    const version=++this.serial;this.busy=true;this.emit();
    try{
      await this.options.beforeNavigate();if(version!==this.serial||!this.active||!this.current)return false;
      const position=this.current.position+1;this.furthest=position;this.replace({...this.current,max:position});
      this.current={...this.current,position,max:position,route};this.win.history.pushState(this.state(this.current),'',this.url(route));
      this.remember();this.options.onRoute(clone(route));return true;
    }catch(error){if(version===this.serial)this.options.onError?.(this.message(error));return false;}
    finally{if(version===this.serial){this.busy=false;this.emit();}}
  }

  back(){if(this.active&&!this.busy&&!this.exitRequested&&!this._leaving)this.win.history.go(-1);}
  forward(){if(this.active&&!this.busy&&!this.exitRequested&&!this._leaving&&this.current&&this.current.position<this.furthest)this.win.history.go(1);}
  cancelExit(){if(!this.active||this.busy)return;this.exitRequested=false;this.emit();}

  confirmExit(){
    if(!this.active||!this.current||!this.exitRequested||this.busy)return;
    const version=++this.serial;this.busy=true;this.emit();
    void Promise.resolve().then(()=>this.options.beforeNavigate()).then(()=>{
      if(!this.active||version!==this.serial||!this.current)return;
      this._leaving=true;this.busy=false;this.exitRequested=false;this.emit();
      if(this.current.before>0)this.win.history.go(-this.depth(this.current));
      else this.options.onLeave?.();
    }).catch(error=>{if(this.active&&version===this.serial){this.busy=false;this.options.onError?.(this.message(error));this.emit();}});
  }

  private restore(target:Entry,exit:boolean,error?:string){
    if(!this.current)return;
    const delta=this.depth(this.current)-this.depth(target);
    if(delta===0){this.replace(this.current);this.busy=false;this.exitRequested=exit;if(error)this.options.onError?.(error);this.emit();return;}
    this.restoration={depth:this.depth(this.current),fromDepth:this.depth(target),exit,error};this.busy=true;this.emit();this.win.history.go(delta);
  }

  private pop=(event:{state:any})=>{
    if(!this.active||this._leaving||!this.current||!this.profile)return;
    const target=entryFrom(event.state);
    if(this.restoration){
      if(target&&this.depth(target)===this.restoration.depth&&target.generation===this.current.generation){
        const {exit,error}=this.restoration;this.restoration=null;this.busy=false;this.exitRequested=exit;this.replace({...this.current,max:this.furthest});if(error)this.options.onError?.(error);this.emit();return;
      }
      // pageshow precedes its traversal's popstate. Ignore that already handled
      // source event while returning from the exit boundary after BFCache restore.
      if(target&&this.depth(target)===this.restoration.fromDepth)return;
      // An additional native traversal superseded the pending restoration.
      this.restoration=null;
    }
    const version=++this.serial;
    if(target&&(target.generation!==this.current.generation||target.profile!==this.profile||target.boundary)){
      this.restore(target,this.depth(target)<this.depth(this.current));return;
    }
    // A manually edited fragment is not allowed to inject profile/private state.
    // Native anchors are normalized as a fresh same-profile route.
    const destination=target||{...this.current,position:this.current.position+1,route:platformRouteFromHash(this.win.location.hash,this.profile,this.defaultTab)};
    this.busy=true;this.exitRequested=false;this.emit();
    void Promise.resolve().then(()=>this.options.beforeNavigate()).then(()=>{
      if(!this.active||version!==this.serial||!this.current)return;
      if(!target)this.furthest=destination.position;
      this.current={...destination,max:this.furthest};this.replace(this.current);this.remember();this.options.onRoute(clone(this.current.route));this.busy=false;this.emit();
    }).catch(error=>{if(this.active&&version===this.serial)this.restore(destination,false,this.message(error));});
  };

  private pageShow=(event:{persisted?:boolean})=>{
    if(!event.persisted||!this.active||!this.profile)return;
    // BFCache restores the same controller after leaving and returning to the site.
    const target=entryFrom(this.win.history.state);
    if(this.current&&target&&(target.boundary||target.generation!==this.current.generation)){
      this.serial++;this._leaving=false;this.exitRequested=false;this.restoration=null;this.restore(target,false);
    }else this.init(this.profile,this.defaultTab);
  };

  destroy(){this.serial++;this.active=false;this.busy=false;this.exitRequested=false;this.restoration=null;if(this.attached){this.win.removeEventListener('popstate',this.pop);this.win.removeEventListener('pageshow',this.pageShow);this.attached=false;}this.current=null;this.profile=null;this.emit();}
}
