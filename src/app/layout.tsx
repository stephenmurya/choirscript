import type { Metadata } from "next";
import "./globals.css";

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
    <html lang="en" className="h-full">
      <body className="flex min-h-full flex-col antialiased">{children}</body>
    </html>
  );
}
