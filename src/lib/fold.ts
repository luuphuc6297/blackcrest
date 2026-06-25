/**
 * Diacritic-fold + lowercase for accent-insensitive Vietnamese matching.
 * Strips combining marks (U+0300–U+036F), maps đ/Đ → d, lowercases, trims.
 * Shared by the client typeahead and any JS-side fuzzy filtering so the matching
 * rule stays identical everywhere. Pure JS — safe in both client and server code.
 */
export const fold = (s: string): string =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "d")
    .toLowerCase()
    .trim();
