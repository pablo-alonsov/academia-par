"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { buildMathEntry, insertMathEntry, isMathSubject, type MathEntryKind } from "@/lib/math-answer";
import { tokenizeMathText } from "@/lib/math-notation";
import MathText from "./MathText";
import "./math-answer.css";

type Props = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  subject?: string;
  multiline?: boolean;
  rows?: number;
  maxLength?: number;
  allowPowers?: boolean;
  inputMode?: "text" | "decimal";
};
type Selection = { start: number | null; end: number | null };
const wholeInteger = /^[+\-−]?\d{1,12}$/;

/** The editable and submitted value always remains ordinary text. */
export default function MathAnswerField({ label, value, onChange, subject, multiline = false, rows = 4, maxLength = multiline ? 20000 : 1000, allowPowers = true, inputMode }: Props) {
  const id = useId(), mathematical = isMathSubject(subject);
  const field = useRef<HTMLInputElement | HTMLTextAreaElement>(null), firstField = useRef<HTMLInputElement>(null), secondField = useRef<HTMLInputElement>(null);
  const selection = useRef<Selection>({ start: null, end: null });
  const [kind, setKind] = useState<MathEntryKind | null>(null), [first, setFirst] = useState(""), [second, setSecond] = useState(""), [error, setError] = useState("");
  const showPreview = useMemo(() => mathematical && /[\/^²³⁰¹⁴⁵⁶⁷⁸⁹]/.test(value) && tokenizeMathText(value).some(token => token.type !== "text"), [mathematical, value]);
  const entry = kind ? buildMathEntry(kind, first, second) : null;
  const partNames = kind === "power" ? ["Base", "Exponente"] : ["Numerador", "Denominador"];
  const signNames = kind === "power" ? ["de la base", "del exponente"] : ["del numerador", "del denominador"];
  const disabled = () => !field.current || field.current.matches(":disabled");
  const remember = (element: HTMLInputElement | HTMLTextAreaElement) => { selection.current = { start: element.selectionStart, end: element.selectionEnd }; };
  const restoreField = (next = selection.current) => requestAnimationFrame(() => {
    const element = field.current;
    if (!element?.isConnected || element.matches(":disabled")) return;
    element.focus({ preventScroll: true });
    if (next.start !== null && next.end !== null) element.setSelectionRange(next.start, next.end);
  });
  useEffect(() => { if (kind) { firstField.current?.focus({ preventScroll: true }); firstField.current?.select(); } }, [kind]);
  useEffect(() => { if (!mathematical || !allowPowers && kind === "power") { setKind(null); setError(""); } }, [mathematical, allowPowers, kind]);
  const openBuilder = (next: MathEntryKind) => {
    if (disabled()) return;
    if (kind === next) { firstField.current?.focus({ preventScroll: true }); return; }
    if (field.current && document.activeElement === field.current) remember(field.current);
    const { start, end } = selection.current;
    const selected = start !== null && end !== null ? value.slice(start, end).trim() : "";
    setFirst(wholeInteger.test(selected) ? selected.replace(/−/g, "-") : ""); setSecond(""); setError(""); setKind(next);
  };
  const cancel = () => { setKind(null); setError(""); restoreField(); };
  const insert = (text: string) => {
    if (disabled()) return;
    const next = insertMathEntry(value, selection.current.start, selection.current.end, text, maxLength);
    if (!next.inserted) { setError(`La respuesta no puede superar ${maxLength} caracteres. El texto se ha conservado.`); return; }
    selection.current = { start: next.start, end: next.end };
    onChange(next.value); setKind(null); setError(""); restoreField(selection.current);
  };
  const insertBuilt = () => {
    if (disabled() || !kind) return;
    const result = buildMathEntry(kind, first, second);
    if (result.text === null) { setError(result.error); (wholeInteger.test(first.trim()) ? secondField.current : firstField.current)?.focus({ preventScroll: true }); return; }
    insert(result.text);
  };
  const toggleSign = (index: number) => {
    if (disabled()) return;
    const current = (index ? second : first).trim(), next = /^[-−]/.test(current) ? current.slice(1) : `-${current.replace(/^\+/, "")}`;
    (index ? setSecond : setFirst)(next); setError("");
    const element = index ? secondField.current : firstField.current;
    element?.focus({ preventScroll: true }); requestAnimationFrame(() => element?.isConnected && element.setSelectionRange(next.length, next.length));
  };
  const preserveMainFocus = (event: React.PointerEvent<HTMLButtonElement>) => { if (document.activeElement === field.current && field.current) remember(field.current); event.preventDefault(); };
  const inputProps = {
    id: `${id}-answer`, value, maxLength,
    inputMode: inputMode || (mathematical && !multiline ? "decimal" as const : "text" as const),
    onSelect: (event: React.SyntheticEvent<HTMLInputElement | HTMLTextAreaElement>) => remember(event.currentTarget),
    onBlur: (event: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => remember(event.currentTarget),
    onChange: (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => { remember(event.currentTarget); setError(""); onChange(event.target.value); },
    ...(mathematical || !multiline ? { autoCorrect: "off", autoCapitalize: "none", spellCheck: false } : {}),
    "aria-describedby": error ? `${id}-error` : undefined,
  };
  return <div className="math-answer-field" onKeyDown={event => {
    if (!kind || event.key !== "Escape") return;
    event.preventDefault(); event.stopPropagation(); cancel();
  }}>
    <label className="field ma-source-label" htmlFor={`${id}-answer`}>{label}{multiline ? <textarea {...inputProps} ref={element => { field.current = element; }} rows={rows}/> : <input {...inputProps} ref={element => { field.current = element; }} type="text"/>}</label>
    {mathematical && <>
      {showPreview && <div className="ma-answer-preview" role="group" aria-labelledby={`${id}-preview-title`}><span id={`${id}-preview-title`} className="ma-preview-label">Así se verá</span><div className="ma-preview-content" tabIndex={0}><MathText subject={subject}>{value}</MathText></div></div>}
      <div className="ma-toolbar" role="group" aria-label={`Insertar en: ${label}`}>
        <button type="button" className="btn secondary" aria-expanded={kind === "fraction"} aria-controls={kind === "fraction" ? `${id}-builder` : undefined} onPointerDown={preserveMainFocus} onClick={() => openBuilder("fraction")}>Fracción</button>
        {allowPowers && <button type="button" className="btn secondary" aria-expanded={kind === "power"} aria-controls={kind === "power" ? `${id}-builder` : undefined} onPointerDown={preserveMainFocus} onClick={() => openBuilder("power")}>Potencia</button>}
        <button type="button" className="btn secondary ma-minus" aria-label="Insertar signo menos" onPointerDown={preserveMainFocus} onClick={() => insert("-")}>−</button>
      </div>
      {kind && <div id={`${id}-builder`} className="ma-builder" role="group" aria-labelledby={`${id}-builder-title`} onKeyDown={event => {
        if (event.key === "Enter" && event.target instanceof HTMLInputElement && !event.nativeEvent.isComposing) { event.preventDefault(); event.stopPropagation(); insertBuilt(); }
      }}>
        <h3 id={`${id}-builder-title`}>{kind === "fraction" ? "Insertar fracción" : "Insertar potencia"}</h3>
        <div className="ma-builder-body"><div className="ma-parts">{partNames.map((name, index) => <div key={`${kind}:${index}`} className="ma-part"><label htmlFor={`${id}-part-${index}`}>{name}</label><div className="ma-part-input"><input id={`${id}-part-${index}`} ref={index ? secondField : firstField} type="text" inputMode="decimal" autoComplete="off" autoCorrect="off" autoCapitalize="none" spellCheck={false} maxLength={32} aria-describedby={error ? `${id}-error` : undefined} value={index ? second : first} onChange={event => { (index ? setSecond : setFirst)(event.target.value); setError(""); }}/><button type="button" className="btn secondary ma-minus" aria-label={`Cambiar signo ${signNames[index]}`} onPointerDown={event => event.preventDefault()} onClick={() => toggleSign(index)}>−</button></div></div>)}</div><div className="ma-builder-preview" tabIndex={0} aria-label="Vista previa de la expresión">{entry?.text ? <MathText subject={subject}>{entry.text}</MathText> : kind === "fraction" ? <MathText subject={subject}>{`${wholeInteger.test(first.trim()) ? first.trim() : "□"}/${wholeInteger.test(second.trim()) ? second.trim() : "□"}`}</MathText> : <span className="ma-empty-power" role="math" aria-label={`${first || "base"} elevado a ${second || "exponente"}`}><span aria-hidden="true">{first || "□"}<sup>{second || "□"}</sup></span></span>}</div></div>
        <div className="ma-builder-actions"><button type="button" className="btn primary" onClick={insertBuilt}>Insertar</button><button type="button" className="btn secondary" onClick={cancel}>Cancelar</button></div>
      </div>}
      {error && <p id={`${id}-error`} className="error-text ma-error" role="alert">{error}</p>}
    </>}
  </div>;
}
