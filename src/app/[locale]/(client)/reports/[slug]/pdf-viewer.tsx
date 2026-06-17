"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Icon } from "@/components/icon";
import { requestDownloadUrl } from "@/server/download-actions";
import { reviewReport } from "@/server/report-actions";
import { REPORT_STATUS } from "@/lib/status";
import {
  Badge,
  Button,
  Dialog,
  IconButton,
  Input,
  Tabs,
  Toast,
  Tooltip,
  type BadgeTone,
} from "@/components/ui";
import { formatDate } from "@/lib/format";

/* ─────────────────────────────────────────────────────────────────────────
 * Types — plain serializable props from the RSC page.
 * ──────────────────────────────────────────────────────────────────────── */
type ReportStatus =
  | "DRAFT"
  | "REVIEW"
  | "APPROVED"
  | "PUBLISHED"
  | "REJECTED"
  | "ARCHIVED";

type AccessLevel = "PUBLIC" | "RESTRICTED";

export interface ViewerReport {
  id: string;
  slug: string;
  title: string;
  summary: string | null;
  status: ReportStatus;
  accessLevel: AccessLevel;
  categoryLabel: string;
  coverLabel: string | null;
  author: string | null;
  publishedAt: string | null;
  pageCount: number | null;
  hasFile: boolean;
}

export interface PdfViewerProps {
  report: ViewerReport;
  locale: string;
  canApprove: boolean;
  /** Inline view/print endpoint (download uses the one-time token flow). */
  viewUrl: string;
  reviewerName: string;
}

/* Status → Status.* i18n key (resolved via the Status namespace t()). */
const STATUS_LABEL: Record<ReportStatus, string> = {
  DRAFT: "draft",
  REVIEW: "review",
  APPROVED: "approved",
  PUBLISHED: "published",
  REJECTED: "rejected",
  ARCHIVED: "archived",
};
/* Tone comes from the shared @/lib/status REPORT_STATUS map (single source). */

/* Vietnamese status label for the SIMULATED document body (cover page). This
 * represents the printed VN document and stays Vietnamese regardless of UI locale. */
const DOC_STATUS_LABEL_VI: Record<ReportStatus, string> = {
  DRAFT: "Nháp",
  REVIEW: "Chờ duyệt",
  APPROVED: "Đã duyệt",
  PUBLISHED: "Đã phát hành",
  REJECTED: "Từ chối",
  ARCHIVED: "Lưu trữ",
};

/* ─────────────────────────────────────────────────────────────────────────
 * Document pages — mirrors ReportPages.jsx. Each page is an A4 (794×1123 @96dpi)
 * white sheet carrying the diagonal "BẢO MẬT" watermark + investor-only footer
 * (blueprint §VISUAL). This is a VISUAL recreation — no real PDF renderer.
 * ──────────────────────────────────────────────────────────────────────── */
function Watermark() {
  return (
    <div className="pointer-events-none absolute inset-0 flex items-center justify-center overflow-hidden">
      <span
        className="whitespace-nowrap font-sans font-bold text-[rgba(20,22,27,0.05)]"
        style={{
          fontSize: 86,
          letterSpacing: "0.1em",
          transform: "rotate(-32deg)",
        }}
      >
        BẢO MẬT
      </span>
    </div>
  );
}

function PageFrame({
  n,
  total,
  pad = 64,
  children,
}: {
  n: number;
  total: number;
  pad?: number;
  children: React.ReactNode;
}) {
  return (
    <div
      className="relative overflow-hidden rounded-page bg-white shadow-stack"
      style={{ width: 794, minHeight: 1123 }}
    >
      <Watermark />
      <div
        className="relative flex flex-col"
        style={{ padding: pad, minHeight: 1123, boxSizing: "border-box" }}
      >
        {children}
        <div
          className="flex justify-between border-t font-mono text-[10px]"
          style={{
            marginTop: "auto",
            paddingTop: 28,
            marginBlockStart: 36,
            color: "#9aa0a8",
            borderColor: "#eee",
          }}
        >
          <span>BLACKCREST · QUỸ CÂN BẰNG</span>
          <span>
            Bảo mật — chỉ dành cho nhà đầu tư · Trang {n} / {total}
          </span>
        </div>
      </div>
    </div>
  );
}

function H({ children, sz = 22 }: { children: React.ReactNode; sz?: number }) {
  return (
    <h2
      className="font-serif font-semibold"
      style={{
        fontSize: sz,
        color: "#1c1d21",
        letterSpacing: "-0.012em",
        margin: "0 0 14px",
      }}
    >
      {children}
    </h2>
  );
}
function P({ children }: { children: React.ReactNode }) {
  return (
    <p
      style={{
        fontSize: 13.5,
        lineHeight: 1.7,
        color: "#3c4149",
        margin: "0 0 13px",
        textAlign: "justify",
      }}
    >
      {children}
    </p>
  );
}
function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="font-mono uppercase"
      style={{
        fontSize: 10.5,
        letterSpacing: "0.12em",
        color: "#16181d",
        marginBottom: 8,
      }}
    >
      {children}
    </div>
  );
}

