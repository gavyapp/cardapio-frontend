import type { ReactNode } from "react";

/** Página do quadro de pedidos: título, busca à direita e o quadro. */
export function OrderBoardTemplate({
  title,
  action,
  children,
}: {
  title: ReactNode;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="w-full px-4 pt-4 pb-12 sm:px-6 sm:pt-6">
      <div className="mx-auto flex max-w-[1120px] flex-col gap-4">
        <header className="flex min-h-11 flex-wrap items-center gap-x-4 gap-y-3">
          <h1 className="mr-auto flex min-w-0 items-baseline gap-2 text-2xl leading-tight font-semibold">
            {title}
          </h1>
          {action}
        </header>
        {children}
      </div>
    </div>
  );
}
