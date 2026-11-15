import {test} from 'node:test';
import assert from 'node:assert/strict';
import {buildMathEntry,insertMathEntry,isMathSubject} from '../lib/math-answer.ts';

test('fraction entry trims outer whitespace, normalizes minus and preserves exact integers',()=>{
  assert.deepEqual(buildMathEntry('fraction',' 3 ',' 4 '),{text:'3/4',error:null});
  assert.deepEqual(buildMathEntry('fraction',' −3 ','−4'),{text:'-3/-4',error:null});
  assert.deepEqual(buildMathEntry('fraction','+3','+4'),{text:'+3/+4',error:null});
  assert.deepEqual(buildMathEntry('fraction','0','8'),{text:'0/8',error:null});
  assert.deepEqual(buildMathEntry('fraction','18','24'),{text:'18/24',error:null}); // No simplification.
});

test('fraction denominators reject every signed zero representation without evaluating anything',()=>{
  for(const zero of ['0','-0','−0','+0','000','-000','+000']){
    const result=buildMathEntry('fraction','1',zero);
    assert.equal(result.text,null);assert.match(result.error,/denominador.*0/);
  }
});

test('powers preserve negative-base precedence and allow zero or signed exponents as notation',()=>{
  assert.deepEqual(buildMathEntry('power','2','3'),{text:'2^3',error:null});
  assert.deepEqual(buildMathEntry('power','−2','3'),{text:'(-2)^3',error:null});
  assert.deepEqual(buildMathEntry('power','-2','-4'),{text:'(-2)^-4',error:null});
  assert.deepEqual(buildMathEntry('power','10',' −2 '),{text:'10^-2',error:null});
  assert.deepEqual(buildMathEntry('power','0','0'),{text:'0^0',error:null}); // Entry is not evaluation.
  assert.deepEqual(buildMathEntry('power','0','-1'),{text:'0^-1',error:null});
});

test('root entry accepts one bounded nonnegative integer without simplifying or evaluating it',()=>{
  assert.deepEqual(buildMathEntry('root','49'),{text:'√49',error:null});
  assert.deepEqual(buildMathEntry('root','  +49  '),{text:'√49',error:null});
  assert.deepEqual(buildMathEntry('root','0'),{text:'√0',error:null});
  assert.deepEqual(buildMathEntry('root','2'),{text:'√2',error:null});
  assert.deepEqual(buildMathEntry('root','00049','  '),{text:'√00049',error:null});
  assert.deepEqual(buildMathEntry('root','123456789012'),{text:'√123456789012',error:null});
  for(const invalid of ['-9','−9','-0','−0','',' ','1.5','1,5','2+3','2^3','√49','(49)','x','□','Infinity','1e3','Math.sqrt(49)','1234567890123']){
    const result=buildMathEntry('root',invalid);
    assert.equal(result.text,null,invalid);assert.equal(typeof result.error,'string');
  }
  for(const second of ['3','0','x','<script>'])assert.equal(buildMathEntry('root','49',second).text,null);
});

test('entry rejects incomplete, decimal, symbolic, compound and executable text',()=>{
  for(const invalid of ['', ' ','1.5','1,5','1 2','1e3','2^3','2³','(2)','--2','− 2','2/3','□','x','<script>','Math.pow(2,3)']){
    for(const kind of ['fraction','power']){
      assert.equal(buildMathEntry(kind,invalid,'2').text,null,`${kind} first ${invalid}`);
      assert.equal(buildMathEntry(kind,'2',invalid).text,null,`${kind} second ${invalid}`);
    }
  }
  assert.equal(buildMathEntry('unknown','2','3').text,null);
});

test('per-part digit limits exclude signs and are validated before any computation',()=>{
  assert.equal(buildMathEntry('fraction','-123456789012','123456789012').text,'-123456789012/123456789012');
  assert.equal(buildMathEntry('power','123456789012','-123456').text,'123456789012^-123456');
  assert.equal(buildMathEntry('fraction','1234567890123','4').text,null);
  assert.equal(buildMathEntry('fraction','3','1234567890123').text,null);
  assert.equal(buildMathEntry('power','1234567890123','4').text,null);
  assert.equal(buildMathEntry('power','3','1234567').text,null);
});

test('insertion replaces exactly the selected range and returns the caret after the inserted notation',()=>{
  assert.deepEqual(insertMathEntry('Respuesta: x.',11,12,'3/4',100),{value:'Respuesta: 3/4.',start:14,end:14,inserted:true});
  assert.deepEqual(insertMathEntry('abc',1,1,'2^3',6),{value:'a2^3bc',start:4,end:4,inserted:true});
  assert.deepEqual(insertMathEntry('3/4',0,3,'3/4',3),{value:'3/4',start:3,end:3,inserted:true});
});

