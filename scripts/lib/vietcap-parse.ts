/**
 * Single source of truth for parsing the Vietcap corpus filenames/paths into
 * Blackcrest taxonomy (ticker, tier, date, ReportType, Recommendation).
 * Used by both scripts/ingest-dryrun.ts and scripts/ingest.ts.
 *
 * The TYPE_MAP/REC_MAP are the PROPOSED canonical mapping — confirm with Vietcap
 * (see scripts/dryrun-output/report-types.csv for the raw→canonical table).
 */

export const deAccent = (s: string) =>
  s.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/gi, "d");

type TypeDef = { type: string; typeVi: string };
export const TYPE_MAP: Record<string, TypeDef> = {
  KQKD: { type: "EARNINGS", typeVi: "Kết quả kinh doanh" },
  BAOCAOKQKD: { type: "EARNINGS", typeVi: "Kết quả kinh doanh" },
  KDKQ: { type: "EARNINGS", typeVi: "Kết quả kinh doanh (typo)" },
  EARNINGSFLASH: { type: "EARNINGS", typeVi: "Earnings flash" },
  KQ: { type: "RESULT", typeVi: "Kết quả" },
  KQLN: { type: "RESULT", typeVi: "Kết quả lợi nhuận" },
  DHCD: { type: "AGM", typeVi: "Đại hội cổ đông" },
  DHCH: { type: "AGM", typeVi: "Đại hội cổ đông (typo)" },
  DHCDBT: { type: "AGM_EXTRA", typeVi: "ĐHCĐ bất thường" },
  PHTT: { type: "PHTT", typeVi: "PHTT — cần Vietcap xác nhận" },
  NDT: { type: "INVESTOR_MEETING", typeVi: "Gặp gỡ nhà đầu tư" },
  NTD: { type: "INVESTOR_MEETING", typeVi: "Gặp gỡ nhà đầu tư (typo)" },
  GAPGONDT: { type: "INVESTOR_MEETING", typeVi: "Gặp gỡ nhà đầu tư" },
  BCCONGTY: { type: "COMPANY", typeVi: "Báo cáo công ty" },
  BAOCAOCONGTY: { type: "COMPANY", typeVi: "Báo cáo công ty" },
  BCDOANHNGHIEP: { type: "COMPANY", typeVi: "Báo cáo doanh nghiệp" },
  BCDN: { type: "COMPANY", typeVi: "Báo cáo doanh nghiệp" },
  BCCT: { type: "COMPANY", typeVi: "Báo cáo công ty" },
  CTCT: { type: "COMPANY", typeVi: "Báo cáo công ty" },
  THAMDN: { type: "COMPANY_VISIT", typeVi: "Thăm doanh nghiệp" },
  BCTHAMDN: { type: "COMPANY_VISIT", typeVi: "Thăm doanh nghiệp" },
  BCLANDAU: { type: "INITIATION", typeVi: "Báo cáo lần đầu" },
  BCNIEMYET: { type: "LISTING", typeVi: "Niêm yết" },
  BAOCAONIEMYET: { type: "LISTING", typeVi: "Niêm yết" },
  THONGBAONIEMYET: { type: "LISTING", typeVi: "Thông báo niêm yết" },
  LISTINGNOTEVN: { type: "LISTING", typeVi: "Listing note" },
  LISTINGNOTE: { type: "LISTING", typeVi: "Listing note" },
  BAOCAOIPO: { type: "IPO", typeVi: "IPO" },
  PHTRAIPHIEU: { type: "BOND", typeVi: "Phát hành trái phiếu" },
  NGUNGTHEODOI: { type: "DROP_COVERAGE", typeVi: "Ngưng theo dõi" },
  DUNGKHUYENNGHI: { type: "DROP_COVERAGE", typeVi: "Dừng khuyến nghị" },
  QUANDIEM: { type: "VIEW", typeVi: "Quan điểm" },
  // Decoded from the corpus (titles/contentText) 2026-06-21 — retail-research &
  // small-cap company notes ("Báo cáo Khối Khách hàng Cá nhân" / "Cổ phiếu vốn
  // hóa nhỏ" / "Phân tích CT vốn hóa nhỏ" / "Giới thiệu công ty") → COMPANY;
  // "Ghi nhận từ VAD" (Vietnam Access Day) → investor meeting.
  CPVHN: { type: "COMPANY", typeVi: "Cổ phiếu vốn hóa nhỏ (KHCN)" },
  PHANTICHCTVHN: { type: "COMPANY", typeVi: "Phân tích công ty vốn hóa nhỏ" },
  BCKKHCN: { type: "COMPANY", typeVi: "Báo cáo khối KHCN" },
  BCKKCN: { type: "COMPANY", typeVi: "Báo cáo khối KHCN" },
  GTCT: { type: "COMPANY", typeVi: "Giới thiệu công ty" },
  BAOCAOVAD: { type: "INVESTOR_MEETING", typeVi: "Ghi nhận từ VAD (Vietnam Access Day)" },
};
export const REC_MAP: Record<string, string> = {
  MUA: "BUY",
  GIU: "HOLD",
  NAMGIU: "HOLD",
  BAN: "SELL",
  GIAM: "REDUCE",
  THEM: "ADD",
  THEMVAO: "ADD",
  KKQ: "REDUCE", // Kém Khả Quan = underperform (titles: "[KÉM KHẢ QUAN -12,2%]")
};
// Recognized "no rating" codes — Không Đánh Giá / Không Khuyến Nghị. They are a
// VALID classification (rec stays null) so the file is NOT flagged as an issue.
// After deAccent+cleanCode: KĐG→KDG, KDG_→KDG.
const NOT_RATED = new Set(["KDG", "KKN", "KNN"]);
const NOISE = new Set(["VN", "1", "AM", "VY"]);
const KNOWN = new Set([
  ...Object.keys(TYPE_MAP),
  ...Object.keys(REC_MAP),
  ...NOT_RATED,
]);