/* Cover page — uses the report's real title / category / author. */
function CoverPage({
  report,
  locale,
  total,
}: {
  report: ViewerReport;
  locale: string;
  total: number;
}) {
  return (
    <PageFrame n={1} total={total} pad={0}>
      <div
        className="relative flex flex-col"
        style={{ height: 1123, padding: 64, boxSizing: "border-box" }}
      >
        <div className="flex items-center gap-[10px]">
          <div
            className="flex items-center justify-center"
            style={{ width: 30, height: 30, borderRadius: 7, background: "#0a0b0d" }}
          >
            <svg width="19" height="19" viewBox="0 0 64 64" fill="none" aria-hidden>
              <path
                d="M16 39 L32 21 L48 39"
                stroke="#fff"
                strokeWidth="6"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M20.5 46.5 L32 33.5 L43.5 46.5"
                stroke="#fff"
                strokeWidth="5"
                strokeLinecap="round"
                strokeLinejoin="round"
                opacity="0.62"
              />
            </svg>
          </div>
          <span className="font-serif font-semibold" style={{ fontSize: 20 }}>
            Blackcrest
          </span>
        </div>

        <div style={{ marginTop: 220 }}>
          <div
            className="font-mono uppercase"
            style={{ fontSize: 12, letterSpacing: "0.14em", color: "#16181d" }}
          >
            {report.categoryLabel}
          </div>
          <h1
            className="font-serif font-semibold"
            style={{
              fontSize: 52,
              lineHeight: 1.08,
              letterSpacing: "-0.022em",
              color: "#1c1d21",
              margin: "20px 0 0",
            }}
          >
            {report.title}
          </h1>
          <div
            className="font-serif italic"
            style={{ marginTop: 28, fontSize: 22, color: "#3c4149" }}
          >
            {report.coverLabel ?? "Quỹ Cân bằng Blackcrest"}
          </div>
        </div>

        <div
          className="flex items-end justify-between"
          style={{ marginTop: "auto" }}
        >
          <div style={{ fontSize: 12, color: "#6a6f78", lineHeight: 1.8 }}>
            <div>Phân loại: {report.categoryLabel}</div>
            <div>
              Ngày phát hành: {formatDate(report.publishedAt, locale)}
            </div>
            <div>
              Trạng thái: {DOC_STATUS_LABEL_VI[report.status]} ·{" "}
              {report.accessLevel === "PUBLIC" ? "Công khai nội bộ" : "Hạn chế"}
            </div>
          </div>
          <div
            className="font-mono text-right"
            style={{ fontSize: 10, color: "#9aa0a8" }}
          >
            TÀI LIỆU BẢO MẬT
            <br />
            KHÔNG SAO CHÉP
          </div>
        </div>
      </div>
    </PageFrame>
  );
}

/* Page 2 — executive summary (uses the report summary as the lede). */
function SummaryPage({
  report,
  total,
}: {
  report: ViewerReport;
  total: number;
}) {
  const kpis: [string, string, string][] = [
    ["NAV / đơn vị", "12.847,02", "+8,42% YTD"],
    ["Tổng tài sản ròng", "₫ 4.182 tỷ", "+11,3%"],
    ["Tỷ suất Sharpe", "1,84", "+0,21"],
  ];
  return (
    <PageFrame n={2} total={total}>
      <Eyebrow>01 — Tóm tắt điều hành</Eyebrow>
      <H>Tổng quan kết quả quý</H>
      <P>
        {report.summary ??
          "Trong kỳ báo cáo, Quỹ Cân bằng Blackcrest duy trì cân bằng giữa tài sản cố định và cổ phiếu niêm yết, với việc gia tăng tỷ trọng trái phiếu doanh nghiệp chất lượng cao trong giai đoạn biến động lãi suất."}
      </P>
      <P>
        Dòng tiền giải ngân từ các cam kết hiện hữu đạt 78% kế hoạch năm. Quỹ
        tiếp tục thận trọng với các khoản đầu tư bất động sản trong bối cảnh
        thanh khoản thị trường còn hạn chế.
      </P>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr 1fr",
          gap: 14,
          margin: "24px 0",
        }}
      >
        {kpis.map(([l, v, s]) => (
          <div
            key={l}
            style={{ border: "1px solid #ececef", borderRadius: 10, padding: 16 }}
          >
            <div style={{ fontSize: 11, color: "#6a6f78" }}>{l}</div>
            <div
              className="font-mono font-medium"
              data-numeric
              style={{ fontSize: 20, color: "#1c1d21", marginTop: 6 }}
            >
              {v}
            </div>
            <div style={{ fontSize: 11, color: "#1f9a3d", marginTop: 5 }}>{s}</div>
          </div>
        ))}
      </div>
      <P>
        Ban điều hành duy trì quan điểm tích cực thận trọng cho quý tới, với
        trọng tâm bảo toàn vốn và tận dụng cơ hội tái cơ cấu danh mục khi định
        giá thị trường trở nên hấp dẫn hơn.
      </P>
    </PageFrame>
  );
}

