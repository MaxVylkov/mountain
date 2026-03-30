import type { Metadata } from "next";
import { Geologica, JetBrains_Mono } from "next/font/google";
import { Navbar } from "@/components/nav/navbar";
import "./globals.css";

const geologica = Geologica({
  subsets: ["latin", "cyrillic"],
  variable: "--font-geologica",
  weight: ["300", "400", "500", "600", "700", "800"],
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains-mono",
});

export const metadata: Metadata = {
  title: "Mountaine — Подготовка к восхождениям",
  description: "Приложение для альпинистов: база гор, снаряжение, тренировки, обучение узлам",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru" className={`${geologica.variable} ${jetbrainsMono.variable}`}>
      <body className="font-sans min-h-screen">
        <Navbar />
        <main className="mx-auto max-w-7xl px-4 py-8">
          {children}
        </main>
      </body>
    </html>
  );
}
