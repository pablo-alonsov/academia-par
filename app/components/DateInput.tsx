'use client';
import {useEffect,useRef,type FormEvent,type InputHTMLAttributes} from 'react';

type Props=Omit<InputHTMLAttributes<HTMLInputElement>,'type'|'value'|'onInput'|'onChange'> & {value:string;onValueChange:(value:string)=>void};
/** Capture native picker edits before a mobile dialog is dismissed or suspended. */
export default function DateInput({value,onValueChange,onBlur,...props}:Props){
  const emitted=useRef(value);
  useEffect(()=>{emitted.current=value},[value]);
  const report=(event:FormEvent<HTMLInputElement>)=>{const next=event.currentTarget.value;if(next!==emitted.current){emitted.current=next;onValueChange(next)}};
  return <input {...props} type="date" value={value} onInput={report} onChange={report} onBlur={event=>{report(event);onBlur?.(event)}}/>;
}
