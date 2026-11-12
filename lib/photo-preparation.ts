export function photoDimensions(width:number,height:number,maxEdge=2560){
  if(!Number.isFinite(width)||!Number.isFinite(height)||width<=0||height<=0)throw Error('No se han podido leer las dimensiones de la foto.');
  const ratio=Math.min(1,maxEdge/Math.max(width,height));
  return {width:Math.max(1,Math.round(width*ratio)),height:Math.max(1,Math.round(height*ratio))};
}
export function jpegName(name:string){return `${name.replace(/\.[^.]+$/,'').replace(/^\.+/,'').trim()||'foto'}.jpg`;}
