import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Thought Mapping System",
  description: "사고의 궤적을 기록하는 개인용 사유 시스템",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" className="dark">
      <body className={`${inter.className} bg-background text-foreground antialiased min-h-screen`}>
        <TooltipProvider delayDuration={300}>
          {children}
        </TooltipProvider>
        <Toaster />
      </body>
    </html>
  );
}
