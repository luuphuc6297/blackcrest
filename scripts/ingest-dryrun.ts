/**
 * Bulk-ingestion DRY RUN for the Vietcap research corpus.
 *
 * Scans a directory tree of broker research PDFs (organized as
 *   `<TICKER> - <Company Name>/<Báo cáo|Nhận định nhanh>/<file>.pdf`)
 * and produces the metadata Blackcrest would ingest — WITHOUT touching the DB.
 *
 * Outputs (to ./scripts/dryrun-output/):
 *   symbols.csv        — ticker, company, counts, date range
 *   report-types.csv   — raw code -> proposed canonical ReportType + Recommendation
 *   unparsed.txt       — filenames whose type couldn't be parsed (manual review)
 * + a summary to stdout.
 *
 * Run:  pnpm exec tsx scripts/ingest-dryrun.ts ["/path/to/corpus"]
 * (auto-finds ~/Downloads/*Vietcap* if no path is given)
 */
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";

// ── de-accent helper (ĐHCĐ -> DHCD, NĐT -> NDT) ──────────────────────────────
const deAccent = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/đ/gi, "d");

// ── PROPOSED taxonomy (raw code -> canonical) — EDIT + send to Vietcap ───────
type TypeDef = { type: string; typeVi: string };
const TYPE_MAP: Record<string, TypeDef> = {
  KQKD: { type: "EARNINGS", typeVi: "Kết quả kinh doanh" },
  BAOCAOKQKD: { type: "EARNINGS", typeVi: "Kết quả kinh doanh" },
  KDKQ: { type: "EARNINGS", typeVi: "Kết quả kinh doanh (typo)" },
  EARNINGSFLASH: { type: "EARNINGS", typeVi: "Earnings flash" },
  KQ: { type: "RESULT", typeVi: "Kết quả" },
  KQLN: { type: "RESULT", typeVi: "Kết quả lợi nhuận" },
  DHCD: { type: "AGM", typeVi: "Đại hội cổ đông" },
  DHCH: { type: "AGM", typeVi: "Đại hội cổ đông (typo)" },
  DHCDBT: { type: "AGM_EXTRA", typeVi: "ĐHCĐ bất thường" },
  PHTT: { type: "PHTT", typeVi: "PHTT — CẦN VIETCAP XÁC NHẬN" },
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
// Recommendation axis (orthogonal to type)
const REC_MAP: Record<string, string> = {
  MUA: "BUY",
  GIU: "HOLD",
  NAMGIU: "HOLD",
  BAN: "SELL",
  GIAM: "REDUCE",
  THEM: "ADD",
  THEMVAO: "ADD",
};
// Pure noise (version / language markers — NOT a report type)
const NOISE = new Set(["VN", "1", "AM", "VY"]);

const KNOWN = new Set([...Object.keys(TYPE_MAP), ...Object.keys(REC_MAP)]);

/** Normalize a raw code: strip version suffixes/markers, fold accents. */
function cleanCode(raw: string): string {
  let c = deAccent(raw).toUpperCase().trim();
  c = c.replace(/\.PDF$/i, "");
  c = c.replace(/\s*\(\d+\)$/, ""); // " (1)"
  c = c.replace(/[\s_-]+\d+$/, ""); // " 1", "-1", "_2"
  c = c.replace(/\d{4}$/, ""); // trailing year e.g. DHCD2010
  c = c.replace(/^[\s_-]+|[\s_-]+$/g, ""); // trim separators
  return c;
}

/** Split combined codes (KQKD&DHCD, KQKD-DHCD, KQKDDHCD) into known parts. */
function splitCombined(code: string): string[] {
  if (/[&]/.test(code)) return code.split(/[&]/).map(cleanCode);
  // hyphen between two known codes
  const dash = code.split("-").map(cleanCode);
  if (dash.length === 2 && KNOWN.has(dash[0]) && KNOWN.has(dash[1])) return dash;
  // glued concatenation of two known codes (e.g. KQKDDHCD)
  for (const a of KNOWN) {
    if (code.startsWith(a) && KNOWN.has(code.slice(a.length))) {
      return [a, code.slice(a.length)];
    }
  }
  return [code];
}

type Parsed = { types: string[]; rec: string | null; status: "KNOWN" | "PARTIAL" | "NOISE" | "UNKNOWN" };
function classify(raw: string): Parsed {
  const clean = cleanCode(raw);
  if (!clean || NOISE.has(clean)) return { types: [], rec: null, status: "NOISE" };
  const parts = splitCombined(clean);
  const types: string[] = [];
  let rec: string | null = null;
  let anyKnown = false,
    anyUnknown = false;
  for (const p of parts) {
    if (REC_MAP[p]) {
      rec = REC_MAP[p];
      anyKnown = true;
    } else if (TYPE_MAP[p]) {
      types.push(TYPE_MAP[p].type);
      anyKnown = true;
    } else {
      anyUnknown = true;
    }
  }
  const status = anyKnown && anyUnknown ? "PARTIAL" : anyKnown ? "KNOWN" : "UNKNOWN";
  return { types: [...new Set(types)], rec, status };
}

/** Slug-style files: pull the trailing type keyword. */
function classifySlug(name: string): Parsed {
  const n = name.toLowerCase();
  if (/gap-go-?(nha-dau-tu|ndt)/.test(n)) return { types: ["INVESTOR_MEETING"], rec: null, status: "KNOWN" };
  if (/kqkd/.test(n)) return { types: ["EARNINGS"], rec: null, status: "KNOWN" };
  if (/dhcd/.test(n)) return { types: ["AGM"], rec: null, status: "KNOWN" };
  if (/ndt/.test(n)) return { types: ["INVESTOR_MEETING"], rec: null, status: "KNOWN" };
  return { types: [], rec: null, status: "UNKNOWN" };
}

const TIER: Record<string, "FULL" | "FLASH"> = {
  "bao cao": "FULL",
  "nhan dinh nhanh": "FLASH",
};

const STRUCT = /^([A-Za-z0-9.]+)-(\d{8})-(.+)\.pdf$/i;

type Sym = { ticker: string; company: string; total: number; full: number; flash: number; first: string; last: string };

async function walk(dir: string, rel: string, out: string[]) {
  for (const e of await fs.readdir(dir, { withFileTypes: true })) {
    const abs = path.join(dir, e.name);
    const r = rel ? `${rel}/${e.name}` : e.name;
    if (e.isDirectory()) await walk(abs, r, out);
    else if (e.name.toLowerCase().endsWith(".pdf")) out.push(r);
  }
}

async function main() {
  let root = process.argv[2];
  if (!root) {
    const dl = path.join(os.homedir(), "Downloads");
    const m = (await fs.readdir(dl)).find((e) => /vietcap/i.test(e) && !e.toLowerCase().endsWith(".rar"));
    root = m ? path.join(dl, m) : "";
  }
  if (!root) throw new Error("Corpus path not found — pass it as the first arg.");
  console.log(`Scanning: ${root}\n`);

  const rels: string[] = [];
  await walk(root, "", rels);

  const symbols = new Map<string, Sym>();
  const typeTally = new Map<string, { count: number; p: Parsed }>();
  const unparsed: string[] = [];
  let withDate = 0;

  for (const rel of rels) {
    const seg = rel.split("/");
    const top = seg[0] ?? "";
    const mTicker = top.match(/^\s*([A-Za-z0-9]{2,5})\s*-\s*(.+)$/);
    const ticker = (mTicker?.[1] ?? top.split(/[\s-]/)[0]).toUpperCase();
    const company = (mTicker?.[2] ?? "").trim();
    const tierName = seg.length > 2 ? deAccent(seg[1]).toLowerCase() : "";
    const tier = TIER[tierName] ?? null;
    const file = seg[seg.length - 1];

    // date + raw code
    const m = file.match(STRUCT);
    let date = "";
    let parsed: Parsed;
    let rawCode = "";
    if (m) {
      const d = m[2];
      if (/^20(1[0-9]|2[0-6])(0[1-9]|1[0-2])[0-3]\d$/.test(d)) date = d;
      rawCode = m[3];
      parsed = classify(rawCode);
    } else {
      const dm = file.match(/(20(?:1[0-9]|2[0-6])(?:0[1-9]|1[0-2])[0-3]\d)/);
      if (dm) date = dm[1];
      parsed = classifySlug(file);
      rawCode = "(slug)";
    }
    if (date) withDate++;

    // symbol tally
    const s =
      symbols.get(ticker) ??
      ({ ticker, company, total: 0, full: 0, flash: 0, first: "99999999", last: "0" } as Sym);
    if (company && !s.company) s.company = company;
    s.total++;
    if (tier === "FULL") s.full++;
    if (tier === "FLASH") s.flash++;
    if (date) {
      if (date < s.first) s.first = date;
      if (date > s.last) s.last = date;
    }
    symbols.set(ticker, s);

    // type tally (keyed by raw code so we can build the mapping table)
    if (rawCode !== "(slug)") {
      const key = cleanCode(rawCode) || "(empty)";
      const t = typeTally.get(key) ?? { count: 0, p: parsed };
      t.count++;
      typeTally.set(key, t);
    }
    if (parsed.status === "UNKNOWN") unparsed.push(`${rawCode}\t${rel}`);
  }

  // ── write outputs ──────────────────────────────────────────────────────────
  const outDir = path.join(process.cwd(), "scripts", "dryrun-output");
  await fs.mkdir(outDir, { recursive: true });
  const fmtDate = (d: string) => (d && d !== "99999999" && d !== "0" ? `${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6, 8)}` : "");

  const symRows = [...symbols.values()].sort((a, b) => b.total - a.total);
  await fs.writeFile(
    path.join(outDir, "symbols.csv"),
    "ticker,company,total,full,flash,firstDate,lastDate\n" +
      symRows
        .map((s) => `${s.ticker},"${s.company.replace(/"/g, "'")}",${s.total},${s.full},${s.flash},${fmtDate(s.first)},${fmtDate(s.last)}`)
        .join("\n"),
  );

  const typeRows = [...typeTally.entries()].sort((a, b) => b[1].count - a[1].count);
  await fs.writeFile(
    path.join(outDir, "report-types.csv"),
    "rawCode,count,canonicalType,recommendation,status\n" +
      typeRows
        .map(([code, { count, p }]) => `${code},${count},${p.types.join("|") || "-"},${p.rec ?? "-"},${p.status}`)
        .join("\n"),
  );
  await fs.writeFile(path.join(outDir, "unparsed.txt"), unparsed.join("\n"));

  // ── summary ────────────────────────────────────────────────────────────────
  const distinctTypes = new Set<string>();
  for (const [, { p }] of typeTally) p.types.forEach((t) => distinctTypes.add(t));
  const unknownCodes = typeRows.filter(([, v]) => v.p.status === "UNKNOWN");

  console.log(`=== SUMMARY ===`);
  console.log(`PDF files            : ${rels.length}`);
  console.log(`Distinct tickers     : ${symbols.size}`);
  console.log(`Files with valid date: ${withDate} (${Math.round((withDate / rels.length) * 100)}%)`);
  console.log(`Distinct raw codes   : ${typeTally.size}`);
  console.log(`→ Canonical types    : ${distinctTypes.size}  [${[...distinctTypes].sort().join(", ")}]`);
  console.log(`→ Recommendations    : BUY/HOLD/SELL/REDUCE/ADD (MUA/GIU/BAN/GIAM/THEM)`);
  console.log(`Unparsed (UNKNOWN)   : ${unparsed.length} files across ${unknownCodes.length} codes`);
  console.log(`\nTop UNKNOWN codes (need Vietcap): ${unknownCodes.slice(0, 18).map(([c, v]) => `${c}(${v.count})`).join(", ")}`);
  console.log(`\n=== PROPOSED ReportType mapping (top 25 by volume) ===`);
  console.log("rawCode".padEnd(16), "count".padEnd(7), "type".padEnd(20), "rec".padEnd(6), "status");
  for (const [code, { count, p }] of typeRows.slice(0, 25)) {
    console.log(code.padEnd(16), String(count).padEnd(7), (p.types.join("|") || "-").padEnd(20), (p.rec ?? "-").padEnd(6), p.status);
  }
  console.log(`\nTop 12 tickers by volume:`);
  for (const s of symRows.slice(0, 12)) console.log(`  ${s.ticker.padEnd(6)} ${String(s.total).padStart(3)}  (full ${s.full}, flash ${s.flash})  ${s.company}`);
  console.log(`\nWrote: ${outDir}/{symbols.csv, report-types.csv, unparsed.txt}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
