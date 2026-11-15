'use client';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { ChevronDown, CircleHelp, LogOut, Palette } from 'lucide-react';

type Props = { name: string; level: string; avatar: ReactNode; onSwitch: () => Promise<void>; onHelp: () => void; onOpen: () => void; onPersonalize?: () => void | Promise<void> };
export default function ProfileMenu({name,level,avatar,onSwitch,onHelp,onOpen,onPersonalize}: Props) {
 const [open,setOpen]=useState(false),[switching,setSwitching]=useState(false);
 const wrapper=useRef<HTMLDivElement>(null),trigger=useRef<HTMLButtonElement>(null),menu=useRef<HTMLDivElement>(null),keyboardOpen=useRef<'first'|'last'|null>(null),switchPending=useRef(false);
 const close=(restore=false)=>{setOpen(false);if(restore)trigger.current?.focus({preventScroll:true})};
 const focusItem=(last=false)=>{const items=menu.current?.querySelectorAll<HTMLButtonElement>('button:not(:disabled)');if(items?.length)items[last?items.length-1:0].focus({preventScroll:true})};
 const show=(keyboard=false,last=false)=>{keyboardOpen.current=keyboard?(last?'last':'first'):null;setOpen(true);onOpen();if(open&&keyboard)focusItem(last)};
 useEffect(()=>{
  if(!open)return;
  if(keyboardOpen.current)focusItem(keyboardOpen.current==='last');
  const outside=(event:PointerEvent)=>{if(!wrapper.current?.contains(event.target as Node))setOpen(false)};
  // Safari can blur a button with relatedTarget=null before a touch click.
  // Close only when focus actually arrives outside, so the tapped item survives.
  const focusOutside=(event:FocusEvent)=>{if(!wrapper.current?.contains(event.target as Node))setOpen(false)};
  const escape=(event:KeyboardEvent)=>{if(event.key==='Escape'){event.preventDefault();setOpen(false);trigger.current?.focus({preventScroll:true})}};
  document.addEventListener('pointerdown',outside);document.addEventListener('focusin',focusOutside);document.addEventListener('keydown',escape);
  return()=>{document.removeEventListener('pointerdown',outside);document.removeEventListener('focusin',focusOutside);document.removeEventListener('keydown',escape)};
 },[open]);
 return <div className="profile-menu" ref={wrapper}>
  <button type="button" ref={trigger} className={`user-chip profile-menu-trigger ${open?'is-open':''}`} aria-label={`Menú del perfil de ${name}`} aria-haspopup="menu" aria-expanded={open} aria-controls="profile-options" onClick={event=>open?close():show(event.detail===0)} onKeyDown={event=>{if(event.key==='ArrowDown'||event.key==='ArrowUp'){event.preventDefault();show(true,event.key==='ArrowUp')}}}>
   {avatar}<span className="user-chip-copy"><strong>{name}</strong><small>{level}</small></span><ChevronDown size={15} className="profile-menu-chevron"/>
  </button>
  {open&&<div ref={menu} id="profile-options" className="profile-menu-popup" role="menu" aria-label={`Opciones del perfil de ${name}`} onKeyDown={event=>{
   if(!['ArrowDown','ArrowUp','Home','End'].includes(event.key))return;event.preventDefault();
   const items=Array.from(menu.current?.querySelectorAll<HTMLButtonElement>('button:not(:disabled)')||[]),current=items.indexOf(document.activeElement as HTMLButtonElement);
   const index=event.key==='Home'?0:event.key==='End'?items.length-1:event.key==='ArrowDown'?(current+1)%items.length:(current-1+items.length)%items.length;items[index]?.focus({preventScroll:true});
  }}>
   <div className="profile-menu-heading" role="presentation"><strong>{name}</strong><small>{level}</small></div>
   {onPersonalize&&<button type="button" role="menuitem" onClick={()=>{close(true);void onPersonalize()}}><Palette size={17}/>Personalizar presentación</button>}
   <button type="button" role="menuitem" disabled={switching} onClick={async()=>{if(switchPending.current)return;switchPending.current=true;setSwitching(true);try{await onSwitch();setOpen(false)}finally{switchPending.current=false;setSwitching(false)}}}><LogOut size={17}/>{switching?'Cambiando de perfil…':'Cambiar de perfil'}</button>
   <button type="button" role="menuitem" onClick={()=>{close(true);onHelp()}}><CircleHelp size={17}/>Ver ayuda del menú</button>
  </div>}
 </div>;
}
