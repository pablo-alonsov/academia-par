'use client';

import {useEffect,useId,useRef,useState,type ReactNode} from 'react';
import {createPortal} from 'react-dom';
import {X} from 'lucide-react';
import './dialog.css';

const dialogStack:HTMLElement[]=[];
const backgroundState=new Map<HTMLElement,{inert:boolean;hidden:string|null}>();
let bodyState:{overflow:string;paddingRight:string;position:string;top:string;left:string;width:string;scrollX:number;scrollY:number;fixed:boolean}|null=null;
function updateBackground(){
  const active=dialogStack.at(-1);
  for(const child of Array.from(document.body.children)){
    if(!(child instanceof HTMLElement))continue;
    if(!active || child===active){const saved=backgroundState.get(child);if(saved){child.inert=saved.inert;if(saved.hidden===null)child.removeAttribute('aria-hidden');else child.setAttribute('aria-hidden',saved.hidden);}}
    else{if(!backgroundState.has(child))backgroundState.set(child,{inert:child.inert,hidden:child.getAttribute('aria-hidden')});child.inert=true;child.setAttribute('aria-hidden','true');}
  }
  if(!active)backgroundState.clear();
}
function activateDialog(host:HTMLElement,focus:()=>void){
  if(!dialogStack.length){
    const body=document.body,scrollbar=window.innerWidth-document.documentElement.clientWidth;
    bodyState={overflow:body.style.overflow,paddingRight:body.style.paddingRight,position:body.style.position,top:body.style.top,left:body.style.left,width:body.style.width,scrollX:window.scrollX,scrollY:window.scrollY,fixed:window.matchMedia('(max-width:700px)').matches};
    body.style.overflow='hidden';
    if(scrollbar>0)body.style.paddingRight=`${parseFloat(getComputedStyle(body).paddingRight)+scrollbar}px`;
    if(bodyState.fixed){body.style.position='fixed';body.style.top=`-${bodyState.scrollY}px`;body.style.left='0';body.style.width='100%';}
  }
  dialogStack.push(host);focus();updateBackground();
  return()=>{
    const index=dialogStack.indexOf(host);if(index>=0)dialogStack.splice(index,1);updateBackground();
    if(!dialogStack.length && bodyState){const saved=bodyState;Object.assign(document.body.style,{overflow:saved.overflow,paddingRight:saved.paddingRight,position:saved.position,top:saved.top,left:saved.left,width:saved.width});bodyState=null;if(saved.fixed)window.scrollTo(saved.scrollX,saved.scrollY);}
  };
}

type Props={title:ReactNode;onClose:()=>void;children:ReactNode;wide?:boolean;className?:string};
export default function Dialog({title,onClose,children,wide=false,className=''}:Props){
  const [host,setHost]=useState<HTMLDivElement|null>(null);
  const panelRef=useRef<HTMLDivElement>(null),backdropRef=useRef<HTMLDivElement>(null),returnFocusRef=useRef<HTMLElement|null>(null),closeRef=useRef(onClose);
  const titleId=useId();
  useEffect(()=>{closeRef.current=onClose},[onClose]);
  useEffect(()=>{
    returnFocusRef.current=document.activeElement instanceof HTMLElement?document.activeElement:null;
    const element=document.createElement('div');element.className='arp-dialog-portal';element.dataset.arpDialogPortal='';document.body.appendChild(element);setHost(element);
    return()=>{element.remove();};
  },[]);
  useEffect(()=>{
    if(!host?.isConnected)return;
    const panel=panelRef.current;
    const items=()=>Array.from(panel?.querySelectorAll<HTMLElement>('button:not(:disabled),a[href],input:not(:disabled),select:not(:disabled),textarea:not(:disabled),[tabindex]') || []).filter(element=>element.tabIndex>=0 && element.getClientRects().length>0 && !element.closest('[inert]') && getComputedStyle(element).visibility!=='hidden');
    // Respect explicit autofocus; otherwise avoid opening the mobile keyboard.
    const deactivate=activateDialog(host,()=>{if(!panel?.contains(document.activeElement))(items()[0] || panel)?.focus({preventScroll:true});});
    const isTop=()=>dialogStack.at(-1)===host;
    const onKey=(event:KeyboardEvent)=>{
      if(!isTop())return;
      if(event.key==='Escape'){event.preventDefault();event.stopPropagation();closeRef.current();return;}
      if(event.key!=='Tab')return;
      const focusable=items(),first=focusable[0],last=focusable.at(-1);
      if(!first){event.preventDefault();panel?.focus({preventScroll:true});return;}
      if(!panel?.contains(document.activeElement)){event.preventDefault();(event.shiftKey?last:first)?.focus();}
      else if(event.shiftKey && document.activeElement===first){event.preventDefault();last?.focus();}
      else if(!event.shiftKey && document.activeElement===last){event.preventDefault();first.focus();}
    };
    const onFocus=(event:FocusEvent)=>{if(isTop() && event.target instanceof Node && !panel?.contains(event.target))(items()[0] || panel)?.focus({preventScroll:true});};
    const updateViewport=()=>{
      const viewport=window.visualViewport,style=backdropRef.current?.style;if(!style)return;
      style.setProperty('--arp-viewport-height',`${viewport?.height || window.innerHeight}px`);style.setProperty('--arp-viewport-width',`${viewport?.width || window.innerWidth}px`);style.setProperty('--arp-viewport-top',`${viewport?.offsetTop || 0}px`);style.setProperty('--arp-viewport-left',`${viewport?.offsetLeft || 0}px`);
    };
    updateViewport();window.addEventListener('resize',updateViewport);window.visualViewport?.addEventListener('resize',updateViewport);window.visualViewport?.addEventListener('scroll',updateViewport);
    document.addEventListener('keydown',onKey,true);document.addEventListener('focusin',onFocus);
    return()=>{
      document.removeEventListener('keydown',onKey,true);document.removeEventListener('focusin',onFocus);window.removeEventListener('resize',updateViewport);window.visualViewport?.removeEventListener('resize',updateViewport);window.visualViewport?.removeEventListener('scroll',updateViewport);
      deactivate();const previous=returnFocusRef.current;if(previous?.isConnected && !previous.closest('[inert]'))previous.focus({preventScroll:true});
    };
  },[host]);
  if(!host)return null;
  return createPortal(<div ref={backdropRef} className="modal-backdrop arp-modal-backdrop" onMouseDown={event=>{if(event.target===event.currentTarget)closeRef.current()}}><div ref={panelRef} className={`modal arp-dialog ${className}`} style={wide?{maxWidth:900}:undefined} role="dialog" aria-modal="true" aria-labelledby={titleId} tabIndex={-1}><div className="card-head arp-dialog-header"><h2 id={titleId}>{title}</h2><button type="button" className="icon-btn" aria-label="Cerrar ventana" onClick={()=>closeRef.current()}><X size={20}/></button></div><div className="arp-dialog-content">{children}</div></div></div>,host);
}
