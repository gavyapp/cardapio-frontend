"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BookOpen,
  ChevronDown,
  ClipboardList,
  LayoutGrid,
  Tag,
} from "lucide-react";

import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/atoms/dropdown-menu";

// Contagem fixa de exemplo até os pedidos entrarem.
const NEW_ORDERS_SAMPLE = 3;

const MENU_ITEMS = [
  { label: "Produtos", href: "/painel/cardapio/produtos" },
  {
    label: "Complementos",
    href: "/painel/cardapio/complementos",
  },
];

const tabClass =
  "relative flex h-12 shrink-0 items-center gap-2 px-1 text-[15px] text-muted-foreground transition-colors hover:text-foreground data-[active=true]:font-semibold data-[active=true]:text-foreground data-[active=true]:after:absolute data-[active=true]:after:inset-x-0 data-[active=true]:after:-bottom-px data-[active=true]:after:h-0.5 data-[active=true]:after:bg-foreground [&_svg]:size-4.5";

function isActive(pathname: string, href: string) {
  return (
    pathname === href || pathname.startsWith(`${href}/`)
  );
}

export function PanelNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Seções do painel"
      className="border-b border-border"
    >
      <ul className="flex [scrollbar-width:none] gap-6 overflow-x-auto px-4 sm:px-6">
        <li>
          <Link
            href="/painel/pedidos"
            data-active={isActive(
              pathname,
              "/painel/pedidos",
            )}
            className={tabClass}
          >
            <ClipboardList />
            Pedidos
            <span className="tabular rounded-md bg-warning-soft px-1.5 py-0.5 text-xs font-medium text-warning-foreground">
              {NEW_ORDERS_SAMPLE}
            </span>
          </Link>
        </li>
        <li>
          <DropdownMenu>
            <DropdownMenuTrigger
              data-active={isActive(
                pathname,
                "/painel/cardapio",
              )}
              className={cn(
                tabClass,
                "cursor-pointer outline-none",
              )}
            >
              <BookOpen />
              Cardápio
              <ChevronDown className="size-4! text-muted-foreground" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              {MENU_ITEMS.map((item) => (
                <DropdownMenuItem
                  key={item.href}
                  render={<Link href={item.href} />}
                >
                  {item.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </li>
        <li>
          <Link
            href="/painel/promocoes"
            data-active={isActive(
              pathname,
              "/painel/promocoes",
            )}
            className={tabClass}
          >
            <Tag />
            Promoções
          </Link>
        </li>
        <li>
          <Link
            href="/painel/dashboard"
            data-active={isActive(
              pathname,
              "/painel/dashboard",
            )}
            className={tabClass}
          >
            <LayoutGrid />
            Dashboard
          </Link>
        </li>
      </ul>
    </nav>
  );
}
