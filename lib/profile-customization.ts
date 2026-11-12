/** Stable preference IDs shared by the UI and server validation. */
export const studentColors:Record<string,{label:string;color:string;soft:string}>={
  violet:{label:'Violeta',color:'#6751a8',soft:'#eee9fa'},
  blue:{label:'Azul',color:'#285ca8',soft:'#e7effb'},
  teal:{label:'Verde azulado',color:'#1e7164',soft:'#e0f2ec'},
  rose:{label:'Rosa',color:'#a83c65',soft:'#f9e6ed'},
  amber:{label:'Ámbar',color:'#8c601f',soft:'#fcf0d9'},
  indigo:{label:'Índigo',color:'#4338ca',soft:'#eae9fd'},
  purple:{label:'Morado',color:'#7e22ce',soft:'#f2e8fc'},
  pink:{label:'Fucsia',color:'#be185d',soft:'#fce7f0'},
  red:{label:'Rojo',color:'#b91c1c',soft:'#fee9e9'},
  orange:{label:'Naranja',color:'#b54708',soft:'#fff0e2'},
  green:{label:'Verde oliva',color:'#3f6212',soft:'#edf5df'},
  emerald:{label:'Esmeralda',color:'#047857',soft:'#dcf5e9'},
  cyan:{label:'Turquesa',color:'#0e7490',soft:'#e0f5f9'},
  sky:{label:'Azul cielo',color:'#0369a1',soft:'#e1f1fc'},
  slate:{label:'Pizarra',color:'#475569',soft:'#eaf0f5'},
  graphite:{label:'Grafito',color:'#3f3f46',soft:'#ededf0'},
};
export const PROFILE_COLORS=Object.keys(studentColors);
export const PROFILE_AVATARS=['initials','book','star','planet','flower','rocket','cat','dog','rabbit','bird','sun','moon','mountain','wave','leaf','tree','music','headphones','palette','camera','gamepad','bike','football','flask','atom','telescope','puzzle','diamond'] as const;
