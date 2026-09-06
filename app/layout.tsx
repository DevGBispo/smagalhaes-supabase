import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Teste Supabase | Controle de Embarque Smagalhães",
  description: "Ambiente de teste para validar Supabase no Controle de Embarque Smagalhães.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
