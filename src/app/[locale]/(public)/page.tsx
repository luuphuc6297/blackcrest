import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { Badge, Button } from "@/components/ui";
import { Icon } from "@/components/icon";
import type { IconName } from "@/components/icon";
import { Logo } from "@/components/logo";
import { LanguageSwitcher } from "@/components/language-switcher";
import { Reveal } from "@/components/reveal";
import { MobileMenu } from "./mobile-menu";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const title =
    locale === "en"
      ? "Investment documents, controlled to every page"
      : locale === "zh"
        ? "投资文件，逐页严格管控"
        : "Tài liệu đầu tư, được kiểm soát đến từng trang";
  const description =
    locale === "en"
      ? "Blackcrest issues, approves and distributes confidential investment reports to investors — in one precise, fast workflow."
      : locale === "zh"
        ? "Blackcrest 在单一流程中发布、审批并向投资者分发机密投资报告——精准高效。"
        : "Blackcrest phát hành, phê duyệt và phân phối báo cáo đầu tư bảo mật tới nhà đầu tư — trong một quy trình duy nhất, chính xác và nhanh.";
  // Marketing landing — the one public page we DO want indexed.
  return {
    title,
    description,
    robots: { index: true, follow: true },
    alternates: {
      canonical: `/${locale}`,
      languages: { vi: "/vi", en: "/en", zh: "/zh", "x-default": "/vi" },
    },
  };
}

type NavItem = { label: string; href: string };

export default async function LandingPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations();

  const nav: NavItem[] = [
    { label: t("Marketing.products"), href: "#san-pham" },
    { label: t("Marketing.security"), href: "#bao-mat" },
    { label: t("Marketing.process"), href: "#quy-trinh" },
    { label: t("Marketing.clients"), href: "#khach-hang" },
  ];

  return (
    <div className="min-h-screen bg-surface-marketing">
      <div className="bg-surface">
        <Header
          nav={nav}
          signInLabel={t("Actions.signIn")}
          registerLabel={t("Actions.requestAccess")}
          menuLabel={t("Landing.menu")}
        />
        <Hero
          eyebrow={t("Landing.heroEyebrow")}
          headline={t("Landing.heroHeadline")}
          subtitle={t("Landing.heroSubtitle")}
          microcopy={t("Landing.heroMicrocopy")}
          getStartedLabel={t("Actions.getStarted")}
          viewDemoLabel={t("Marketing.viewDemo")}
          publishedLabel={t("Status.published")}
        />
        <Reveal>
        <Trust
          stats={[
            { value: "248", label: t("Landing.statInvestors") },
            { value: "12.400+", label: t("Landing.statDocuments") },
            { value: "99,98%", label: t("Landing.statUptime") },
            { value: "< 180ms", label: t("Landing.statLatency") },
          ]}
        />
        </Reveal>
        <Reveal>
        <Features
          eyebrow={t("Landing.featuresEyebrow")}
          heading={t("Landing.featuresHeading")}
          items={[
            {
              icon: "file-check",
              title: t("Landing.feature1Title"),
              desc: t("Landing.feature1Body"),
            },
            {
              icon: "shield-check",
              title: t("Landing.feature2Title"),
              desc: t("Landing.feature2Body"),
            },
            {
              icon: "activity",
              title: t("Landing.feature3Title"),
              desc: t("Landing.feature3Body"),
            },
          ]}
        />
        </Reveal>
        <Reveal>
        <Workflow
          eyebrow={t("Landing.workflowEyebrow")}
          heading={t("Landing.workflowHeading")}
          intro={t("Landing.workflowIntro")}
          reviewLabel={t("Status.review")}
          steps={[
            {
              tone: "draft",
              label: t("Status.draft"),
              title: t("Landing.step1Title"),
              desc: t("Landing.step1Body"),
            },
            {
              tone: "review",
              label: t("Status.review"),
              title: t("Landing.step2Title"),
              desc: t("Landing.step2Body"),
            },
            {
              tone: "approved",
              label: t("Status.approved"),
              title: t("Landing.step3Title"),
              desc: t("Landing.step3Body"),
            },
            {
              tone: "published",
              label: t("Status.published"),
              title: t("Landing.step4Title"),
              desc: t("Landing.step4Body"),
            },
          ]}
          approveLabel={t("Actions.approve")}
          rejectLabel={t("Actions.reject")}
        />
        </Reveal>
        <Reveal>
        <Clients
          quote={t("Landing.clientQuote")}
          attributionRole={t("Landing.clientRole")}
          attributionDetail={t("Landing.clientDetail")}
        />
        </Reveal>
        <Reveal>
        <CTA
          heading={t("Landing.ctaHeading")}
          body={t("Landing.ctaBody")}
          registerLabel={t("Actions.requestAccess")}
        />
        </Reveal>
        <Footer
          securityLabel={t("Marketing.security")}
          processLabel={t("Marketing.process")}
          copyright={t("Landing.copyright")}
        />
      </div>
    </div>
  );
}

