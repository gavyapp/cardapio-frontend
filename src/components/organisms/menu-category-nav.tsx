"use client";

import { useEffect, useRef, useState } from "react";

import { StoreAvatar } from "@/components/atoms/store-avatar";
import { menuSectionId } from "@/lib/catalog/menu-sections";
import { cn } from "@/lib/utils";

export type NavCategory = { id: string; name: string };

/** Folga entre a barra fixa e o título da categoria. */
const SECTION_GAP = 12;

/**
 * Barra fixa do cardápio: a marca da loja (depois que o topo saiu da tela) e
 * as abas de categoria. A aba marcada acompanha a rolagem; tocar numa aba
 * rola até a categoria.
 */
export function MenuCategoryNav({
  store,
  categories,
  heroId,
}: {
  store: {
    name: string;
    logoUrl: string | null;
    primaryColor: string;
  };
  categories: readonly NavCategory[];
  /** Id do topo da página; a marca aparece quando ele sai da tela. */
  heroId: string;
}) {
  const navRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(
    categories[0]?.id ?? "",
  );
  const [pastHero, setPastHero] = useState(false);

  useEffect(() => {
    function update() {
      const hero = document.getElementById(heroId);
      setPastHero(
        hero
          ? hero.getBoundingClientRect().bottom <= 0
          : false,
      );

      if (!categories.length) return;

      // No fim da página a última categoria nunca chega à barra.
      const reachedBottom =
        window.innerHeight + window.scrollY >=
        document.documentElement.scrollHeight - 1;
      if (reachedBottom) {
        setActive(categories[categories.length - 1].id);
        return;
      }

      const navBottom =
        navRef.current?.getBoundingClientRect().bottom ?? 0;
      let current = categories[0].id;
      for (const { id } of categories) {
        const section = document.getElementById(
          menuSectionId(id),
        );
        if (!section) continue;
        if (
          section.getBoundingClientRect().top -
            navBottom -
            SECTION_GAP <=
          1
        ) {
          current = id;
        }
      }
      setActive(current);
    }

    // Página recarregada já rolada: acerta depois da primeira pintura.
    const frame = requestAnimationFrame(update);
    window.addEventListener("scroll", update, {
      passive: true,
    });
    window.addEventListener("resize", update);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, [categories, heroId]);

  // Mantém a aba marcada à vista na lista horizontal.
  useEffect(() => {
    const list = listRef.current;
    const tab = list?.querySelector<HTMLElement>(
      `[data-category="${active}"]`,
    );
    if (!list || !tab) return;
    list.scrollTo({
      left:
        tab.offsetLeft -
        (list.clientWidth - tab.clientWidth) / 2,
      behavior: "smooth",
    });
  }, [active]);

  function scrollToCategory(id: string) {
    const section = document.getElementById(
      menuSectionId(id),
    );
    if (!section) return;
    const navHeight = navRef.current?.offsetHeight ?? 0;
    window.scrollTo({
      top:
        section.getBoundingClientRect().top +
        window.scrollY -
        navHeight -
        SECTION_GAP,
      behavior: "smooth",
    });
  }

  return (
    <div
      ref={navRef}
      className="sticky top-0 z-30 -mx-4 border-b bg-background px-4 lg:mx-0 lg:px-0"
    >
      {pastHero ? (
        <div className="flex items-center gap-3 pt-3">
          <StoreAvatar
            name={store.name}
            primaryColor={store.primaryColor}
            imageUrl={store.logoUrl}
            className="size-9 rounded-control text-caption"
          />
          <p className="truncate text-body font-semibold">
            {store.name}
          </p>
        </div>
      ) : null}

      <nav aria-label="Categorias do cardápio">
        <div
          ref={listRef}
          className="flex [scrollbar-width:none] gap-2 overflow-x-auto py-3"
        >
          {categories.map((category) => {
            const selected = category.id === active;
            return (
              <button
                key={category.id}
                type="button"
                data-category={category.id}
                aria-current={selected ? "true" : undefined}
                onClick={() =>
                  scrollToCategory(category.id)
                }
                className={cn(
                  "h-9 shrink-0 rounded-full px-4 text-support font-semibold whitespace-nowrap transition-colors outline-none focus-visible:ring-2 focus-visible:ring-foreground focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                  selected
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-foreground hover:bg-border",
                )}
              >
                {category.name}
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
