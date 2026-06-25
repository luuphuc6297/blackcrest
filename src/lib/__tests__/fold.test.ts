import { describe, it, expect } from "vitest";
import { fold } from "@/lib/fold";

describe("fold", () => {
  it("lowercases and trims", () => {
    expect(fold("  MWG  ")).toBe("mwg");
  });

  it("strips Vietnamese diacritics (combining marks)", () => {
    expect(fold("Kết quả")).toBe("ket qua");
    expect(fold("Đại hội cổ đông")).toBe("dai hoi co dong");
    expect(fold("Thủy Sản Vĩnh Hoàn")).toBe("thuy san vinh hoan");
  });

  it("maps đ/Đ to d", () => {
    expect(fold("đầu tư")).toBe("dau tu");
    expect(fold("ĐẦU TƯ")).toBe("dau tu");
  });

  it("makes accent-insensitive matching reflexive (query vs target both folded)", () => {
    const target = fold("Kết quả kinh doanh");
    // A user typing without diacritics still matches.
    expect(target.includes(fold("ket qua"))).toBe(true);
    // …and typing with diacritics matches too.
    expect(target.includes(fold("Kết"))).toBe(true);
  });

  it("is idempotent", () => {
    const once = fold("Tổng Công ty Điện lực");
    expect(fold(once)).toBe(once);
  });

  it("handles empty/whitespace input", () => {
    expect(fold("")).toBe("");
    expect(fold("   ")).toBe("");
  });
});
