import {test} from 'node:test';
import assert from 'node:assert/strict';
import {tokenizeMathText as tokenize} from '../lib/math-notation.ts';

const text=value=>({type:'text',text:value});
const fraction=(numerator,denominator,spoken=`${numerator} dividido entre ${denominator}`)=>({type:'fraction',numerator,denominator,spoken});
const power=(base,exponent,spoken=`${base} elevado a ${exponent}`)=>({type:'power',base,exponent,spoken});
const root=radicand=>({type:'root',radicand,spoken:`raíz cuadrada de ${radicand}`});
const plain=value=>assert.deepEqual(tokenize(value),value?[text(value)]:[]);

test('ordinary prose, written numbers, HTML-like input and empty text are unchanged',()=>{
  for(const input of ['', 'cinco octavos de ciento veinte', 'Un tercio de 24 son 8.', '2 + 3 = 5; x = 2', '¿Dónde está Rocío?\nAquí.', '<img src=x onerror="alert(1)">'])plain(input);
});

test('integer fractions retain surrounding text and provide a Spanish accessible reading',()=>{
  assert.deepEqual(tokenize('Calcula 5/8 de 120.'),[text('Calcula '),fraction('5','8'),text(' de 120.')]);
  assert.deepEqual(tokenize('1/3 + 1/4 = 7/12'),[fraction('1','3'),text(' + '),fraction('1','4'),text(' = '),fraction('7','12')]);
  assert.deepEqual(tokenize('(18 / 24)'),[text('('),fraction('18','24'),text(')')]);
  assert.deepEqual(tokenize('2/0'),[fraction('2','0')]); // Presentation, never evaluation.
});

test('fraction signs preserve unary signs and leave binary operators outside the numerator',()=>{
  assert.deepEqual(tokenize('-3/4 + 5/6'),[fraction('-3','4','menos 3 dividido entre 4'),text(' + '),fraction('5','6')]);
  assert.deepEqual(tokenize('−3/4'),[fraction('−3','4','menos 3 dividido entre 4')]);
  assert.deepEqual(tokenize('3/−4'),[fraction('3','−4','3 dividido entre menos 4')]);
  assert.deepEqual(tokenize('+3/+4'),[fraction('+3','+4','más 3 dividido entre más 4')]);
  assert.deepEqual(tokenize('2-3/4'),[text('2-'),fraction('3','4')]);
  assert.deepEqual(tokenize('2 − 3/4'),[text('2 − '),fraction('3','4')]);
  assert.deepEqual(tokenize('2 + -3/4'),[text('2 + '),fraction('-3','4','menos 3 dividido entre 4')]);
});

test('caret powers distinguish a negative base from the negative of a power',()=>{
  assert.deepEqual(tokenize('2^3'),[power('2','3')]);
  assert.deepEqual(tokenize('10^(-2)'),[power('10','-2','10 elevado a menos 2')]);
  assert.deepEqual(tokenize('10^−2'),[power('10','−2','10 elevado a menos 2')]);
  assert.deepEqual(tokenize('(-2)^4'),[power('(-2)','4','menos 2 entre paréntesis elevado a 4')]);
  assert.deepEqual(tokenize('-2^4'),[text('-'),power('2','4')]);
  assert.deepEqual(tokenize('(−2)^4 − −2^4'),[power('(−2)','4','menos 2 entre paréntesis elevado a 4'),text(' − −'),power('2','4')]);
  assert.deepEqual(tokenize('2 ^ (+3)'),[power('2','+3','2 elevado a más 3')]);
});

test('parenthesized fractional powers preserve the base, sign and negative exponent as one token',()=>{
  assert.deepEqual(tokenize('(-2/3)^2'),[{type:'power',base:'(-2/3)',exponent:'2',spoken:'menos 2 dividido entre 3 entre paréntesis elevado a 2',fractionBase:{numerator:'-2',denominator:'3'}}]);
  assert.deepEqual(tokenize('(1/2)^(-1)'),[{type:'power',base:'(1/2)',exponent:'-1',spoken:'1 dividido entre 2 entre paréntesis elevado a menos 1',fractionBase:{numerator:'1',denominator:'2'}}]);
  assert.deepEqual(tokenize('(−1/2)^(-2)'),[{type:'power',base:'(−1/2)',exponent:'-2',spoken:'menos 1 dividido entre 2 entre paréntesis elevado a menos 2',fractionBase:{numerator:'−1',denominator:'2'}}]);
  assert.deepEqual(tokenize('−(2/3)^2'),[text('−'),{type:'power',base:'(2/3)',exponent:'2',spoken:'2 dividido entre 3 entre paréntesis elevado a 2',fractionBase:{numerator:'2',denominator:'3'}}]);
  assert.deepEqual(tokenize('( 3 / −4 )⁻²'),[{type:'power',base:'( 3 / −4 )',exponent:'−2',spoken:'3 dividido entre menos 4 entre paréntesis elevado a menos 2',fractionBase:{numerator:'3',denominator:'−4'}}]);
});

test('a fractional power keeps the surrounding operation order and does not evaluate it',()=>{
  const tokens=tokenize('((−1/2)^(-2) − 3) ÷ ((3/2)^(-1) + 1/6)');
  assert.deepEqual(tokens.map(token=>token.type),['text','power','text','power','text','fraction','text']);
  assert.deepEqual(tokens.filter(token=>token.type==='text').map(token=>token.text),['(', ' − 3) ÷ (', ' + ', ')']);
  assert.deepEqual(tokens.filter(token=>token.type==='power').map(token=>[token.base,token.exponent]),[['(−1/2)','-2'],['(3/2)','-1']]);
  for(const input of ['(1/2 + 1)^2','((1/2))^2','(1.5/2)^2','(1/2.5)^2','(1234567890123/2)^2','(1/2)^1234567','(03/04)^2','1/(2/3)^2'])plain(input);
});

