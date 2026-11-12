/** Square source area and output size for a centred crop without upscaling. */
export function avatarCrop(width:number,height:number,max=512){
  if(![width,height,max].every(value=>Number.isSafeInteger(value)&&value>0))throw Error('No se han podido leer las dimensiones de la foto.');
  const sourceSize=Math.min(width,height);
  return {sourceX:(width-sourceSize)/2,sourceY:(height-sourceSize)/2,sourceSize,outputSize:Math.min(sourceSize,max)};
}