/* ── Header ─────────────────────────────────────────────────────────────── */

function Header({
  nav,
  signInLabel,
  registerLabel,
  menuLabel,
}: {
  nav: NavItem[];
  signInLabel: string;
  registerLabel: string;
  menuLabel: string;
}) {
  return (
    <header className="sticky top-0 z-20 border-b border-line bg-surface/80 backdrop-blur-md">
      <div className="mx-auto flex h-[72px] max-w-[1180px] items-center gap-6 px-6 lg:px-8">
        <Link href="/" aria-label="Blackcrest" className="shrink-0">
          <Logo size={32} />
        </Link>

        <nav className="ml-4 hidden shrink-0 items-center gap-7 xl:flex">
          {nav.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="whitespace-nowrap text-[14px] font-medium text-ink-2 transition-colors hover:text-ink"
            >
              {item.label}
            </a>
          ))}
        </nav>

        <div className="ml-auto flex shrink-0 items-center gap-3">
          <LanguageSwitcher />
          <div className="hidden items-center gap-2 xl:flex">
            <Link href="/login">
              <Button variant="ghost">{signInLabel}</Button>
            </Link>
            <Link href="/register">
              <Button
                variant="primary"
                trailingIcon={<Icon name="arrow-right" size={16} />}
              >
                {registerLabel}
              </Button>
            </Link>
          </div>
          <MobileMenu
            nav={nav}
            signInLabel={signInLabel}
            registerLabel={registerLabel}
            menuLabel={menuLabel}
          />
        </div>
      </div>
    </header>
  );
}

/* ── Hero ───────────────────────────────────────────────────────────────── */

function Hero({
  eyebrow,
  headline,
  subtitle,
  microcopy,
  getStartedLabel,
  viewDemoLabel,
  publishedLabel,
}: {
  eyebrow: string;
  headline: string;
  subtitle: string;
  microcopy: string;
  getStartedLabel: string;
  viewDemoLabel: string;
  publishedLabel: string;
}) {
  return (
    <section
      id="san-pham"
      className="mx-auto max-w-[1080px] px-6 pb-14 pt-20 text-center lg:px-8 lg:pt-[88px]"
    >
      <div className="mb-6 inline-flex">
        <Badge tone="accent" dot>
          {eyebrow}
        </Badge>
      </div>

      <h1 className="mx-auto max-w-[880px] font-serif text-[40px] font-semibold leading-[1.05] tracking-[-0.025em] text-ink sm:text-[52px] lg:text-[60px]">
        {headline}
      </h1>

      <p className="mx-auto mt-6 max-w-[600px] text-[18px] leading-[1.55] text-ink-3 lg:text-[19px]">
        {subtitle}
      </p>

      <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
        <Link href="/register">
          <Button
            variant="primary"
            size="lg"
            trailingIcon={<Icon name="arrow-right" size={18} />}
          >
            {getStartedLabel}
          </Button>
        </Link>
        <Link href="/login">
          <Button
            variant="secondary"
            size="lg"
            leadingIcon={<Icon name="eye" size={16} />}
          >
            {viewDemoLabel}
          </Button>
        </Link>
      </div>

      <p className="mt-[18px] text-[13px] text-ink-4">{microcopy}</p>

      <ProductPreview publishedLabel={publishedLabel} />
    </section>
  );
}

