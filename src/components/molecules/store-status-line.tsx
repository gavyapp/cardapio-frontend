import { cn } from "@/lib/utils";

/**
 * "● Aberto · fecha às 23h" ou "● Fechado · abre hoje às 18h". O complemento
 * some quando a loja foi aberta ou fechada manualmente.
 */
export function StoreStatusLine({
  isOpen,
  hint,
  className,
}: {
  isOpen: boolean;
  /** "fecha às 23h" ou "abre hoje às 18h". */
  hint: string | null;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "flex items-center gap-2 text-support",
        className,
      )}
    >
      <span
        aria-hidden
        className={cn(
          "size-2 shrink-0 rounded-full",
          isOpen ? "bg-success" : "bg-gray-medium",
        )}
      />
      <span
        className={cn(
          "font-semibold",
          isOpen ? "text-success" : "text-foreground",
        )}
      >
        {isOpen ? "Aberto" : "Fechado"}
      </span>
      {hint ? (
        <span className="text-muted-foreground">
          · {hint}
        </span>
      ) : null}
    </span>
  );
}
