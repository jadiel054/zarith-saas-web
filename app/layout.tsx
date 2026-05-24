import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Zarith VTuber AI",
  description: "Chat com IA cyberpunk",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
