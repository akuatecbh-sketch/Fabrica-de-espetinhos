import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Painel do dia",
  robots: { index: false, follow: false },
};

export default function PainelLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-full bg-[#0B1220] text-white">
      <style>{`html, body { background-color: #0B1220 !important; }`}</style>
      {children}
    </div>
  );
}
