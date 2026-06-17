---
name: blackcrest-design
description: Use this skill to generate well-branded interfaces and assets for Blackcrest — a light-first private-wealth / fintech document platform (PDF report viewing, approval workflow, role-based portals) with a Linear-grade precise aesthetic and editorial serif gravitas. Vietnamese-first. Contains design guidelines, colors, type, fonts, assets, reusable components and full UI kits for prototyping or production.
user-invocable: true
---

Read `readme.md` in this skill first — it covers brand context, content fundamentals (Vietnamese, tone, casing, numerals), visual foundations, iconography, and a full file index. Then explore the other files as needed.

**Foundations**
- `styles.css` is the single global entry point (only `@import`s). Link it and author against the **role tokens** (`--color-bg-primary`, `--color-text-secondary`, `--color-border-primary`, `--color-accent`, …). Light is primary; `[data-theme="dark"]` mirrors the Linear identity.
- Tokens live in `tokens/`. Fonts: Inter (UI), Source Serif 4 (display, substitutes Tiempos), IBM Plex Mono (numerals, substitutes Berkeley).

**Components** are React (`.jsx` + `.d.ts` + `.prompt.md`) under `components/`, exported on `window.BlackcrestDesignSystem_e9728c` once the compiled `_ds_bundle.js` is loaded. Read each `.prompt.md` for usage. Icons: Lucide via CDN.

**UI kits** under `ui_kits/<product>/` are full-screen recreations (marketing, auth, portal, admin, and the core **pdf-viewer**). Open any `index.html` to see them; copy patterns from the `.jsx`.

**When producing work:**
- If creating visual artifacts (slides, mocks, throwaway prototypes), copy the assets you need out and create static HTML files for the user to view.
- If working on production code, copy assets and follow the rules here to design as an expert in this brand.
- If invoked without guidance, ask what the user wants to build, ask a few focused questions, then act as an expert designer outputting HTML artifacts **or** production code as appropriate.
- Keep everything Vietnamese-first, use the violet accent sparingly, lean on hairline borders over shadows, mono for all figures, and the serif only for large editorial moments.
