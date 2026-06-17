import { getRequestConfig } from "next-intl/server";
import { hasLocale } from "next-intl";
import { routing } from "./routing";

/**
 * Per-request i18n config. Validates the requested locale, falls back to the
 * default, and loads the matching UI message bundle. Figures/dates are formatted
 * in the Asia/Ho_Chi_Minh timezone (blueprint §F4).
 */
export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale;
  const locale = hasLocale(routing.locales, requested)
    ? requested
    : routing.defaultLocale;

  return {
    locale,
    messages: (await import(`../../messages/${locale}.json`)).default,
    timeZone: "Asia/Ho_Chi_Minh",
    now: new Date(),
  };
});
