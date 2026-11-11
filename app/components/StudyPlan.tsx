import { BookOpen, CalendarDays } from 'lucide-react';
type TopicPlan={subject:string;topics:string;scope?:string;term?:string};
export default function StudyPlan({plan=[]}:{plan?:TopicPlan[]}){
 if(!plan.length)return null;
 return <section className="card study-plan"><div className="card-head"><div><span className="eyebrow">CONTENIDOS PREVISTOS</span><h3>Plan de trabajo</h3></div><BookOpen size={19} className="muted"/></div><div className="study-plan-grid">{plan.map((item,index)=><article key={`${item.subject}:${index}`} className={item.term==='Segundo trimestre'?'study-plan-item later':'study-plan-item'}><div className="row between"><strong>{item.subject}</strong>{item.term&&<span className={`badge ${item.term==='Segundo trimestre'?'':'violet'}`}>{item.term==='Segundo trimestre'&&<CalendarDays size={11}/>}{item.term}</span>}</div><p>{item.topics}</p>{item.scope&&<small>{item.scope}</small>}</article>)}</div></section>;
}
