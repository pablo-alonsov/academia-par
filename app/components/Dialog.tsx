'use client';

import {useEffect,useId,useRef,useState,type ReactNode} from 'react';
import {createPortal} from 'react-dom';
import {X} from 'lucide-react';
import './dialog.css';
import {lockPageScroll} from '@/lib/page-scroll';
import {viewportFrame} from '@/lib/viewport-frame';

const dialogStack:HTMLElement[]=[];
const backgroundState=new Map<HTMLElement,{inert:boolean;hidden:string|null}>();
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
  const unlock=lockPageScroll();
  dialogStack.push(host);focus();updateBackground();
  return()=>{
    const index=dialogStack.indexOf(host);if(index>=0)dialogStack.splice(index,1);updateBackground();
    unlock();
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
      const frame=viewportFrame(viewport,window.innerWidth,window.innerHeight);if(backdropRef.current)backdropRef.current.dataset.compactViewport=String(frame.height<400);
      style.setProperty('--arp-viewport-height',`${frame.height}px`);style.setProperty('--arp-viewport-width',`${frame.width}px`);style.setProperty('--arp-viewport-top',`${frame.top}px`);style.setProperty('--arp-viewport-left',`${frame.left}px`);
      requestAnimationFrame(()=>{const active=document.activeElement,content=panel?.querySelector<HTMLElement>('.arp-dialog-content');if(!(active instanceof HTMLElement)||!active.matches('input,textarea,select')||!content?.contains(active))return;const field=active.getBoundingClientRect(),area=content.getBoundingClientRect(),space=area.height-24;if(field.height<=space){if(field.bottom>area.bottom-12)content.scrollTop+=field.bottom-area.bottom+12;else if(field.top<area.top+12)content.scrollTop-=area.top+12-field.top;}else if(field.bottom<area.top||field.top>area.bottom)content.scrollTop+=field.top-area.top-12;});
    };
    updateViewport();window.addEventListener('resize',updateViewport);window.addEventListener('orientationchange',updateViewport);panel?.addEventListener('focusin',updateViewport);window.visualViewport?.addEventListener('resize',updateViewport);window.visualViewport?.addEventListener('scroll',updateViewport);
    document.addEventListener('keydown',onKey,true);document.addEventListener('focusin',onFocus);
    return()=>{
      document.removeEventListener('keydown',onKey,true);document.removeEventListener('focusin',onFocus);window.removeEventListener('resize',updateViewport);window.removeEventListener('orientationchange',updateViewport);panel?.removeEventListener('focusin',updateViewport);window.visualViewport?.removeEventListener('resize',updateViewport);window.visualViewport?.removeEventListener('scroll',updateViewport);
      deactivate();
      const previous=returnFocusRef.current;
      const canRestore=previous?.isConnected&&!previous.closest('[inert]')&&!previous.matches(':disabled')&&previous.getClientRects().length;
      const fallback=dialogStack.at(-1)?.querySelector<HTMLElement>('button:not(:disabled),[tabindex="0"]')||document.getElementById('main');
      (canRestore?previous:fallback)?.focus({preventScroll:true});
    };
  },[host]);
  if(!host)return null;
  return createPortal(<div ref={backdropRef} className="modal-backdrop arp-modal-backdrop" onMouseDown={event=>{if(event.target===event.currentTarget)closeRef.current()}}><div ref={panelRef} className={`modal arp-dialog ${className}`} style={wide?{maxWidth:900}:undefined} role="dialog" aria-modal="true" aria-labelledby={titleId} tabIndex={-1}><div className="card-head arp-dialog-header"><h2 id={titleId}>{title}</h2><button type="button" className="icon-btn" aria-label="Cerrar ventana" onClick={()=>closeRef.current()}><X size={20}/></button></div><div className="arp-dialog-content">{children}</div></div></div>,host);
}
