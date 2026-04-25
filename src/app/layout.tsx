import type { Metadata } from "next";
import { Geologica, JetBrains_Mono } from "next/font/google";
import { Navbar } from "@/components/nav/navbar";
import { MilestoneToast } from "@/components/flow/milestone-toast";
import "./globals.css";

const criticalFallbackCss = `
  :root {
    color-scheme: dark;
    --bg: #0F1923;
    --surface: #1A2735;
    --primary: #3B82F6;
    --accent: #F59E0B;
    --success: #10B981;
    --danger: #EF4444;
    --text: #F1F5F9;
    --muted: #94A3B8;
    --border: #334155;
  }
  * { box-sizing: border-box; }
  html { background: var(--bg); }
  body {
    margin: 0;
    min-height: 100vh;
    background: var(--bg);
    color: var(--text);
    font-family: var(--font-geologica), system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    -webkit-font-smoothing: antialiased;
    text-rendering: optimizeLegibility;
  }
  a { color: inherit; text-decoration: none; }
  button, input, textarea, select {
    font: inherit;
  }
  a[href="#main-content"]:not(:focus) {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border: 0;
  }
  nav {
    position: sticky;
    top: 0;
    z-index: 50;
    border-bottom: 1px solid var(--border);
    background: color-mix(in srgb, var(--bg) 88%, transparent);
    backdrop-filter: blur(12px);
  }
  nav > div,
  main {
    width: 100%;
    max-width: 80rem;
    margin-inline: auto;
    padding-inline: 1rem;
  }
  nav > div {
    min-height: 4rem;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
  }
  main {
    padding-block: 2rem;
  }
  .surface-card,
  .rounded-lg.border,
  section > .rounded-lg {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 0.5rem;
  }
  .text-mountain-text { color: var(--text); }
  .text-mountain-muted { color: var(--muted); }
  .text-mountain-primary { color: var(--primary); }
  .text-mountain-accent { color: var(--accent); }
  .text-mountain-success { color: var(--success); }
  .bg-mountain-surface { background: var(--surface); }
  .bg-mountain-bg { background: var(--bg); }
  .border-mountain-border { border-color: var(--border); }
  .bg-mountain-primary { background: var(--primary); }
  .text-white { color: #fff; }
  .font-bold { font-weight: 700; }
  .font-semibold { font-weight: 600; }
  .font-medium { font-weight: 500; }
  .uppercase { text-transform: uppercase; }
  .tracking-wide { letter-spacing: .025em; }
  .tracking-tight { letter-spacing: 0; }
  .leading-tight { line-height: 1.25; }
  .leading-relaxed { line-height: 1.625; }
  .text-xs { font-size: .75rem; line-height: 1rem; }
  .text-sm { font-size: .875rem; line-height: 1.25rem; }
  .text-base { font-size: 1rem; line-height: 1.5rem; }
  .text-xl { font-size: 1.25rem; line-height: 1.75rem; }
  .text-2xl { font-size: 1.5rem; line-height: 2rem; }
  .text-3xl { font-size: 1.875rem; line-height: 2.25rem; }
  .flex { display: flex; }
  .grid { display: grid; }
  .hidden { display: none; }
  .items-center { align-items: center; }
  .items-start { align-items: flex-start; }
  .justify-between { justify-content: space-between; }
  .justify-center { justify-content: center; }
  .flex-col { flex-direction: column; }
  .flex-wrap { flex-wrap: wrap; }
  .shrink-0 { flex-shrink: 0; }
  .flex-1 { flex: 1 1 0%; }
  .gap-1 { gap: .25rem; }
  .gap-2 { gap: .5rem; }
  .gap-3 { gap: .75rem; }
  .gap-4 { gap: 1rem; }
  .gap-5 { gap: 1.25rem; }
  .space-y-2 > * + * { margin-top: .5rem; }
  .space-y-3 > * + * { margin-top: .75rem; }
  .space-y-4 > * + * { margin-top: 1rem; }
  .space-y-5 > * + * { margin-top: 1.25rem; }
  .space-y-6 > * + * { margin-top: 1.5rem; }
  .p-3 { padding: .75rem; }
  .p-4 { padding: 1rem; }
  .p-5 { padding: 1.25rem; }
  .p-6 { padding: 1.5rem; }
  .px-3 { padding-left: .75rem; padding-right: .75rem; }
  .px-4 { padding-left: 1rem; padding-right: 1rem; }
  .px-5 { padding-left: 1.25rem; padding-right: 1.25rem; }
  .py-2 { padding-top: .5rem; padding-bottom: .5rem; }
  .py-2\\.5 { padding-top: .625rem; padding-bottom: .625rem; }
  .py-3 { padding-top: .75rem; padding-bottom: .75rem; }
  .py-4 { padding-top: 1rem; padding-bottom: 1rem; }
  .py-5 { padding-top: 1.25rem; padding-bottom: 1.25rem; }
  .py-8 { padding-top: 2rem; padding-bottom: 2rem; }
  .pt-10 { padding-top: 2.5rem; }
  .pb-8 { padding-bottom: 2rem; }
  .mt-1 { margin-top: .25rem; }
  .mt-2 { margin-top: .5rem; }
  .mt-3 { margin-top: .75rem; }
  .mt-5 { margin-top: 1.25rem; }
  .mb-1 { margin-bottom: .25rem; }
  .mb-2 { margin-bottom: .5rem; }
  .mb-3 { margin-bottom: .75rem; }
  .mb-5 { margin-bottom: 1.25rem; }
  .mx-auto { margin-inline: auto; }
  .max-w-2xl { max-width: 42rem; }
  .max-w-7xl { max-width: 80rem; }
  .min-h-screen { min-height: 100vh; }
  .overflow-hidden { overflow: hidden; }
  .rounded { border-radius: .25rem; }
  .rounded-lg { border-radius: .5rem; }
  .rounded-xl { border-radius: .75rem; }
  .rounded-full { border-radius: 9999px; }
  .border { border-width: 1px; border-style: solid; }
  .border-t { border-top-width: 1px; border-top-style: solid; }
  .border-b { border-bottom-width: 1px; border-bottom-style: solid; }
  .border-r { border-right-width: 1px; border-right-style: solid; }
  .w-10 { width: 2.5rem; }
  .h-10 { height: 2.5rem; }
  .w-16 { width: 4rem; }
  .h-16 { height: 4rem; }
  .inline-flex { display: inline-flex; }
  .text-center { text-align: center; }
  .transition-colors { transition: color .15s ease, background-color .15s ease, border-color .15s ease; }
  @media (min-width: 640px) {
    .sm\\:text-4xl { font-size: 2.25rem; line-height: 2.5rem; }
    .sm\\:flex-row { flex-direction: row; }
    .sm\\:items-center { align-items: center; }
  }
  @media (min-width: 768px) {
    .md\\:flex { display: flex; }
    .md\\:hidden { display: none; }
    .md\\:grid-cols-5 { grid-template-columns: repeat(5, minmax(0, 1fr)); }
    .md\\:col-span-2 { grid-column: span 2 / span 2; }
    .md\\:col-span-3 { grid-column: span 3 / span 3; }
  }
  @media (min-width: 1024px) {
    .lg\\:grid-cols-\\[1\\.2fr_0\\.8fr\\] { grid-template-columns: 1.2fr .8fr; }
    .lg\\:border-l { border-left: 1px solid var(--border); }
    .lg\\:border-t-0 { border-top: 0; }
  }
`;

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
      <head>
        <style dangerouslySetInnerHTML={{ __html: criticalFallbackCss }} />
      </head>
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
