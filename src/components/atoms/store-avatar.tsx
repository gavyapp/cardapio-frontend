import { cn } from "@/lib/utils";

function initials(name: string): string {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase() ?? "")
    .join("");
}

/** Iniciais da loja sobre a cor principal dela. Decorativo por padrão. */
export function StoreAvatar({
  name,
  primaryColor,
  className,
  label,
}: {
  name: string;
  primaryColor: string;
  className?: string;
  label?: string;
}) {
  return (
    <span
      aria-hidden={label ? undefined : true}
      aria-label={label}
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full font-semibold",
        className,
      )}
      style={{
        backgroundColor: primaryColor,
        color: "var(--primary-foreground)",
      }}
    >
      {initials(name)}
    </span>
  );
}