/* Page 3 — performance chart + table. */
function PerformancePage({ total }: { total: number }) {
  const months: [string, number][] = [
    ["T7", 62],
    ["T8", 48],
    ["T9", 80],
  ];
  const rows: [string, string, string, string][] = [
    ["Tháng 7", "+2,81%", "+2,10%", "+0,71"],
    ["Tháng 8", "+1,94%", "+1,72%", "+0,22"],
    ["Tháng 9", "+3,40%", "+2,55%", "+0,85"],
  ];
  return (
    <PageFrame n={3} total={total}>
      <Eyebrow>02 — Hiệu suất</Eyebrow>
      <H>Lợi nhuận theo tháng</H>
      <P>
        Biểu đồ dưới đây thể hiện lợi nhuận hàng tháng của quỹ trong kỳ báo cáo,
        so sánh với chỉ số tham chiếu VN-Balanced.
      </P>
      <div
        style={{
          display: "flex",
          alignItems: "flex-end",
          gap: 40,
          height: 220,
          padding: "20px 24px",
          border: "1px solid #ececef",
          borderRadius: 10,
          margin: "8px 0 24px",
        }}
      >
        {months.map(([m, h]) => (
          <div
            key={m}
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 8,
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "flex-end",
                gap: 6,
                height: 160,
              }}
            >
              <div
                style={{
                  width: 26,
                  height: h * 1.6,
                  background: "#16181d",
                  borderRadius: "3px 3px 0 0",
                }}
              />
              <div
                style={{
                  width: 26,
                  height: h * 1.2,
                  background: "#cfd0d6",
                  borderRadius: "3px 3px 0 0",
                }}
              />
            </div>
            <span className="font-mono" style={{ fontSize: 11, color: "#6a6f78" }}>
              {m}
            </span>
          </div>
        ))}
      </div>
      <table
        style={{
          width: "100%",
          borderCollapse: "collapse",
          fontSize: 12.5,
          fontFeatureSettings: "'tnum'",
        }}
      >
        <thead>
          <tr
            className="uppercase"
            style={{
              textAlign: "left",
              color: "#6a6f78",
              fontSize: 11,
              letterSpacing: "0.04em",
            }}
          >
            <th style={{ padding: "8px 0", borderBottom: "1px solid #ececef" }}>
              Tháng
            </th>
            <th style={{ borderBottom: "1px solid #ececef" }}>Quỹ</th>
            <th style={{ borderBottom: "1px solid #ececef" }}>Tham chiếu</th>
            <th
              style={{ borderBottom: "1px solid #ececef", textAlign: "right" }}
            >
              Chênh lệch
            </th>
          </tr>
        </thead>
        <tbody className="font-mono" style={{ color: "#1c1d21" }}>
          {rows.map((r) => (
            <tr key={r[0]}>
              <td
                className="font-sans"
                style={{ padding: "9px 0", borderBottom: "1px solid #f4f4f6" }}
              >
                {r[0]}
              </td>
              <td data-numeric style={{ borderBottom: "1px solid #f4f4f6" }}>
                {r[1]}
              </td>
              <td
                data-numeric
                style={{ borderBottom: "1px solid #f4f4f6", color: "#6a6f78" }}
              >
                {r[2]}
              </td>
              <td
                data-numeric
                style={{
                  borderBottom: "1px solid #f4f4f6",
                  textAlign: "right",
                  color: "#1f9a3d",
                }}
              >
                {r[3]}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </PageFrame>
  );
}

/* Page 4 — allocation. */
function AllocationPage({ total }: { total: number }) {
  const alloc: [string, number, string][] = [
    ["Cổ phiếu niêm yết", 42, "#16181d"],
    ["Trái phiếu doanh nghiệp", 28, "#45484f"],
    ["Bất động sản", 14, "#74777f"],
    ["Tiền & tương đương", 10, "#a2a5ad"],
    ["Khác", 6, "#cfd1d6"],
  ];
  return (
    <PageFrame n={4} total={total}>
      <Eyebrow>03 — Phân bổ tài sản</Eyebrow>
      <H>Cơ cấu danh mục</H>
      <P>
        Danh mục được phân bổ theo nguyên tắc cân bằng rủi ro, ưu tiên thanh
        khoản và chất lượng tín dụng trong giai đoạn hiện tại.
      </P>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 14,
          margin: "20px 0",
        }}
      >
        {alloc.map(([l, p, c]) => (
          <div key={l}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                fontSize: 12.5,
                marginBottom: 6,
              }}
            >
              <span style={{ color: "#3c4149" }}>{l}</span>
              <span
                className="font-mono font-medium"
                data-numeric
                style={{ color: "#1c1d21" }}
              >
                {p}%
              </span>
            </div>
            <div style={{ height: 9, background: "#f4f4f6", borderRadius: 999 }}>
              <div
                style={{
                  height: "100%",
                  width: `${p}%`,
                  background: c,
                  borderRadius: 999,
                }}
              />
            </div>
          </div>
        ))}
      </div>
      <P>
        So với kỳ trước, tỷ trọng cổ phiếu niêm yết giảm 3 điểm phần trăm,
        chuyển sang trái phiếu doanh nghiệp nhằm khoá lợi suất trong môi trường
        lãi suất dự kiến đi ngang.
      </P>
    </PageFrame>
  );
}

