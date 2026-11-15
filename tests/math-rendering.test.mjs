import test from 'node:test';
import assert from 'node:assert/strict';
import {registerHooks} from 'node:module';
import {readFileSync,existsSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import ts from 'typescript';
const root=new URL('../',import.meta.url);
registerHooks({
 resolve(specifier,context,next){
  if(specifier.endsWith('.css'))return {url:'data:text/javascript,export default {};',shortCircuit:true};
  if(specifier.startsWith('@/'))return next(new URL(specifier.slice(2)+'.ts',root).href,context);
  if(specifier.startsWith('.')&&context.parentURL?.startsWith(root.href)){
   const url=new URL(specifier,context.parentURL);
   for(const extension of ['.ts','.tsx'])if(!/\.tsx?$/.test(url.pathname)&&existsSync(fileURLToPath(url)+extension))return next(url.href+extension,context);
  }
  return next(specifier,context);
 },
 load(url,context,next){
  if(url.startsWith(root.href)&&/\.tsx?$/.test(url))return {format:'module',source:ts.transpileModule(readFileSync(fileURLToPath(url),'utf8'),{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2020,jsx:ts.JsxEmit.ReactJSX}}).outputText,shortCircuit:true};
  return next(url,context);
 }
});
const {default:MathText}=await import('../app/components/MathText.tsx');
const render=(children,subject='Matemáticas')=>renderToStaticMarkup(createElement(MathText,{subject,children}));
test('fractions render numerator and denominator with a single spoken math label',()=>{
 const html=render('5/8 de 120');
 assert.match(html,/role="math"/);assert.match(html,/aria-label="5 dividido entre 8"/);
 assert.match(html,/class="math-numerator" aria-hidden="true">5<\/span>/);
 assert.match(html,/class="math-denominator" aria-hidden="true">8<\/span>/);
 assert.ok(html.includes(' de 120'));
});
test('powers and roots use typographic markup and retain their accessible meaning',()=>{
 const html=render('2^3 y √49');
 assert.match(html,/<sup>3<\/sup>/);assert.match(html,/2 elevado a 3/);assert.match(html,/raíz cuadrada de 49/);
 assert.match(render('(-2)^4'),/\(-2\)<sup>4<\/sup>/);
 assert.ok(render('3 g/cm³','Física y química').includes('<sup>3</sup>'));
});
test('non-mathematical subjects and form source strings remain plain text',()=>{
 assert.equal(render('2^3 y 3/4','Lengua'),'2^3 y 3/4');
 assert.equal(renderToStaticMarkup(createElement(MathText,{children:'2^3 y 3/4'})),'2^3 y 3/4');
 assert.equal(render('','Matemáticas'),'');
});
test('teacher or pupil text is escaped rather than treated as HTML or executable input',()=>{
 const html=render('<script>alert(1)</script> 2^3 & 3/4');
 assert.ok(!html.includes('<script>'));assert.ok(html.includes('&lt;script&gt;alert(1)&lt;/script&gt;'));
 assert.ok(html.includes('&amp;'));assert.ok(html.includes('<sup>3</sup>'));
});

test('math answer fields preserve the editable source and preview the same stored answer',async()=>{
 const {default:MathAnswerField}=await import('../app/components/MathAnswerField.tsx');
 const html=renderToStaticMarkup(createElement(MathAnswerField,{label:'Respuesta',subject:'Matemáticas',value:'3/4 y 2^3; √49 × 2 ÷ 7',onChange:()=>{},multiline:true,allowExpressions:true}));
 assert.match(html,/<textarea[^>]*>3\/4 y 2\^3; √49 × 2 ÷ 7<\/textarea>/);
 assert.match(html,/math-fraction/);assert.match(html,/<sup>3<\/sup>/);assert.match(html,/math-root/);
 assert.match(html,/Fracción/);assert.match(html,/Potencia/);assert.match(html,/Raíz/);
 assert.match(html,/Insertar signo de multiplicación/);assert.match(html,/Insertar signo de división/);
 const plain=renderToStaticMarkup(createElement(MathAnswerField,{label:'Respuesta',subject:'Lengua',value:'Rocío',onChange:()=>{}}));
 assert.ok(plain.includes('Rocío'));assert.ok(!plain.includes('math-fraction'));assert.ok(!plain.includes('Potencia'));assert.ok(!plain.includes('Fracción'));assert.ok(!plain.includes('Insertar signo de multiplicación'));
 const numeric=renderToStaticMarkup(createElement(MathAnswerField,{label:'Resultado',subject:'Matemáticas',value:'6/8',onChange:()=>{},allowExpressions:false}));
 assert.match(numeric,/Fracción/);assert.ok(!numeric.includes('Potencia'));assert.ok(!numeric.includes('Raíz'));assert.ok(!numeric.includes('Insertar signo de división'));assert.ok(numeric.includes('value="6/8"'));
});

test('roots or multiplication alone trigger a readable preview without implying evaluation',async()=>{
 const {default:MathAnswerField}=await import('../app/components/MathAnswerField.tsx');
 for(const value of ['√49','2 × 3 ÷ 6']){
  const html=renderToStaticMarkup(createElement(MathAnswerField,{label:'Cálculo',subject:'Matemáticas',value,onChange:()=>{},multiline:true}));
  assert.match(html,/Así se verá/);assert.ok(!html.includes('Resultado automático correcto'));assert.ok(!html.includes('aria-live'));
 }
});
