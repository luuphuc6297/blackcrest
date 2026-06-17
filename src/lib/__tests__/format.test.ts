import { describe, it, expect } from "vitest";
import {
  formatVND,
  formatVNDCompact,
  formatPercent,
  formatNumber,
  formatDate,
  formatDateTime,
} from "../format";

describe("format — locale-aware formatters", () => {
  describe("formatNumber", () => {
    it("uses vi grouping (dot thousands, comma decimal)", () => {
      expect(formatNumber(1234.56, "vi")).toBe("1.234,56");
    });
    it("uses en grouping (comma thousands, dot decimal)", () => {
      expect(formatNumber(1234.56, "en")).toBe("1,234.56");
    });
    it("uses zh grouping", () => {
      expect(formatNumber(1234.56, "zh")).toBe("1,234.56");
    });
    it("honours the digits arg (3rd param after locale)", () => {
      expect(formatNumber(5, "vi", 0)).toBe("5");
    });
    it("defaults to vi when no locale passed", () => {
      expect(formatNumber(1000, undefined, 0)).toBe("1.000");
    });
  });

  describe("formatVND", () => {
    it("keeps ₫ across locales, localises grouping", () => {
      expect(formatVND(1_000_000, "vi")).toBe("₫ 1.000.000");
      expect(formatVND(1_000_000, "en")).toBe("₫ 1,000,000");
    });
    it("rounds to integer", () => {
      expect(formatVND(1234.5, "vi")).toBe("₫ 1.235");
    });
  });

  describe("formatVNDCompact", () => {
    it("vi uses tỷ / tr", () => {
      expect(formatVNDCompact(1_280_000_000, "vi")).toContain("tỷ");
      expect(formatVNDCompact(320_000_000, "vi")).toContain("tr");
    });
    it("en uses B / M", () => {
      expect(formatVNDCompact(1_280_000_000, "en")).toContain("B");
      expect(formatVNDCompact(320_000_000, "en")).toContain("M");
    });
    it("zh uses 亿 / 万", () => {
      expect(formatVNDCompact(1_280_000_000, "zh")).toContain("亿");
      expect(formatVNDCompact(50_000, "zh")).toContain("万");
    });
    it("keeps ₫ and marks negatives with the minus glyph", () => {
      const s = formatVNDCompact(-1_280_000_000, "vi");
      expect(s).toContain("₫");
      expect(s.startsWith("−")).toBe(true);
    });
  });

  describe("formatPercent", () => {
    it("always shows sign, uses − glyph, vi decimals", () => {
      expect(formatPercent(2.4, "vi")).toBe("+2,40%");
      expect(formatPercent(-1.1, "vi")).toBe("−1,10%");
    });
  });

  describe("formatDate / formatDateTime", () => {
    it("returns — for null/empty", () => {
      expect(formatDate(null)).toBe("—");
      expect(formatDateTime(null)).toBe("—");
    });
    it("formats a date as dd/mm/yyyy-ish and includes time for datetime", () => {
      expect(formatDate("2026-06-18", "vi")).toMatch(/\d{2}\/\d{2}\/\d{4}/);
      expect(formatDateTime("2026-06-18T14:30:00Z", "vi")).toMatch(/\d{2}:\d{2}/);
    });
  });
});
