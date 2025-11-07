import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Aurora FotoLab | Restauração de fotos antigas",
  description:
    "Restaure fotos antigas com ajustes automáticos de cor, contraste e nitidez diretamente no navegador.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body className={`${inter.className} bg-transparent`}>{children}</body>
    </html>
  );
}