export function cleanCode(raw: string): string {
  let c = deAccent(raw).toUpperCase().trim();
  c = c.replace(/\.PDF$/i, "");
  c = c.replace(/\s*\(\d+\)$/, "");
  c = c.replace(/[\s_-]+\d+$/, "");
  c = c.replace(/\d{4}$/, "");
  c = c.replace(/^[\s_-]+|[\s_-]+$/g, "");
  return c;
}

const knownish = (s: string) => KNOWN.has(s) || NOISE.has(s);

function splitCombined(code: string): string[] {
  if (/[&]/.test(code)) return code.split(/[&]/).map(cleanCode);
  const dash = code.split("-").map(cleanCode);
  // Split on dash when BOTH sides are recognized or noise (so "PHTT-VY" → PHTT + VY).
  if (dash.length === 2 && knownish(dash[0]) && knownish(dash[1])) return dash;
  for (const a of KNOWN) {
    if (code.startsWith(a) && KNOWN.has(code.slice(a.length))) return [a, code.slice(a.length)];
  }
  return [code];
}

export type Parsed = {
  types: string[];
  rec: string | null;
  status: "KNOWN" | "PARTIAL" | "NOISE" | "UNKNOWN";
};

export function classifyCode(raw: string): Parsed {
  const clean = cleanCode(raw);
  if (!clean || NOISE.has(clean)) return { types: [], rec: null, status: "NOISE" };
  const parts = splitCombined(clean);
  const types: string[] = [];
  let rec: string | null = null;
  let anyKnown = false;
  let anyUnknown = false;
  for (const p of parts) {
    if (REC_MAP[p]) {
      rec = REC_MAP[p];
      anyKnown = true;
    } else if (TYPE_MAP[p]) {
      types.push(TYPE_MAP[p].type);
      anyKnown = true;
    } else if (NOT_RATED.has(p)) {
      anyKnown = true; // recognized "no rating" — valid, leaves rec null
    } else if (NOISE.has(p)) {
      /* drop noise tokens (e.g. VY, VN) — neither known nor unknown */
    } else anyUnknown = true;
  }
  const status = anyKnown && anyUnknown ? "PARTIAL" : anyKnown ? "KNOWN" : "UNKNOWN";
  return { types: [...new Set(types)], rec, status };
}

export function classifySlug(name: string): Parsed {
  // Match against a COMPACT form (diacritics + all separators stripped) so the
  // same keyword catches "ngung-theo-doi", "NgungTheoDoi" and "ngungtheodoi".
  const c = deAccent(name).toLowerCase().replace(/[^a-z0-9]/g, "");
  const hit = (t: string): Parsed => ({ types: [t], rec: null, status: "KNOWN" });
  // Order matters — most specific first.
  if (/dhcdbt|dhcdbatthuong/.test(c)) return hit("AGM_EXTRA");
  if (/kqkd|ketquakinhdoanh|baocaokq/.test(c)) return hit("EARNINGS");
  if (/dhcd|daihoicodong/.test(c)) return hit("AGM");
  if (/gapgo(nhadautu|ndt)|hopndt|hopnhadautu|baocaohopndt/.test(c)) return hit("INVESTOR_MEETING");
  if (/ghinhantuvad|baocaovad/.test(c)) return hit("INVESTOR_MEETING");
  if (/thamdn|thamdoanhnghiep/.test(c)) return hit("COMPANY_VISIT");
  if (/landau|baocaodau|initiation/.test(c)) return hit("INITIATION");
  if (/niemyet|listing/.test(c)) return hit("LISTING");
  if (/traiphieu|bond/.test(c)) return hit("BOND");
  if (/ipo/.test(c)) return hit("IPO");
  if (/ngungtheodoi|dungkhuyennghi|dropcoverage/.test(c)) return hit("DROP_COVERAGE");
  if (/quandiem/.test(c)) return hit("VIEW");
  if (/ndt/.test(c)) return hit("INVESTOR_MEETING");
  if (/bccongty|baocaocongty|baocaodoanhnghiep|bcdoanhnghiep|capnhat/.test(c)) return hit("COMPANY");
  return { types: [], rec: null, status: "UNKNOWN" };
}

