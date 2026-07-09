import type { Metadata } from "next";
import "./globals.css";
import { Geist } from "next/font/google";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";
import { cn } from "@/lib/utils";

const geist = Geist({
  subsets: ["latin"],
  variable: "--font-geist",
});

export const metadata: Metadata = {
  title: "ChoirScript",
  description: "Annotated choir scripts for directors who teach by ear.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={cn("dark h-full", geist.variable)}>
      <body className="flex min-h-full flex-col bg-background font-sans text-foreground antialiased">
        <TooltipProvider>{children}</TooltipProvider>
        <Toaster />
      </body>
    </html>
  );
}