/* Page 5 — notes + disclaimer + signatures. */
function NotesPage({
  report,
  total,
}: {
  report: ViewerReport;
  total: number;
}) {
  return (
    <PageFrame n={5} total={total}>
      <Eyebrow>04 — Ghi chú quản lý &amp; triển vọng</Eyebrow>
      <H>Triển vọng kỳ tới</H>
      <P>
        Chúng tôi kỳ vọng môi trường vĩ mô ổn định hơn trong kỳ tới, với áp lực
        lạm phát hạ nhiệt và mặt bằng lãi suất duy trì. Quỹ sẽ tiếp tục chiến
        lược cân bằng, đồng thời chuẩn bị nguồn lực cho các cơ hội đầu tư tư nhân
        có chọn lọc.
      </P>
      <P>
        Các khoản cam kết mới dự kiến được giải ngân theo tiến độ, ưu tiên các
        thương vụ có dòng tiền ổn định và biên an toàn định giá rõ ràng.
      </P>
      <div
        style={{
          marginTop: 28,
          padding: 20,
          background: "#f8f8f9",
          borderRadius: 10,
          border: "1px solid #ececef",
        }}
      >
        <div
          className="font-mono uppercase"
          style={{
            fontSize: 10.5,
            letterSpacing: "0.1em",
            color: "#6a6f78",
            marginBottom: 10,
          }}
        >
          Miễn trừ trách nhiệm
        </div>
        <p
          style={{
            fontSize: 11.5,
            lineHeight: 1.65,
            color: "#6a6f78",
            margin: 0,
          }}
        >
          Tài liệu này được chuẩn bị riêng cho nhà đầu tư của Quỹ Cân bằng
          Blackcrest và không được phân phối lại. Hiệu suất trong quá khứ không
          đảm bảo cho kết quả tương lai. Mọi quyết định đầu tư cần dựa trên bản
          cáo bạch chính thức.
        </p>
      </div>
      <div style={{ marginTop: 40, display: "flex", gap: 60 }}>
        <div>
          <div
            className="font-serif"
            style={{
              fontSize: 17,
              color: "#1c1d21",
              borderBottom: "1px solid #cfd0d6",
              paddingBottom: 30,
              width: 180,
            }}
          />
          <div style={{ fontSize: 11.5, color: "#6a6f78", marginTop: 8 }}>
            Giám đốc Quỹ
          </div>
        </div>
        <div>
          <div
            className="font-serif"
            style={{
              fontSize: 17,
              color: "#1c1d21",
              borderBottom: "1px solid #cfd0d6",
              paddingBottom: 30,
              width: 180,
            }}
          >
            {report.author ?? ""}
          </div>
          <div style={{ fontSize: 11.5, color: "#6a6f78", marginTop: 8 }}>
            Người duyệt
          </div>
        </div>
      </div>
    </PageFrame>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
 * Main viewer island.
 * ──────────────────────────────────────────────────────────────────────── */
export function PdfViewer({
  report,
  locale,
  canApprove,
  viewUrl,
  reviewerName,
}: PdfViewerProps) {
  const [zoom, setZoom] = React.useState(0.92);
  const [current, setCurrent] = React.useState(1);
  const [panelOpen, setPanelOpen] = React.useState(true);
  const [dialog, setDialog] = React.useState<
    "approve" | "reject" | "publish" | null
  >(null);
  const [toast, setToast] = React.useState<
    "approved" | "rejected" | "published" | null
  >(null);
  const [downloading, setDownloading] = React.useState(false);
  const [downloadErr, setDownloadErr] = React.useState<string | null>(null);
  const [reviewNote, setReviewNote] = React.useState("");
  const [reviewing, setReviewing] = React.useState(false);
  const router = useRouter();
  const t = useTranslations("Viewer");
  const tStatus = useTranslations("Status");

  // Persist an approve/reject decision via the real Server Action, then refresh
  // so the status badge reflects the new state (no more fake confirmation).
  const handleReview = async (decision: "approve" | "reject" | "publish") => {
    if (reviewing) return;
    setReviewing(true);
    try {
      const res = await reviewReport({
        reportId: report.id,
        decision,
        note: reviewNote || undefined,
      });
      setDialog(null);
      setReviewNote("");
      if (res.ok) {
        setToast(
          decision === "approve"
            ? "approved"
            : decision === "publish"
              ? "published"
              : "rejected",
        );
        router.refresh();
      } else {
        setDownloadErr(res.error);
      }
    } catch {
      setDownloadErr(t("reviewError"));
    } finally {
      setReviewing(false);
    }
  };

  // Mint a one-time, short-lived, watermarked download URL then navigate to it
  // (blueprint §F1) — never link straight to storage.
  const handleDownload = async () => {
    if (downloading) return;
    setDownloading(true);
    setDownloadErr(null);
    try {
      const res = await requestDownloadUrl(report.id);
      if ("url" in res) window.location.href = res.url;
      else setDownloadErr(res.error);
    } catch {
      setDownloadErr(t("downloadLinkError"));
    } finally {
      setDownloading(false);
    }
  };

  const scrollRef = React.useRef<HTMLDivElement | null>(null);
  const pageRefs = React.useRef<(HTMLDivElement | null)[]>([]);

  const pages = React.useMemo(
    () => [
      {
        title: "Trang bìa",
        el: <CoverPage report={report} locale={locale} total={5} />,
      },
      { title: "Tóm tắt điều hành", el: <SummaryPage report={report} total={5} /> },
      { title: "Hiệu suất", el: <PerformancePage total={5} /> },
      { title: "Phân bổ tài sản", el: <AllocationPage total={5} /> },
      { title: "Ghi chú & triển vọng", el: <NotesPage report={report} total={5} /> },
    ],
    [report, locale],
  );
  const total = pages.length;

  // Track the current page via IntersectionObserver (mirror PdfViewer.jsx).
  React.useEffect(() => {
    const root = scrollRef.current;
    if (!root) return;
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            const p = (e.target as HTMLElement).dataset.page;
            if (p) setCurrent(Number(p));
          }
        });
      },
      { root, threshold: 0.5 },
    );
    pageRefs.current.forEach((el) => el && io.observe(el));
    return () => io.disconnect();
  }, [total]);

  const jump = (i: number) => {
    const el = pageRefs.current[i];
    const root = scrollRef.current;
    if (el && root) root.scrollTo({ top: el.offsetTop - 24, behavior: "smooth" });
  };
  const step = (d: number) =>
    jump(Math.min(total - 1, Math.max(0, current - 1 + d)));
  const changeZoom = (d: number) =>
    setZoom((z) => Math.min(2, Math.max(0.5, Math.round((z + d) * 100) / 100)));
  const fit = () => setZoom(0.92);

  return (
    <div
      className="flex flex-col bg-surface font-sans"
      style={{ height: "100vh" }}
    >
      {/* ── Top toolbar ───────────────────────────────────────────────── */}
      <header className="flex h-[56px] flex-none items-center gap-[14px] border-b border-line bg-surface pl-3 pr-[14px]">
        <Link href="/reports" className="inline-flex">
          <IconButton label={t("backToLibrary")}>
            <Icon name="arrow-left" size={18} />
          </IconButton>
        </Link>
        <span className="h-6 w-px flex-none bg-line" />
        <span className="flex h-9 w-[30px] flex-none items-center justify-center rounded-card border border-line bg-surface-2">
          <Icon name="file-text" size={16} className="text-ink-3" />
        </span>
        <div className="min-w-0">
          <div className="flex items-center gap-[9px]">
            <span className="truncate text-[15px] font-semibold tracking-[-0.01em] text-ink">
              {report.title}
            </span>
            <Badge tone={REPORT_STATUS[report.status].tone} dot>
              {tStatus(STATUS_LABEL[report.status])}
            </Badge>
          </div>
          <div className="text-[12px] text-ink-4">
            {report.categoryLabel} ·{" "}
            <span className="font-mono">{report.slug}</span>
          </div>
        </div>

        <div className="ml-auto flex items-center gap-[6px]">
          <Tooltip content={t("searchInDocument")}>
            <IconButton label={t("search")}>
              <Icon name="search" size={18} />
            </IconButton>
          </Tooltip>
          <Tooltip content={t("download")}>
            <IconButton
              label={t("download")}
              onClick={handleDownload}
              disabled={downloading || !report.hasFile}
            >
              <Icon name="download" size={18} />
            </IconButton>
          </Tooltip>
          <Tooltip content={t("print")}>
            <a
              href={viewUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex"
            >
              <IconButton label={t("print")}>
                <Icon name="printer" size={18} />
              </IconButton>
            </a>
          </Tooltip>
          <Tooltip content={t("share")}>
            <IconButton label={t("share")}>
              <Icon name="share-2" size={18} />
            </IconButton>
          </Tooltip>
          <span className="mx-[2px] h-6 w-px flex-none bg-line" />
          <Tooltip content={panelOpen ? t("hidePanel") : t("showPanel")} side="bottom">
            <IconButton
              label={t("infoPanel")}
              active={panelOpen}
              onClick={() => setPanelOpen((v) => !v)}
            >
              <Icon name="panel-left" size={18} className="scale-x-[-1]" />
            </IconButton>
          </Tooltip>
        </div>
      </header>

      {/* ── Body: rail · canvas · side-panel ──────────────────────────── */}
      <div className="relative flex flex-1 overflow-hidden">
        {/* Thumbnail rail */}
        <aside className="w-[168px] flex-none overflow-auto border-r border-line bg-surface-1 py-4">
          {pages.map((p, i) => {
            const active = current === i + 1;
            return (
              <button
                key={i}
                type="button"
                onClick={() => jump(i)}
                className="block w-full cursor-pointer border-none bg-transparent pb-[14px] pt-[6px]"
              >
                <div
                  className="relative mx-auto overflow-hidden rounded-page bg-white"
                  style={{
                    width: 96,
                    height: 136,
                    outline: active
                      ? "2px solid var(--color-accent)"
                      : "1px solid var(--color-border-secondary)",
                    boxShadow: active
                      ? "var(--shadow-medium)"
                      : "var(--shadow-low)",
                  }}
                >
                  <div
                    className="pointer-events-none"
                    style={{
                      transform: "scale(0.1208)",
                      transformOrigin: "top left",
                      width: 794,
                      height: 1123,
                    }}
                  >
                    {p.el}
                  </div>
                </div>
                <div
                  className={
                    "mt-[7px] font-mono text-[12px] " +
                    (active
                      ? "font-semibold text-accent"
                      : "font-medium text-ink-4")
                  }
                  data-numeric
                >
                  {i + 1}
                </div>
              </button>
            );
          })}
        </aside>

        {/* Canvas */}
        <div className="relative flex flex-1">
          <div
            ref={scrollRef}
            className="flex-1 overflow-auto bg-surface-2"
            style={{ padding: "32px 0 120px" }}
          >
            <div
              className="flex flex-col items-center gap-6"
              style={{ zoom }}
            >
              {pages.map((p, i) => (
                <div
                  key={i}
                  ref={(el) => {
                    pageRefs.current[i] = el;
                  }}
                  data-page={i + 1}
                >
                  {p.el}
                </div>
              ))}
            </div>
          </div>

          {/* Floating page-nav / zoom toolbar */}
          <div
            className="absolute bottom-6 left-1/2 z-10 flex -translate-x-1/2 items-center gap-1 rounded-card-lg border border-line bg-surface p-[6px] shadow-float"
          >
            <IconButton label={t("previousPage")} size="sm" onClick={() => step(-1)}>
              <Icon name="chevron-up" size={17} />
            </IconButton>
            <div className="flex items-center gap-[5px] px-[6px] font-mono text-[13px] text-ink-3">
              <span className="font-medium text-ink" data-numeric>
                {current}
              </span>
              <span className="text-ink-4" data-numeric>
                / {total}
              </span>
            </div>
            <IconButton label={t("nextPage")} size="sm" onClick={() => step(1)}>
              <Icon name="chevron-down" size={17} />
            </IconButton>
            <span className="mx-1 h-5 w-px bg-line" />
            <IconButton
              label={t("zoomOut")}
              size="sm"
              onClick={() => changeZoom(-0.1)}
            >
              <Icon name="zoom-out" size={16} />
            </IconButton>
            <span
              className="min-w-[44px] text-center font-mono text-[13px] text-ink-3"
              data-numeric
            >
              {Math.round(zoom * 100)}%
            </span>
            <IconButton
              label={t("zoomIn")}
              size="sm"
              onClick={() => changeZoom(0.1)}
            >
              <Icon name="zoom-in" size={16} />
            </IconButton>
            <span className="mx-1 h-5 w-px bg-line" />
            <Tooltip content={t("fitToWidth")}>
              <IconButton label={t("fitToWidth")} size="sm" onClick={fit}>
                <Icon name="maximize" size={15} />
              </IconButton>
            </Tooltip>
          </div>
        </div>

        {/* Right side-panel */}
        {panelOpen && (
          <SidePanel
            report={report}
            locale={locale}
            canApprove={canApprove}
            reviewerName={reviewerName}
            onApprove={() => {
              setReviewNote("");
              setDialog("approve");
            }}
            onReject={() => {
              setReviewNote("");
              setDialog("reject");
            }}
            onPublish={() => {
              setReviewNote("");
              setDialog("publish");
            }}
          />
        )}
      </div>

      {/* ── Approval dialogs (staff only) ─────────────────────────────── */}
      <Dialog
        open={dialog === "approve"}
        onClose={() => setDialog(null)}
        title={t("approveDialogTitle")}
        description={t("approveDialogDescription")}
        footer={
          <>
            <Button variant="ghost" onClick={() => setDialog(null)}>
              {t("cancel")}
            </Button>
            <Button
              variant="primary"
              loading={reviewing}
              onClick={() => handleReview("approve")}
            >
              {t("approve")}
            </Button>
          </>
        }
      >
        <Input
          label={t("approveNoteLabel")}
          placeholder={t("approveNotePlaceholder")}
          value={reviewNote}
          onChange={(e) => setReviewNote(e.target.value)}
        />
      </Dialog>

      <Dialog
        open={dialog === "reject"}
        onClose={() => setDialog(null)}
        title={t("rejectDialogTitle")}
        description={t("rejectDialogDescription")}
        footer={
          <>
            <Button variant="ghost" onClick={() => setDialog(null)}>
              {t("cancel")}
            </Button>
            <Button
              variant="danger"
              loading={reviewing}
              onClick={() => handleReview("reject")}
            >
              {t("reject")}
            </Button>
          </>
        }
      >
        <Input
          label={t("rejectNoteLabel")}
          placeholder={t("rejectNotePlaceholder")}
          value={reviewNote}
          onChange={(e) => setReviewNote(e.target.value)}
        />
      </Dialog>

      <Dialog
        open={dialog === "publish"}
        onClose={() => setDialog(null)}
        title={t("publishDialogTitle")}
        description={t("publishDialogDescription")}
        footer={
          <>
            <Button variant="ghost" onClick={() => setDialog(null)}>
              {t("cancel")}
            </Button>
            <Button
              variant="primary"
              loading={reviewing}
              onClick={() => handleReview("publish")}
            >
              {t("publish")}
            </Button>
          </>
        }
      >
        <Input
          label={t("approveNoteLabel")}
          placeholder={t("approveNotePlaceholder")}
          value={reviewNote}
          onChange={(e) => setReviewNote(e.target.value)}
        />
      </Dialog>

      {toast && (
        <div className="fixed bottom-6 right-6 z-[200]">
          {toast === "approved" || toast === "published" ? (
            <Toast
              tone="success"
              icon={<Icon name="check-circle" size={18} />}
              title={
                toast === "published"
                  ? t("publishedToastTitle")
                  : t("approvedToastTitle")
              }
              message={
                toast === "published"
                  ? t("publishedToastMessage")
                  : t("approvedToastMessage")
              }
              onClose={() => setToast(null)}
              duration={4000}
            />
          ) : (
            <Toast
              tone="danger"
              icon={<Icon name="x-circle" size={18} />}
              title={t("rejectedToastTitle")}
              message={t("rejectedToastMessage")}
              onClose={() => setToast(null)}
              duration={4000}
            />
          )}
        </div>
      )}

      {downloadErr && (
        <div className="fixed bottom-6 right-6 z-[200]">
          <Toast
            tone="danger"
            icon={<Icon name="alert-circle" size={18} />}
            title={t("downloadErrorTitle")}
            message={downloadErr}
            onClose={() => setDownloadErr(null)}
            duration={5000}
          />
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
 * Right side-panel — metadata + access for everyone; approval timeline +
 * actions ONLY when canApprove.
 * ──────────────────────────────────────────────────────────────────────── */
function MetaRow({ k, v, mono = false }: { k: string; v: React.ReactNode; mono?: boolean }) {
  return (
    <div className="flex justify-between gap-3 border-b border-line py-2">
      <span className="text-[13px] text-ink-3">{k}</span>
      <span
        className={
          "text-right text-[13px] font-medium text-ink " +
          (mono ? "font-mono" : "")
        }
        data-numeric={mono ? "" : undefined}
      >
        {v}
      </span>
    </div>
  );
}

function SidePanel({
  report,
  locale,
  canApprove,
  reviewerName,
  onApprove,
  onReject,
  onPublish,
}: {
  report: ViewerReport;
  locale: string;
  canApprove: boolean;
  reviewerName: string;
  onApprove: () => void;
  onReject: () => void;
  onPublish: () => void;
}) {
  const [tab, setTab] = React.useState("info");
  const t = useTranslations("Viewer");
  const tStatus = useTranslations("Status");

  const timeline: [string, string, string, BadgeTone][] = [
    [t("stepCreateDraft"), report.author ?? t("editor"), "—", "approved"],
    [t("stepSubmitApproval"), report.author ?? t("editor"), "—", "approved"],
    [
      t("stepApprove"),
      reviewerName,
      report.publishedAt ? formatDate(report.publishedAt, locale) : "—",
      "approved",
    ],
    [
      t("stepPublish"),
      t("system"),
      report.publishedAt ? formatDate(report.publishedAt, locale) : "—",
      "published",
    ],
  ];

  return (
    <aside className="flex w-[320px] flex-none flex-col overflow-hidden border-l border-line bg-surface">
      <div className="px-4">
        <Tabs
          value={tab}
          onChange={setTab}
          items={[
            { value: "info", label: t("tabInfo") },
            { value: "access", label: t("tabAccess") },
          ]}
        />
      </div>

      <div className="flex-1 overflow-auto p-4">
        {tab === "info" ? (
          <>
            <div style={{ marginBottom: 22 }}>
              <MetaRow k={t("fieldCategory")} v={report.categoryLabel} />
              <MetaRow k={t("fieldAuthor")} v={report.author ?? "—"} />
              <MetaRow
                k={t("fieldStatus")}
                v={
                  <Badge tone={REPORT_STATUS[report.status].tone} size="sm">
                    {tStatus(STATUS_LABEL[report.status])}
                  </Badge>
                }
              />
              <MetaRow
                k={t("fieldPublishedAt")}
                v={formatDate(report.publishedAt, locale)}
                mono
              />
              <MetaRow k={t("fieldPageCount")} v={report.pageCount ?? "—"} mono />
              <MetaRow k={t("fieldDocumentId")} v={report.slug} mono />
            </div>

            {canApprove ? (
              <>
                <div className="bc-overline mb-3 text-[11px] font-semibold uppercase tracking-[0.1em] text-ink-3">
                  {t("approvalProcess")}
                </div>
                <div className="relative pl-1">
                  {timeline.map((t, i) => (
                    <div
                      key={i}
                      className="relative flex gap-3"
                      style={{
                        paddingBottom: i < timeline.length - 1 ? 18 : 0,
                      }}
                    >
                      {i < timeline.length - 1 && (
                        <span
                          className="absolute bottom-0 w-[2px] bg-line-2"
                          style={{ left: 7, top: 18 }}
                        />
                      )}
                      <span
                        className="z-[1] flex h-4 w-4 flex-none items-center justify-center rounded-pill"
                        style={{ background: `var(--status-${t[3]})` }}
                      >
                        <Icon name="check" size={10} className="text-white" />
                      </span>
                      <div className="min-w-0">
                        <div className="text-[13px] font-semibold text-ink">
                          {t[0]}
                        </div>
                        <div className="text-[12px] text-ink-4">
                          {t[1]} ·{" "}
                          <span className="font-mono" data-numeric>
                            {t[2]}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="rounded-card border border-line bg-surface-1 p-3">
                <div className="mb-[6px] flex items-center gap-2 text-ink-2">
                  <Icon name="lock" size={14} />
                  <span className="text-[13px] font-medium">
                    {t("confidentialDocument")}
                  </span>
                </div>
                <p className="text-[12px] leading-[1.5] text-ink-3">
                  {t("confidentialDocumentNote")}
                </p>
              </div>
            )}
          </>
        ) : (
          <div className="flex flex-col gap-3">
            <MetaRow
              k={t("accessLevel")}
              v={
                <Badge
                  tone={report.accessLevel === "PUBLIC" ? "neutral" : "accent"}
                  size="sm"
                >
                  {report.accessLevel === "PUBLIC"
                    ? t("accessInternalPublic")
                    : t("accessRestricted")}
                </Badge>
              }
            />
            <MetaRow
              k={t("attachment")}
              v={report.hasFile ? t("attachmentUploaded") : t("attachmentNone")}
            />
            <div className="rounded-card border border-line bg-surface-1 p-3">
              <div className="mb-[6px] flex items-center gap-2 text-ink-2">
                <Icon name="shield-check" size={14} />
                <span className="text-[13px] font-medium">{t("accessPolicy")}</span>
              </div>
              <p className="text-[12px] leading-[1.5] text-ink-3">
                {report.accessLevel === "PUBLIC"
                  ? t("accessPolicyPublic")
                  : t("accessPolicyRestricted")}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Approval actions — staff only, and only when a transition is valid for
          the current status (REVIEW → approve/reject, APPROVED → publish/reject). */}
      {canApprove &&
        (report.status === "REVIEW" || report.status === "APPROVED") && (
          <div className="flex-none border-t border-line bg-surface-1 p-[14px]">
            <div className="mb-[10px] text-[11px] font-semibold uppercase tracking-[0.1em] text-ink-3">
              {t("approvalActions")}
            </div>
            <div className="flex gap-2">
              {report.status === "REVIEW" ? (
                <Button
                  variant="primary"
                  fullWidth
                  leadingIcon={<Icon name="check" size={16} />}
                  onClick={onApprove}
                >
                  {t("approve")}
                </Button>
              ) : (
                <Button
                  variant="primary"
                  fullWidth
                  leadingIcon={<Icon name="send" size={16} />}
                  onClick={onPublish}
                >
                  {t("publish")}
                </Button>
              )}
              <Button
                variant="secondary"
                leadingIcon={<Icon name="x" size={16} />}
                onClick={onReject}
              >
                {t("reject")}
              </Button>
            </div>
          </div>
        )}
    </aside>
  );
}
