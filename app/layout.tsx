import "./globals.css";
import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import { ClerkProvider } from "@clerk/nextjs";
import { ThemeProvider } from "@/components/theme-provider";
import { cn } from "@/lib/utils";
import { Toaster } from "@/components/ui/toaster";
import { ProModal } from "@/components/pro-modal";
import LoadingIndicator from "@/components/loading-indicator";

export const metadata: Metadata = {
  title: "Companion — AI characters that remember you",
  description:
    "Create and chat with AI companions backed by a hybrid memory system: short-term context in Redis and long-term semantic recall in a vector database.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ClerkProvider>
      <html
        lang="en"
        suppressHydrationWarning
        className={cn(GeistSans.variable, GeistMono.variable)}
      >
        <body className="min-h-full bg-background font-sans text-foreground">
          <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
            <LoadingIndicator />
            <ProModal />
            {children}
            <Toaster />
          </ThemeProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
