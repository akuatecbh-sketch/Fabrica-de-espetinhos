import type { ReactNode } from "react";

export function CardRegistro({
  children,
  acoes,
}: {
  children: ReactNode;
  acoes?: ReactNode;
}) {
  return (
    <article className="rounded-lg border border-borda bg-superficie p-4">
      <div className="flex flex-col gap-1">{children}</div>
      {acoes ? (
        <div className="mt-3 flex flex-wrap items-center gap-3 border-t border-borda pt-3">
          {acoes}
        </div>
      ) : null}
    </article>
  );
}
