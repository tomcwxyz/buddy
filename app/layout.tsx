import type { Metadata } from "next";
import { Atkinson_Hyperlegible } from "next/font/google";
import { WordMotionController } from "@/components/WordMotionController";
import "./globals.css";
import "./playful.css";
import "./mobile.css";

const atkinson = Atkinson_Hyperlegible({
  subsets: ["latin"],
  weight: ["400", "700"],
  display: "swap",
  variable: "--font-atkinson",
});

export const metadata: Metadata = {
  title: "Buddy",
  description: "A calm learning companion.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en-GB">
      <body className={atkinson.variable}>
        {children}
        <WordMotionController />
      </body>
    </html>
  );
}
