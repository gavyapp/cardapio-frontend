import type { Enums } from "@/lib/database.types";

/** Moto (entrega) ou sacola (retirada), como no protótipo. */
export function OrderModeIcon({
  mode,
  className,
}: {
  mode: Enums<"order_mode">;
  className?: string;
}) {
  if (mode === "ENTREGA") {
    return (
      <svg
        aria-hidden
        className={className}
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <circle cx="5.5" cy="16.5" r="3" />
        <circle cx="18.5" cy="16.5" r="3" />
        <path d="M8.5 16.5h4l3.5-7h-3.5" />
        <path d="M15 6h2.5l1 4.5" />
        <path d="M3 12h6l2.5 4.5" />
      </svg>
    );
  }
  return (
    <svg
      aria-hidden
      className={className}
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinejoin="round"
    >
      <path d="M5 8h14l-1 13H6z" />
      <path d="M9 10V6a3 3 0 0 1 6 0v4" />
    </svg>
  );
}
