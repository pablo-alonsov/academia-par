'use client';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { ChevronDown, CircleHelp, LogOut } from 'lucide-react';

type Props = { name: string; level: string; avatar: ReactNode; onSwitch: () => Promise<void>; onHelp: () => void; onOpen: () => void };
export default function ProfileMenu({name,level,avatar,onSwitch,onHelp,onOpen}: Props) {
 const [open,setOpen]=useState(false),[switching,setSwitching]=useState(false);
 const wrapper=useRef<HTMLDivElement>(null),trigger=useRef<HTMLButtonElement>(null),menu=useRef<HTMLDivElement>(null);
 const close=(restore=false)=>{setOpen(false);if(restore)trigger.current?.focus()};
 const show=()=>{setOpen(true);onOpen()};
 useEffect(()=>{
  if(!open)return;
  menu.current?.querySelector<HTMLButtonElement>('button')?.focus();
  const outside=(event:PointerEvent)=>{if(!wrapper.current?.contains(event.target as Node))setOpen(false)};
  const escape=(event:KeyboardEvent)=>{if(event.key==='Escape'){event.preventDefault();setOpen(false);trigger.current?.focus()}};
  document.addEventListener('pointerdown',outside);document.addEventListener('keydown',escape);
  return()=>{document.removeEventListener('pointerdown',outside);document.removeEventListener('keydown',escape)};
 },[open]);
 return <div className="profile-menu" ref={wrapper} onBlur={event=>{if(!event.currentTarget.contains(event.relatedTarget as Node))setOpen(false)}}>
  <button ref={trigger} className={`user-chip profile-menu-trigger ${open?'is-open':''}`} aria-label={`Menú del perfil de ${name}`} aria-haspopup="menu" aria-expanded={open} aria-controls="profile-options" onClick={()=>open?close():show()} onKeyDown={event=>{if(event.key==='ArrowDown'||event.key==='ArrowUp'){event.preventDefault();show()}}}>
   {avatar}<span className="user-chip-copy"><strong>{name}</strong><small>{level}</small></span><ChevronDown size={15} className="profile-menu-chevron"/>
  </button>
  {open&&<div ref={menu} id="profile-options" className="profile-menu-popup" role="menu" aria-label={`Opciones del perfil de ${name}`} onKeyDown={event=>{
   if(!['ArrowDown','ArrowUp','Home','End'].includes(event.key))return;event.preventDefault();
   const items=Array.from(menu.current?.querySelectorAll<HTMLButtonElement>('button:not(:disabled)')||[]),current=items.indexOf(document.activeElement as HTMLButtonElement);
   const index=event.key==='Home'?0:event.key==='End'?items.length-1:event.key==='ArrowDown'?(current+1)%items.length:(current-1+items.length)%items.length;items[index]?.focus();
  }}>
   <div className="profile-menu-heading" role="presentation"><strong>{name}</strong><small>{level}</small></div>
   <button role="menuitem" disabled={switching} onClick={async()=>{setSwitching(true);try{await onSwitch();setOpen(false)}finally{setSwitching(false)}}}><LogOut size={17}/>{switching?'Cambiando de perfil…':'Cambiar de perfil'}</button>
   <button role="menuitem" onClick={()=>{close(true);onHelp()}}><CircleHelp size={17}/>Ver ayuda del menú</button>
  </div>}
 </div>;
}
