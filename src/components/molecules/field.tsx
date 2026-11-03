import type { ReactNode } from "react";

import { Label } from "@/components/atoms/label";

/** Rótulo sempre acima do campo, como no protótipo. */
export function Field({
  id,
  label,
  children,
}: {
  id: string;
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="grid gap-2">
      <Label htmlFor={id}>{label}</Label>
      {children}
    </div>
  );
}
