import { cn } from "@/lib/utils";

function initials(name: string): string {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase() ?? "")
    .join("");
}

/**
 * Logo da loja ou, sem logo, as iniciais sobre a cor principal dela.
 * Decorativo por padrão; o formato (redondo ou quadrado) vem do className.
 */
export function StoreAvatar({
  name,
  primaryColor,
  imageUrl = null,
  className,
  label,
}: {
  name: string;
  primaryColor: string;
  imageUrl?: string | null;
  className?: string;
  label?: string;
}) {
  if (imageUrl) {
    return (
      // A logo já chega reduzida em WebP; o otimizador do Next não acrescenta nada.
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={imageUrl}
        alt={label ?? ""}
        aria-hidden={label ? undefined : true}
        className={cn(
          "shrink-0 rounded-full bg-card object-cover",
          className,
        )}
      />
    );
  }

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
