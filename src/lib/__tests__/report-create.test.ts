import { describe, it, expect } from "vitest";
import { slugify } from "../report-create";

describe("report-create — slugify (Vietnamese-aware)", () => {
  it("strips diacritics", () => {
    expect(slugify("Triển vọng vĩ mô")).toBe("trien-vong-vi-mo");
    expect(slugify("Tổng quan thị trường")).toBe("tong-quan-thi-truong");
  });
  it("maps đ/Đ → d", () => {
    expect(slugify("Đánh giá đầu năm")).toBe("danh-gia-dau-nam");
  });
  it("lowercases, collapses separators, trims hyphens", () => {
    expect(slugify("  Báo Cáo —  Tháng VI  ")).toBe("bao-cao-thang-vi");
    expect(slugify("---test---")).toBe("test");
  });
  it("truncates to 60 chars", () => {
    expect(slugify("a".repeat(100))).toHaveLength(60);
  });
  it("falls back to bao-cao when empty after cleaning", () => {
    expect(slugify("———")).toBe("bao-cao");
    expect(slugify("   ")).toBe("bao-cao");
  });
});
