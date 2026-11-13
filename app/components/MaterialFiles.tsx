"use client";
import { Download, ExternalLink, FileText, Paperclip } from "lucide-react";
import "./material-files.css";

type Item = Record<string, any>;

export function MaterialFiles({ resource, files = [] }: { resource: Item; files?: Item[] }) {
  const ids = [...new Set<string>([...(Array.isArray(resource.fileIds) ? resource.fileIds : []), ...(resource.fileId ? [resource.fileId] : [])])];
  if (!ids.length) return null;
  return <div className="material-files">{ids.map((id, index) => {
    const file = files.find(item => item.id === id);
    const url = `/api/files/${encodeURIComponent(id)}`;
    if (file?.type !== "application/pdf") return <a className="btn secondary material-file-link" key={id} href={url} target="_blank" rel="noopener noreferrer"><Paperclip size={17}/>{file?.name || `Material ${index + 1}`}<ExternalLink size={15}/></a>;
    return <section key={id} className="material-pdf" aria-label={`Ficha PDF: ${file.name || resource.title}`}>
      <div className="material-pdf-heading"><FileText size={23} aria-hidden="true"/><div><strong>Ficha completa en PDF</strong><p>{file.name || resource.title}{file.size > 0 ? ` · ${Math.ceil(file.size / 1024)} KB` : ""}</p></div></div>
      <div className="material-pdf-actions"><a className="btn primary" href={`${url}?view=inline#view=FitH`} target="_blank" rel="noopener noreferrer">Abrir ficha PDF<ExternalLink size={16}/></a><a className="btn secondary" href={url} download={file.name || true}><Download size={16}/>Descargar PDF</a></div>
      <p className="material-pdf-help">La ficha se abre en otra pestaña. Puedes consultarla mientras preparas tu respuesta aquí o trabajar en papel.</p>
    </section>;
  })}</div>;
}
