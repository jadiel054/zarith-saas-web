import type { Metadata } from "next";
import { JetBrains_Mono, Orbitron, Inter } from 'next/font/google'
import "./globals.css";
import { CommandPalette } from "./_components/command-palette";

const orbitron = Orbitron({
  subsets: ['latin'],
  variable: '--font-orbitron',
  weight: ['400', '700', '900']
})

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
})

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
})

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
    <html lang="pt-BR" className={`${orbitron.variable} ${jetbrainsMono.variable} ${inter.variable}`}>
      <body className="font-sans antialiased bg-[#020208] text-[#e0e0ff]">
        {children}
        <CommandPalette />
      </body>
    </html>
  );
}
