import type { Metadata } from "next";
import { Geologica, JetBrains_Mono } from "next/font/google";
import { Navbar } from "@/components/nav/navbar";
import { MilestoneToast } from "@/components/flow/milestone-toast";
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
  openGraph: {
    title: "Mountaine — Подготовка к восхождениям",
    description: "Единая среда для обучения, планирования и командной работы альпинистов",
    type: "website",
    locale: "ru_RU",
    siteName: "Mountaine",
  },
  twitter: {
    card: "summary",
    title: "Mountaine — Подготовка к восхождениям",
    description: "Единая среда для обучения, планирования и командной работы альпинистов",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru" className={`${geologica.variable} ${jetbrainsMono.variable}`}>
      <body className="font-sans min-h-screen">
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[100] focus:rounded-lg focus:bg-mountain-primary focus:px-4 focus:py-2 focus:text-white focus:text-sm focus:font-medium"
        >
          Перейти к содержимому
        </a>
        <Navbar />
        <main id="main-content" className="mx-auto max-w-7xl px-4 py-8">
          {children}
        </main>
        <MilestoneToast />
      </body>
    </html>
  );
}