test('multiplication and division signs insert literally at the cursor or replace only the selection',()=>{
  for(const operator of ['×','÷']){
    const replace=insertMathEntry('4?2',1,2,operator,3);
    assert.deepEqual(replace,{value:`4${operator}2`,start:2,end:2,inserted:true});
    assert.deepEqual(insertMathEntry('42',1,1,operator,3),replace);
    assert.deepEqual(JSON.parse(JSON.stringify({answer:replace.value})),{answer:`4${operator}2`});
    assert.deepEqual(insertMathEntry('42',1,1,operator,2),{value:'42',start:1,end:1,inserted:false});
    assert.deepEqual(insertMathEntry('4?',1,2,operator,2),{value:`4${operator}`,start:2,end:2,inserted:true});
    assert.deepEqual(insertMathEntry('4',null,null,operator,2),{value:`4${operator}`,start:2,end:2,inserted:true});
  }
  assert.deepEqual(insertMathEntry('Resultado: x.',11,12,buildMathEntry('root','49').text,100),{value:'Resultado: √49.',start:14,end:14,inserted:true});
});

test('parentheses insert without padding while addition and equality retain their surrounding spaces',()=>{
  const original='Antes x después',start=original.indexOf('x');
  for(const [symbol,expected]of [['(','Antes ( después'],[')','Antes ) después'],[' + ','Antes  +  después'],[' = ','Antes  =  después']]){
    const result=insertMathEntry(original,start,start+1,symbol,100);
    assert.deepEqual(result,{value:expected,start:start+symbol.length,end:start+symbol.length,inserted:true});
    assert.equal(JSON.parse(JSON.stringify({answer:result.value})).answer,expected);
    assert.deepEqual(insertMathEntry(original,start,start,symbol,original.length),{value:original,start,end:start,inserted:false});
    const atLimit=insertMathEntry(original,start,start,symbol,original.length+symbol.length);
    assert.equal(atLimit.inserted,true);assert.equal(atLimit.value.length,original.length+symbol.length);
    assert.equal(atLimit.value.slice(0,start),'Antes ');assert.equal(atLimit.value.slice(atLimit.end),'x después');
  }
});

test('successive symbol insertions preserve the full calculation and caret without evaluating it',()=>{
  let state=insertMathEntry('2?3',1,2,' + ',11);
  assert.deepEqual(state,{value:'2 + 3',start:4,end:4,inserted:true});
  state=insertMathEntry(state.value,0,0,'(',11);
  assert.deepEqual(state,{value:'(2 + 3',start:1,end:1,inserted:true});
  state=insertMathEntry(state.value,state.value.length,state.value.length,')',11);
  assert.deepEqual(state,{value:'(2 + 3)',start:7,end:7,inserted:true});
  state=insertMathEntry(state.value,state.start,state.end,' = ',11);
  assert.deepEqual(state,{value:'(2 + 3) = ',start:10,end:10,inserted:true});
  state=insertMathEntry(state.value,state.start,state.end,'5',11);
  assert.deepEqual(state,{value:'(2 + 3) = 5',start:11,end:11,inserted:true});
  assert.deepEqual(insertMathEntry(state.value,state.start,state.end,' + ',11),{...state,inserted:false});
});

test('unknown selections append; finite offsets are safely clamped and ordered',()=>{
  for(const [start,end]of [[null,null],[1,null],[null,2],[NaN,1],[1,Infinity]])assert.deepEqual(insertMathEntry('A',start,end,'3/4',4),{value:'A3/4',start:4,end:4,inserted:true});
  assert.deepEqual(insertMathEntry('abc',-10,100,'2/3',3),{value:'2/3',start:3,end:3,inserted:true});
  assert.deepEqual(insertMathEntry('abcd',3,1,'2/3',5),{value:'a2/3d',start:4,end:4,inserted:true});
  assert.deepEqual(insertMathEntry('abc',1.9,2.1,'2/3',5),{value:'a2/3c',start:4,end:4,inserted:true});
});

test('limits never truncate existing work and permit a deliberate replacement that fits',()=>{
  const work='Procedimiento que ya estaba escrito';
  assert.deepEqual(insertMathEntry(work,3,3,'2^3',work.length),{value:work,start:3,end:3,inserted:false});
  assert.deepEqual(insertMathEntry(work,null,null,'2^3',3),{value:work,start:work.length,end:work.length,inserted:false});
  assert.deepEqual(insertMathEntry('123456789',0,9,'3/4',3),{value:'3/4',start:3,end:3,inserted:true});
  for(const limit of [NaN,Infinity,-1])assert.equal(insertMathEntry(work,0,work.length,'3/4',limit).value,work);
  assert.deepEqual(insertMathEntry('abc',0,3,'',3),{value:'abc',start:0,end:3,inserted:false});
});

test('UTF-16 insertion agrees with textarea offsets and maxLength while retaining Unicode prose',()=>{
  const value='😀 Rocío: ';
  const result=insertMathEntry(value,value.length,value.length,'3/4',value.length+3);
  assert.equal(result.value,'😀 Rocío: 3/4');assert.equal(result.start,result.value.length);
  assert.equal(insertMathEntry(value,null,null,'3/4',value.length+2).value,value);
});

test('math-subject filtering matches the existing mathematical display boundary',()=>{
  for(const subject of ['Matemáticas','MATEMATICAS','Matema\u0301ticas','Matemáticas de 6.º','Física y química','FISICA Y QUIMICA'])assert.equal(isMathSubject(subject),true,subject);
  for(const subject of [undefined,'','Lengua','Inglés','Tecnología','Física','MatematicasExtra','Química',' Matemáticas'])assert.equal(isMathSubject(subject),false,String(subject));
});
