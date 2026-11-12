import test from 'node:test';
import assert from 'node:assert/strict';
import {detectImageType,detectUploadType,isDocx,DOCX_MIME} from '../lib/upload-format.ts';
import {png,docx,docxEntries,zip,heif} from './upload-fixtures.mjs';

test('photo signatures work with a short prefix, including original HEIC/HEIF',()=>{
 for(const [bytes,type]of [[png,'image/png'],[Buffer.from([0xff,0xd8,0xff,0xe0]),'image/jpeg'],[Buffer.from('GIF89a'),'image/gif'],[Buffer.from('RIFF0000WEBP'),'image/webp'],[heif(),'image/heic'],[heif('mif1'),'image/heif']])assert.equal(detectImageType(bytes.subarray(0,64)),type);
 for(const bytes of [Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"/>'),heif('avif'),heif('mp42').subarray(0,16),png.subarray(0,7)])assert.equal(detectImageType(bytes),null);
});
test('binary content, rather than missing or misleading provider MIME, selects the safe type',()=>{
 for(const type of ['', 'application/octet-stream', 'image/jpeg'])assert.equal(detectUploadType(png,'cámara.png',type),'image/png');
 assert.equal(detectUploadType(Buffer.from('%PDF-1.7\n%%EOF'),'ficha.pdf','application/octet-stream'),'application/pdf');
 assert.equal(detectUploadType(heif(),'foto.HEIC',''),'image/heic');
 for(const [name,type]of [['imagen.png','image/png'],['foto.jpg','image/jpeg'],['archivo.svg','image/svg+xml'],['notas.txt','text/plain']])assert.equal(detectUploadType(Buffer.from('<svg><script>bad</script></svg>'),name,type),null);
});
test('plain text accepts UTF-8 accents and rejects binary, invalid UTF-8 and active markup',()=>{
 assert.equal(detectUploadType(Buffer.from('Rocío\nQué he aprendido\t¿por qué?'),'apuntes.TXT',''),'text/plain');
 assert.equal(detectUploadType(Buffer.from('Explicación'),'sin-extensión','text/plain;charset=utf-8'),'text/plain');
 for(const bytes of [Buffer.from([0xc3,0x28]),Buffer.from([0,1,2]),Buffer.from('<!doctype html><html>texto</html>')])assert.equal(detectUploadType(bytes,'notas.txt','text/plain'),null);
 assert.equal(detectUploadType(Buffer.from('unknown'),'unknown.bin','application/octet-stream'),null);
});
test('DOCX requires a bounded, unencrypted ZIP directory with its document parts',()=>{
 assert.equal(isDocx(docx),true);assert.equal(detectUploadType(docx,'trabajo.docx','application/octet-stream'),DOCX_MIME);
 assert.equal(isDocx(zip([...docxEntries,['word/área.xml','<x/>']])),true);
 for(const bytes of [zip([['other.txt','text']]),zip([docxEntries[0]]),zip([...docxEntries,['word/vbaProject.bin','macro']]),zip([...docxEntries,['../other.xml','escape']]),docx.subarray(0,docx.length-1)])assert.equal(isDocx(bytes),false);
 const encrypted=Buffer.from(docx),central=encrypted.indexOf(Buffer.from([0x50,0x4b,0x01,0x02]));encrypted.writeUInt16LE(0x801,central+8);assert.equal(isDocx(encrypted),false);
 const badOffset=Buffer.from(docx);badOffset.writeUInt32LE(0xffffffff,badOffset.length-6);assert.equal(isDocx(badOffset),false);
});
