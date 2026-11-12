'use client';
import {useEffect,useState} from 'react';
import {UserRound,BookOpen,Star,Orbit,Flower2,Rocket,Cat,Dog,Rabbit,Bird,Sun,Moon,Mountain,Waves,Leaf,TreePine,Music2,Headphones,Palette,Camera,Gamepad2,Bike,Volleyball,FlaskConical,Atom,Telescope,Puzzle,Diamond} from 'lucide-react';
import {studentColors} from '@/lib/profile-customization';
import './profile-avatar.css';

export const avatarOptions=[
  {id:'initials',label:'Iniciales',icon:UserRound},{id:'book',label:'Libro',icon:BookOpen},{id:'star',label:'Estrella',icon:Star},{id:'planet',label:'Planeta',icon:Orbit},{id:'flower',label:'Flor',icon:Flower2},{id:'rocket',label:'Cohete',icon:Rocket},
  {id:'cat',label:'Gato',icon:Cat},{id:'dog',label:'Perro',icon:Dog},{id:'rabbit',label:'Conejo',icon:Rabbit},{id:'bird',label:'Pájaro',icon:Bird},{id:'sun',label:'Sol',icon:Sun},{id:'moon',label:'Luna',icon:Moon},
  {id:'mountain',label:'Montaña',icon:Mountain},{id:'wave',label:'Olas',icon:Waves},{id:'leaf',label:'Hoja',icon:Leaf},{id:'tree',label:'Árbol',icon:TreePine},{id:'music',label:'Música',icon:Music2},{id:'headphones',label:'Auriculares',icon:Headphones},
  {id:'palette',label:'Pintura',icon:Palette},{id:'camera',label:'Cámara',icon:Camera},{id:'gamepad',label:'Videojuegos',icon:Gamepad2},{id:'bike',label:'Bicicleta',icon:Bike},{id:'football',label:'Balón',icon:Volleyball},{id:'flask',label:'Laboratorio',icon:FlaskConical},
  {id:'atom',label:'Átomo',icon:Atom},{id:'telescope',label:'Telescopio',icon:Telescope},{id:'puzzle',label:'Puzle',icon:Puzzle},{id:'diamond',label:'Diamante',icon:Diamond},
];
type Props={student:any;size?:'small'|'normal'|'large';className?:string};
export default function ProfileAvatar({student,size='normal',className=''}:Props){
  const [failed,setFailed]=useState('');
  const selected=avatarOptions.find(option=>option.id===student?.avatar),Icon=selected?.icon;
  const color=studentColors[student?.color]||studentColors[student?.id==='teacher'?'blue':student?.id==='alejandra'?'teal':'violet'];
  const url=typeof student?.avatarUrl==='string'&&student.avatarUrl.startsWith(`/api/profiles/${encodeURIComponent(student.id)}/avatar`)?student.avatarUrl:'';
  useEffect(()=>{setFailed('');const recovered=(event:Event)=>{if((event as CustomEvent).detail?.profile===student?.id)setFailed('')};window.addEventListener('arp:resume-ready',recovered);return()=>window.removeEventListener('arp:resume-ready',recovered)},[url,student?.avatar,student?.id]);
  const photo=student?.avatar==='photo'&&url&&failed!==url;
  const initial=(student?.name||({rocio:'Rocío',alejandra:'Alejandra',teacher:'Pablo'} as Record<string,string>)[student?.id]||'A').slice(0,1);
  return <span className={`profile-avatar profile-avatar--${size} ${className}`} style={{background:color.color,color:'#fff'}} aria-hidden="true">{photo?<img src={url} alt="" draggable={false} decoding="async" onError={()=>setFailed(url)}/>:Icon&&selected.id!=='initials'?<Icon size={size==='large'?40:size==='small'?20:29}/>:<span>{initial}</span>}</span>;
}
