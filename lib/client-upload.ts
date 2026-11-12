'use client';
import {detectImageType} from './upload-format';
import {photoDimensions,jpegName} from './photo-preparation';

export const UPLOAD_ACCEPT='image/jpeg,image/png,image/webp,image/gif,image/heic,image/heif,application/pdf,text/plain,application/vnd.openxmlformats-officedocument.wordprocessingml.document,.jpg,.jpeg,.png,.webp,.gif,.heic,.heif,.pdf,.txt,.docx';
export const UPLOAD_HELP='Fotos, PDF, TXT o DOCX. Hasta 8 MB por archivo enviado. Las fotos grandes se preparan para subirlas. HEIC se convierte a JPG cuando el navegador lo permite; si no, se conserva como original descargable.';
const MAX_FILE=8*1024*1024,MAX_PHOTO=20*1024*1024;
const prepared=new WeakMap<File,Promise<File>>();

async function prepare(file:File):Promise<File>{
  if(!file.size)throw Error('Este archivo está vacío. Selecciona otro archivo.');
  const head=new Uint8Array(await file.slice(0,256).arrayBuffer()),imageType=detectImageType(head);
  const canPrepare=imageType==='image/jpeg'||imageType==='image/heic'||imageType==='image/heif'||imageType==='image/png'&&file.size>MAX_FILE;
  if(file.size>(canPrepare?MAX_PHOTO:MAX_FILE))throw Error(canPrepare?'La foto supera los 20 MB. Elige una foto de menor tamaño.':'El archivo supera los 8 MB. Elige otro archivo o reduce su tamaño.');
  if(!canPrepare)return file;
  let image:HTMLImageElement|undefined,url='';
  try{
    url=URL.createObjectURL(file);image=new Image();
    await new Promise<void>((resolve,reject)=>{image!.onload=()=>resolve();image!.onerror=()=>reject(Error('No se ha podido abrir esta foto.'));image!.src=url;});
    const size=photoDimensions(image.naturalWidth,image.naturalHeight);
    if(imageType==='image/jpeg'&&size.width===image.naturalWidth&&size.height===image.naturalHeight&&file.size<=MAX_FILE)return file;
    const canvas=document.createElement('canvas');canvas.width=size.width;canvas.height=size.height;
    try{
      const context=canvas.getContext('2d');if(!context)throw Error('No se ha podido preparar esta foto.');
      context.fillStyle='#fff';context.fillRect(0,0,size.width,size.height);context.drawImage(image,0,0,size.width,size.height);
      const blob=await new Promise<Blob>((resolve,reject)=>canvas.toBlob(value=>value?resolve(value):reject(Error('No se ha podido preparar la foto.')),'image/jpeg',.92));
      if(blob.size>MAX_FILE)throw Error('La foto sigue superando los 8 MB. Elige una foto de menor tamaño.');
      if(blob.type!=='image/jpeg')throw Error('Este navegador no ha podido convertir la foto a JPG.');
      return new File([blob],jpegName(file.name),{type:blob.type,lastModified:file.lastModified});
    }finally{canvas.width=0;canvas.height=0;}
  }catch(error){
    // Keep a readable original when a browser lacks an image codec. The server
    // validates its actual format and serves HEIC/HEIF as an attachment.
    if(file.size<=MAX_FILE)return file;
    throw error instanceof Error?error:Error('No se ha podido preparar esta foto. Prueba con JPG o PNG.');
  }finally{if(image){image.onload=null;image.onerror=null;}if(url)URL.revokeObjectURL(url);}
}
export function prepareUploadFile(file:File):Promise<File>{
  let task=prepared.get(file);if(!task){task=prepare(file);prepared.set(file,task);task.catch(()=>prepared.delete(file));}return task;
}
