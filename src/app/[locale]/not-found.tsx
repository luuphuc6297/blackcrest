import { getTranslations } from "next-intl/server";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui";
import { Icon } from "@/components/icon";

// Branded 404 — also the boundary for notFound() (e.g. a report a user can't see,
// which is intentionally indistinguishable from "not found" for security).
export default async function NotFound() {
  const t = await getTranslations("Errors");
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-surface px-6 text-center">
      <Logo size={34} />
      <div className="flex flex-col items-center gap-3">
        <span
          data-numeric
          className="font-mono text-small tracking-[0.04em] text-ink-4"
        >
          404
        </span>
        <h1 className="font-serif text-[34px] font-semibold leading-tight tracking-[-0.02em] text-ink">
          {t("notFoundTitle")}
        </h1>
        <p className="max-w-md text-regular text-ink-2">{t("notFoundDesc")}</p>
      </div>
      <a href="/" className="inline-flex">
        <Button
          variant="secondary"
          leadingIcon={<Icon name="arrow-left" size={16} />}
        >
          {t("backHome")}
        </Button>
      </a>
    </div>
  );
}
