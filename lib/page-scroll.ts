'use client';

// One shared lock for menus and stacked dialogs avoids competing body offsets
// when Safari opens the keyboard or reauthentication opens above a menu.
const owners=new Set<symbol>();
let saved:{styles:Record<string,string>;x:number;y:number;fixed:boolean}|null=null;
export function lockPageScroll(){
  const owner=Symbol('scroll-lock');
  if(!owners.size){
    const body=document.body,keys=['overflow','paddingRight','position','top','left','width'] as const;
    saved={styles:Object.fromEntries(keys.map(key=>[key,body.style[key]])),x:window.scrollX,y:window.scrollY,fixed:matchMedia('(pointer:coarse), (max-width:900px)').matches};
    const scrollbar=Math.max(0,window.innerWidth-document.documentElement.clientWidth);
    body.style.overflow='hidden';if(scrollbar)body.style.paddingRight=`${(parseFloat(getComputedStyle(body).paddingRight)||0)+scrollbar}px`;
    if(saved.fixed){body.style.position='fixed';body.style.top=`-${saved.y}px`;body.style.left='0';body.style.width='100%';}
  }
  owners.add(owner);
  return()=>{if(!owners.delete(owner)||owners.size||!saved)return;const restore=saved;saved=null;Object.assign(document.body.style,restore.styles);if(restore.fixed)window.scrollTo({left:restore.x,top:restore.y,behavior:'auto'});};
}
