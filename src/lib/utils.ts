import { clsx, type ClassValue } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

/**
 * tailwind-merge configured for the Blackcrest design tokens. Our @theme adds
 * custom font-size utilities (text-micro … text-title-1) and a custom tracking
 * (tracking-caps). tailwind-merge doesn't know these, so by default it would put
 * e.g. `text-micro` (size) in the same conflict group as `text-danger` (color)
 * and silently drop one. Registering them in the right groups lets size + color
 * (and tracking) coexist.
 */
const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      "font-size": [
        {
          text: [
            "micro",
            "mini",
            "small",
            "regular",
            "medium",
            "large",
            "title-1",
            "title-2",
            "title-3",
          ],
        },
      ],
      tracking: [{ tracking: ["caps"] }],
    },
  },
});

/** Merge conditional class names, de-duplicating conflicting Tailwind utilities. */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
