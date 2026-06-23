"use client";

import * as React from "react";
import { Icon } from "@/components/icon";
import { ReportCard } from "@/components/report-card";
import type { SearchedReport } from "@/lib/authz";

/**
 * Horizontal, snap-scrolling row of report cards with prev/next controls. Each
 * section fetches only ~12 reports, so this stays light. Arrows enable/disable at
 * the ends; native horizontal scroll (trackpad / swipe) works too.
 */
export function ReportCarousel({
  reports,
  locale,
}: {
  reports: SearchedReport[];
  locale: string;
}) {
  const ref = React.useRef<HTMLDivElement | null>(null);
  const [atStart, setAtStart] = React.useState(true);
  const [atEnd, setAtEnd] = React.useState(false);

  const sync = React.useCallback(() => {
    const el = ref.current;
    if (!el) return;
    setAtStart(el.scrollLeft <= 2);
    setAtEnd(el.scrollLeft + el.clientWidth >= el.scrollWidth - 2);
  }, []);

  React.useEffect(() => {
    sync();
    const el = ref.current;
    if (!el) return;
    el.addEventListener("scroll", sync, { passive: true });
    window.addEventListener("resize", sync);
    return () => {
      el.removeEventListener("scroll", sync);
      window.removeEventListener("resize", sync);
    };
  }, [sync]);

  const scrollBy = (dir: 1 | -1) => {
    const el = ref.current;
    if (!el) return;
    el.scrollBy({ left: dir * Math.max(el.clientWidth * 0.85, 280), behavior: "smooth" });
  };

  return (
    <div className="group/carousel relative">
      <div
        ref={ref}
        className="flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-smooth pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {reports.map((r) => (
          <div key={r.id} className="w-[280px] flex-none snap-start sm:w-[300px]">
            <ReportCard report={r} locale={locale} />
          </div>
        ))}
      </div>

      {!atStart && (
        <Arrow side="left" onClick={() => scrollBy(-1)} />
      )}
      {!atEnd && (
        <Arrow side="right" onClick={() => scrollBy(1)} />
      )}
    </div>
  );
}

function Arrow({ side, onClick }: { side: "left" | "right"; onClick: () => void }) {
  return (
    <button
      type="button"
      aria-label={side === "left" ? "Trước" : "Sau"}
      onClick={onClick}
      className={
        "absolute top-1/2 z-10 hidden size-9 -translate-y-1/2 items-center justify-center rounded-pill border border-line bg-surface-card text-ink-2 shadow-soft-lit transition hover:border-line-3 hover:text-ink sm:flex " +
        (side === "left" ? "-left-3" : "-right-3")
      }
    >
      <Icon name={side === "left" ? "chevron-left" : "chevron-right"} size={18} />
    </button>
  );
}