test('explicit empty boxes are complete fraction parts or exponents with meaningful accessible labels',()=>{
  assert.deepEqual(tokenize('3/5 = □/20'),[fraction('3','5'),text(' = '),fraction('□','20','casilla dividido entre 20')]);
  assert.deepEqual(tokenize('3/□'),[fraction('3','□','3 dividido entre casilla')]);
  assert.deepEqual(tokenize('□/□'),[fraction('□','□','casilla dividido entre casilla')]);
  assert.deepEqual(tokenize('10^□ = 1000'),[power('10','□','10 elevado al exponente que falta'),text(' = 1000')]);
  for(const input of ['2□/20','□2/20','3/4□','x/20','10^x','10^(□+1)','□^3'])plain(input);
});

test('Unicode superscript digits support multiple digits, numeric signs and positive school units',()=>{
  assert.deepEqual(tokenize('2², 3³ y 4⁴.'),[power('2','2'),text(', '),power('3','3'),text(' y '),power('4','4'),text('.')]);
  assert.deepEqual(tokenize('2¹⁰ + 10⁻²'),[power('2','10'),text(' + '),power('10','−2','10 elevado a menos 2')]);
  assert.deepEqual(tokenize('40 cm³; 3 g/cm³ y 2 m²'),[text('40 '),power('cm','3'),text('; 3 g/'),power('cm','3'),text(' y 2 '),power('m','2')]);
  assert.deepEqual(tokenize('cm^3 y x²'),[power('cm','3'),text(' y '),power('x','2')]);
  assert.deepEqual(tokenize('(-2)⁴'),[power('(-2)','4','menos 2 entre paréntesis elevado a 4')]);
  plain('cm⁻³');plain('palabra²');
});

test('simple integer roots are displayed without computing a result or changing the radicand',()=>{
  assert.deepEqual(tokenize('√49 = 7'),[root('49'),text(' = 7')]);
  assert.deepEqual(tokenize('√(49) y √ 16'),[root('49'),text(' y '),root('16')]);
  assert.deepEqual(tokenize('√2'),[root('2')]);
  assert.deepEqual(tokenize('√(-9)'),[{type:'root',radicand:'-9',spoken:'raíz cuadrada de menos 9'}]);
});

test('unsupported compound formulae remain literal without styling a misleading inner fragment',()=>{
  for(const input of ['1/(-3)','1/(2/3)','1/(2^3)','(-3)/4','2^(3+1)','2^3^4','(2^3)^2','(2^3)²','2 ^ (3+1)','2^(3^4)','2^((3+1))','√(a)','√(4+5)','√(2+√4)','√(2^3)','1/2/3','1 / 2 / 3','2^3/4','1/2^3','√4^2','√1/2','2^(3+1'])plain(input);
});

test('decimals, longer identifiers and partial numeric fragments are not rewritten',()=>{
  for(const input of ['1.5/2','1,5/2','1/2.5','1/2,5','2.5^3','2,5²','√49.5','a1/2','1/2b','a2^3','2^3b','2²m','abc2³'])plain(input);
  assert.deepEqual(tokenize('La respuesta es 3/4.'),[text('La respuesta es '),fraction('3','4'),text('.')]);
});

test('absolute, bare-domain and supported relative URLs and emails remain byte-for-byte literal',()=>{
  for(const input of ['https://ejemplo.es/3/4?valor=2^3#√49','http://ejemplo.es/cm³','www.ejemplo.es/1/2','ejemplo.es/2^3','/api/files/3/4','/assets/cm³','alumna2^3@ejemplo.es'])plain(input);
  assert.deepEqual(tokenize('Abre https://ejemplo.es/3/4 y calcula 5/8.'),[text('Abre https://ejemplo.es/3/4 y calcula '),fraction('5','8'),text('.')]);
});

test('dates and ambiguous padded or calendar-labelled fractions remain literal',()=>{
  for(const input of ['17/11/2026','2026/11/17','2026-11-17','2026/11','2026-11','03/04','3/04','03/4','Fecha: 3/4','examen el 17/11','lunes 3/4','desde el 5/6'])plain(input);
  assert.deepEqual(tokenize('Fecha: 17/11/2026. Después calcula 3/4.'),[text('Fecha: 17/11/2026. Después calcula '),fraction('3','4'),text('.')]);
});

test('oversized numbers and exponents stay as text instead of producing oversized math boxes',()=>{
  for(const input of ['1234567890123/4','3/1234567890123','1234567890123^2','2^1234567','2¹²³⁴⁵⁶⁷','√1234567890123'])plain(input);
  assert.deepEqual(tokenize('123456789012/4'),[fraction('123456789012','4')]);
  assert.deepEqual(tokenize('2^123456'),[power('2','123456')]);
});

test('mixed notation remains deterministic and preserves every ordinary text segment',()=>{
  const input='Datos:\n 5/8 de 120; 10^(-2), √49 y 40 cm³.\nNo calcular: 2^(3+1).';
  const tokens=tokenize(input);
  assert.deepEqual(tokens,tokenize(input));
  assert.deepEqual(tokens.filter(token=>token.type==='text').map(token=>token.text),['Datos:\n ',' de 120; ', ', ', ' y 40 ', '.\nNo calcular: 2^(3+1).']);
  assert.ok(tokens.every(token=>!Object.hasOwn(token,'html')));
});
