"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { Icon } from "@/components/icon";
import { setWatch } from "@/server/watchlist-actions";

/**
 * A per-symbol watch toggle (F2). Optimistic: flips immediately, reverts if the
 * server action fails. The accent fill IS the state feedback (no toast needed).
 */
export function WatchButton({
  symbolId,
  ticker,
  initialWatching,
}: {
  symbolId: string;
  ticker: string;
  initialWatching: boolean;
}) {
  const t = useTranslations("Watchlist");
  const [watching, setWatching] = React.useState(initialWatching);
  const [pending, start] = React.useTransition();
  React.useEffect(() => setWatching(initialWatching), [initialWatching]);

  const toggle = () => {
    const next = !watching;
    setWatching(next); // optimistic
    start(async () => {
      const res = await setWatch({ symbolId, watching: next });
      if (!res.ok) setWatching(!next); // revert on failure
    });
  };

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={pending}
      aria-pressed={watching}
      title={watching ? t("removeFromWatchlist") : t("addToWatchlist")}
      className={
        "inline-flex items-center gap-[5px] rounded-control border px-[9px] py-[5px] text-mini font-medium transition-colors disabled:opacity-60 " +
        (watching
          ? "border-accent bg-accent text-on-accent"
          : "border-line bg-surface text-ink-2 hover:bg-surface-hover hover:text-ink")
      }
    >
      <Icon name="bell" size={13} />
      <span className="font-mono">{ticker}</span>
    </button>
  );
}
