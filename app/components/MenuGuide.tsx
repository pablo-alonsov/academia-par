'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowUpLeft, Menu, X } from 'lucide-react';

type Props={teacher:boolean;onDismiss:(restoreFocus?:boolean)=>void;onOpen:()=>void};
export default function MenuGuide({teacher,onDismiss,onOpen}:Props){
 const [hovered,setHovered]=useState(false),[focused,setFocused]=useState(false),[closing,setClosing]=useState(false);
 const dismiss=useRef(onDismiss),closeTimer=useRef<ReturnType<typeof setTimeout>|null>(null);dismiss.current=onDismiss;
 const close=useCallback((restoreFocus=false)=>{if(matchMedia('(prefers-reduced-motion: reduce)').matches){dismiss.current(restoreFocus);return}setClosing(true);closeTimer.current=setTimeout(()=>dismiss.current(restoreFocus),260)},[]);
 useEffect(()=>{if(hovered||focused||closing)return;const timer=setTimeout(()=>close(false),12000);return()=>clearTimeout(timer)},[hovered,focused,closing,close]);
 useEffect(()=>()=>{if(closeTimer.current)clearTimeout(closeTimer.current)},[]);
 return <aside className={`menu-guide ${closing?'is-leaving':''}`} aria-label="Ayuda del menú principal" onPointerEnter={()=>setHovered(true)} onPointerLeave={()=>setHovered(false)} onFocusCapture={()=>setFocused(true)} onBlurCapture={event=>{if(!event.currentTarget.contains(event.relatedTarget as Node))setFocused(false)}}>
  <span className="menu-guide-pointer" aria-hidden="true"/>
  <div className="menu-guide-heading"><span className="icon-tile"><Menu size={19}/></span><strong>Menú principal</strong><button className="icon-btn" aria-label="Cerrar ayuda del menú" onClick={()=>close(true)}><X size={17}/></button></div>
  <p role="status">{teacher?'En el menú encontrarás las sesiones, las alumnas, las actividades, la biblioteca y el calendario de exámenes.':'En Practicar tienes los ejercicios y materiales. En Mis clases puedes consultar las explicaciones y en Calendario anotar tus exámenes.'}</p>
  <p className="menu-guide-detail">Puedes cambiar de perfil al final del menú o pulsando tu avatar de arriba a la derecha.</p>
  <button className="btn quiet" onClick={()=>{dismiss.current();onOpen()}}><ArrowUpLeft size={16}/>Ver menú</button>
 </aside>;
}
