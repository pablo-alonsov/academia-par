import { Fragment } from "react";
import { tokenizeMathText } from "@/lib/math-notation";
import { isMathSubject } from "@/lib/math-answer";
import "./math-text.css";

type Props = { children?: string | number | null; subject?: string };

/** Presentation only. Saved answers, grading and the editable source stay plain text. */
export default function MathText({ children, subject }: Props) {
  const text = children == null ? "" : String(children);
  if (!text || !isMathSubject(subject)) return <>{text}</>;
  const tokens = tokenizeMathText(text);
  if (tokens.every(token => token.type === "text")) return <>{text}</>;
  return <span className="math-text">{tokens.map((token,index) => {
    if (token.type === "text") return <Fragment key={index}>{token.text}</Fragment>;
    if (token.type === "fraction") return <span key={index} className="math-token math-fraction" role="math" aria-label={token.spoken}><span className="math-numerator" aria-hidden="true">{token.numerator}</span><span className="math-denominator" aria-hidden="true">{token.denominator}</span></span>;
    if (token.type === "power") return token.fractionBase ? <span key={index} className="math-token math-power math-power-fraction" role="math" aria-label={token.spoken}><span className="math-powered-expression" aria-hidden="true"><span className="math-base-parenthesis">(</span><span className="math-fraction"><span className="math-numerator">{token.fractionBase.numerator}</span><span className="math-denominator">{token.fractionBase.denominator}</span></span><span className="math-base-parenthesis">)</span></span><sup aria-hidden="true">{token.exponent}</sup></span> : <span key={index} className="math-token math-power" role="math" aria-label={token.spoken}><span aria-hidden="true">{token.base}<sup>{token.exponent}</sup></span></span>;
    return <span key={index} className="math-token math-root" role="math" aria-label={token.spoken}><span className="math-root-symbol" aria-hidden="true">√</span><span className="math-radicand" aria-hidden="true">{token.radicand}</span></span>;
  })}</span>;
}
