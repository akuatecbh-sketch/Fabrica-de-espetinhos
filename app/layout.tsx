import type { Metadata } from "next";
import { JetBrains_Mono, Sora } from "next/font/google";
import "./globals.css";

const sora = Sora({
  variable: "--font-sora",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
});

export const metadata: Metadata = {
  title: "Gestão — Fábrica de Espetinhos",
  description: "Sistema de gestão e PDV da fábrica de espetinhos",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="pt-BR"
      className={`${sora.variable} ${jetbrainsMono.variable} h-full antialiased`}
    >
      <body className={`${sora.className} flex min-h-full flex-col bg-fundo text-texto-primario`}>
        {children}
      </body>
    </html>
  );
}
