import type { Metadata } from "next";
import { AuthProvider } from "@/components/providers/session-provider";
import { Urbanist } from 'next/font/google';
import "./globals.css";

const urbanist = Urbanist({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700', '800', '900'],
  variable: '--font-urbanist',
});

export const metadata: Metadata = {
  title: "csvout - AI-Powered Metadata & Prompt Generation",
  description: "Generate perfect metadata for stock platforms like Adobe Stock and Shutterstock. Transform images into prompts for Ideogram, Runway ML, and more.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${urbanist.variable} font-sans antialiased`}
      >
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
