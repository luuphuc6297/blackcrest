import { createNavigation } from "next-intl/navigation";
import { routing } from "./routing";

/**
 * Locale-aware navigation helpers. Components MUST use these (not next/navigation)
 * so locale prefixes are preserved — blueprint §F4.
 */
export const { Link, redirect, usePathname, useRouter, getPathname } =
  createNavigation(routing);
