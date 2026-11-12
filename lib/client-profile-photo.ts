'use client';

import {avatarCrop} from './avatar-crop';
import {detectImageType} from './upload-format';

export const AVATAR_PHOTO_ACCEPT='image/jpeg,image/png,image/webp,image/heic,image/heif,.jpg,.jpeg,.png,.webp,.heic,.heif';
const MAX_ORIGINAL=20*1024*1024,MAX_OUTPUT=2*1024*1024;
const allowedTypes=new Set(['image/jpeg','image/png','image/webp','image/heic','image/heif']);
class ProfilePhotoError extends Error {}

/** Re-encoding the pixels removes the original file's EXIF and other metadata. */
export async function prepareProfilePhoto(file:File):Promise<File>{
  if(!file.size)throw new ProfilePhotoError('La foto está vacía. Elige otra foto en JPG o PNG.');
  if(file.size>MAX_ORIGINAL)throw new ProfilePhotoError('La foto supera los 20 MB. Elige una foto de menor tamaño.');
  let type:string|null;
  try{type=detectImageType(new Uint8Array(await file.slice(0,256).arrayBuffer()));}
  catch{throw new ProfilePhotoError('No se ha podido leer la foto. Vuelve a seleccionarla.');}
  if(!type||!allowedTypes.has(type))throw new ProfilePhotoError('Elige una foto JPG, PNG, WebP, HEIC o HEIF. No se admiten SVG, GIF ni vídeos.');

  let image:HTMLImageElement|undefined,canvas:HTMLCanvasElement|undefined,url='';
  try{
    // Use the verified format even when the picker supplies an empty or wrong MIME.
    url=URL.createObjectURL(new Blob([file],{type}));image=new Image();
    await new Promise<void>((resolve,reject)=>{image!.onload=()=>resolve();image!.onerror=()=>reject(new ProfilePhotoError('Este navegador no ha podido abrir la foto. Elige otra foto en JPG o PNG.'));image!.src=url;});
    const crop=avatarCrop(image.naturalWidth,image.naturalHeight);
    canvas=document.createElement('canvas');canvas.width=crop.outputSize;canvas.height=crop.outputSize;
    const context=canvas.getContext('2d');
    if(!context)throw new ProfilePhotoError('No se ha podido preparar la foto en este navegador. Prueba con otra foto JPG o PNG.');
    context.fillStyle='#fff';context.fillRect(0,0,crop.outputSize,crop.outputSize);
    context.imageSmoothingEnabled=true;context.imageSmoothingQuality='high';
    context.drawImage(image,crop.sourceX,crop.sourceY,crop.sourceSize,crop.sourceSize,0,0,crop.outputSize,crop.outputSize);
    const blob=await new Promise<Blob>((resolve,reject)=>canvas!.toBlob(value=>value?resolve(value):reject(new ProfilePhotoError('No se ha podido preparar la foto. Elige otra foto en JPG o PNG.')),'image/jpeg',.9));
    if(blob.type!=='image/jpeg'||!blob.size)throw new ProfilePhotoError('Este navegador no ha podido convertir la foto a JPG. Prueba con otra foto.');
    if(blob.size>MAX_OUTPUT)throw new ProfilePhotoError('La foto preparada supera los 2 MB. Elige otra foto de menor tamaño.');
    return new File([blob],'perfil.jpg',{type:'image/jpeg'});
  }catch(error){
    if(error instanceof ProfilePhotoError)throw error;
    throw new ProfilePhotoError('No se ha podido preparar la foto. Elige otra foto en JPG o PNG.');
  }finally{
    if(image){image.onload=null;image.onerror=null;}
    if(url)URL.revokeObjectURL(url);
    if(canvas){canvas.width=0;canvas.height=0;}
  }
}
