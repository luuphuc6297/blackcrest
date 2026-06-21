/**
 * F3 attachment validation — defence against type-spoofing + macro payloads.
 * Excel/Word only, download-only. Pure (no I/O) so it unit-tests directly and
 * runs identically client- and server-side. The SERVER call is authoritative.
 */

export const MAX_ATTACHMENT_BYTES = 25 * 1024 * 1024; // 25 MB

// Allowed by extension (browser-supplied MIME is unreliable). family → magic check.
const TYPES: Record<string, { mime: string; family: "zip" | "ole" }> = {
  xlsx: { mime: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", family: "zip" },
  docx: { mime: "application/vnd.openxmlformats-officedocument.wordprocessingml.document", family: "zip" },
  xls: { mime: "application/vnd.ms-excel", family: "ole" },
  doc: { mime: "application/msword", family: "ole" },
};

// Macro-enabled Office variants are rejected outright (the common macro vector).
const MACRO_EXTS = new Set(["xlsm", "xlsb", "docm", "dotm", "xltm", "pptm", "ppam"]);

/** `accept=` value for the file picker. */
export const ATTACHMENT_ACCEPT = ".xlsx,.xls,.docx,.doc";

export type AttachmentValidation =
  | { ok: true; ext: string; mime: string }
  | { ok: false; error: "empty" | "size" | "type" | "macro" | "magic" };

export function extOf(fileName: string): string {
  const m = /\.([a-z0-9]+)$/i.exec(fileName.trim());
  return m ? m[1].toLowerCase() : "";
}

/**
 * Validate an attachment's bytes against its declared filename. Order matters:
 * cheap checks first, content checks last.
 */
export function validateAttachment(buf: Buffer, fileName: string): AttachmentValidation {
  // Magic byte tables are built lazily so this module stays import-safe in the
  // browser (no top-level `Buffer`); validateAttachment itself only runs server-side.
  const ZIP_MAGIC = Buffer.from([0x50, 0x4b, 0x03, 0x04]); // PK\x03\x04 (OOXML = zip)
  const OLE_MAGIC = Buffer.from([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]); // legacy OLE2
  const VBA_MARKER = Buffer.from("vbaProject.bin"); // uncompressed in a macro OOXML's central dir

  const ext = extOf(fileName);
  if (MACRO_EXTS.has(ext)) return { ok: false, error: "macro" };
  const type = TYPES[ext];
  if (!type) return { ok: false, error: "type" };
  if (buf.length === 0) return { ok: false, error: "empty" };
  if (buf.length > MAX_ATTACHMENT_BYTES) return { ok: false, error: "size" };

  if (type.family === "zip") {
    if (!buf.subarray(0, 4).equals(ZIP_MAGIC)) return { ok: false, error: "magic" };
    // A non-macro xlsx/docx never embeds a VBA project — reject if one is present
    // (defence-in-depth beyond the extension check; deeper AV is a fast-follow).
    if (buf.includes(VBA_MARKER)) return { ok: false, error: "macro" };
  } else {
    if (!buf.subarray(0, 8).equals(OLE_MAGIC)) return { ok: false, error: "magic" };
  }

  return { ok: true, ext, mime: type.mime };
}
