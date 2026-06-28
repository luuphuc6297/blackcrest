"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { Card, Select } from "@/components/ui";
import { Icon } from "@/components/icon";
import { SKINS, type Skin } from "@/lib/skins";
import {
  readAppearance,
  writeAppearance,
  DEFAULT_APPEARANCE,
  type Appearance,
  type Theme,
  type Depth,
  type Density,
  type Reading,
  type Radius,
  type TextSize,
  type FontChoice,
} from "@/lib/appearance";

/** A small recessed segmented control (well) with a raised, lit active pill. */
function Segmented<T extends string>({
  label,
  hint,
  value,
  options,
  onChange,
}: {
  label: string;
  hint: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
}) {
  return (
    <div className="flex flex-col gap-[10px] sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <div className="text-small font-medium text-ink">{label}</div>
        <div className="mt-[2px] text-mini leading-normal text-ink-3">{hint}</div>
      </div>
      <div className="inline-flex flex-none rounded-control border border-line-2 bg-surface-input p-[2px] shadow-well">
        {options.map((o) => {
          const active = value === o.value;
          return (
            <button
              key={o.value}
              type="button"
              aria-pressed={active}
              onClick={() => onChange(o.value)}
              className={
                "rounded-[2px] px-[13px] py-[6px] text-mini font-medium transition-colors " +
                (active
                  ? "bg-surface-card text-ink shadow-soft-lit"
                  : "text-ink-3 hover:text-ink")
              }
            >
              {o.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/** Full design-system ("skin") picker — swatch chips driven by the SKINS registry,
 * so adding a skin needs no change here. Each chip shows the skin's canvas/card/
 * accent so the visual identity reads before selecting. */
function SkinPicker({
  label,
  hint,
  value,
  onChange,
  labelOf,
}: {
  label: string;
  hint: string;
  value: Skin;
  onChange: (v: Skin) => void;
  labelOf: (key: string) => string;
}) {
  return (
    <div className="flex flex-col gap-[10px] sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0">
        <div className="text-small font-medium text-ink">{label}</div>
        <div className="mt-[2px] text-mini leading-normal text-ink-3">{hint}</div>
      </div>
      <div className="flex flex-none flex-wrap gap-[8px] sm:max-w-[320px] sm:justify-end">
        {SKINS.map((s) => {
          const active = value === s.id;
          return (
            <button
              key={s.id}
              type="button"
              aria-pressed={active}
              onClick={() => onChange(s.id)}
              className={
                "inline-flex items-center gap-[8px] rounded-control border px-[11px] py-[7px] text-mini font-medium transition-colors " +
                (active
                  ? "border-accent bg-surface-card text-ink shadow-soft-lit"
                  : "border-line-2 bg-surface-input text-ink-3 hover:text-ink")
              }
            >
              <span className="flex flex-none" aria-hidden>
                <span className="size-[13px] rounded-full border border-line" style={{ background: s.swatch.canvas }} />
                <span className="-ml-[5px] size-[13px] rounded-full border border-line" style={{ background: s.swatch.card }} />
                <span className="-ml-[5px] size-[13px] rounded-full border border-line" style={{ background: s.swatch.accent }} />
              </span>
              {labelOf(s.labelKey)}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/**
 * Appearance settings — lets the user retune the depth/elevation system, table
 * density, and PDF reading background. Writes the bc-appearance cookie and
 * applies the change to <html> LIVE (no reload); the SSR layout reads the same
 * cookie so the choice survives navigation flash-free.
 */
export function AppearanceSettings() {
  const t = useTranslations("Appearance");
  // Start from defaults to match SSR, then sync with the saved cookie on mount
  // (cookie is client-only — reading it in render would cause a hydration mismatch).
  const [a, setA] = React.useState<Appearance>(DEFAULT_APPEARANCE);
  React.useEffect(() => {
    setA(readAppearance());
  }, []);

  const update = (patch: Partial<Appearance>) => {
    const next = { ...a, ...patch };
    setA(next);
    writeAppearance(next);
  };

  return (
    <Card padding={0}>
      <div className="flex items-center gap-[10px] border-b border-line px-[20px] py-[16px]">
        <Icon
          name="sliders-horizontal"
          size={17}
          className="flex-none text-ink-3"
        />
        <h2 className="text-medium font-semibold tracking-tight">{t("title")}</h2>
      </div>
      <div className="flex flex-col gap-[20px] p-[20px]">
        <SkinPicker
          label={t("skin")}
          hint={t("skinHint")}
          value={a.skin}
          onChange={(v) => update({ skin: v })}
          labelOf={(k) => t(k)}
        />
        <div className="h-px bg-line" />
        <Segmented<Theme>
          label={t("theme")}
          hint={t("themeHint")}
          value={a.theme}
          options={[
            { value: "light", label: t("themeLight") },
            { value: "dark", label: t("themeDark") },
            { value: "system", label: t("themeSystem") },
          ]}
          onChange={(v) => update({ theme: v })}
        />
        <div className="h-px bg-line" />
        <Segmented<Depth>
          label={t("depth")}
          hint={t("depthHint")}
          value={a.depth}
          options={[
            { value: "flat", label: t("depthFlat") },
            { value: "soft", label: t("depthSoft") },
            { value: "elevated", label: t("depthElevated") },
          ]}
          onChange={(v) => update({ depth: v })}
        />
        <div className="h-px bg-line" />
        <Segmented<Density>
          label={t("density")}
          hint={t("densityHint")}
          value={a.density}
          options={[
            { value: "comfortable", label: t("densityComfortable") },
            { value: "compact", label: t("densityCompact") },
          ]}
          onChange={(v) => update({ density: v })}
        />
        <div className="h-px bg-line" />
        <Segmented<Radius>
          label={t("radius")}
          hint={t("radiusHint")}
          value={a.radius}
          options={[
            { value: "sharp", label: t("radiusSharp") },
            { value: "soft", label: t("radiusSoft") },
            { value: "round", label: t("radiusRound") },
          ]}
          onChange={(v) => update({ radius: v })}
        />
        <div className="h-px bg-line" />
        <Segmented<TextSize>
          label={t("textSize")}
          hint={t("textSizeHint")}
          value={a.text}
          options={[
            { value: "small", label: t("textSmall") },
            { value: "default", label: t("textDefault") },
            { value: "large", label: t("textLarge") },
          ]}
          onChange={(v) => update({ text: v })}
        />
        <div className="h-px bg-line" />
        <div className="flex flex-col gap-[10px] sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <div className="text-small font-medium text-ink">{t("font")}</div>
            <div className="mt-[2px] text-mini leading-normal text-ink-3">
              {t("fontHint")}
            </div>
          </div>
          <Select
            aria-label={t("font")}
            value={a.font}
            onChange={(e) => update({ font: e.target.value as FontChoice })}
            containerClassName="sm:w-[210px]"
          >
            <option value="sans">Inter</option>
            <option value="be-vietnam">Be Vietnam Pro</option>
            <option value="jakarta">Plus Jakarta Sans</option>
            <option value="lexend">Lexend</option>
            <option value="serif">Source Serif</option>
            <option value="mono">IBM Plex Mono</option>
          </Select>
        </div>
        <div className="h-px bg-line" />
        <Segmented<Reading>
          label={t("reading")}
          hint={t("readingHint")}
          value={a.reading}
          options={[
            { value: "light", label: t("readingLight") },
            { value: "dark", label: t("readingDark") },
          ]}
          onChange={(v) => update({ reading: v })}
        />
      </div>
    </Card>
  );
}
