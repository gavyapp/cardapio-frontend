/** Mensagem de erro logo abaixo do campo; o campo recebe aria-invalid. */
export function FieldError({
  message,
}: {
  message?: string;
}) {
  if (!message) return null;
  return (
    <span
      role="alert"
      className="text-[13px] text-destructive"
    >
      {message}
    </span>
  );
}
