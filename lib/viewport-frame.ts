export function viewportFrame(viewport:{width:number;height:number;offsetTop:number;offsetLeft:number}|null|undefined,width:number,height:number){
  const positive=(value:number|undefined,fallback:number)=>Number.isFinite(value)&&Number(value)>0?Number(value):fallback;
  const offset=(value:number|undefined)=>Number.isFinite(value)?Math.max(0,Number(value)):0;
  return {width:positive(viewport?.width,width),height:positive(viewport?.height,height),top:offset(viewport?.offsetTop),left:offset(viewport?.offsetLeft)};
}