/** Parse a filename's 8-digit date code: YYYYMMDD, else US MMDDYYYY. → YYYYMMDD. */
export function parseFileDate(eight: string): string | null {
  if (VALID_DATE.test(eight)) return eight;
  // MMDDYYYY (e.g. 06302016 → 2016-06-30)
  const mm = eight.slice(0, 2), dd = eight.slice(2, 4), yyyy = eight.slice(4, 8);
  const cand = `${yyyy}${mm}${dd}`;
  if (VALID_DATE.test(cand) && +dd >= 1 && +dd <= 31) return cand;
  return null;
}

/** First plausible report date (DD/MM/YYYY, 2010–2026) in extracted PDF text. The
 * VCSC template's English boilerplate "18 March 2011" is not DD/MM/YYYY so it is
 * skipped; the first numeric date near the top is the report's own date. */
export function extractDateFromText(text: string | null): string | null {
  if (!text) return null;
  const re = /\b([0-3]?\d)\/([01]?\d)\/(20(?:1[0-9]|2[0-6]))\b/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text.slice(0, 4000)))) {
    const d = +m[1], mo = +m[2];
    if (d >= 1 && d <= 31 && mo >= 1 && mo <= 12) {
      return `${m[3]}${String(mo).padStart(2, "0")}${String(d).padStart(2, "0")}`;
    }
  }
  return null;
}

export const TIER: Record<string, "FULL" | "FLASH"> = {
  "bao cao": "FULL",
  "nhan dinh nhanh": "FLASH",
};

// TICKER <sep> 8-digit-date <sep> CODE — separators may be "-" or "_".
const STRUCT = /^([A-Za-z0-9.]+)[-_](\d{8})[-_](.+)\.pdf$/i;
const VALID_DATE = /^20(1[0-9]|2[0-6])(0[1-9]|1[0-2])[0-3]\d$/;

export type ParsedFile = {
  ticker: string;
  company: string;
  tier: "FULL" | "FLASH" | null;
  fileName: string;
  date: string | null; // YYYYMMDD
  rawCode: string;
  parsed: Parsed;
};

/** Parse a corpus-relative path "TICKER - Name/Báo cáo/FILE.pdf". */
export function parsePath(rel: string): ParsedFile {
  const seg = rel.split("/");
  const top = seg[0] ?? "";
  const mTicker = top.match(/^\s*([A-Za-z0-9]{2,5})\s*-\s*(.+)$/);
  const ticker = (mTicker?.[1] ?? top.split(/[\s-]/)[0] ?? "").toUpperCase();
  const company = (mTicker?.[2] ?? "").trim();
  const tier = seg.length > 2 ? (TIER[deAccent(seg[1]).toLowerCase()] ?? null) : null;
  const fileName = seg[seg.length - 1];
  // Some exports prefix a 8–14 digit timestamp ("20160303014756_CTG-…") — strip it
  // for parsing only (fileName is kept intact for slug linkage compatibility).
  const pname = fileName.replace(/^\d{8,14}_/, "");

  const m = pname.match(STRUCT);
  let date: string | null = null;
  let rawCode = "(slug)";
  let parsed: Parsed;
  if (m) {
    date = parseFileDate(m[2]); // YYYYMMDD or US MMDDYYYY
    rawCode = m[3];
    parsed = classifyCode(rawCode);
  } else {
    const dm = pname.match(/(20(?:1[0-9]|2[0-6])(?:0[1-9]|1[0-2])[0-3]\d)/);
    if (dm) date = dm[1];
    parsed = classifySlug(pname);
  }
  return { ticker, company, tier, fileName, date, rawCode, parsed };
}

/** YYYYMMDD → Date (UTC noon to avoid TZ off-by-one). */
export function toDate(yyyymmdd: string | null): Date | null {
  if (!yyyymmdd) return null;
  return new Date(`${yyyymmdd.slice(0, 4)}-${yyyymmdd.slice(4, 6)}-${yyyymmdd.slice(6, 8)}T12:00:00Z`);
}
