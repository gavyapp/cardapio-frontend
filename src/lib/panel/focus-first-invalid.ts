/**
 * Depois de marcar os erros, leva o foco ao primeiro campo com
 * aria-invalid dentro do container, para o lojista ver o que corrigir.
 */
export function focusFirstInvalid(
  container: HTMLElement | null,
) {
  requestAnimationFrame(() => {
    const field = container?.querySelector<HTMLElement>(
      '[aria-invalid="true"]',
    );
    field?.scrollIntoView({
      block: "center",
      behavior: "smooth",
    });
    field?.focus({ preventScroll: true });
  });
}
