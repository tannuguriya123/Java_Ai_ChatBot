import type { Metadata } from "next";
import { Geist, Geist_Mono, Inter, DM_Sans, Outfit } from "next/font/google";

import "./globals.css";
import { cn } from "@/lib/utils";
import { Toaster } from "@/components/ui/toast";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/providers/theme-provider";
import QueryProvider from "@/components/providers/query-provider";

const outfitHeading = Outfit({subsets:['latin'],variable:'--font-heading'});

const dmSans = DM_Sans({subsets:['latin'],variable:'--font-sans'});

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "DevPilot — Chat with your codebase",
  description:
    "Connect GitHub, index a repository, and ask anything about your code.",
  icons: {
    icon: "/devpilot-icon.svg",
    apple: "/devpilot-icon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={cn(
              "h-full",
              "antialiased",
              geistSans.variable,
              geistMono.variable
            , "font-sans", dmSans.variable, outfitHeading.variable)}
      suppressHydrationWarning
    >
      <body className="flex min-h-svh flex-col">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <QueryProvider>
            <TooltipProvider>
              {children}
              <Toaster />
            </TooltipProvider>
          </QueryProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
