# Porting conventions — bundle components → Next.js Tailwind TSX

Read this fully before porting. The goal is **pixel-faithful** recreations of the
design-bundle components as **Tailwind v4** components in the real app, that
**compile under TypeScript + React 19** and stay **server-renderable** where
possible (the app is RSC-first).

## Where things go
- One component per file: `src/components/ui/<kebab-case>.tsx`
  (e.g. `IconButton` → `src/components/ui/icon-button.tsx`).
- Named, PascalCase export: `export function Badge(...)`. Also export the prop
  interface (`export interface BadgeProps`).
- Import alias is `@/*` → `src/*`. Use `cn` from `@/lib/utils` to merge classes.
- Icons: use `<Icon name="download" size={16} />` from `@/components/icon`
  (kebab names match the bundle's `data-lucide` names) OR a direct `lucide-react`
  import. Always thin stroke (the `Icon` wrapper defaults `strokeWidth=1.5`).

## The gold reference
**Read `src/components/ui/button.tsx`** — it is the already-ported `Button`.
Match its style exactly: `forwardRef`, variant/size class maps, `cn()`, exact
pixel values via arbitrary utilities, hover/active as Tailwind variants (NOT JS
state), no `'use client'`.

## Server vs client (important)
- **Default to a server component (no directive).** Presentational wrappers over
  native elements — `Input`, `Select`, `Checkbox`, `Switch`, `Badge`, `Tag`,
  `Avatar`, `Card` — must be server components: style native `<input>/<select>`
  etc. and let the parent own state (`forwardRef`, spread `...rest`). The
  bundle's internal `useState` is a prototype artifact; drop it.
- Add `"use client"` ONLY for components that genuinely own interactive state:
  `Tooltip` (hover/focus open), `Dialog` (open + escape + scrim), `Tabs` (active
  tab — unless you make it controlled-only), `Toast` (timed dismiss). Keep these
  minimal and self-contained.

## Source of truth for each component
For component `X`, read in `design-reference/components/<group>/`:
- `X.jsx` — the visual spec (exact px, colors, gaps, radii, states). Translate
  every inline style to a Tailwind utility. Keep explicit pixel values as
  arbitrary utilities (`h-[38px]`, `text-[11.5px]`, `tracking-[0.09em]`,
  `gap-[9px]`); do NOT round to the nearest scale step.
- `X.d.ts` — the **prop contract**. Reproduce it as the TS interface; for native
  wrappers extend the right `React.*HTMLAttributes`.
- `X.prompt.md` — usage notes / variants to cover.
- the group's `*.card.html` — shows the variants/states to support.

## Token utility cheat-sheet (Tailwind v4 `@theme`, defined in src/app/globals.css)
Use these semantic utilities (they auto-swap under `[data-theme="dark"]`). Prefer
them over hard-coded hex.

**Color (usable as `bg-*`, `text-*`, `border-*`):**
- Surfaces: `surface` (page), `surface-marketing`, `surface-1`, `surface-2`
  (cards), `surface-3` (popovers), `surface-input`, `surface-hover`,
  `surface-active`, `surface-translucent`, `overlay` (scrim), `inverse` (dark band).
- Text: `ink` (primary), `ink-2`, `ink-3`, `ink-4`, `on-accent` (white on black).
- Accent/brand (monochrome — near-black): `accent`, `accent-hover`,
  `accent-active`, `accent-tint`, `brand`.
- Borders (hairline): `line`, `line-2`, `line-3`, `line-translucent`.
- Functional status (muted, sparse): `success`/`success-tint`,
  `warning`/`warning-tint`, `danger`/`danger-tint`, `info`/`info-tint`.
- Document status: `status-draft`, `status-review`, `status-approved`,
  `status-published`, `status-archived`, `status-rejected`.

**Radius (sharp/institutional):** `rounded-control` (2px), `rounded-badge` (3px),
`rounded-card` (4px), `rounded-card-lg`, `rounded-page` (2px), `rounded-pill`.

**Fonts:** `font-sans` (Inter, UI/body), `font-serif` (Source Serif 4, editorial
moments only), `font-mono` (IBM Plex Mono — ALL figures/numerals; add
`data-numeric` or class `tabular` for tnum).

**Weights:** `font-light` 300, `font-normal` 400, `font-medium` 510,
`font-semibold` 590, `font-bold` 680.

**Shadows (subtle, theme-aware):** `shadow-soft`, `shadow-card`, `shadow-float`,
`shadow-stack`. Lean on hairline borders over shadows.

**Motion:** `ease-signature` (default), `ease-standard`, `ease-out-expo`,
`ease-out-quint`; durations `duration-[180ms]` / `duration-[80ms]`.

## Aesthetic guardrails (the user iterated hard on these)
- Monochrome black/white. Near-black `accent` is the only action/brand color. No
  violet, no decorative color. Color only for functional status, muted.
- Squared corners everywhere. Hairline `border-line` over shadows.
- Uppercase + positive tracking only for buttons and eyebrow/overline labels.
- `font-serif` only for large editorial moments — never for dense UI.
- No emoji. No unicode glyphs as icons. Figures always `font-mono`.

## Output
Write the files. Do not edit `button.tsx`, `icon.tsx`, `logo.tsx`, tokens, or
globals.css. Return ONLY the structured summary requested.
