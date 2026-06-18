import { getTranslations, setRequestLocale } from "next-intl/server";
import { auth } from "@/auth";
import { AppShell } from "@/components/app-shell";
import { LanguageSwitcher } from "@/components/language-switcher";
import { Badge, Card, EmptyState, FilterTabs, SearchBox } from "@/components/ui";
import { Icon } from "@/components/icon";
import { Link } from "@/i18n/navigation";
import { listVisibleReports } from "@/lib/authz";
import { categoryName, listCategories } from "@/server/reports";
import { portalNav } from "@/lib/nav";
import { REPORT_STATUS } from "@/lib/status";
import { formatDate } from "@/lib/format";

// Gated, per-user data — never prerender/cache.
export const dynamic = "force-dynamic";

export default async function ReportsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ cat?: string; q?: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const { cat, q } = await searchParams;

  const session = await auth();
  const user = session!.user;
  const userName = user.name ?? user.email ?? "Nhà đầu tư";

  const t = await getTranslations("Library");
  const tNav = await getTranslations("Nav");
  const tStatus = await getTranslations("Status");
  const tRoles = await getTranslations("Roles");

  const [{ items }, categories] = await Promise.all([
    listVisibleReports({
      userId: user.id,
      role: user.role,
      locale,
      take: 24,
      categorySlug: cat ?? null,
      q: q ?? null,
    }),
    listCategories(),
  ]);

  return (
    <AppShell
      nav={portalNav(tNav)}
      activeKey="documents"
      user={{ name: userName, role: tRoles(user.role) }}
      title={tNav("documents")}
      actions={<LanguageSwitcher />}
    >
      <div className="mx-auto max-w-[1180px] px-7 py-7">
        {/* Header */}
        <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="font-serif text-[24px] font-semibold tracking-[-0.015em] text-ink">
              {t("title")}
            </h2>
            <p className="mt-[6px] text-[15px] text-ink-3">
              {t("description")}
            </p>
          </div>
          <span
            data-numeric
            className="font-mono text-[13px] text-ink-3"
          >
            {t("documentCount", { n: items.length })}
          </span>
        </div>

        {/* Category filter + search (URL-param; compose so both persist) */}
        <div className="mb-6 flex flex-col gap-3 border-b border-line pb-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-[6px]">
            <Icon name="filter" size={15} className="flex-none text-ink-4" />
            <FilterTabs
              paramKey="cat"
              allLabel={t("filterAll")}
              options={categories.map((c) => ({
                value: c.slug,
                label: categoryName(c, locale),
              }))}
            />
          </div>
          <SearchBox className="sm:w-[260px]" />
        </div>

        {/* Document grid */}
        {items.length === 0 ? (
          <Card padding={0}>
            <EmptyState
              icon="file-text"
              title={t("emptyFiltered")}
            />
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-[14px] sm:grid-cols-2 lg:grid-cols-3">
            {items.map((d, i) => (
              <Link
                key={d.id}
                href={`/reports/${d.slug}`}
                className="group bc-rise"
                style={{ animationDelay: `${Math.min(i, 8) * 45}ms` }}
              >
                <Card
                  padding={18}
                  className="flex h-full flex-col transition-[box-shadow,transform] group-hover:-translate-y-px group-hover:shadow-card"
                >
                  {/* Category + status */}
                  <div className="mb-3 flex items-center justify-between gap-2">
                    <span className="truncate text-[10px] font-medium uppercase tracking-[0.06em] text-ink-4">
                      {categoryName(d.category, locale)}
                    </span>
                    <Badge tone={REPORT_STATUS[d.status].tone} dot size="sm">
                      {tStatus(REPORT_STATUS[d.status].key)}
                    </Badge>
                  </div>

                  {/* Cover tile + title */}
                  <div className="flex items-start gap-3">
                    <span className="flex h-[52px] w-[42px] flex-none items-center justify-center rounded-card border border-line bg-surface-2">
                      <Icon
                        name="file-text"
                        size={20}
                        className="text-ink-3"
                      />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="line-clamp-2 text-[15px] font-semibold leading-[1.3] tracking-[-0.01em] text-ink">
                        {d.title}
                      </div>
                      {d.author && (
                        <div className="mt-1 truncate text-[12px] text-ink-3">
                          {d.author}
                        </div>
                      )}
                    </div>
                  </div>

                  {d.summary && (
                    <p className="mt-3 line-clamp-2 text-[13px] leading-[1.5] text-ink-3">
                      {d.summary}
                    </p>
                  )}

                  {/* Footer meta */}
                  <div className="mt-auto flex items-center justify-between gap-2 border-t border-line pt-3 text-[12px] text-ink-3">
                    <span
                      data-numeric
                      className="font-mono"
                    >
                      {formatDate(d.publishedAt, locale)}
                    </span>
                    <span className="flex items-center gap-3">
                      {d.pageCount != null && (
                        <span
                          data-numeric
                          className="inline-flex items-center gap-[5px] font-mono"
                        >
                          <Icon name="files" size={13} className="text-ink-4" />
                          {t("pageCount", { n: d.pageCount })}
                        </span>
                      )}
                      <Icon
                        name="arrow-up-right"
                        size={15}
                        className="text-ink-4 transition-colors group-hover:text-accent"
                      />
                    </span>
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}

