'use client';

import {useEffect, useRef, type CSSProperties} from 'react';
import {createPortal} from 'react-dom';
import {CircleCheck, CircleX} from 'lucide-react';
import {EXERCISE_SUCCESS_DELAY_MS} from '@/lib/exercise-return';
import {viewportFrame} from '@/lib/viewport-frame';
import './exercise-feedback.css';

export type ExerciseFeedback = {
  id: string;
  tone: 'success' | 'error';
  title: string;
  description: string;
};

export default function ExerciseFeedbackToast({feedback, onDismiss}: {feedback:ExerciseFeedback|null;onDismiss:()=>void}) {
  const dismiss = useRef(onDismiss), toast = useRef<HTMLDivElement>(null); dismiss.current = onDismiss;
  useEffect(() => {
    if (!feedback) return;
    const update = () => {
      const element=toast.current;if(!element)return;
      const frame=viewportFrame(window.visualViewport,window.innerWidth,window.innerHeight),header=document.querySelector('.topbar')?.getBoundingClientRect();
      const visibleHeaderBottom=header&&header.bottom>frame.top&&header.top<frame.top+frame.height?header.bottom:frame.top;
      const top=Math.min(Math.max(frame.top+12,visibleHeaderBottom+12),Math.max(frame.top+12,frame.top+frame.height-element.getBoundingClientRect().height-12));
      element.style.top=`${top}px`;element.style.left=`${frame.left+frame.width/2}px`;element.style.width=`${Math.min(440,Math.max(0,frame.width-28))}px`;
    };
    update();window.addEventListener('resize',update);window.addEventListener('orientationchange',update);window.visualViewport?.addEventListener('resize',update);window.visualViewport?.addEventListener('scroll',update);
    return()=>{window.removeEventListener('resize',update);window.removeEventListener('orientationchange',update);window.visualViewport?.removeEventListener('resize',update);window.visualViewport?.removeEventListener('scroll',update)};
  }, [feedback?.id]);
  useEffect(() => {
    if (!feedback || feedback.tone === 'success') return;
    const timer = setTimeout(() => dismiss.current(), 4500);
    return () => clearTimeout(timer);
  }, [feedback?.id, feedback?.tone]);
  if (!feedback || typeof document === 'undefined') return null;
  const success = feedback.tone === 'success', Icon = success ? CircleCheck : CircleX;
  return createPortal(<div ref={toast} key={feedback.id} className={`exercise-feedback-toast ${feedback.tone}`} role={success ? 'status' : 'alert'} aria-atomic="true" style={{'--exercise-feedback-duration':`${EXERCISE_SUCCESS_DELAY_MS}ms`} as CSSProperties}>
    <span className="exercise-feedback-icon" aria-hidden="true"><Icon size={28} strokeWidth={2}/></span>
    <div className="exercise-feedback-copy"><strong>{feedback.title}</strong><p>{feedback.description}</p></div>
    {success && <span className="exercise-feedback-progress" aria-hidden="true"><span/></span>}
  </div>, document.body);
}
