"use client";

import { useEffect, useState } from "react";

import { cn } from "@/lib/utils";

export type NavSection = { id: string; label: string };

// Altura do header do painel mais uma folga, para a seção não ficar escondida.
const SCROLL_OFFSET = 128;

/** Menu lateral que rola até a seção e destaca a que está em leitura. */
export function SectionNav({
  sections,
  ariaLabel,
}: {
  sections: readonly NavSection[];
  ariaLabel: string;
}) {
  const active = useActiveSection(sections);

  function scrollTo(id: string) {
    const element = document.getElementById(id);
    if (!element) return;
    const top =
      element.getBoundingClientRect().top +
      window.scrollY -
      SCROLL_OFFSET;
    window.scrollTo({ top, behavior: "smooth" });
  }

  return (
    <nav
      aria-label={ariaLabel}
      className="rounded-surface border bg-card p-2 lg:sticky lg:top-32"
    >
      <ul className="flex flex-col gap-0.5">
        {sections.map((section) => (
          <li key={section.id}>
            <a
              href={`#${section.id}`}
              aria-current={
                section.id === active
                  ? "location"
                  : undefined
              }
              onClick={(event) => {
                event.preventDefault();
                scrollTo(section.id);
              }}
              className={cn(
                "block rounded-control px-4 py-3 text-body transition-colors hover:bg-muted",
                section.id === active
                  ? "bg-muted font-semibold text-foreground"
                  : "text-muted-foreground",
              )}
            >
              {section.label}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}

// Seção ativa: a última cujo topo passou da linha de leitura.
function useActiveSection(
  sections: readonly NavSection[],
): string {
  const [active, setActive] = useState(
    sections[0]?.id ?? "",
  );

  useEffect(() => {
    function update() {
      // No fim da página a última seção nunca chega ao topo:
      // se a rolagem acabou, ela é a ativa.
      const reachedBottom =
        window.innerHeight + window.scrollY >=
        document.documentElement.scrollHeight - 1;
      if (reachedBottom && sections.length) {
        setActive(sections[sections.length - 1].id);
        return;
      }

      let current = sections[0]?.id ?? "";
      for (const { id } of sections) {
        const element = document.getElementById(id);
        if (!element) continue;
        if (
          element.getBoundingClientRect().top -
            SCROLL_OFFSET <=
          1
        )
          current = id;
      }
      setActive(current);
    }
    window.addEventListener("scroll", update, {
      passive: true,
    });
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, [sections]);

  return active;
}
