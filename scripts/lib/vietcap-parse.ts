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
};
export const REC_MAP: Record<string, string> = {
  MUA: "BUY",
  GIU: "HOLD",
  NAMGIU: "HOLD",
  BAN: "SELL",
  GIAM: "REDUCE",
  THEM: "ADD",
  THEMVAO: "ADD",
};
const NOISE = new Set(["VN", "1", "AM", "VY"]);
const KNOWN = new Set([...Object.keys(TYPE_MAP), ...Object.keys(REC_MAP)]);

export function cleanCode(raw: string): string {
  let c = deAccent(raw).toUpperCase().trim();
  c = c.replace(/\.PDF$/i, "");
  c = c.replace(/\s*\(\d+\)$/, "");
  c = c.replace(/[\s_-]+\d+$/, "");
  c = c.replace(/\d{4}$/, "");
  c = c.replace(/^[\s_-]+|[\s_-]+$/g, "");
  return c;
}

function splitCombined(code: string): string[] {
  if (/[&]/.test(code)) return code.split(/[&]/).map(cleanCode);
  const dash = code.split("-").map(cleanCode);
  if (dash.length === 2 && KNOWN.has(dash[0]) && KNOWN.has(dash[1])) return dash;
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
    } else anyUnknown = true;
  }
  const status = anyKnown && anyUnknown ? "PARTIAL" : anyKnown ? "KNOWN" : "UNKNOWN";
  return { types: [...new Set(types)], rec, status };
}

export function classifySlug(name: string): Parsed {
  const n = name.toLowerCase();
  if (/gap-go-?(nha-dau-tu|ndt)/.test(n)) return { types: ["INVESTOR_MEETING"], rec: null, status: "KNOWN" };
  if (/kqkd/.test(n)) return { types: ["EARNINGS"], rec: null, status: "KNOWN" };
  if (/dhcd/.test(n)) return { types: ["AGM"], rec: null, status: "KNOWN" };
  if (/ndt/.test(n)) return { types: ["INVESTOR_MEETING"], rec: null, status: "KNOWN" };
  return { types: [], rec: null, status: "UNKNOWN" };
}

export const TIER: Record<string, "FULL" | "FLASH"> = {
  "bao cao": "FULL",
  "nhan dinh nhanh": "FLASH",
};

const STRUCT = /^([A-Za-z0-9.]+)-(\d{8})-(.+)\.pdf$/i;
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

  const m = fileName.match(STRUCT);
  let date: string | null = null;
  let rawCode = "(slug)";
  let parsed: Parsed;
  if (m) {
    if (VALID_DATE.test(m[2])) date = m[2];
    rawCode = m[3];
    parsed = classifyCode(rawCode);
  } else {
    const dm = fileName.match(/(20(?:1[0-9]|2[0-6])(?:0[1-9]|1[0-2])[0-3]\d)/);
    if (dm) date = dm[1];
    parsed = classifySlug(fileName);
  }
  return { ticker, company, tier, fileName, date, rawCode, parsed };
}

/** YYYYMMDD → Date (UTC noon to avoid TZ off-by-one). */
export function toDate(yyyymmdd: string | null): Date | null {
  if (!yyyymmdd) return null;
  return new Date(`${yyyymmdd.slice(0, 4)}-${yyyymmdd.slice(4, 6)}-${yyyymmdd.slice(6, 8)}T12:00:00Z`);
}
