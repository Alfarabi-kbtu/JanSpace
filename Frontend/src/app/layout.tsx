import type { Metadata } from "next";
import { DM_Serif_Display, Inter } from "next/font/google";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin", "cyrillic"],
});

const dmSerifDisplay = DM_Serif_Display({
  variable: "--font-dm-serif",
  weight: "400",
  style: ["normal", "italic"],
  // DM Serif Display has no Cyrillic subset — headings that need Cyrillic
  // text fall back to the sans stack via the --font-serif fallback chain
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "JanSpace",
  description: "JanSpace — товары и услуги в одном месте",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="ru"
      className={`${inter.variable} ${dmSerifDisplay.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-cream text-charcoal">
        <Header />
        {children}
        <Footer />
      </body>
    </html>
  );
}
