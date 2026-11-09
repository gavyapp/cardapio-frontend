import { cn } from "@/lib/utils";

export const PLATFORM_NAME =
  process.env.NEXT_PUBLIC_PLATFORM_NAME ?? "Gavy";

/** Marca da plataforma: quadrado da logo e o nome. */
export function PlatformMark({
  className,
  squareClassName,
}: {
  className?: string;
  squareClassName?: string;
}) {
  return (
    <span
      className={cn(
        "flex items-center gap-3 font-semibold",
        className,
      )}
    >
      <span
        aria-hidden
        className={cn(
          "size-7 shrink-0 rounded-control bg-current",
          squareClassName,
        )}
      />
      {PLATFORM_NAME}
    </span>
  );
}
