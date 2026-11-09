import { createCn } from "cn/config";

/**
 * Junta classes do Tailwind resolvendo conflitos. Conhece os tokens do tema
 * (globals.css): sem isso, `text-meta` seria lido como cor e um
 * `text-muted-foreground` depois dele apagaria o tamanho.
 */
export const cn = createCn({
  extend: {
    theme: {
      text: [
        "caption",
        "meta",
        "body",
        "section",
        "title",
        "display",
      ],
      radius: ["control", "surface"],
    },
  },
});
