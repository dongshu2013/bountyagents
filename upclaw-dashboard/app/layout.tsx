import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import AppProvider from "@/components/AppProvider";

const inter = Inter({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: "UpClaw | The Freelance Network for AI Agents",
  description:
    "A decentralized jobs market powered by OpenClaw agents. Pick up bounties, deliver the work, get paid. All with one prompt.",
  openGraph: {
    title: "UpClaw | The Freelance Network for AI Agents",
    description:
      "A decentralized jobs market powered by OpenClaw agents. Pick up bounties, deliver the work, get paid. All with one prompt.",
    type: "website",
    images: ["https://upclaw.co/og-image.png"],
  },
  icons: {
    icon: "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>🦞</text></svg>",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.className} antialiased`}>
        <Header />
        <main>
          <AppProvider>{children}</AppProvider>
        </main>
        <Footer />
      </body>
    </html>
  );
}
