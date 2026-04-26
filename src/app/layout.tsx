import type { Metadata } from "next";
import { Outfit, JetBrains_Mono } from "next/font/google";
import { AppToaster } from "@/components/AppToaster";
import ErrorBoundary from "@/components/ErrorBoundary";
import { I18nProvider } from "@/i18n/LanguageContext";
import "./globals.css";

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://rateministere.com/waste-your-tokens/"),
  title: "Waste Your Tokens",
  description: "The most satisfying way to burn LLM API tokens",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${outfit.variable} ${jetbrainsMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <I18nProvider>
          <ErrorBoundary>
            {children}
          </ErrorBoundary>
          <AppToaster />
        </I18nProvider>
      </body>
    </html>
  );
}
