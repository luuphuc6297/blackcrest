import { describe, it, expect } from "vitest";
import { validateAttachment, extOf, MAX_ATTACHMENT_BYTES } from "../attachment-validate";

const ZIP = Buffer.from([0x50, 0x4b, 0x03, 0x04]);
const OLE = Buffer.from([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]);
const pad = (head: Buffer, extra = "some content") => Buffer.concat([head, Buffer.from(extra)]);

describe("attachment-validate", () => {
  it("extOf pulls the lowercased extension", () => {
    expect(extOf("Model FINAL.XLSX")).toBe("xlsx");
    expect(extOf("noext")).toBe("");
  });

  it("accepts a well-formed xlsx/docx (zip magic)", () => {
    expect(validateAttachment(pad(ZIP), "model.xlsx")).toEqual({
      ok: true,
      ext: "xlsx",
      mime: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    expect(validateAttachment(pad(ZIP), "memo.docx").ok).toBe(true);
  });

  it("accepts legacy xls/doc (OLE magic)", () => {
    expect(validateAttachment(pad(OLE), "old.xls").ok).toBe(true);
    expect(validateAttachment(pad(OLE), "old.doc").ok).toBe(true);
  });

  it("rejects macro-enabled extensions outright", () => {
    expect(validateAttachment(pad(ZIP), "evil.xlsm")).toEqual({ ok: false, error: "macro" });
    expect(validateAttachment(pad(ZIP), "evil.docm").ok).toBe(false);
  });

  it("rejects disallowed types", () => {
    expect(validateAttachment(pad(ZIP), "run.exe")).toEqual({ ok: false, error: "type" });
    expect(validateAttachment(pad(ZIP), "data.csv").ok).toBe(false);
  });

  it("rejects a spoofed extension whose magic bytes don't match", () => {
    // .xlsx but not a zip
    expect(validateAttachment(Buffer.from("%PDF-1.7 not a zip"), "fake.xlsx")).toEqual({
      ok: false,
      error: "magic",
    });
    // .xls but not OLE
    expect(validateAttachment(pad(ZIP), "fake.xls")).toEqual({ ok: false, error: "magic" });
  });

  it("rejects an OOXML carrying a VBA project (macro smuggled into .xlsx)", () => {
    const withVba = Buffer.concat([ZIP, Buffer.from("...vbaProject.bin...")]);
    expect(validateAttachment(withVba, "smuggle.xlsx")).toEqual({ ok: false, error: "macro" });
  });

  it("rejects empty and oversized files", () => {
    expect(validateAttachment(Buffer.alloc(0), "x.xlsx")).toEqual({ ok: false, error: "empty" });
    const huge = Buffer.concat([ZIP, Buffer.alloc(MAX_ATTACHMENT_BYTES)]);
    expect(validateAttachment(huge, "x.xlsx")).toEqual({ ok: false, error: "size" });
  });
});
