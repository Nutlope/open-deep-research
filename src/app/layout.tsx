import type { Metadata } from "next";
import { Figtree } from "next/font/google";
import "./globals.css";
import { ClerkProvider } from "@clerk/nextjs";
import { Toaster } from "sonner";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app/AppSidebar";
import { Header } from "@/components/Header";
import PlausibleProvider from "next-plausible";
import { cn } from "@/lib/utils";
import { TogetherApiKeyProvider } from "@/components/app/ApiKeyControls";

const figtree = Figtree({
  variable: "--font-figtree",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Open Deep Research",
  description: "Let AI do research for you",
  openGraph: {
    images: ["https://www.opendeepresearch.dev/og.jpg"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider>
      <SidebarProvider>
        <TogetherApiKeyProvider>
          <AppSidebar />
          <html lang="en" className="h-full">
            <head>
              <PlausibleProvider domain="opendeepresearch.dev" />
            </head>
            <body
              className={cn(
                `${figtree.variable} flex min-h-full flex-col antialiased mt-[80px] md:mt-0`
              )}
            >
              <Header />
              <Toaster position="top-center" richColors />
              {children}
            </body>
          </html>
        </TogetherApiKeyProvider>
      </SidebarProvider>
    </ClerkProvider>
  );
}
