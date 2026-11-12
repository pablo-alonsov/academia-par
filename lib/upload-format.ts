/** Shared byte checks: this module is also imported by the browser photo helper. */
export const MAX_UPLOAD_BYTES = 8 * 1024 * 1024;
export const DOCX_MIME = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
const ascii = (bytes: Uint8Array, start: number, length: number) => String.fromCharCode(...bytes.subarray(start, start + length));
const starts = (bytes: Uint8Array, signature: number[]) => signature.every((value, index) => bytes[index] === value);
const u16 = (bytes: Uint8Array, at: number) => new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength).getUint16(at, true);
const u32 = (bytes: Uint8Array, at: number) => new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength).getUint32(at, true);

/** Works on a short prefix too; HEIF originals are stored, never promised a preview. */
export function detectImageType(bytes: Uint8Array): string | null {
  if (starts(bytes, [0xff, 0xd8, 0xff])) return "image/jpeg";
  if (starts(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return "image/png";
  if (["GIF87a", "GIF89a"].includes(ascii(bytes, 0, 6))) return "image/gif";
  if (bytes.length >= 12 && ascii(bytes, 0, 4) === "RIFF" && ascii(bytes, 8, 4) === "WEBP") return "image/webp";
  if (bytes.length >= 16 && ascii(bytes, 4, 4) === "ftyp") {
    const size = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength).getUint32(0);
    if (size < 16 || size % 4 !== 0) return null;
    const brands = [ascii(bytes, 8, 4)];
    for (let at = 16; at + 4 <= Math.min(size, bytes.length); at += 4) brands.push(ascii(bytes, at, 4));
    if (brands.some(brand => brand === "avif" || brand === "avis")) return null;
    if (brands.some(brand => ["heic", "heix", "hevc", "hevx", "heim", "heis"].includes(brand))) return "image/heic";
    if (brands.some(brand => ["mif1", "msf1", "heif"].includes(brand))) return "image/heif";
  }
  return null;
}

/** Inspect the ZIP directory, without expanding arbitrary or encrypted archives. */
export function isDocx(bytes: Uint8Array): boolean {
  if (bytes.length < 22 || !starts(bytes, [0x50, 0x4b, 0x03, 0x04])) return false;
  try {
    let end = -1;
    for (let at = bytes.length - 22; at >= Math.max(0, bytes.length - 65557); at--) {
      if (u32(bytes, at) === 0x06054b50 && at + 22 + u16(bytes, at + 20) === bytes.length) { end = at; break; }
    }
    if (end < 0 || u16(bytes, end + 4) !== 0 || u16(bytes, end + 6) !== 0) return false;
    const count = u16(bytes, end + 10), size = u32(bytes, end + 12), offset = u32(bytes, end + 16);
    if (!count || count > 2000 || count !== u16(bytes, end + 8) || offset + size !== end) return false;
    const names = new Set<string>(); let at = offset, totalExpanded = 0;
    for (let index = 0; index < count; index++) {
      if (at + 46 > end || u32(bytes, at) !== 0x02014b50) return false;
      const flags = u16(bytes, at + 8), method = u16(bytes, at + 10), compressed = u32(bytes, at + 20), expanded = u32(bytes, at + 24);
      const nameLength = u16(bytes, at + 28), extraLength = u16(bytes, at + 30), commentLength = u16(bytes, at + 32), local = u32(bytes, at + 42);
      if ((flags & 1) || ![0, 8].includes(method) || at + 46 + nameLength + extraLength + commentLength > end) return false;
      const name = new TextDecoder("utf-8", { fatal: true }).decode(bytes.subarray(at + 46, at + 46 + nameLength));
      if (!name || names.has(name) || name.includes("\0") || name.includes("\\") || name.startsWith("/") || name.split("/").includes("..") || /(?:^|\/)vbaProject\.bin$/i.test(name)) return false;
      totalExpanded += expanded;
      if (totalExpanded > 64 * 1024 * 1024 || local + 30 > offset || u32(bytes, local) !== 0x04034b50 || u16(bytes, local + 8) !== method || u16(bytes, local + 6) !== flags) return false;
      const localNameLength = u16(bytes, local + 26), localExtraLength = u16(bytes, local + 28);
      if (local + 30 + localNameLength + localExtraLength + compressed > offset || new TextDecoder("utf-8", {fatal:true}).decode(bytes.subarray(local + 30,local + 30 + localNameLength)) !== name) return false;
      names.add(name); at += 46 + nameLength + extraLength + commentLength;
    }
    return at === end && names.has("[Content_Types].xml") && names.has("word/document.xml");
  } catch { return false; }
}

/** A missing provider MIME is fine; bytes remain the authority for binary formats. */
export function detectUploadType(bytes: Uint8Array, filename: string, declaredType = ""): string | null {
  const image = detectImageType(bytes); if (image) return image;
  if (ascii(bytes, 0, 5) === "%PDF-") return "application/pdf";
  if (isDocx(bytes)) return DOCX_MIME;
  if (!/\.txt$/i.test(filename) && declaredType.toLowerCase().split(";")[0].trim() !== "text/plain") return null;
  try {
    const text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
    if (/[\u0000-\u0008\u000b\u000e-\u001f\u007f]/.test(text) || /<(?:svg|html|script)\b|<!doctype\s+html|<\?xml/i.test(text)) return null;
    return "text/plain";
  } catch { return null; }
}
