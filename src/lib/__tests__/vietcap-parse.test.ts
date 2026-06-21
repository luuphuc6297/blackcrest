import { describe, it, expect } from "vitest";
import {
  classifyCode,
  classifySlug,
  parseFileDate,
  extractDateFromText,
  parsePath,
} from "../../../scripts/lib/vietcap-parse";

// Decode decisions made 2026-06-21 from the real Vietcap corpus (titles/content).
describe("vietcap-parse — decoded review-queue codes", () => {
  it("KKQ = Kém Khả Quan → recommendation REDUCE", () => {
    expect(classifyCode("KKQ")).toMatchObject({ rec: "REDUCE", status: "KNOWN" });
  });

  it("KDG / KĐG / KDG_ = Không Đánh Giá → recognized, no rating (not an issue)", () => {
    for (const c of ["KDG", "KĐG", "KDG_"]) {
      const r = classifyCode(c);
      expect(r.status).toBe("KNOWN");
      expect(r.rec).toBeNull();
      expect(r.types).toEqual([]);
    }
  });

  it("KKN / KNN = no-rating retail notes → recognized, no type/rec", () => {
    expect(classifyCode("KKN").status).toBe("KNOWN");
    expect(classifyCode("KNN").status).toBe("KNOWN");
  });

  it("retail / small-cap company codes → COMPANY", () => {
    for (const c of ["CPVHN", "BCKKHCN", "BCKKCN", "GTCT", "PhantichCTVHN"]) {
      expect(classifyCode(c)).toMatchObject({ types: ["COMPANY"], status: "KNOWN" });
    }
  });

  it("BaoCaoVAD (Vietnam Access Day) → INVESTOR_MEETING", () => {
    expect(classifyCode("BaoCaoVAD")).toMatchObject({ types: ["INVESTOR_MEETING"] });
  });

  it("PHTT-VY → PHTT (VY noise dropped, not UNKNOWN)", () => {
    expect(classifyCode("PHTT-VY")).toMatchObject({ types: ["PHTT"], status: "KNOWN" });
  });
});

describe("vietcap-parse — date recovery", () => {
  it("parseFileDate accepts YYYYMMDD and US MMDDYYYY", () => {
    expect(parseFileDate("20150828")).toBe("20150828");
    expect(parseFileDate("06302016")).toBe("20160630"); // MMDDYYYY
    expect(parseFileDate("99999999")).toBeNull();
  });

  it("extractDateFromText takes the first DD/MM/YYYY and skips English boilerplate", () => {
    expect(extractDateFromText("…(DCM) 18 March 2011 KHÔNG KHUYẾN NGHỊ 03/12/2014 Giá khí…")).toBe("20141203");
    expect(extractDateFromText("16/03/2018 | 1 TCT Cảng Hàng không (ACV)")).toBe("20180316");
    expect(extractDateFromText("no date here")).toBeNull();
  });
});

describe("vietcap-parse — slug + path recovery", () => {
  it("classifySlug matches diacritic/separator-free keywords", () => {
    expect(classifySlug("CTD-Ngungtheodoi.pdf")).toMatchObject({ types: ["DROP_COVERAGE"] });
    expect(classifySlug("xyz-bao-cao-kqkd.pdf")).toMatchObject({ types: ["EARNINGS"] });
  });

  it("parsePath handles underscore separators", () => {
    const p = parsePath("BAF - Cty/Báo cáo/BAF-20260115_BCCongty.pdf");
    expect(p.date).toBe("20260115");
    expect(p.parsed.types).toEqual(["COMPANY"]);
  });

  it("parsePath strips a leading export-timestamp prefix", () => {
    const p = parsePath("CTG - Cty/Báo cáo/20160303014756_CTG-20150828-PHTT.pdf");
    expect(p.date).toBe("20150828");
    expect(p.parsed.types).toEqual(["PHTT"]);
  });
});
