export function EmConstrucao({ titulo }: { titulo: string }) {
  return (
    <div className="flex flex-col gap-2">
      <h1 className="text-2xl font-semibold tracking-tight">{titulo}</h1>
      <p className="text-sm text-zinc-600">Esta tela ainda será construída</p>
    </div>
  );
}
