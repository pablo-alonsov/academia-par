const subjectKey=(value:string)=>{const key=value.normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().replace(/\s+/g,' ').toLocaleLowerCase('es');return key==='fyq'?'fisica y quimica':key;};
const knowledge='Conocimiento del Medio';
const science='Física y química';

/** Options for the exam draft; existing saved exams are never rewritten. */
export function examSubjectsForStudent(names:readonly string[],studentId:string):string[]{
  const rocio=studentId==='rocio',seen=new Set<string>(),result:string[]=[];
  const add=(name:string)=>{const value=name.trim(),key=subjectKey(value);if(value&&!seen.has(key)){seen.add(key);result.push(value);}};
  for(const name of names){
    const key=subjectKey(name);
    if(key===subjectKey(science))add(rocio?knowledge:science);
    else if(key===subjectKey(knowledge)){if(rocio)add(knowledge);}
    else add(name);
  }
  add(rocio?knowledge:science);
  return result;
}

export function retainedExamSubject(names:readonly string[],studentId:string,value:string):string{
  if(studentId==='rocio'&&subjectKey(value)===subjectKey(science))return '';
  return examSubjectsForStudent(names,studentId).find(name=>subjectKey(name)===subjectKey(value)) || value.trim();
}
