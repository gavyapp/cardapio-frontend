import type { ReactNode } from "react";

/** Linha de configuração: título e explicação à esquerda, controle à direita. */
export function SettingRow({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <div className="grid gap-4 py-6 md:grid-cols-[280px_1fr] md:items-center">
      <div>
        <p className="text-[15px] font-medium">{title}</p>
        {description ? (
          <p className="text-[13px] text-muted-foreground">
            {description}
          </p>
        ) : null}
      </div>
      <div className="flex items-center gap-4">
        {children}
      </div>
    </div>
  );
}
