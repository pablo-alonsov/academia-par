type Item=Record<string,any>;

/** Retired enunciados stay available to their historical classes and responses. */
export const isCurrentPractice=(item:Item)=>item.practiceRetired!==true;

export function practiceSearch(value:unknown):string{
  return String(value??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('es').replace(/\b(rl|rm|ri|am|af|al)[\s-]*(\d{1,2})\b/g,(_,prefix,digits)=>prefix+digits.padStart(2,'0')).replace(/\b(rl|rm|ri|am|af|al)[\s-]*$/g,'$1').trim();
}

const groups:Record<string,number>={rl:0,rm:1,ri:2,am:0,af:1,al:2};
export function comparePractice(a:Item,b:Item):number{
  const group=(item:Item)=>groups[String(item.title||'').match(/^([A-Za-z]{2})-\d+/)?.[1]?.toLowerCase()||'']??3;
  return group(a)-group(b)||String(a.title||'').localeCompare(String(b.title||''),'es',{numeric:true});
}