function ProductPreview({ publishedLabel }: { publishedLabel: string }) {
  const railItems = [
    "Tổng quan quỹ",
    "Hiệu suất Q3",
    "Phân bổ tài sản",
    "Giao dịch",
    "Ghi chú quản lý",
  ];
  return (
    <div className="mt-14 overflow-hidden rounded-card-lg border border-line bg-surface-1 text-left shadow-stack">
      {/* Window chrome */}
      <div className="flex h-10 items-center gap-2 border-b border-line bg-surface px-[14px]">
        <span className="flex gap-[6px]">
          <span className="h-[10px] w-[10px] rounded-pill bg-line-2" />
          <span className="h-[10px] w-[10px] rounded-pill bg-line-2" />
          <span className="h-[10px] w-[10px] rounded-pill bg-line-2" />
        </span>
        <span className="ml-3 truncate font-mono text-[11px] text-ink-3">
          blackcrest.app/portal/bao-cao/q3-2026.pdf
        </span>
        <span className="ml-auto shrink-0">
          <Badge tone="published" dot>
            {publishedLabel}
          </Badge>
        </span>
      </div>

      <div className="grid min-h-[360px] grid-cols-1 sm:grid-cols-[200px_1fr]">
        {/* Outline rail */}
        <aside className="hidden border-r border-line bg-surface p-[14px] sm:block">
          {railItems.map((label, i) => {
            const active = i === 1;
            return (
              <div
                key={label}
                className={
                  "mb-0.5 rounded-control px-[10px] py-2 text-[13px] " +
                  (active
                    ? "bg-accent-tint font-semibold text-accent"
                    : "font-medium text-ink-2")
                }
              >
                {label}
              </div>
            );
          })}
        </aside>

        {/* Canvas */}
        <div className="flex justify-center bg-surface-2 p-6 sm:p-8">
          <div className="w-[340px] max-w-full rounded-page bg-white p-[30px] shadow-card">
            <div className="font-serif text-[19px] font-semibold text-[#0a0a0c]">
              Báo cáo Quý III 2026
            </div>
            <div className="mt-1 font-mono text-[11px] uppercase tracking-[0.06em] text-[#9a9aa3]">
              Quỹ Cân Bằng Blackcrest
            </div>
            <div className="my-[18px] h-px bg-line" />
            <div className="mb-[9px] h-2 w-[80%] rounded-badge bg-[#e7e7ec]" />
            <div className="mb-[9px] h-2 w-[95%] rounded-badge bg-[#e7e7ec]" />
            <div className="mb-[9px] h-2 w-[70%] rounded-badge bg-[#e7e7ec]" />

            <div className="my-[22px] flex gap-[10px]">
              <div className="flex-1 rounded-card border border-line bg-surface-1 p-3">
                <div className="text-[10px] text-ink-3">NAV / đơn vị</div>
                <div
                  className="mt-[3px] font-mono text-[16px] font-medium text-ink"
                  data-numeric
                >
                  12.847
                </div>
              </div>
              <div className="flex-1 rounded-card border border-line bg-surface-1 p-3">
                <div className="text-[10px] text-ink-3">Lợi nhuận YTD</div>
                <div
                  className="mt-[3px] font-mono text-[16px] font-medium text-success"
                  data-numeric
                >
                  +8,42%
                </div>
              </div>
            </div>

            <div className="mb-2 h-[7px] w-full rounded-badge bg-[#e7e7ec]" />
            <div className="mb-2 h-[7px] w-[90%] rounded-badge bg-[#e7e7ec]" />
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Trust band ─────────────────────────────────────────────────────────── */

function Trust({ stats }: { stats: { value: string; label: string }[] }) {
  return (
    <section className="border-y border-line bg-surface-1">
      <div className="mx-auto grid max-w-[1080px] grid-cols-2 gap-6 px-6 py-10 lg:grid-cols-4 lg:px-8">
        {stats.map(({ value, label }) => (
          <div key={label}>
            <div
              className="font-mono text-[28px] font-medium tracking-[-0.02em] text-ink lg:text-[30px]"
              data-numeric
            >
              {value}
            </div>
            <div className="mt-1 text-[13px] text-ink-3">{label}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ── Features ───────────────────────────────────────────────────────────── */

function Features({
  eyebrow,
  heading,
  items,
}: {
  eyebrow: string;
  heading: string;
  items: { icon: IconName; title: string; desc: string }[];
}) {
  return (
    <section id="bao-mat" className="mx-auto max-w-[1080px] px-6 py-20 lg:px-8">
      <div className="mb-12 text-center">
        <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-accent">
          {eyebrow}
        </div>
        <h2 className="mt-3 font-serif text-[30px] font-semibold tracking-[-0.02em] text-ink lg:text-[38px]">
          {heading}
        </h2>
      </div>
      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        {items.map(({ icon, title, desc }) => (
          <div
            key={title}
            className="rounded-card border border-line bg-surface p-7 shadow-soft"
          >
            <div className="mb-[18px] flex h-10 w-10 items-center justify-center rounded-card bg-accent-tint">
              <Icon name={icon} size={20} className="text-accent" />
            </div>
            <h3 className="text-[18px] font-semibold tracking-[-0.012em] text-ink">
              {title}
            </h3>
            <p className="mt-2 text-[14px] leading-[1.55] text-ink-3">{desc}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ── Approval workflow ──────────────────────────────────────────────────── */

function Workflow({
  eyebrow,
  heading,
  intro,
  reviewLabel,
  steps,
  approveLabel,
  rejectLabel,
}: {
  eyebrow: string;
  heading: string;
  intro: string;
  reviewLabel: string;
  steps: {
    tone: "draft" | "review" | "approved" | "published";
    label: string;
    title: string;
    desc: string;
  }[];
  approveLabel: string;
  rejectLabel: string;
}) {
  return (
    <section id="quy-trinh" className="border-t border-line bg-surface-1">
      <div className="mx-auto max-w-[1080px] px-6 py-20 lg:px-8">
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] lg:items-center">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-accent">
              {eyebrow}
            </div>
            <h2 className="mt-3 max-w-[460px] font-serif text-[30px] font-semibold tracking-[-0.02em] text-ink lg:text-[36px]">
              {heading}
            </h2>
            <p className="mt-5 max-w-[440px] text-[15px] leading-[1.6] text-ink-3">
              {intro}
            </p>

            {/* Decision strip — mirrors the report side-panel */}
            <div className="mt-7 max-w-[440px] rounded-card border border-line bg-surface p-4 shadow-soft">
              <div className="flex items-center justify-between">
                <div className="text-[13px] font-medium text-ink">
                  Báo cáo Quý III 2026
                </div>
                <Badge tone="review" dot>
                  {reviewLabel}
                </Badge>
              </div>
              <div className="mt-3 flex gap-2">
                <Button variant="primary" size="sm">
                  {approveLabel}
                </Button>
                <Button variant="ghost" size="sm">
                  {rejectLabel}
                </Button>
              </div>
            </div>
          </div>

          <ol className="relative space-y-0">
            {steps.map((step, i) => (
              <li key={step.label} className="relative flex gap-4 pb-6 last:pb-0">
                {/* connector */}
                {i < steps.length - 1 && (
                  <span
                    aria-hidden
                    className="absolute left-[15px] top-8 h-[calc(100%-1rem)] w-px bg-line"
                  />
                )}
                <span className="relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-pill border border-line bg-surface font-mono text-[12px] font-medium text-ink-2">
                  {i + 1}
                </span>
                <div className="pt-0.5">
                  <div className="flex items-center gap-2">
                    <span className="text-[15px] font-semibold text-ink">
                      {step.title}
                    </span>
                    <Badge tone={step.tone} dot>
                      {step.label}
                    </Badge>
                  </div>
                  <p className="mt-1 text-[14px] leading-[1.55] text-ink-3">
                    {step.desc}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}

/* ── Clients / quote ────────────────────────────────────────────────────── */

function Clients({
  quote,
  attributionRole,
  attributionDetail,
}: {
  quote: string;
  attributionRole: string;
  attributionDetail: string;
}) {
  return (
    <section id="khach-hang" className="mx-auto max-w-[1080px] px-6 py-20 lg:px-8">
      <figure className="mx-auto max-w-[760px] text-center">
        <Icon
          name="landmark"
          size={28}
          className="mx-auto mb-6 text-ink-4"
        />
        <blockquote className="font-serif text-[24px] font-medium leading-[1.4] tracking-[-0.012em] text-ink lg:text-[28px]">
          {quote}
        </blockquote>
        <figcaption className="mt-7 text-[13px] text-ink-3">
          <span className="font-medium text-ink-2">{attributionRole}</span> ·{" "}
          {attributionDetail}
        </figcaption>
      </figure>
    </section>
  );
}

/* ── Dark CTA band ──────────────────────────────────────────────────────── */

function CTA({
  heading,
  body,
  registerLabel,
}: {
  heading: string;
  body: string;
  registerLabel: string;
}) {
  return (
    <section className="mx-auto mb-20 max-w-[1080px] px-6 lg:px-8">
      <div className="rounded-card-lg bg-inverse px-8 py-16 text-center lg:px-12 lg:py-20">
        <h2 className="mx-auto max-w-[640px] font-serif text-[30px] font-semibold tracking-[-0.022em] text-on-accent lg:text-[40px]">
          {heading}
        </h2>
        <p className="mx-auto mt-4 max-w-[520px] text-[16px] leading-[1.55] text-[#b4bcd0] lg:text-[18px]">
          {body}
        </p>
        <div className="mt-8 flex justify-center">
          <Link href="/register">
            <Button
              variant="secondary"
              size="lg"
              className="border-white bg-white text-[#0a0a0c] hover:bg-[#e7e7ec] hover:text-[#0a0a0c] hover:border-[#e7e7ec]"
              trailingIcon={<Icon name="arrow-right" size={18} />}
            >
              {registerLabel}
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
}

/* ── Footer ─────────────────────────────────────────────────────────────── */

function Footer({
  securityLabel,
  processLabel,
  copyright,
}: {
  securityLabel: string;
  processLabel: string;
  copyright: string;
}) {
  return (
    <footer className="border-t border-line">
      <div className="mx-auto flex max-w-[1080px] flex-col items-center justify-between gap-4 px-6 py-8 sm:flex-row lg:px-8">
        <Logo size={28} />
        <div className="flex items-center gap-5">
          <a href="#bao-mat" className="text-[13px] text-ink-3 hover:text-ink">
            {securityLabel}
          </a>
          <a href="#quy-trinh" className="text-[13px] text-ink-3 hover:text-ink">
            {processLabel}
          </a>
          <span className="text-[13px] text-ink-4">{copyright}</span>
        </div>
      </div>
    </footer>
  );
}
