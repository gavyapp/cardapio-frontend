import { Button } from "@/components/atoms/button";

/** Barra fixa no rodapé com a ação principal da página. */
export function SaveBar({
  message,
  label = "Salvar alterações",
  onSave,
}: {
  message: string;
  label?: string;
  onSave?: () => void;
}) {
  return (
    <div className="sticky bottom-0 -mx-4 border-t bg-card px-4 py-3 sm:-mx-6 sm:px-6 lg:mx-0 lg:rounded-xl lg:border">
      <div className="flex items-center justify-between gap-4">
        <p className="text-[15px] text-muted-foreground">
          {message}
        </p>
        <Button size="lg" onClick={onSave}>
          {label}
        </Button>
      </div>
    </div>
  );
}
