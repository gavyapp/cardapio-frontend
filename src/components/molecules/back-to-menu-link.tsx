"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { menuPathFrom } from "@/lib/routing/store-paths";

/** Link do checkout de volta para o cardápio da mesma loja. */
export function BackToMenuLink({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  const pathname = usePathname();
  return (
    <Link
      href={menuPathFrom(pathname)}
      className={className}
    >
      {children}
    </Link>
  );
}
